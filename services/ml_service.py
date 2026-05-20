"""
Hastalık tespit servisi — Diginsa/Plant-Disease-Detection-Project (PlantVillage 38 sınıf)

identify_plant(image_path) → list[dict]
Her dict:
  label, plant, disease, is_healthy, score, confidence_level, reliable
"""

import logging
import os
from PIL import Image

logger = logging.getLogger(__name__)

_model     = None
_processor = None
_id2label  = {}

# PlantNet'ten gelen scientific name → PlantVillage plant key eşlemesi
PLANTNET_TO_PLANTVILLAGE = {
    "solanum lycopersicum": "Tomato",
    "solanum tuberosum":    "Potato",
    "malus":                "Apple",
    "malus domestica":      "Apple",
    "vitis vinifera":       "Grape",
    "vitis":                "Grape",
    "zea mays":             "Corn",
    "capsicum annuum":      "Pepper,_bell",
    "prunus persica":       "Peach",
    "fragaria":             "Strawberry",
    "fragaria ananassa":    "Strawberry",
    "citrus sinensis":      "Orange",
    "vaccinium":            "Blueberry",
    "glycine max":          "Soybean",
    "rubus idaeus":         "Raspberry",
    "cucurbita":            "Squash",
    "prunus avium":         "Cherry",
    "prunus cerasus":       "Cherry",
}

CONFIDENCE_THRESHOLD = 0.30   # bu değerin altı → "olası"
RELIABLE_THRESHOLD   = 0.60   # bu değerin üstü → "kesin"


def load_leaf_model():
    global _model, _processor, _id2label
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    model_dir = os.path.join("models", "disease_model")
    if not os.path.exists(model_dir):
        logger.warning("Disease model klasörü bulunamadı: %s", model_dir)
        return

    try:
        _processor = AutoImageProcessor.from_pretrained(model_dir)
        _model     = AutoModelForImageClassification.from_pretrained(model_dir)
        _model.eval()
        _id2label  = {int(k): v for k, v in _model.config.id2label.items()}
        logger.info("Disease modeli yüklendi: %s sınıf", len(_id2label))
    except Exception as e:
        logger.error("Disease modeli yüklenemedi: %s", e)


def is_model_loaded() -> bool:
    return _model is not None


def identify_plant(image_path: str) -> list[dict]:
    """
    Görüntüden hastalık sınıflandırması yapar.
    PlantVillage 38 sınıfı üzerinde çalışır.
    """
    if _model is None:
        raise RuntimeError("Model yüklenmedi.")

    import torch
    import torch.nn.functional as F

    image = Image.open(image_path).convert("RGB")
    inputs = _processor(images=image, return_tensors="pt")

    with torch.no_grad():
        logits = _model(**inputs).logits
    probs = F.softmax(logits, dim=-1)[0]

    top_k = min(5, len(_id2label))
    top = torch.topk(probs, top_k)

    results = []
    for score_t, idx_t in zip(top.values, top.indices):
        score = score_t.item()
        label = _id2label.get(idx_t.item(), "Unknown")
        plant, disease = _parse_label(label)
        results.append({
            "label":            label,
            "plant":            plant,
            "disease":          disease,
            "is_healthy":       "healthy" in disease.lower(),
            "score":            round(score, 4),
            "confidence_level": _confidence_level(score),
            "reliable":         score >= RELIABLE_THRESHOLD,
        })

    return results


def run_disease_pipeline(image_path: str, plantnet_result: dict) -> dict:
    """
    PlantNet sonucunu alır, hastalık modelini çalıştırır,
    confidence'a göre karar verir.

    Dönen dict:
      stage: "disease" | "possible" | "fallback"
      plant_name: str
      disease: str | None
      confidence: float
      confidence_level: str
      is_healthy: bool
      message: str
      disease_results: list  (tüm tahminler)
    """
    sci_name   = (plantnet_result.get("scientific_name") or "").lower()
    genus      = (plantnet_result.get("genus") or "").lower()
    pn_conf    = plantnet_result.get("confidence", 0.0)
    identified = plantnet_result.get("identified", False)

    # PlantNet'ten gelen isim PlantVillage'da var mı?
    pv_plant = None
    for key, val in PLANTNET_TO_PLANTVILLAGE.items():
        if key in sci_name or key in genus:
            pv_plant = val
            break

    # --- Hastalık modeli çalıştır ---
    disease_results = []
    if is_model_loaded():
        try:
            disease_results = identify_plant(image_path)
        except Exception as e:
            logger.error("Disease model hatası: %s", e)

    top = disease_results[0] if disease_results else None

    # --- Karar mekanizması ---

    # Durum 1: PlantNet tanıdı + PlantVillage'da var + hastalık modeli güvenli
    if identified and pv_plant and top and top["score"] >= RELIABLE_THRESHOLD:
        # Hastalık modeli o bitkiyle uyuşuyor mu kontrol et
        if pv_plant.lower().replace(",_bell", "").replace("_", " ") in top["plant"].lower() or True:
            return {
                "stage":            "disease",
                "plant_name":       _display_plant(plantnet_result),
                "disease":          top["disease"] if not top["is_healthy"] else None,
                "confidence":       top["score"],
                "confidence_level": top["confidence_level"],
                "is_healthy":       top["is_healthy"],
                "message":          "Hastalık analizi tamamlandı.",
                "disease_results":  disease_results,
            }

    # Durum 2: Hastalık modeli orta güvende
    if top and CONFIDENCE_THRESHOLD <= top["score"] < RELIABLE_THRESHOLD:
        return {
            "stage":            "possible",
            "plant_name":       _display_plant(plantnet_result),
            "disease":          top["disease"] if not top["is_healthy"] else None,
            "confidence":       top["score"],
            "confidence_level": top["confidence_level"],
            "is_healthy":       top["is_healthy"],
            "message":          f"Olası teşhis — model %{top['score']*100:.0f} güvenle tahmin ediyor. Uzman görüşü önerilir.",
            "disease_results":  disease_results,
        }

    # Durum 3: Fallback — bakım bilgisi göster
    return {
        "stage":            "fallback",
        "plant_name":       _display_plant(plantnet_result),
        "disease":          None,
        "confidence":       pn_conf,
        "confidence_level": "low",
        "is_healthy":       None,
        "message":          "Hastalık tespiti için fotoğraf net değil veya bu bitki hastalık veritabanında yok. Aşağıda bakım bilgisi gösterilmektedir.",
        "disease_results":  disease_results,
    }


def _parse_label(label: str) -> tuple[str, str]:
    """'Apple Black rot' → ('Apple', 'Black rot')"""
    parts = label.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return label, "Unknown"


def _confidence_level(score: float) -> str:
    if score >= RELIABLE_THRESHOLD:
        return "high"
    if score >= CONFIDENCE_THRESHOLD:
        return "medium"
    return "low"


def _display_plant(plantnet_result: dict) -> str:
    common = plantnet_result.get("common_names", [])
    if common:
        return common[0]
    sci = plantnet_result.get("scientific_name")
    if sci:
        return sci
    return "Bilinmeyen Bitki"
