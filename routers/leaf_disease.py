import os
import re
import shutil
import logging
from datetime import datetime
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
from config import Config
from services import ml_service
from services import plantnet_service
from services.database import get_db
from services.plant_knowledge import find_plant, evaluate_problems, get_optimal_status, PLANTS
from models import LeafAnalysis, SensorReading
from schemas import DiagnosisResponse, PlantCandidate, HealthProblem
from dependencies import get_current_user

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


def _get_latest_sensor(db: Session, device_mac: Optional[str]) -> Optional[dict]:
    if not device_mac:
        return None
    query = db.query(SensorReading).order_by(SensorReading.log_id.desc())
    query = query.filter(SensorReading.device_mac == device_mac)
    row = query.first()
    if not row:
        return None
    return {
        "moisture_pct":  row.moisture_pct,
        "temperature_c": row.temperature_c,
        "humidity_pct":  row.humidity_pct,
        "light_lux":     row.light_lux,
        "timestamp":     row.timestamp.isoformat() + "Z" if row.timestamp else None,
        "device_mac":    row.device_mac,
    }


def _overall_health(stage: str, is_healthy, problems: list) -> str:
    if stage == "fallback":
        return "unknown"
    if is_healthy is True and not problems:
        return "healthy"
    severities = {p["severity"] for p in problems}
    if "critical" in severities:
        return "critical"
    if stage == "possible":
        return "attention"
    if is_healthy is False:
        return "attention"
    return "healthy"


@router.get("/leaf_disease", response_class=HTMLResponse)
async def leaf_index(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse(request, "leaf_disease_index.html", {"current_user": user})


@router.post("/leaf_disease/predict", response_model=DiagnosisResponse)
async def leaf_predict(
    file: UploadFile = File(...),
    device_mac: Optional[str] = Form(None),
    plant_id: Optional[int] = Form(None),
    plant_name_form: Optional[str] = Form(None, alias="plant_name"),
    db: Session = Depends(get_db),
):
    # --- Dosya doğrulama ---
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya seçilmedi.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="PNG, JPG veya JPEG yükleyin.")

    filename = _secure_filename(file.filename)
    filepath = os.path.join(cfg.UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    image_path = f"/static/uploads/{filename}"

    # --- Adım 1: PlantNet ile bitki tanıma ---
    try:
        plantnet_result = plantnet_service.identify_plant(filepath)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("PlantNet hatası")
        raise HTTPException(status_code=500, detail=str(e))

    plant_display = plantnet_result.get("common_names", [None])[0] or plantnet_result.get("scientific_name") or "Bilinmeyen Bitki"
    sci_name      = plantnet_result.get("scientific_name")
    pn_confidence = plantnet_result.get("confidence", 0.0)
    pn_conf_level = plantnet_result.get("confidence_level", "unknown")
    pn_candidates = plantnet_result.get("all_results", [])

    # --- Adım 2: İki aşamalı hastalık pipeline ---
    pipeline_result = ml_service.run_disease_pipeline(filepath, plantnet_result)

    stage         = pipeline_result["stage"]           # disease / possible / fallback
    disease_name  = pipeline_result.get("disease")
    diag_conf     = pipeline_result.get("confidence", 0.0)
    diag_level    = pipeline_result.get("confidence_level", "low")
    is_healthy    = pipeline_result.get("is_healthy")
    diag_message  = pipeline_result.get("message", "")
    disease_list  = pipeline_result.get("disease_results", [])

    candidates = [
        PlantCandidate(label=r["label"], confidence=r["score"], score=r["score"])
        for r in disease_list[:5]
    ]

    # --- Adım 3: Bilgi tabanında bitki ara (sensör karşılaştırması için) ---
    match      = find_plant(plant_display) or find_plant(sci_name or "")
    plant_key  = match[0] if match else None
    plant_data = match[1] if match else None

    # --- Adım 4: Sensör verisi ---
    sensor_data = _get_latest_sensor(db, device_mac)
    sensor_reading_time = sensor_data.pop("timestamp", None) if sensor_data else None
    _sensor_mac = sensor_data.pop("device_mac", None) if sensor_data else None
    sensor_used = sensor_data is not None and any(v is not None for v in sensor_data.values())

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

    # Görsel hastalık varsa problem listesine ekle
    if disease_name and stage in ("disease", "possible"):
        prefix = "Tespit Edilen" if stage == "disease" else "Olası"
        severity = "warning" if stage == "disease" else "info"
        problems.insert(0, HealthProblem(
            name=f"{prefix} Hastalık: {disease_name}",
            symptoms=["Yaprak görüntüsünde hastalık belirtisi tespit edildi"],
            recommendation="Etkilenen yaprakları uzaklaştırın, uygun fungisit uygulayın ve bitkiyi izole edin." if stage == "disease"
                           else "Bitkiyi yakından izleyin. Belirtiler artarsa uzman görüşü alın.",
            severity=severity,
            sensor_value=0.0,
            threshold=0.0,
            metric="gorsel_analiz",
        ))

    overall = _overall_health(stage, is_healthy, raw_problems)

    # --- Veritabanına kaydet ---
    label_str = f"{plant_display} — {disease_name}" if disease_name else plant_display
    record = LeafAnalysis(
        image_path=image_path,
        label=label_str,
        confidence=pn_confidence,
        timestamp=datetime.utcnow(),
        plant_id=plant_id,
        plant_name=plant_name_form,
    )
    db.add(record)
    db.commit()

    return DiagnosisResponse(
        success=True,
        image_path=image_path,
        identified_plant=plant_key,
        plant_display_name=plant_display,
        plant_scientific_name=sci_name,
        plant_confidence=pn_confidence,
        plant_confidence_level=pn_conf_level,
        plant_in_knowledge_base=plant_data is not None,
        plantnet_candidates=pn_candidates,
        diagnosis_stage=stage,
        disease_name=disease_name,
        disease_confidence=diag_conf if stage != "fallback" else None,
        disease_confidence_level=diag_level if stage != "fallback" else None,
        all_candidates=candidates,
        sensor_used=sensor_used,
        device_mac=_sensor_mac or device_mac,
        sensor_reading_time=sensor_reading_time,
        sensor_status=sensor_status,
        problems=problems,
        overall_health=overall,
        diagnosis_message=diag_message,
        disclaimer=DISCLAIMER,
        care=_build_care(plant_data),
    )


# ── Mobil Uygulama Endpoint'i ─────────────────────────────────────────────────

def _build_care(plant_data: Optional[dict]) -> dict:
    """plant_knowledge verisinden mobil care objesi üret."""
    if not plant_data:
        return {
            "humidity_min": 40, "humidity_max": 70,
            "light_min": 1000, "light_max": 10000,
            "soil_moisture_min": 30, "soil_moisture_max": 60,
            "watering": "Toprağın üst katmanı kuruyunca sulayın.",
            "notes": "Genel bitki bakımı önerileri uygulanıyor.",
        }
    opt = plant_data.get("optimal", {})
    m_min, m_max = opt.get("moisture", (30, 60))
    t_min, t_max = opt.get("temperature", (15, 28))
    h_min, h_max = opt.get("humidity", (40, 70))
    l_min, l_max = opt.get("light", (1000, 10000))

    # Sulama ve notlar için problem listesinden ipucu çek
    watering_hint = "Toprağın üst katmanı kuruyunca sulayın."
    notes_hint    = f"İdeal sıcaklık {t_min}–{t_max}°C arasında tutun."
    for p in plant_data.get("problems", []):
        if p.get("metric") == "moisture" and p.get("op") == "gt":
            watering_hint = p.get("recommendation", watering_hint)
            break

    return {
        "humidity_min":       h_min,
        "humidity_max":       h_max,
        "light_min":          l_min,
        "light_max":          l_max,
        "soil_moisture_min":  m_min,
        "soil_moisture_max":  m_max,
        "watering":           watering_hint,
        "notes":              notes_hint,
    }


@router.post("/predict-disease")
async def predict_disease_mobile(
    file: UploadFile = File(...),
    plant_id: Optional[int] = Form(None),
    plant_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Mobil uygulama için basitleştirilmiş hastalık tespiti endpoint'i.
    Multipart/form-data ile görsel alır; JSON döner.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya seçilmedi.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Desteklenen formatlar: jpg, jpeg, png.")

    # Dosya boyutu kontrolü (10 MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Dosya 10 MB sınırını aşıyor.")

    filename = _secure_filename(file.filename)
    filepath = os.path.join(cfg.UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # --- PlantNet ile bitki tanıma ---
    try:
        plantnet_result = plantnet_service.identify_plant(filepath)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        logger.exception("PlantNet hatası (mobile)")
        raise HTTPException(status_code=500, detail="Bitki tanıma servisi hatası.")

    # --- Hastalık pipeline ---
    pipeline = ml_service.run_disease_pipeline(filepath, plantnet_result)

    stage        = pipeline["stage"]
    disease_name = pipeline.get("disease")
    diag_conf    = pipeline.get("confidence", 0.0)
    is_healthy   = pipeline.get("is_healthy")

    # Web ile aynı mantık: PlantNet güveni ana metrik, sadece stage==fallback'te fallback
    pn_confidence = plantnet_result.get("confidence", 0.0)
    fallback      = stage == "fallback"

    # --- Bitki bilgi tabanı ---
    plant_display = plantnet_result.get("common_names", [None])[0] \
                    or plantnet_result.get("scientific_name") \
                    or "Bilinmeyen Bitki"
    sci_name      = plantnet_result.get("scientific_name", "")
    match         = find_plant(plant_display) or find_plant(sci_name)
    plant_data    = match[1] if match else None
    care          = _build_care(plant_data)

    # --- Mesaj ---
    if fallback:
        message = "Model hastalık tahmininden emin değil. Bakım analizine geçildi."
        disease_out = None
    elif is_healthy:
        message = "Yaprak sağlıklı görünüyor."
        disease_out = None
    else:
        message = "Hastalık analizi tamamlandı."
        disease_out = disease_name

    # --- DB kayıt (web ile aynı: pn_confidence kaydedilir) ---
    label_str = f"{plant_display} — {disease_name}" if disease_name else plant_display
    db.add(LeafAnalysis(
        image_path=f"/static/uploads/{filename}",
        label=label_str,
        confidence=pn_confidence,
        timestamp=datetime.utcnow(),
        plant_id=plant_id,
        plant_name=plant_name,
    ))
    db.commit()

    return {
        "success":         True,
        "plant":           plant_display,
        "disease":         disease_out,
        "confidence":      round(pn_confidence, 4),
        "disease_confidence": round(diag_conf, 4) if not fallback else None,
        "fallback":        fallback,
        "message":         message,
        "care":            care,
    }
