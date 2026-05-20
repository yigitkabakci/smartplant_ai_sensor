import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from services.database import get_db
from services.plant_knowledge import find_plant, evaluate_problems
from models import SensorReading, Alert
from schemas import (
    SensorReadingCreate,
    SensorReadingResponse,
    AlertResponse,
    AlertDbResponse,
    LeafAnalysisHistoryItem,
    WateringPredictionRequest,
    WateringPredictionResponse,
)
from services.prediction_service import (
    predict_next_watering,
    InsufficientDataError,
    NoDeclineError,
)
from services.alert_service import evaluate_and_persist

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Sensor & History"])


@router.post("/sensor", response_model=SensorReadingResponse, status_code=201)
async def create_sensor_reading(
    reading: SensorReadingCreate,
    db: Session = Depends(get_db),
):
    row = SensorReading(
        device_mac=reading.device_mac,
        moisture_pct=reading.moisture_pct,
        temperature_c=reading.temperature_c,
        humidity_pct=reading.humidity_pct,
        light_lux=reading.light_lux,
        timestamp=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    # REQ-F-030 / REQ-F-031: Yeni veri geldiğinde alert sistemi otomatik tetiklenir.
    evaluate_and_persist(db, row)

    return row


@router.get("/sensor", response_model=List[SensorReadingResponse])
async def get_sensor_readings(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SensorReading)
        .order_by(SensorReading.log_id.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.get("/latest-data", response_model=Optional[SensorReadingResponse])
async def get_latest_data(
    device_mac: Optional[str] = Query(None, description="Belirli bir cihazın verisi için MAC adresi"),
    db: Session = Depends(get_db),
):
    """En son sensör okumasını döner. Cihaz yoksa null döner."""
    query = db.query(SensorReading).order_by(SensorReading.log_id.desc())
    if device_mac:
        query = query.filter(SensorReading.device_mac == device_mac)
    row = query.first()
    return row


@router.get("/history", response_model=List[SensorReadingResponse])
async def get_history(
    days: int = Query(7, ge=1, le=30, description="Kaç günlük veri (1–30)"),
    device_mac: Optional[str] = Query(None, description="Belirli bir cihazın verisi için MAC adresi"),
    db: Session = Depends(get_db),
):
    """Son N günlük sensör verilerini zaman serisi olarak döner (dashboard grafiği için)."""
    since = datetime.utcnow() - timedelta(days=days)
    query = (
        db.query(SensorReading)
        .filter(SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp.asc())
    )
    if device_mac:
        query = query.filter(SensorReading.device_mac == device_mac)
    return query.all()


@router.get("/leaf-history", response_model=List[LeafAnalysisHistoryItem])
async def leaf_history(
    limit: int = Query(20, ge=1, le=100),
    plant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    from models import LeafAnalysis
    q = db.query(LeafAnalysis)
    if plant_id is not None:
        q = q.filter(LeafAnalysis.plant_id == plant_id)
    return q.order_by(LeafAnalysis.id.desc()).limit(limit).all()


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(db: Session = Depends(get_db)):
    row = (
        db.query(SensorReading)
        .order_by(SensorReading.log_id.desc())
        .first()
    )
    alerts: List[AlertResponse] = []

    if not row:
        return alerts

    ts = row.timestamp.strftime("%Y-%m-%d %H:%M:%S") if row.timestamp else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    temp = row.temperature_c or 0
    humidity = row.humidity_pct or 0
    moisture = row.moisture_pct or 0

    if temp > 35:
        alerts.append(AlertResponse(level="warning", message=f"Yüksek sıcaklık: {temp}°C", timestamp=ts))
    if temp < 5:
        alerts.append(AlertResponse(level="critical", message=f"Çok düşük sıcaklık: {temp}°C", timestamp=ts))
    if humidity < 30:
        alerts.append(AlertResponse(level="warning", message=f"Düşük nem: {humidity}%", timestamp=ts))
    if moisture < 20:
        alerts.append(AlertResponse(level="info", message=f"Toprak nemi düşük: {moisture}%", timestamp=ts))

    return alerts


@router.get("/alerts/history", response_model=List[AlertDbResponse])
async def get_alert_history(
    limit: int = Query(50, ge=1, le=500),
    severity: Optional[str] = Query(None, description="'Critical' | 'Warning' | 'Info'"),
    device_mac: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Veritabanına kaydedilmiş uyarıların tarihçesini döner (REQ-F-032).
    İsteğe bağlı olarak severity ve device_mac ile filtrelenebilir.
    """
    query = db.query(Alert).order_by(Alert.timestamp.desc())
    if severity:
        query = query.filter(Alert.severity == severity)
    if device_mac:
        query = query.filter(Alert.device_mac == device_mac)
    return query.limit(limit).all()


@router.post("/predict-watering", response_model=WateringPredictionResponse)
async def predict_watering(
    payload: WateringPredictionRequest,
    db: Session = Depends(get_db),
):
    """
    Son 24 saatlik toprak nemi verisine lineer regresyon (Least Squares)
    uygulayarak bir sonraki sulama zamanını tahmin eder.

    - Eğim < 0 → Kritik eşiğe ulaşım saati hesaplanır.
    - Eğim ≥ 0 → "Sulama gerekmiyor" yanıtı döner (HTTP 200).
    - Yetersiz veri → HTTP 422.
    - Eşik zaten aşılmış → HTTP 409.
    """
    try:
        result = predict_next_watering(db=db, device_mac=payload.device_mac)
    except InsufficientDataError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "insufficient_data",
                "message": str(exc),
                "device_mac": payload.device_mac,
            },
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "threshold_already_breached",
                "message": str(exc),
                "device_mac": payload.device_mac,
            },
        )

    return WateringPredictionResponse(**result)


# ── Sensör Analizi ────────────────────────────────────────────────────────────

class SensorDataIn(BaseModel):
    humidity:     Optional[float] = None
    temperature:  Optional[float] = None
    light:        Optional[float] = None
    soil_moisture: Optional[float] = None

class SensorAnalysisRequest(BaseModel):
    plant: str
    sensor_data: SensorDataIn


_METRIC_META = {
    "humidity":     ("humidity_pct",   "Hava Nemi",    "%",    "humidity"),
    "temperature":  ("temperature_c",  "Sıcaklık",     "°C",   "temperature"),
    "light":        ("light_lux",      "Işık",         " lux", "light"),
    "soil_moisture":("moisture_pct",   "Toprak Nemi",  "%",    "moisture"),
}
_FIELD_LABELS = {
    "humidity": "hava nemi", "temperature": "sıcaklık",
    "light": "ışık", "soil_moisture": "toprak nemi",
}


@router.post("/analyze-sensor-data")
async def analyze_sensor_data(payload: SensorAnalysisRequest):
    sd = payload.sensor_data
    raw = {
        "humidity":     sd.humidity,
        "temperature":  sd.temperature,
        "light":        sd.light,
        "soil_moisture": sd.soil_moisture,
    }

    internal = {
        "humidity_pct":   sd.humidity,
        "temperature_c":  sd.temperature,
        "light_lux":      sd.light,
        "moisture_pct":   sd.soil_moisture,
    }

    match = find_plant(payload.plant)
    plant_data   = match[1] if match else None
    display_name = plant_data["display_name"] if plant_data else payload.plant

    comments = {}
    status   = "ok"

    if plant_data:
        optimal = plant_data.get("optimal", {})
        for field, (_, label, unit, opt_key) in _METRIC_META.items():
            val = raw.get(field)
            if val is None:
                comments[field] = f"{label} verisi alınamadı."
                continue
            rng = optimal.get(opt_key)
            if not rng:
                comments[field] = f"{label} uygun görünüyor."
                continue
            lo, hi = rng
            if val < lo:
                comments[field] = f"{label} düşük ({val}{unit}). İdeal aralık {lo}–{hi}{unit}."
                if status == "ok":
                    status = "warning"
            elif val > hi:
                comments[field] = f"{label} yüksek ({val}{unit}). İdeal aralık {lo}–{hi}{unit}."
                if status == "ok":
                    status = "warning"
            else:
                comments[field] = f"{label} uygun ({val}{unit})."
    else:
        for field, (_, label, unit, _ok) in _METRIC_META.items():
            val = raw.get(field)
            comments[field] = f"{label}: {val}{unit}." if val is not None else f"{label} verisi alınamadı."

    problems        = evaluate_problems(plant_data, internal) if plant_data else []
    recommendations = [p["recommendation"] for p in problems]

    severities = {p["severity"] for p in problems}
    if "critical" in severities:
        status = "critical"
    elif "warning" in severities and status == "ok":
        status = "warning"

    bad_fields = [f for f, c in comments.items() if "düşük" in c or "yüksek" in c]
    if not bad_fields:
        summary = f"{display_name} için tüm değerler ideal aralıkta. Bitki sağlıklı görünüyor."
    elif len(bad_fields) == 1:
        summary = f"{display_name} için {_FIELD_LABELS.get(bad_fields[0], bad_fields[0])} sorunlu, diğer değerler uygun."
    else:
        labels  = [_FIELD_LABELS.get(f, f) for f in bad_fields]
        summary = f"{display_name} için {', '.join(labels)} değerleri ideal aralık dışında."

    return {
        "success":         True,
        "plant":           display_name,
        "status":          status,
        "summary":         summary,
        "comments":        comments,
        "recommendations": recommendations,
    }
