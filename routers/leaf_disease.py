import os
import re
import shutil
import logging
from datetime import datetime
from fastapi import APIRouter, Request, UploadFile, File, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from config import Config
from services import ml_service
from services.database import get_db
from models import LeafAnalysis
from schemas import LeafAnalysisResponse, DiseaseResult

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Leaf Disease"])
templates = Jinja2Templates(directory="templates")

cfg = Config()
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


def _secure_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename or "upload"


@router.get("/leaf_disease", response_class=HTMLResponse)
async def leaf_index(request: Request):
    return templates.TemplateResponse(request, "leaf_disease_index.html")


@router.post("/leaf_disease/predict", response_model=LeafAnalysisResponse)
async def leaf_predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya seçilmedi.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz dosya türü. Lütfen PNG, JPG veya JPEG yükleyin.",
        )

    filename = _secure_filename(file.filename)
    filepath = os.path.join(cfg.UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        raw = ml_service.predict_leaf_disease(filepath)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Tahmin hatası")
        raise HTTPException(status_code=500, detail=str(e))

    predictions = [DiseaseResult(**p) for p in raw]
    top = predictions[0]

    record = LeafAnalysis(
        image_path=f"/static/uploads/{filename}",
        label=top.disease,
        confidence=top.score,
        timestamp=datetime.utcnow(),
    )
    db.add(record)
    db.commit()

    return LeafAnalysisResponse(
        success=True,
        predictions=predictions,
        top_prediction=top,
        image_path=f"/static/uploads/{filename}",
    )
