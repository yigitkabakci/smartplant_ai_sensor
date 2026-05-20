import json
import os
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from services.database import get_db
from models import PlantLibrary, Device, SensorReading
from services.weather_service import get_weather, weather_warning

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Plant Detail"])

_care_data: dict | None = None

def _load_care():
    global _care_data
    if _care_data is not None:
        return _care_data
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "plant_care_data.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            _care_data = json.load(f)
    except Exception as e:
        logger.warning("plant_care_data.json yüklenemedi: %s", e)
        _care_data = {}
    return _care_data


def _find_care(plant_name: str) -> tuple[str, dict] | None:
    data = _load_care()
    name_lower = plant_name.lower().strip()

    # Exact key match
    for key, val in data.items():
        if key.lower() == name_lower:
            return key, val

    # Alias exact match
    for key, val in data.items():
        for alias in val.get("aliases", []):
            if alias.lower() == name_lower:
                return key, val

    # Partial key/alias match
    for key, val in data.items():
        if name_lower in key.lower() or key.lower() in name_lower:
            return key, val
        for alias in val.get("aliases", []):
            if name_lower in alias.lower() or alias.lower() in name_lower:
                return key, val

    return None


def _get_season() -> str:
    m = datetime.now().month
    if m in (12, 1, 2): return "winter"
    if m in (3, 4, 5):  return "spring"
    if m in (6, 7, 8):  return "summer"
    return "autumn"


def _score_and_comments(care: dict, sensor: dict) -> tuple[int, str, list]:
    c = care.get("care", {})
    metrics = [
        ("temperature_c",  c.get("temperature_min"), c.get("temperature_max"), "Sıcaklık", "°C"),
        ("humidity_pct",   c.get("humidity_min"),    c.get("humidity_max"),    "Hava Nemi", "%"),
        ("moisture_pct",   c.get("soil_moisture_min"), c.get("soil_moisture_max"), "Toprak Nemi", "%"),
    ]
    deduct = 0
    comments = []
    for field, lo, hi, label, unit in metrics:
        val = sensor.get(field)
        if val is None:
            continue
        if lo is not None and val < lo:
            diff = round(lo - val, 1)
            comments.append({"metric": label, "status": "low",
                              "message": f"{label} düşük ({val:.1f}{unit}). İdeal min: {lo}{unit}. {diff}{unit} artırın."})
            deduct += 20
        elif hi is not None and val > hi:
            diff = round(val - hi, 1)
            comments.append({"metric": label, "status": "high",
                              "message": f"{label} yüksek ({val:.1f}{unit}). İdeal max: {hi}{unit}. {diff}{unit} azaltın."})
            deduct += 20
        else:
            comments.append({"metric": label, "status": "ok",
                              "message": f"{label} ideal aralıkta ({val:.1f}{unit})."})

    score = max(0, 100 - deduct)
    if score >= 80:   status = "healthy"
    elif score >= 50: status = "warning"
    else:             status = "critical"

    return score, status, comments


@router.get("/plants/{plant_id}/detail")
async def get_plant_detail(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(PlantLibrary).filter(PlantLibrary.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Bitki bulunamadı.")

    care_match = _find_care(plant.name)
    if not care_match:
        return {
            "success": False,
            "message": f"'{plant.name}' için özel bakım bilgisi bulunamadı.",
            "plant": {"id": plant.id, "name": plant.name},
            "care": None, "sensor": None, "weather": None,
            "analysis": None, "special_notes": [], "seasonal_tip": None,
        }

    care_key, care_data = care_match

    # Get latest sensor reading from devices linked to this plant
    linked_devices = db.query(Device).filter(Device.plant_type_id == plant_id).all()
    latest = None
    if linked_devices:
        macs = [d.device_mac for d in linked_devices]
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.device_mac.in_(macs))
            .order_by(SensorReading.log_id.desc())
            .first()
        )
    # Fallback: any latest reading
    if not latest:
        latest = db.query(SensorReading).order_by(SensorReading.log_id.desc()).first()

    sensor = None
    analysis = None
    if latest:
        sensor = {
            "temperature_c": latest.temperature_c,
            "humidity_pct":  latest.humidity_pct,
            "moisture_pct":  latest.moisture_pct,
            "light_lux":     latest.light_lux,
            "timestamp":     latest.timestamp.isoformat() if latest.timestamp else None,
            "device_mac":    latest.device_mac,
        }
        score, status, comments = _score_and_comments(care_data, sensor)
        analysis = {"score": score, "status": status, "comments": comments}

    weather = get_weather()
    seasonal_tip_key = _get_season()
    seasonal_tips = care_data.get("seasonal_tips", {})
    seasonal_tip = seasonal_tips.get(seasonal_tip_key) or weather_warning(weather, None)

    return {
        "success": True,
        "plant": {
            "id": plant.id,
            "name": plant.name,
            "display_name": care_data.get("display_name", plant.name),
            "image_url": care_data.get("image_url"),
        },
        "care": care_data.get("care", {}),
        "sensor": sensor,
        "weather": weather,
        "analysis": analysis,
        "special_notes": care_data.get("special_notes", []),
        "seasonal_tip": seasonal_tip,
    }
