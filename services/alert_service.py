"""
Uyarı (Alert) Servisi — Eşik Değer Kontrolü ve Otomatik Bildirim Üretimi
=========================================================================
REQ-F-030: Sensör verisi eşik değerlerle kıyaslanır.
REQ-F-031: Anormal durum tespit edildiğinde Alert nesnesi oluşturulur ve
           veritabanına kaydedilir.
REQ-F-032: Kaydedilen alertler GET /api/alerts endpoint'i aracılığıyla
           mobil uygulama tarafından sorgulanabilir.
REQ-F-005: Geçersiz veya eksik sensör verisi loglama mekanizmasıyla
           raporlanır; servis hata fırlatmadan çalışmaya devam eder.
"""

import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from models import SensorReading, Alert, Device, PlantLibrary
from services.plant_thresholds import get_thresholds_for_plant

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Eşik Değer Sözlüğü (REQ-F-030)
# ---------------------------------------------------------------------------
# Her parametre için (min, max, severity_below_min, severity_above_max)
# tuple'ı tanımlanır. None değeri ilgili yönde eşik olmadığını belirtir.
#
# severity seviyeleri:
#   "Critical" → bitkinin hayatta kalmasını tehdit eden durum
#   "Warning"  → dikkat gerektiren ama acil olmayan sapma
#   "Info"     → bilgilendirme amaçlı, optimum dışı durum

THRESHOLDS: dict[str, dict] = {
    "moisture_pct": {
        "min": 20.0,
        "max": 90.0,
        "label": "Moisture",
        "unit": "%",
        "severity_below": "Critical",
        "severity_above": "Warning",
        "msg_below": "Toprak nemi kritik düzeyin altında: {value:.1f}% (eşik: {threshold}%)",
        "msg_above": "Toprak nemi maksimum düzeyin üstünde: {value:.1f}% (eşik: {threshold}%)",
    },
    "temperature_c": {
        "min": 5.0,
        "max": 35.0,
        "label": "Temperature",
        "unit": "°C",
        "severity_below": "Critical",
        "severity_above": "Warning",
        "msg_below": "Sıcaklık tehlikeli ölçüde düşük: {value:.1f}°C (eşik: {threshold}°C)",
        "msg_above": "Sıcaklık yüksek: {value:.1f}°C (eşik: {threshold}°C)",
    },
    "humidity_pct": {
        "min": 30.0,
        "max": 95.0,
        "label": "Humidity",
        "unit": "%",
        "severity_below": "Warning",
        "severity_above": "Info",
        "msg_below": "Hava nemi düşük: {value:.1f}% (eşik: {threshold}%)",
        "msg_above": "Hava nemi çok yüksek: {value:.1f}% (eşik: {threshold}%)",
    },
    "light_lux": {
        "min": 100.0,
        "max": 100_000.0,
        "label": "Light",
        "unit": "lux",
        "severity_below": "Warning",
        "severity_above": "Info",
        "msg_below": "Işık yetersiz: {value:.0f} lux (eşik: {threshold} lux)",
        "msg_above": "Işık fazla yoğun: {value:.0f} lux (eşik: {threshold} lux)",
    },
}


# ---------------------------------------------------------------------------
# Çekirdek Eşik Kontrol Fonksiyonu (REQ-F-030, REQ-F-031)
# ---------------------------------------------------------------------------

def check_thresholds(reading: SensorReading, custom_thresholds: Optional[dict] = None) -> List[Alert]:
    """
    Tek bir SensorReading kaydını THRESHOLDS sözlüğüyle kıyaslar ve
    ihlal edilen her parametre için bir Alert nesnesi döndürür.

    Veritabanı kaydı bu fonksiyonun sorumluluğunda DEĞİLDİR; çağıran
    katman (router) commit işlemini yönetir. Bu tasarım fonksiyonun
    birim testlerini kolaylaştırır (session bağımsız).

    Parametreler
    ------------
    reading : SensorReading
        Yeni kaydedilen sensör satırı (ORM nesnesi).

    Döndürür
    --------
    List[Alert]
        Sıfır veya daha fazla Alert ORM nesnesi. Boş liste → ihlal yok.
    """
    alerts: List[Alert] = []
    effective = THRESHOLDS.copy()
    if custom_thresholds:
        for field, limits in custom_thresholds.items():
            if field in effective:
                effective[field] = {**effective[field], **limits}

    for field, cfg in effective.items():
        value = getattr(reading, field, None)

        # REQ-F-005: Eksik veya None değerli parametre → loglayıp geç
        if value is None:
            logger.debug(
                "Alan eksik, atlanıyor | cihaz=%s | alan=%s",
                reading.device_mac, field,
            )
            continue

        try:
            value = float(value)
        except (TypeError, ValueError):
            logger.warning(
                "Geçersiz sensör değeri | cihaz=%s | alan=%s | değer=%r",
                reading.device_mac, field, value,
            )
            continue

        # Minimum eşik kontrolü
        if cfg["min"] is not None and value < cfg["min"]:
            msg = cfg["msg_below"].format(value=value, threshold=cfg["min"])
            alerts.append(Alert(
                device_mac=reading.device_mac,
                alert_type=cfg["label"],
                severity=cfg["severity_below"],
                message=msg,
                sensor_value=value,
                threshold_value=cfg["min"],
                timestamp=datetime.utcnow(),
            ))
            logger.info(
                "Alert üretildi [%s] | %s | cihaz=%s",
                cfg["severity_below"], msg, reading.device_mac,
            )

        # Maksimum eşik kontrolü
        elif cfg["max"] is not None and value > cfg["max"]:
            msg = cfg["msg_above"].format(value=value, threshold=cfg["max"])
            alerts.append(Alert(
                device_mac=reading.device_mac,
                alert_type=cfg["label"],
                severity=cfg["severity_above"],
                message=msg,
                sensor_value=value,
                threshold_value=cfg["max"],
                timestamp=datetime.utcnow(),
            ))
            logger.info(
                "Alert üretildi [%s] | %s | cihaz=%s",
                cfg["severity_above"], msg, reading.device_mac,
            )

    return alerts


def _get_plant_thresholds(db: Session, device_mac: Optional[str]) -> dict:
    """
    Cihaza atanmış bitkinin eşik değerlerini döndürür.
    Cihaz veya bitki yoksa botanik veritabanından genel eşikler alınır.
    """
    if not device_mac:
        return _build_thresholds(None)

    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    if not device:
        return _build_thresholds(None)

    # Önce PlantLibrary kaydına bak (kullanıcı elle girdiyse)
    plant: Optional[PlantLibrary] = None
    if device.plant_type_id:
        plant = db.query(PlantLibrary).filter(PlantLibrary.id == device.plant_type_id).first()

    return _build_thresholds(plant, device.plant_name)


def _build_thresholds(plant: Optional[PlantLibrary], plant_name: Optional[str] = None) -> dict:
    """
    PlantLibrary kaydından veya botanik veritabanından eşik sözlüğü üretir.
    """
    # PlantLibrary'de tüm eşikler dolu mu?
    if plant and all(getattr(plant, f) is not None for f in [
        "min_moisture", "max_moisture", "ideal_temp_min", "ideal_temp_max",
        "min_humidity", "max_humidity", "min_light_lux", "max_light_lux"
    ]):
        return {
            "moisture_pct":  {"min": plant.min_moisture,   "max": plant.max_moisture},
            "temperature_c": {"min": plant.ideal_temp_min, "max": plant.ideal_temp_max},
            "humidity_pct":  {"min": plant.min_humidity,   "max": plant.max_humidity},
            "light_lux":     {"min": plant.min_light_lux,  "max": plant.max_light_lux},
        }

    # Botanik veritabanından al
    name = (plant.name if plant else None) or plant_name or ""
    t = get_thresholds_for_plant(name) if name else get_thresholds_for_plant("")
    return {
        "moisture_pct":  {"min": t["min_moisture"],   "max": t["max_moisture"]},
        "temperature_c": {"min": t["ideal_temp_min"], "max": t["ideal_temp_max"]},
        "humidity_pct":  {"min": t["min_humidity"],   "max": t["max_humidity"]},
        "light_lux":     {"min": t["min_light_lux"],  "max": t["max_light_lux"]},
    }


def evaluate_and_persist(db: Session, reading: SensorReading) -> List[Alert]:
    """
    Bitkiye özgü eşik kontrolünü çalıştırır ve alertleri veritabanına kaydeder.
    """
    thresholds = _get_plant_thresholds(db, reading.device_mac)
    generated = check_thresholds(reading, thresholds)
    if generated:
        db.add_all(generated)
        db.commit()
        logger.info(
            "%d alert veritabanına kaydedildi | cihaz=%s",
            len(generated), reading.device_mac,
        )
    return generated
