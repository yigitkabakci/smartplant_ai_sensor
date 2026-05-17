import os
import logging
import torch
from PIL import Image

# Prevent HuggingFace from making ANY background network requests.
# Without these, huggingface_hub spawns threads that check for model updates,
# send telemetry, and retry downloads — all of which cause GIL contention
# that periodically freezes the asyncio event loop.
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

logger = logging.getLogger(__name__)

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

_model = None
_processor = None


def load_leaf_model():
    """
    Model ve image processor'ı local cache'den yükler.
    Pipeline() yerine doğrudan sınıf kullanılır çünkü:
    - pipeline() background thread'ler ve network istekleri başlatır
    - Bu thread'ler GIL ile event loop'u bloke eder
    - MobileNetV2ImageProcessor açıkça belirtilerek preprocessor_config.json
      uyumsuzluğu (eksik image_processor_type) bypass edilir
    """
    global _model, _processor
    try:
        from transformers import MobileNetV2ImageProcessor, AutoModelForImageClassification

        _processor = MobileNetV2ImageProcessor.from_pretrained(
            MODEL_NAME,
            local_files_only=True,
        )
        _model = AutoModelForImageClassification.from_pretrained(
            MODEL_NAME,
            local_files_only=True,
        )
        _model.eval()
        logger.info("Yaprak hastalığı modeli başarıyla yüklendi.")
    except Exception as e:
        logger.error(f"Yaprak hastalığı modeli yüklenemedi: {e}")
        _model = None
        _processor = None


def predict_leaf_disease(image_path: str):
    if _model is None or _processor is None:
        raise RuntimeError("Yaprak hastalığı modeli yüklenmedi.")

    image = Image.open(image_path).convert("RGB")
    inputs = _processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = _model(**inputs)

    logits = outputs.logits
    probs = torch.softmax(logits, dim=-1)[0]

    top_k = min(5, len(_model.config.id2label))
    top_probs, top_ids = torch.topk(probs, top_k)

    return [
        {
            "disease": _model.config.id2label[idx.item()],
            "confidence": f"{prob.item() * 100:.2f}%",
            "score": prob.item(),
        }
        for prob, idx in zip(top_probs, top_ids)
    ]
