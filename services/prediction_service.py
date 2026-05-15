"""
Sulama Tahmin Servisi — Least Squares Linear Regression
=========================================================
Algorithm 2 (SDD): Son 24 saatlik toprak nemi zaman serisine
birinci dereceden polinom (y = mx + b) fit ederek kritik nem
eşiğine ulaşılacak zamanı tahmin eder.

Referans:
    Gauss, C. F. (1809). Theoria Motus Corporum Coelestium.
    NumPy polyfit: least-squares polynomial fit (LAPACK dgelsd).
"""

import logging
import numpy as np
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
from sqlalchemy.orm import Session
from models import SensorReading, Device, PlantLibrary

logger = logging.getLogger(__name__)

# Bir cihaz için istenen minimum örneklem sayısı.
# Bu değerin altında regresyon güvenilir kabul edilmez.
MIN_DATA_POINTS = 3

# Varsayılan kritik nem eşiği (bitki kütüphanesinde tanımlı değer yoksa).
DEFAULT_CRITICAL_THRESHOLD = 25.0


@dataclass(frozen=True)
class RegressionResult:
    """
    Tek bir lineer regresyon hesaplamasının sonuç nesnesi.

    Alanlar
    -------
    slope : float
        Regresyon doğrusunun eğimi (m), saat başına nem değişimi (Δ%/h).
        Negatif değer nemi azalan bir trend anlamına gelir.
    intercept : float
        y-kesim noktası (b); t=0 anındaki tahmin edilen nem değeri (%).
    r_squared : float
        Determinasyon katsayısı R². [0, 1] aralığında; 1'e yakın değerler
        yüksek doğrusal uyumu ifade eder.
    data_points : int
        Hesaplamada kullanılan örneklem sayısı.
    """
    slope: float
    intercept: float
    r_squared: float
    data_points: int


class InsufficientDataError(Exception):
    """Son 24 saatte yeterli sensör verisi bulunamadığında fırlatılır."""


class NoDeclineError(Exception):
    """Nem trendi negatif değilse (sulama gerekmiyorsa) fırlatılır."""


def _fetch_24h_readings(db: Session, device_mac: Optional[str]) -> list[SensorReading]:
    """
    Veritabanından son 24 saatlik SensorReading kayıtlarını döner.

    Parametreler
    ------------
    db : Session
        Aktif SQLAlchemy oturumu.
    device_mac : str | None
        Belirli bir cihaza filtrelemek için MAC adresi.
        None ise tüm cihazların verisi birleştirilir.

    Döndürür
    --------
    list[SensorReading]
        Zaman damgasına göre artan sırayla sıralanmış kayıtlar.

    Fırlatır
    --------
    InsufficientDataError
        Dönen kayıt sayısı MIN_DATA_POINTS'ten az ise.
    """
    cutoff = datetime.utcnow() - timedelta(hours=24)
    query = (
        db.query(SensorReading)
        .filter(SensorReading.timestamp >= cutoff)
        .filter(SensorReading.moisture_pct.isnot(None))
        .order_by(SensorReading.timestamp.asc())
    )
    if device_mac:
        query = query.filter(SensorReading.device_mac == device_mac)

    rows = query.all()

    if len(rows) < MIN_DATA_POINTS:
        raise InsufficientDataError(
            f"Son 24 saatte yalnızca {len(rows)} geçerli kayıt bulundu. "
            f"Regresyon için en az {MIN_DATA_POINTS} kayıt gereklidir."
        )

    return rows


def _resolve_threshold(db: Session, device_mac: Optional[str]) -> float:
    """
    Cihaza bağlı bitki türünün kritik nem eşiğini (min_moisture) döner.

    Eşik öncelik sırası:
        1. Cihazın plant_type ilişkisindeki PlantLibrary.min_moisture
        2. DEFAULT_CRITICAL_THRESHOLD (sabit: %25)
    """
    if not device_mac:
        return DEFAULT_CRITICAL_THRESHOLD

    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    if device and device.plant_type and device.plant_type.min_moisture is not None:
        return float(device.plant_type.min_moisture)

    return DEFAULT_CRITICAL_THRESHOLD


def _fit_linear_regression(
    timestamps: list[datetime],
    moisture_values: list[float],
) -> RegressionResult:
    """
    NumPy polyfit ile birinci dereceden En Küçük Kareler regresyonu uygular.

    Matematiksel Formülasyon
    -----------------------
    Verilen n adet (tᵢ, yᵢ) çifti için minimize edilen amaç fonksiyonu:

        S(m, b) = Σᵢ [yᵢ - (m·tᵢ + b)]²

    Normal denklemler (kapalı form çözüm):

        m = [n·Σ(tᵢ·yᵢ) - Σtᵢ·Σyᵢ] / [n·Σtᵢ² - (Σtᵢ)²]
        b = (Σyᵢ - m·Σtᵢ) / n

    NumPy.polyfit bu çözümü LAPACK'ın dgelsd() rutini aracılığıyla
    sayısal kararlılık için QR ayrışımı (SVD fallback) kullanarak
    hesaplar.

    Zaman ekseni saat (h) birimine normalize edilir; bu sayede eğim
    birimi Δ%/h (saat başına nem yüzde değişimi) olur.

    Parametreler
    ------------
    timestamps : list[datetime]
        Kayıtların UTC zaman damgaları; artan sırada.
    moisture_values : list[float]
        Her kayda karşılık gelen toprak nemi yüzdesi.

    Döndürür
    --------
    RegressionResult
        Eğim, kesim, R² ve veri noktası sayısı.
    """
    # Zaman eksenini saat cinsinden normalize et (t₀ = 0).
    t0 = timestamps[0]
    t_hours = np.array(
        [(ts - t0).total_seconds() / 3600.0 for ts in timestamps],
        dtype=np.float64,
    )
    y = np.array(moisture_values, dtype=np.float64)

    # Birinci dereceden polinom fit (y = m·t + b).
    coeffs, residuals, rank, sv, rcond = np.polyfit(t_hours, y, deg=1, full=True)
    m, b = float(coeffs[0]), float(coeffs[1])

    # R² hesabı: 1 - SS_res / SS_tot
    y_pred = m * t_hours + b
    ss_res = float(np.sum((y - y_pred) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r_squared = 1.0 - ss_res / ss_tot if ss_tot > 1e-10 else 0.0

    logger.debug(
        "Regresyon tamamlandı | m=%.4f Δ%%/h | b=%.2f%% | R²=%.4f | n=%d",
        m, b, r_squared, len(y),
    )

    return RegressionResult(
        slope=round(m, 6),
        intercept=round(b, 4),
        r_squared=round(max(0.0, r_squared), 4),
        data_points=len(y),
    )


def _predict_crossing_time(
    regression: RegressionResult,
    reference_time: datetime,
    t_last_hours: float,
    threshold: float,
    current_moisture: float,
) -> tuple[datetime, float]:
    """
    y = m·t + b denkleminden eşiği geçme anını hesaplar.

    Çözülen denklem:
        threshold = m·t_cross + b
        t_cross   = (threshold - b) / m

    t_cross, referans zamana (t₀) göre saat cinsinden ifade edilir.

    Döndürür
    --------
    (predicted_datetime, hours_remaining) : tuple
        predicted_datetime : Tahmin edilen sulama zamanı (UTC).
        hours_remaining    : Şu andan kaç saat sonra.

    Fırlatır
    --------
    NoDeclineError
        Eğim ≥ 0 ise (nem artıyor veya sabit).
    ValueError
        Eşik zaten aşılmışsa veya tahmin geçmişe işaret ediyorsa.
    """
    if regression.slope >= 0:
        raise NoDeclineError(
            f"Toprak nemi trendi pozitif veya düz "
            f"(m={regression.slope:.4f} Δ%/h). Sulama gerekmiyor."
        )

    t_cross = (threshold - regression.intercept) / regression.slope
    hours_remaining = t_cross - t_last_hours

    if hours_remaining <= 0:
        raise ValueError(
            f"Toprak nemi zaten kritik eşiğin ({threshold}%) altında. "
            f"Güncel nem: {current_moisture:.1f}%."
        )

    predicted_dt = reference_time + timedelta(hours=t_cross)
    return predicted_dt, round(hours_remaining, 2)


def predict_next_watering(
    db: Session,
    device_mac: Optional[str] = None,
) -> dict:
    """
    Ana tahmin fonksiyonu. Tüm adımları orkestre eder.

    İş Akışı
    ---------
    1. Son 24 saatlik sensör verilerini çek.
    2. Cihaza ait kritik nem eşiğini belirle.
    3. Zaman serisine lineer regresyon fit et.
    4. Eğim analizi yap:
       - m < 0 → Kritik eşiğe ulaşım zamanını hesapla.
       - m ≥ 0 → "Sulama gerekmiyor" mesajı döndür.
    5. Sonuç sözlüğünü oluştur ve döndür.

    Parametreler
    ------------
    db : Session
        Aktif SQLAlchemy veritabanı oturumu.
    device_mac : str | None
        Filtreleme için cihaz MAC adresi.

    Döndürür
    --------
    dict
        Tahmin sonuçlarını içeren yapılandırılmış yanıt.

    Fırlatır
    --------
    InsufficientDataError
        Yeterli veri yoksa.
    NoDeclineError
        Nem trendi negatif değilse.
    """
    rows = _fetch_24h_readings(db, device_mac)
    threshold = _resolve_threshold(db, device_mac)

    timestamps = [r.timestamp for r in rows]
    moisture_values = [r.moisture_pct for r in rows]
    current_moisture = moisture_values[-1]

    regression = _fit_linear_regression(timestamps, moisture_values)

    t0 = timestamps[0]
    t_last_hours = (timestamps[-1] - t0).total_seconds() / 3600.0

    try:
        predicted_dt, hours_remaining = _predict_crossing_time(
            regression=regression,
            reference_time=t0,
            t_last_hours=t_last_hours,
            threshold=threshold,
            current_moisture=current_moisture,
        )
        status = "watering_predicted"
        message = (
            f"Toprak nemi yaklaşık {hours_remaining:.1f} saat içinde "
            f"kritik eşiğe ({threshold}%) ulaşacak."
        )
    except NoDeclineError as exc:
        logger.info("Sulama gerekmedi | cihaz=%s | %s", device_mac, exc)
        return {
            "device_mac": device_mac,
            "status": "no_watering_needed",
            "message": str(exc),
            "current_moisture_pct": round(current_moisture, 2),
            "critical_threshold_pct": threshold,
            "regression": {
                "slope_per_hour": regression.slope,
                "intercept": regression.intercept,
                "r_squared": regression.r_squared,
                "data_points": regression.data_points,
            },
            "predicted_watering_time": None,
            "hours_until_watering": None,
        }
    except ValueError as exc:
        logger.warning("Eşik zaten aşılmış | cihaz=%s | %s", device_mac, exc)
        raise

    logger.info(
        "Sulama tahmini üretildi | cihaz=%s | %.1f saat | R²=%.4f",
        device_mac, hours_remaining, regression.r_squared,
    )

    return {
        "device_mac": device_mac,
        "status": status,
        "message": message,
        "current_moisture_pct": round(current_moisture, 2),
        "critical_threshold_pct": threshold,
        "regression": {
            "slope_per_hour": regression.slope,
            "intercept": regression.intercept,
            "r_squared": regression.r_squared,
            "data_points": regression.data_points,
        },
        "predicted_watering_time": predicted_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hours_until_watering": hours_remaining,
    }
