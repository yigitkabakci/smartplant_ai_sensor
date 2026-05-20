"""
PlantNet API servisi — fotoğraftan bitki türü tanıma.

Dönen sonuç:
{
    "identified": True/False,
    "scientific_name": "Monstera deliciosa",
    "common_names": ["Swiss Cheese Plant"],
    "confidence": 0.87,          # 0.0 - 1.0
    "confidence_level": "high",  # high / medium / low / unknown
    "family": "Araceae",
    "genus": "Monstera",
    "gbif_id": 2684241,
    "all_results": [...]          # ilk 5 aday
}
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

PLANTNET_API_URL = "https://my-api.plantnet.org/v2/identify/all"
_API_KEY = None


def _get_key() -> str:
    global _API_KEY
    if _API_KEY:
        return _API_KEY
    key = os.getenv("PLANTNET_API_KEY", "")
    if not key:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            key = os.getenv("PLANTNET_API_KEY", "")
        except ImportError:
            pass
    if not key:
        raise RuntimeError("PLANTNET_API_KEY bulunamadı. .env dosyasını kontrol edin.")
    _API_KEY = key
    return key


def _confidence_level(score: float) -> str:
    if score >= 0.70:
        return "high"
    if score >= 0.40:
        return "medium"
    if score >= 0.15:
        return "low"
    return "unknown"


def identify_plant(image_path: str, organs: list[str] = None) -> dict:
    """
    image_path: yerel dosya yolu
    organs: ["leaf", "flower", "fruit", "bark", "auto"] — None ise "auto"
    """
    if organs is None:
        organs = ["auto"]

    api_key = _get_key()

    try:
        with open(image_path, "rb") as f:
            image_data = f.read()

        files = [("images", (os.path.basename(image_path), image_data, "image/jpeg"))]
        params = {
            "api-key": api_key,
            "lang": "tr",
            "nb-results": 5,
        }
        for organ in organs:
            params.setdefault("organs", [])
        data = [("organs", o) for o in organs]

        response = requests.post(
            PLANTNET_API_URL,
            params=params,
            files=files,
            data=data,
            timeout=15,
        )

        if response.status_code == 404:
            # Hiçbir bitki tanınamadı
            return _unknown_result()

        if response.status_code != 200:
            logger.error("PlantNet API hatası: %s — %s", response.status_code, response.text[:300])
            raise RuntimeError(f"PlantNet API hatası: {response.status_code}")

        raw = response.json()
        results = raw.get("results", [])

        if not results:
            return _unknown_result()

        # İlk 5 adayı işle
        all_results = []
        for r in results[:5]:
            species = r.get("species", {})
            score = r.get("score", 0.0)
            sci_name = species.get("scientificNameWithoutAuthor", "")
            common = species.get("commonNames", [])
            family = species.get("family", {}).get("scientificNameWithoutAuthor", "")
            genus = species.get("genus", {}).get("scientificNameWithoutAuthor", "")
            gbif = species.get("gbif", {}).get("id")
            all_results.append({
                "scientific_name": sci_name,
                "common_names": common,
                "confidence": round(score, 4),
                "confidence_level": _confidence_level(score),
                "family": family,
                "genus": genus,
                "gbif_id": gbif,
            })

        best = all_results[0]
        return {
            "identified": best["confidence"] >= 0.15,
            "scientific_name": best["scientific_name"],
            "common_names": best["common_names"],
            "confidence": best["confidence"],
            "confidence_level": best["confidence_level"],
            "family": best["family"],
            "genus": best["genus"],
            "gbif_id": best["gbif_id"],
            "all_results": all_results,
        }

    except requests.Timeout:
        logger.error("PlantNet API zaman aşımı")
        raise RuntimeError("PlantNet API yanıt vermedi (zaman aşımı).")
    except RuntimeError:
        raise
    except Exception as e:
        logger.exception("PlantNet API beklenmeyen hata")
        raise RuntimeError(f"PlantNet API hatası: {e}")


def _unknown_result() -> dict:
    return {
        "identified": False,
        "scientific_name": None,
        "common_names": [],
        "confidence": 0.0,
        "confidence_level": "unknown",
        "family": None,
        "genus": None,
        "gbif_id": None,
        "all_results": [],
    }
