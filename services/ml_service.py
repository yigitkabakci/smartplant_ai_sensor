import logging
from transformers import pipeline
from PIL import Image

logger = logging.getLogger(__name__)

_pipe = None


def load_leaf_model():
    global _pipe
    try:
        _pipe = pipeline(
            "image-classification",
            model="linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
        )
        logger.info("Yaprak hastalığı modeli başarıyla yüklendi.")
    except Exception as e:
        logger.error(f"Yaprak hastalığı modeli yüklenemedi: {e}")


def predict_leaf_disease(image_path: str):
    if _pipe is None:
        raise RuntimeError("Yaprak hastalığı modeli yüklenmedi.")
    image = Image.open(image_path)
    predictions = _pipe(image)
    return [
        {
            'disease': p['label'],
            'confidence': f"{p['score'] * 100:.2f}%",
            'score': p['score'],
        }
        for p in predictions
    ]
