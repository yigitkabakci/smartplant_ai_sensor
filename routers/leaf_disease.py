import os
import re
import shutil
import logging
from datetime import datetime
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
from config import Config
from services import ml_service
from services.database import get_db
from services.plant_knowledge import find_plant, evaluate_problems, get_optimal_status
from models import LeafAnalysis, SensorReading
from schemas import DiagnosisResponse, PlantCandidate, HealthProblem

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Leaf Disease"])
templates = Jinja2Templates(directory="templates")

cfg = Config()
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

DISCLAIMER = (
    "Bu sonuç yapay zeka tarafından üretilmiş genel bir değerlendirmedir. "
    "Profesyonel botanik veya zirai teşhisin yerini tutmaz."
)


def _secure_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename or "upload"


def _get_overall_health(problems: list) -> str:
    if not problems:
        return "healthy"
    severities = {p["severity"] for p in problems}
    if "critical" in severities:
        return "critical"
    if "warning" in severities:
        return "attention"
    return "attention"


def _get_latest_sensor(db: Session, device_mac: Optional[str]) -> Optional[dict]:
    query = db.query(SensorReading).order_by(SensorReading.log_id.desc())
    if device_mac:
        query = query.filter(SensorReading.device_mac == device_mac)
    row = query.first()
    if not row:
        return None
    return {
        "moisture_pct":    row.moisture_pct,
        "temperature_c":   row.temperature_c,
        "humidity_pct":    row.humidity_pct,
        "light_lux":       row.light_lux,
    }


@router.get("/leaf_disease", response_class=HTMLResponse)
async def leaf_index(request: Request):
    return templates.TemplateResponse(request, "leaf_disease_index.html")


@router.post("/leaf_disease/predict", response_model=DiagnosisResponse)
async def leaf_predict(
    file: UploadFile = File(...),
    device_mac: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # --- Dosya doğrulama ---
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya seçilmedi.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz dosya türü. PNG, JPG veya JPEG yükleyin.",
        )

    filename = _secure_filename(file.filename)
    filepath = os.path.join(cfg.UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    image_path = f"/static/uploads/{filename}"

    # --- Bitki tanıma ---
    try:
        raw_results = ml_service.identify_plant(filepath)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Bitki tanıma hatası")
        raise HTTPException(status_code=500, detail=str(e))

    top = raw_results[0]
    is_reliable = top.get("reliable", False)

    # Grafik için adaylar (ham label kullan)
    candidates = [
        PlantCandidate(label=r["label"], confidence=r["confidence"], score=r["score"])
        for r in raw_results[:5]
    ]

    # --- Güvenilir değilse teşhis atla ---
    if not is_reliable:
        display_name = f"Tanımlanamadı (en yakın: {top['plant']} - {top['disease']})"
        sensor_data = _get_latest_sensor(db, device_mac)
        sensor_used = sensor_data is not None and any(v is not None for v in sensor_data.values())

        record = LeafAnalysis(
            image_path=image_path,
            label=display_name,
            confidence=top["score"],
            timestamp=datetime.utcnow(),
        )
        db.add(record)
        db.commit()

        return DiagnosisResponse(
            success=True,
            image_path=image_path,
            identified_plant=None,
            plant_display_name=display_name,
            plant_confidence=top["confidence"],
            plant_in_knowledge_base=False,
            all_candidates=candidates,
            sensor_used=sensor_used,
            device_mac=device_mac,
            sensor_status={},
            problems=[],
            overall_health="unknown",
            disclaimer=DISCLAIMER,
        )

    # --- Güvenilir tahmin: bitki adını kullanarak bilgi tabanında ara ---
    plant_search_name = top["plant"]  # parse edilmiş bitki adı
    match = find_plant(plant_search_name)
    plant_key = match[0] if match else None
    plant_data = match[1] if match else None

    # --- Görüntüleme adı ---
    if plant_data:
        display_name = plant_data["display_name"]
    else:
        display_name = f"{top['plant']} - {top['disease']}"

    # --- Sensör verisi ---
    sensor_data = _get_latest_sensor(db, device_mac)
    sensor_used = sensor_data is not None and any(v is not None for v in sensor_data.values())

    # --- Teşhis: sensör bazlı sorunlar ---
    raw_problems = evaluate_problems(plant_data, sensor_data) if plant_data else []
    sensor_status = get_optimal_status(plant_data, sensor_data) if plant_data else {}

    problems = [
        HealthProblem(
            name=p["name"],
            symptoms=p["symptoms"],
            recommendation=p["recommendation"],
            severity=p["severity"],
            sensor_value=p["sensor_value"],
            threshold=p["threshold"],
            metric=p["metric"],
        )
        for p in raw_problems
    ]

    # --- Modelin tespit ettiği hastalığı da problem olarak ekle ---
    if not top.get("is_healthy", True):
        disease_problem = HealthProblem(
            name=f"Görsel Hastalık: {top['disease']}",
            symptoms=["Yaprak görüntüsünde hastalık belirtisi tespit edildi"],
            recommendation="Etkilenen yaprakları uzaklaştırın, uygun fungisit/pestisite uygulayın ve bitkiyi izole edin.",
            severity="warning",
            sensor_value=0.0,
            threshold=0.0,
            metric="görsel_analiz",
        )
        problems.insert(0, disease_problem)

    # Genel sağlık
    if top.get("is_healthy", True) and not raw_problems:
        overall = "healthy"
    elif problems:
        overall = _get_overall_health([{"severity": p.severity} for p in problems])
    else:
        overall = "attention"

    # --- Veritabanına kaydet ---
    record = LeafAnalysis(
        image_path=image_path,
        label=display_name,
        confidence=top["score"],
        timestamp=datetime.utcnow(),
    )
    db.add(record)
    db.commit()

    return DiagnosisResponse(
        success=True,
        image_path=image_path,
        identified_plant=plant_key,
        plant_display_name=display_name,
        plant_confidence=top["confidence"],
        plant_in_knowledge_base=plant_data is not None,
        all_candidates=candidates,
        sensor_used=sensor_used,
        device_mac=device_mac,
        sensor_status=sensor_status,
        problems=problems,
        overall_health=overall,
        disclaimer=DISCLAIMER,
    )
