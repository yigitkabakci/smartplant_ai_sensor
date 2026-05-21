"""
Hastalık tespit servisi — iki model:
  1. disease_model  → PlantVillage 38 sınıf (tarımsal bitkiler)
  2. indoor_model   → 16 sınıf (ev bitkileri: Aloe, Cactus, Money Plant, Snake Plant, Spider Plant)

identify_plant(image_path) → list[dict]
run_disease_pipeline(image_path, plantnet_result) → dict
"""

import logging
import os
from PIL import Image

logger = logging.getLogger(__name__)

# --- Tarımsal model ---
_model     = None
_processor = None
_id2label  = {}

# --- Indoor model ---
_indoor_model     = None
_indoor_processor = None
_indoor_id2label  = {}

# PlantNet scientific name → PlantVillage plant key (tarımsal)
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

# PlantNet scientific name → Indoor model plant key
PLANTNET_TO_INDOOR = {
    "aloe vera":              "Aloe",
    "aloe":                   "Aloe",
    "aloe barbadensis":       "Aloe",
    "opuntia":                "Cactus",
    "cactus":                 "Cactus",
    "epipremnum aureum":      "Money_Plant",
    "epipremnum":             "Money_Plant",
    "pothos":                 "Money_Plant",
    "dracaena trifasciata":   "Snake_Plant",
    "sansevieria":             "Snake_Plant",
    "dracaena":               "Snake_Plant",
    "chlorophytum comosum":   "Spider_Plant",
    "chlorophytum":           "Spider_Plant",
}

CONFIDENCE_THRESHOLD = 0.30
RELIABLE_THRESHOLD   = 0.60


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

    # Indoor modeli de yükle
    _load_indoor_model()


def _load_indoor_model():
    global _indoor_model, _indoor_processor, _indoor_id2label
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    model_dir = os.path.join("models", "indoor_model")
    if not os.path.exists(model_dir):
        logger.warning("Indoor model klasörü bulunamadı: %s", model_dir)
        return
    try:
        _indoor_processor = AutoImageProcessor.from_pretrained(model_dir)
        _indoor_model     = AutoModelForImageClassification.from_pretrained(model_dir)
        _indoor_model.eval()
        _indoor_id2label  = {int(k): v for k, v in _indoor_model.config.id2label.items()}
        logger.info("Indoor modeli yüklendi: %s sınıf", len(_indoor_id2label))
    except Exception as e:
        logger.error("Indoor modeli yüklenemedi: %s", e)


def is_model_loaded() -> bool:
    return _model is not None


def is_indoor_model_loaded() -> bool:
    return _indoor_model is not None


def identify_plant(image_path: str) -> list[dict]:
    """Tarımsal hastalık modeli ile tahmin (PlantVillage 38 sınıf)."""
    if _model is None:
        raise RuntimeError("Model yüklenmedi.")
    return _predict(_model, _processor, _id2label, image_path)


def identify_plant_indoor(image_path: str) -> list[dict]:
    """Indoor bitki hastalık modeli ile tahmin (16 sınıf)."""
    if _indoor_model is None:
        raise RuntimeError("Indoor model yüklenmedi.")
    return _predict(_indoor_model, _indoor_processor, _indoor_id2label, image_path)


def _predict(model, processor, id2label, image_path: str) -> list[dict]:
    import torch
    import torch.nn.functional as F

    image  = Image.open(image_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits
    probs = F.softmax(logits, dim=-1)[0]

    top_k = min(5, len(id2label))
    top   = torch.topk(probs, top_k)

    results = []
    for score_t, idx_t in zip(top.values, top.indices):
        score = score_t.item()
        label = id2label.get(idx_t.item(), "Unknown")
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
    PlantNet sonucunu alır, uygun modeli çalıştırır, karar verir.

    Dönen dict:
      stage: "disease" | "possible" | "fallback"
      plant_name, disease, confidence, confidence_level, is_healthy, message, disease_results
    """
    sci_name = (plantnet_result.get("scientific_name") or "").lower()
    genus    = (plantnet_result.get("genus") or "").lower()
    pn_conf  = plantnet_result.get("confidence", 0.0)

    # Hangi modele ait?
    pv_plant     = _match_dict(PLANTNET_TO_PLANTVILLAGE, sci_name, genus)
    indoor_plant = _match_dict(PLANTNET_TO_INDOOR, sci_name, genus)

    display_name = _display_plant(plantnet_result)

    # --- Indoor model ---
    if indoor_plant and is_indoor_model_loaded():
        try:
            results = identify_plant_indoor(image_path)
        except Exception as e:
            logger.error("Indoor model hatası: %s", e)
            results = []
        return _make_decision(results, display_name, pn_conf, source="indoor")

    # --- Tarımsal model ---
    if pv_plant and is_model_loaded():
        try:
            results = identify_plant(image_path)
        except Exception as e:
            logger.error("Disease model hatası: %s", e)
            results = []
        return _make_decision(results, display_name, pn_conf, source="agriculture")

    # --- Fallback ---
    return {
        "stage":            "fallback",
        "plant_name":       display_name,
        "disease":          None,
        "confidence":       pn_conf,
        "confidence_level": "low",
        "is_healthy":       None,
        "message":          "Bu bitki hastalık veritabanımızda bulunmuyor. Aşağıda genel bakım bilgisi gösterilmektedir.",
        "disease_results":  [],
    }


def _make_decision(results: list, display_name: str, pn_conf: float, source: str) -> dict:
    top = results[0] if results else None

    if top and top["score"] >= RELIABLE_THRESHOLD:
        return {
            "stage":            "disease",
            "plant_name":       display_name,
            "disease":          top["disease"] if not top["is_healthy"] else None,
            "confidence":       top["score"],
            "confidence_level": top["confidence_level"],
            "is_healthy":       top["is_healthy"],
            "message":          "Hastalık analizi tamamlandı.",
            "disease_results":  results,
        }

    if top and top["score"] >= CONFIDENCE_THRESHOLD:
        return {
            "stage":            "possible",
            "plant_name":       display_name,
            "disease":          top["disease"] if not top["is_healthy"] else None,
            "confidence":       top["score"],
            "confidence_level": top["confidence_level"],
            "is_healthy":       top["is_healthy"],
            "message":          f"Olası teşhis — model %{top['score']*100:.0f} güvenle tahmin ediyor. Uzman görüşü önerilir.",
            "disease_results":  results,
        }

    return {
        "stage":            "fallback",
        "plant_name":       display_name,
        "disease":          None,
        "confidence":       top["score"] if top else pn_conf,
        "confidence_level": "low",
        "is_healthy":       None,
        "message":          "Model bu görüntüden yeterince emin değil. Aşağıda bakım bilgisi gösterilmektedir.",
        "disease_results":  results,
    }


def _match_dict(mapping: dict, sci_name: str, genus: str):
    for key, val in mapping.items():
        if key in sci_name or key in genus:
            return val
    return None


def _parse_label(label: str) -> tuple[str, str]:
    """
    'Aloe_Anthracnose'        → ('Aloe', 'Anthracnose')
    'Apple___Black_rot'       → ('Apple', 'Black rot')
    'Snake_Plant_Anthracnose' → ('Snake Plant', 'Anthracnose')
    """
    # PlantVillage format: üç alt çizgi
    if "___" in label:
        parts = label.split("___", 1)
        plant   = parts[0].replace("_", " ").strip()
        disease = parts[1].replace("_", " ").strip()
        return plant, disease

    # Indoor format: bitki adı + hastalık adı, alt çizgiyle
    # Bilinen bitki prefixleri
    for prefix in ("Aloe", "Cactus", "Money_Plant", "Snake_Plant", "Spider_Plant"):
        if label.startswith(prefix + "_"):
            plant   = prefix.replace("_", " ")
            disease = label[len(prefix)+1:].replace("_", " ").strip()
            return plant, disease

    # Fallback: ilk kelime bitki, geri kalan hastalık
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
