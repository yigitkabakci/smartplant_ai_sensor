import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from services.database import get_db
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
    db: Session = Depends(get_db),
):
    from models import LeafAnalysis
    rows = (
        db.query(LeafAnalysis)
        .order_by(LeafAnalysis.id.desc())
        .limit(limit)
        .all()
    )
    return rows


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
