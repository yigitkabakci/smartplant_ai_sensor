import re
import math
import json
import logging
import os
from pathlib import Path
from PIL import Image
from config import Config

logger = logging.getLogger(__name__)

_model       = None   # timm model
_transform   = None   # torchvision transform
_idx2label   = {}     # int → "Tomato_EarlyBlight"
_config      = {}

_RELIABLE_THRESHOLD = 0.50
_ENTROPY_THRESHOLD  = 2.5    # yüksek entropi → bilinmiyor
_MIN_DISPLAY        = 0.03   # grafik için min gösterim


def _load_timm_model(model_dir: str):
    """Eğitilmiş EfficientNet modelini yükler."""
    import torch
    import timm
    from torchvision import transforms

    global _model, _transform, _idx2label, _config

    cfg_path = os.path.join(model_dir, "config.json")
    pth_path = os.path.join(model_dir, "best_model.pth")

    with open(cfg_path, encoding="utf-8") as f:
        _config = json.load(f)

    num_classes = _config["num_labels"]
    img_size    = _config.get("image_size", 260)
    arch        = _config.get("architecture", "efficientnet_b2")
    _idx2label  = {int(k): v for k, v in _config["id2label"].items()}

    _model = timm.create_model(arch, pretrained=False, num_classes=num_classes)
    state  = torch.load(pth_path, map_location="cpu")
    _model.load_state_dict(state)
    _model.eval()

    _transform = transforms.Compose([
        transforms.Resize(img_size + 20),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    _RELIABLE_THRESHOLD = _config.get("reliable_threshold", 0.50)
    _ENTROPY_THRESHOLD  = _config.get("entropy_threshold",  2.5)
    logger.info("Eğitilmiş EfficientNet modeli yüklendi: %s sınıf", num_classes)


def _load_hf_model(model_dir: str):
    """Eski HuggingFace formatındaki modeli yükler (geriye uyumluluk)."""
    from transformers import pipeline as hf_pipeline
    global _model, _idx2label

    pipe = hf_pipeline("image-classification", model=model_dir)
    _model = pipe

    cfg_path = os.path.join(model_dir, "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, encoding="utf-8") as f:
            cfg = json.load(f)
        _idx2label = {int(k): v for k, v in cfg.get("id2label", {}).items()}
    logger.info("HuggingFace modeli yüklendi.")


def load_leaf_model():
    cfg       = Config()
    model_dir = cfg.MODEL_DIR

    # Eğitilmiş model var mı? (best_model.pth → yeni format)
    if os.path.exists(os.path.join(model_dir, "best_model.pth")):
        logger.info("Eğitilmiş model bulundu, yükleniyor: %s", model_dir)
        try:
            _load_timm_model(model_dir)
            return
        except Exception as e:
            logger.warning("timm model yüklenemedi, HF deneniyor: %s", e)

    # Eski HuggingFace model
    if os.path.exists(os.path.join(model_dir, "model.safetensors")) or \
       os.path.exists(os.path.join(model_dir, "pytorch_model.bin")):
        logger.info("HuggingFace model yükleniyor: %s", model_dir)
        _load_hf_model(model_dir)
        return

    logger.error("Hiçbir model bulunamadı: %s", model_dir)


def parse_label(raw_label: str) -> tuple[str, str]:
    """'Tomato_EarlyBlight' → ('Tomato', 'Early Blight')"""
    if "___" in raw_label:
        parts = raw_label.split("___", 1)
        plant   = parts[0].replace("_", " ").strip()
        disease = parts[1].replace("_", " ").strip()
        return plant, disease

    parts = raw_label.rsplit("_", 1)
    if len(parts) == 2:
        plant = parts[0].replace("_", " ").strip()
        disease = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", parts[1]).strip()
        return plant, disease

    return raw_label, "Unknown"


def _entropy(probs: list[float]) -> float:
    return -sum(p * math.log(p + 1e-9) for p in probs if p > 0)


def identify_plant(image_path: str) -> list[dict]:
    if _model is None:
        raise RuntimeError("Model yüklenmedi.")

    image = Image.open(image_path).convert("RGB")

    # ── EfficientNet (yeni model) ──────────────────────────────────────────
    if _transform is not None:
        import torch
        import torch.nn.functional as F

        tensor = _transform(image).unsqueeze(0)
        with torch.no_grad():
            logits = _model(tensor)
            probs  = F.softmax(logits, dim=1)[0].tolist()

        entropy = _entropy(probs)
        pairs   = sorted(enumerate(probs), key=lambda x: x[1], reverse=True)

        top_score = pairs[0][1]
        reliable  = (top_score >= _RELIABLE_THRESHOLD) and (entropy <= _ENTROPY_THRESHOLD)

        results = []
        for idx, score in pairs:
            if score < _MIN_DISPLAY:
                break
            label   = _idx2label.get(idx, f"class_{idx}")
            plant, disease = parse_label(label)
            results.append({
                "label":      label,
                "plant":      plant,
                "disease":    disease,
                "is_healthy": "healthy" in disease.lower(),
                "score":      score,
                "confidence": f"{score * 100:.1f}%",
                "reliable":   reliable,
                "entropy":    round(entropy, 3),
            })

        if not results:
            idx, score = pairs[0]
            label = _idx2label.get(idx, f"class_{idx}")
            plant, disease = parse_label(label)
            results = [{
                "label": label, "plant": plant, "disease": disease,
                "is_healthy": False, "score": score,
                "confidence": f"{score * 100:.1f}%",
                "reliable": False, "entropy": round(entropy, 3),
            }]
        return results

    # ── HuggingFace pipeline (eski model, geriye uyumluluk) ───────────────
    raw = _model(image, top_k=None)
    results = []
    for p in raw:
        if p["score"] < _MIN_DISPLAY:
            continue
        plant, disease = parse_label(p["label"])
        results.append({
            "label":      p["label"],
            "plant":      plant,
            "disease":    disease,
            "is_healthy": "healthy" in disease.lower(),
            "score":      p["score"],
            "confidence": f"{p['score'] * 100:.1f}%",
            "reliable":   p["score"] >= _RELIABLE_THRESHOLD,
            "entropy":    None,
        })

    if not results:
        best = max(raw, key=lambda x: x["score"])
        plant, disease = parse_label(best["label"])
        results = [{
            "label": best["label"], "plant": plant, "disease": disease,
            "is_healthy": False, "score": best["score"],
            "confidence": f"{best['score'] * 100:.1f}%",
            "reliable": False, "entropy": None,
        }]
    return results
