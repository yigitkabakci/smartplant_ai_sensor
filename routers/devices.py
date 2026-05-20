import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from services.database import get_db
from models import Device, PlantLibrary, SensorReading
from services.plant_thresholds import get_thresholds_for_plant
from services.plant_knowledge import find_plant, evaluate_problems
from services.weather_service import get_weather, weather_warning
from schemas import (
    DeviceCreate, DeviceResponse,
    PlantLibraryCreate, PlantLibraryResponse,
    PlantThresholdsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Devices & Plant Library"])


@router.post("/devices", response_model=DeviceResponse, status_code=201)
async def register_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.device_mac == payload.device_mac).first()
    if existing:
        existing.plant_name = payload.plant_name
        existing.plant_type_id = payload.plant_type_id
        existing.last_sync = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    device = Device(
        device_mac=payload.device_mac,
        plant_name=payload.plant_name,
        plant_type_id=payload.plant_type_id,
        last_sync=datetime.utcnow(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/devices", response_model=List[DeviceResponse])
async def list_devices(db: Session = Depends(get_db)):
    registered = db.query(Device).all()
    registered_macs = {d.device_mac for d in registered}

    # sensor_readings'te olup devices'ta olmayan MAC'leri de ekle
    seen_macs = (
        db.query(SensorReading.device_mac)
        .filter(SensorReading.device_mac.isnot(None))
        .distinct()
        .all()
    )
    extra = []
    for (mac,) in seen_macs:
        if mac not in registered_macs:
            latest = (
                db.query(SensorReading)
                .filter(SensorReading.device_mac == mac)
                .order_by(SensorReading.log_id.desc())
                .first()
            )
            extra.append(Device(
                device_mac=mac,
                plant_name=None,
                plant_type_id=None,
                last_sync=latest.timestamp if latest else None,
            ))

    return registered + extra


@router.get("/devices/{device_mac}", response_model=DeviceResponse)
async def get_device(device_mac: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    if not device:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı.")
    return device


@router.post("/plants", response_model=PlantLibraryResponse, status_code=201)
async def create_plant(payload: PlantLibraryCreate, db: Session = Depends(get_db)):
    existing = db.query(PlantLibrary).filter(PlantLibrary.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu bitki zaten kayıtlı.")
    plant = PlantLibrary(**payload.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.get("/plants", response_model=List[PlantLibraryResponse])
async def list_plants(db: Session = Depends(get_db)):
    return db.query(PlantLibrary).all()


@router.get("/plants/suggest-thresholds", response_model=PlantThresholdsResponse)
async def suggest_thresholds(
    name: str = Query(..., description="Bitki adı (örn: 'Monstera', 'Aloe Vera')"),
    save: bool = Query(False, description="Eşikleri veritabanındaki bitkiye kaydet"),
    plant_id: int = Query(None, description="Kaydetmek için bitki ID'si"),
    db: Session = Depends(get_db),
):
    """
    Botanik veritabanından bitkiye özgü ideal sensör eşiklerini döndürür.
    save=true ve plant_id verilirse PlantLibrary kaydını günceller.
    """
    t = get_thresholds_for_plant(name)

    if save and plant_id:
        plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
        if plant:
            plant.min_moisture   = t["min_moisture"]
            plant.max_moisture   = t["max_moisture"]
            plant.ideal_temp_min = t["ideal_temp_min"]
            plant.ideal_temp_max = t["ideal_temp_max"]
            plant.min_humidity   = t["min_humidity"]
            plant.max_humidity   = t["max_humidity"]
            plant.min_light_lux  = t["min_light_lux"]
            plant.max_light_lux  = t["max_light_lux"]
            db.commit()

    return PlantThresholdsResponse(plant_name=name, source="botanical_db", **t)


@router.get("/thresholds", response_model=PlantThresholdsResponse)
async def get_device_thresholds(
    device_mac: str = Query(..., description="ESP32 cihazının MAC adresi"),
    db: Session = Depends(get_db),
):
    """Dashboard'un bitkiye özgü eşikleri çekmesi için kullanılır."""
    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    plant_name = ""
    if device:
        if device.plant_type_id:
            plant = db.query(PlantLibrary).filter(PlantLibrary.id == device.plant_type_id).first()
            if plant:
                plant_name = plant.name
        if not plant_name and device.plant_name:
            plant_name = device.plant_name

    t = get_thresholds_for_plant(plant_name)
    return PlantThresholdsResponse(plant_name=plant_name or "Genel", source="botanical_db", **t)


@router.put("/plants/{plant_id}", response_model=PlantLibraryResponse)
async def update_plant(plant_id: int, payload: PlantLibraryCreate, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")
    for field, val in payload.model_dump().items():
        setattr(plant, field, val)
    db.commit()
    db.refresh(plant)
    return plant


@router.get("/plants/{plant_id}", response_model=PlantLibraryResponse)
async def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")
    return plant


@router.delete("/plants/{plant_id}", status_code=204)
async def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")
    # Bu bitkiye bağlı cihazların plant_type_id'sini temizle
    db.query(Device).filter(Device.plant_type_id == plant_id).update({"plant_type_id": None})
    db.delete(plant)
    db.commit()


@router.get("/weather")
async def get_weather_data():
    """Anlık hava durumu (Konya, 30dk cache)."""
    data = get_weather()
    if data is None:
        raise HTTPException(status_code=503, detail="Hava durumu verisi alınamadı.")
    return data


@router.delete("/devices/{device_mac}", status_code=204)
async def delete_device(device_mac: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_mac == device_mac).first()
    if not device:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadı.")
    db.delete(device)
    db.commit()


# ── Environment Analysis ──────────────────────────────────────────────────────

def _get_season() -> str:
    m = datetime.now().month
    if m in (12, 1, 2): return "winter"
    if m in (3, 4, 5):  return "spring"
    if m in (6, 7, 8):  return "summer"
    return "autumn"

_SEASONAL = {
    "winter": "Kış aylarında bitkiyi soğuk cam kenarından uzak tutun ve sulama sıklığını azaltın.",
    "spring": "İlkbahar büyüme dönemi — sulama sıklığını artırabilirsiniz. Yaprakları zararlılara karşı kontrol edin.",
    "summer": "Yaz sıcağında öğlen güneşinden koruyun. Sıcak günlerde hafif sisleme faydalı olur.",
    "autumn": "Sonbaharda sulama sıklığını yavaşça azaltın ve bitkiyi kışa hazırlayın.",
}
_TROPICAL_KW = {"monstera", "pothos", "calathea", "peace", "anthurium", "ficus", "rubber", "dieffenbachia"}

def _seasonal_warning(plant_data: Optional[dict], season: str) -> str:
    kw = {k.lower() for k in plant_data.get("keywords", [])} if plant_data else set()
    if season == "winter" and kw & _TROPICAL_KW:
        return "Tropikal bitki — kış boyunca minimum 18°C altına düşmemesine dikkat edin. Cam kenarından uzak tutun."
    return _SEASONAL[season]

def _library_problems(plant: PlantLibrary, sensor: dict) -> list:
    pairs = [
        ("moisture",    "moisture_pct",   plant.min_moisture,    plant.max_moisture,    "Toprak Nemi"),
        ("temperature", "temperature_c",  plant.ideal_temp_min,  plant.ideal_temp_max,  "Sıcaklık"),
        ("humidity",    "humidity_pct",   plant.min_humidity,    plant.max_humidity,    "Hava Nemi"),
        ("light",       "light_lux",      plant.min_light_lux,   plant.max_light_lux,   "Işık"),
    ]
    problems = []
    for metric, field, lo, hi, label in pairs:
        val = sensor.get(field)
        if val is None: continue
        if lo is not None and val < lo:
            problems.append({"name": f"Düşük {label}", "severity": "warning",
                             "recommendation": f"{label} değerini {lo} üzerine çıkarın."})
        elif hi is not None and val > hi:
            problems.append({"name": f"Yüksek {label}", "severity": "warning",
                             "recommendation": f"{label} değerini {hi} altında tutun."})
    return problems

def _score(problems: list) -> int:
    deduct = {"critical": 30, "warning": 15, "info": 5}
    return max(0, 100 - sum(deduct.get(p["severity"], 10) for p in problems))


@router.get("/plants/{plant_id}/environment-analysis")
async def plant_environment_analysis(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")

    latest = db.query(SensorReading).order_by(SensorReading.log_id.desc()).first()
    season = _get_season()

    weather = get_weather()

    if not latest:
        match = find_plant(plant.name)
        return {
            "status": "unknown",
            "summary": "Henüz sensör verisi yok. ESP32'nin veri gönderdiğinden emin olun.",
            "seasonal_warning": weather_warning(weather, match[1] if match else None),
            "score": None,
            "sensor_values": None,
            "weather": weather,
        }

    sensor = {
        "humidity_pct":  latest.humidity_pct,
        "temperature_c": latest.temperature_c,
        "moisture_pct":  latest.moisture_pct,
        "light_lux":     latest.light_lux,
    }
    sensor_values = {
        "humidity":      latest.humidity_pct,
        "temperature":   latest.temperature_c,
        "soil_moisture": latest.moisture_pct,
        "light":         latest.light_lux,
    }

    match = find_plant(plant.name)
    plant_data = match[1] if match else None
    problems = evaluate_problems(plant_data, sensor) if plant_data else _library_problems(plant, sensor)

    score = _score(problems)
    if score >= 80:   status = "healthy"
    elif score >= 50: status = "warning"
    else:             status = "critical"

    if not problems:
        summary = f"Tüm değerler {plant.name} için ideal aralıkta."
    else:
        w = problems[0]
        rec = w["recommendation"]
        summary = f"{w['name']} tespit edildi. {rec[:90]}{'...' if len(rec) > 90 else ''}"

    return {
        "status":           status,
        "summary":          summary,
        "seasonal_warning": weather_warning(weather, plant_data),
        "score":            score,
        "sensor_values":    sensor_values,
        "weather":          weather,
    }
