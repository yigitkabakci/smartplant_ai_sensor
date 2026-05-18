"""
Bitkiye Özgü Sensör Eşik Değerleri
====================================
Her bitkinin ideal toprak nemi, sıcaklık, hava nemi ve ışık aralığını
döndürür. Değerler botanik literatüre dayanmaktadır.

Kullanım:
    from services.plant_thresholds import get_thresholds_for_plant
    t = get_thresholds_for_plant("Monstera Deliciosa")
"""

from __future__ import annotations
import re
from typing import TypedDict


class PlantThresholds(TypedDict):
    min_moisture:  float
    max_moisture:  float
    ideal_temp_min: float
    ideal_temp_max: float
    min_humidity:  float
    max_humidity:  float
    min_light_lux: float
    max_light_lux: float


# ---------------------------------------------------------------------------
# Botanik Veritabanı
# ---------------------------------------------------------------------------
# Format: "anahtar_kelime": (nem_min, nem_max, sıcaklık_min, sıcaklık_max,
#                            hava_nemi_min, hava_nemi_max, ışık_min, ışık_max)
# ---------------------------------------------------------------------------
_DB: dict[str, tuple] = {
    # ── Tropikal / Büyük Yapraklı ──────────────────────────────────────────
    "monstera":        (40, 70, 18, 30, 60, 80, 500,  10000),
    "pothos":          (40, 70, 15, 30, 50, 70, 200,   5000),
    "philodendron":    (50, 75, 18, 30, 60, 80, 300,   8000),
    "dieffenbachia":   (50, 70, 18, 30, 60, 80, 500,   5000),
    "dumb cane":       (50, 70, 18, 30, 60, 80, 500,   5000),
    "elephant ear":    (60, 80, 20, 32, 65, 85, 500,  10000),
    "alocasia":        (60, 80, 20, 32, 65, 85, 500,  10000),
    "colocasia":       (65, 85, 20, 32, 65, 85, 1000, 15000),
    "caladium":        (60, 80, 20, 30, 70, 85, 300,   5000),
    "bird of paradise":(50, 70, 18, 30, 50, 70, 2000, 50000),
    "strelitzia":      (50, 70, 18, 30, 50, 70, 2000, 50000),

    # ── Sukulent & Kaktüs ──────────────────────────────────────────────────
    "cactus":          (10, 30, 18, 38, 10, 50, 5000, 80000),
    "kaktüs":          (10, 30, 18, 38, 10, 50, 5000, 80000),
    "kaktus":          (10, 30, 18, 38, 10, 50, 5000, 80000),
    "succulent":       (10, 35, 15, 35, 10, 50, 3000, 60000),
    "sukulent":        (10, 35, 15, 35, 10, 50, 3000, 60000),
    "aloe":            (20, 40, 16, 32, 20, 60, 2000, 50000),
    "aloe vera":       (20, 40, 16, 32, 20, 60, 2000, 50000),
    "echeveria":       (10, 30, 15, 30, 10, 50, 3000, 60000),
    "haworthia":       (20, 40, 15, 28, 20, 60, 500,  10000),
    "agave":           (10, 30, 15, 40, 10, 50, 5000, 80000),
    "jade":            (20, 40, 15, 30, 20, 50, 3000, 60000),
    "jade plant":      (20, 40, 15, 30, 20, 50, 3000, 60000),
    "sedum":           (10, 30, 10, 30, 10, 50, 3000, 60000),
    "kalanchoe":       (20, 40, 15, 28, 20, 60, 2000, 40000),
    "christmas cactus":(45, 65, 15, 25, 50, 70, 500,  10000),

    # ── Eğrelti & Tropikal Nem ─────────────────────────────────────────────
    "fern":            (60, 85, 15, 25, 70, 90, 200,   3000),
    "eğrelti":         (60, 85, 15, 25, 70, 90, 200,   3000),
    "boston fern":     (65, 85, 15, 25, 70, 90, 200,   3000),
    "maidenhair fern": (65, 90, 15, 23, 75, 90, 200,   2000),
    "birds nest fern": (60, 80, 18, 27, 70, 85, 200,   3000),
    "asparagus fern":  (55, 75, 15, 25, 60, 80, 500,   5000),

    # ── Palmiye ───────────────────────────────────────────────────────────
    "palm":            (50, 70, 18, 32, 50, 75, 1000, 20000),
    "palms":           (50, 70, 18, 32, 50, 75, 1000, 20000),
    "areca palm":      (50, 70, 18, 30, 50, 75, 1000, 15000),
    "parlor palm":     (40, 65, 16, 28, 50, 75, 300,   5000),
    "ponytail palm":   (20, 40, 18, 35, 20, 50, 2000, 40000),
    "sago palm":       (30, 55, 18, 32, 30, 60, 2000, 30000),

    # ── Domates & Sebze ───────────────────────────────────────────────────
    "tomato":          (60, 80, 18, 30, 50, 75, 5000, 70000),
    "domates":         (60, 80, 18, 30, 50, 75, 5000, 70000),
    "pepper":          (60, 80, 20, 32, 50, 75, 5000, 70000),
    "biber":           (60, 80, 20, 32, 50, 75, 5000, 70000),
    "potato":          (65, 80, 10, 24, 50, 75, 3000, 50000),
    "patates":         (65, 80, 10, 24, 50, 75, 3000, 50000),
    "corn":            (65, 80, 18, 32, 40, 70, 5000, 80000),
    "mısır":           (65, 80, 18, 32, 40, 70, 5000, 80000),
    "strawberry":      (60, 80, 15, 26, 60, 75, 4000, 60000),
    "çilek":           (60, 80, 15, 26, 60, 75, 4000, 60000),

    # ── Meyve ─────────────────────────────────────────────────────────────
    "apple":           (55, 75, 5,  25, 50, 70, 5000, 60000),
    "elma":            (55, 75, 5,  25, 50, 70, 5000, 60000),
    "grape":           (55, 75, 15, 30, 40, 65, 5000, 70000),
    "üzüm":            (55, 75, 15, 30, 40, 65, 5000, 70000),
    "cherry":          (55, 75, 5,  25, 50, 70, 5000, 60000),
    "kiraz":           (55, 75, 5,  25, 50, 70, 5000, 60000),
    "peach":           (55, 75, 7,  28, 45, 70, 5000, 60000),
    "orange":          (60, 80, 15, 32, 50, 75, 5000, 70000),
    "portakal":        (60, 80, 15, 32, 50, 75, 5000, 70000),
    "blueberry":       (65, 80, 10, 24, 55, 75, 4000, 50000),
    "raspberry":       (65, 80, 10, 25, 55, 75, 4000, 50000),
    "soybean":         (60, 80, 15, 30, 50, 75, 4000, 60000),

    # ── Çiçekli İç Mekan ──────────────────────────────────────────────────
    "orchid":          (40, 65, 18, 28, 60, 80, 1000, 15000),
    "orkide":          (40, 65, 18, 28, 60, 80, 1000, 15000),
    "anthurium":       (50, 70, 20, 30, 65, 85, 500,   8000),
    "peace lily":      (50, 70, 18, 30, 60, 80, 200,   5000),
    "spathiphyllum":   (50, 70, 18, 30, 60, 80, 200,   5000),
    "chrysanthemum":   (55, 70, 15, 25, 50, 70, 3000, 50000),
    "african violet":  (45, 65, 18, 24, 50, 70, 1000, 10000),
    "begonia":         (50, 70, 16, 26, 50, 70, 1000, 15000),
    "poinsettia":      (50, 70, 15, 25, 50, 70, 2000, 20000),
    "impatiens":       (60, 80, 15, 28, 60, 80, 1000, 15000),
    "hyacinth":        (55, 75, 5,  20, 50, 75, 3000, 30000),
    "tulip":           (55, 75, 5,  18, 50, 75, 3000, 30000),
    "lilium":          (55, 75, 15, 25, 50, 70, 3000, 40000),
    "lily":            (55, 75, 15, 25, 50, 70, 3000, 40000),
    "daffodil":        (55, 75, 5,  18, 50, 70, 3000, 30000),
    "daffodils":       (55, 75, 5,  18, 50, 70, 3000, 30000),

    # ── Yeşil Yapraklı İç Mekan ───────────────────────────────────────────
    "snake plant":     (20, 45, 15, 32, 25, 60, 500,  20000),
    "sansevieria":     (20, 45, 15, 32, 25, 60, 500,  20000),
    "spider plant":    (40, 65, 15, 28, 40, 70, 500,  10000),
    "chlorophytum":    (40, 65, 15, 28, 40, 70, 500,  10000),
    "zz plant":        (20, 45, 15, 30, 30, 60, 200,  10000),
    "zamioculcas":     (20, 45, 15, 30, 30, 60, 200,  10000),
    "dracaena":        (40, 65, 18, 30, 40, 70, 500,  10000),
    "schefflera":      (45, 65, 16, 28, 50, 70, 1000, 15000),
    "rubber plant":    (40, 65, 18, 30, 40, 65, 1000, 15000),
    "ficus":           (40, 65, 18, 30, 40, 65, 1000, 20000),
    "cast iron plant": (30, 60, 10, 30, 30, 70, 200,   5000),
    "aspidistra":      (30, 60, 10, 30, 30, 70, 200,   5000),
    "chinese evergreen":(45, 70, 18, 30, 60, 80, 200,   5000),
    "aglaonema":       (45, 70, 18, 30, 60, 80, 200,   5000),
    "tradescantia":    (50, 70, 15, 28, 50, 75, 1000, 20000),
    "prayer plant":    (55, 75, 18, 28, 65, 85, 300,   5000),
    "maranta":         (55, 75, 18, 28, 65, 85, 300,   5000),
    "calathea":        (55, 75, 18, 27, 65, 85, 300,   5000),
    "ctenanthe":       (55, 75, 18, 28, 65, 85, 300,   5000),
    "rattlesnake plant":(55, 75, 18, 27, 65, 85, 300,   5000),
    "english ivy":     (50, 70, 10, 24, 40, 70, 500,  10000),
    "hedera":          (50, 70, 10, 24, 40, 70, 500,  10000),
    "yucca":           (20, 45, 15, 35, 20, 55, 3000, 60000),
    "money plant":     (40, 65, 18, 30, 50, 70, 500,  10000),
    "money tree":      (40, 65, 18, 30, 50, 70, 500,  10000),
    "pacchira":        (40, 65, 18, 30, 50, 70, 1000, 15000),
    "chinese money":   (45, 65, 15, 28, 50, 70, 1000, 15000),
    "pilea":           (45, 65, 15, 28, 50, 70, 1000, 15000),

    # ── Özel Bitkiler ─────────────────────────────────────────────────────
    "venus flytrap":   (70, 90, 18, 30, 70, 90, 3000, 50000),
    "venus":           (70, 90, 18, 30, 70, 90, 3000, 50000),
    "sundew":          (70, 90, 15, 28, 70, 90, 2000, 30000),
    "pitcher plant":   (70, 90, 15, 28, 70, 90, 2000, 30000),
    "lavender":        (30, 50, 15, 30, 30, 60, 5000, 70000),
    "lavanta":         (30, 50, 15, 30, 30, 60, 5000, 70000),
    "rosemary":        (30, 55, 15, 30, 30, 60, 5000, 70000),
    "biberiye":        (30, 55, 15, 30, 30, 60, 5000, 70000),
    "basil":           (60, 80, 18, 32, 50, 70, 4000, 60000),
    "fesleğen":        (60, 80, 18, 32, 50, 70, 4000, 60000),
    "mint":            (65, 85, 15, 28, 55, 75, 2000, 30000),
    "nane":            (65, 85, 15, 28, 55, 75, 2000, 30000),
}

# Varsayılan (tür bilinmiyorsa)
_DEFAULT: tuple = (30, 70, 10, 35, 30, 80, 200, 50000)


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", name.lower()).strip()


def get_thresholds_for_plant(plant_name: str) -> PlantThresholds:
    """
    Bitki adına göre eşik değerlerini döndürür.
    Tam eşleşme yoksa kısmi eşleşme dener, o da yoksa genel varsayılanları kullanır.
    """
    normalized = _normalize(plant_name)

    # Tam eşleşme
    if normalized in _DB:
        t = _DB[normalized]
        return _to_dict(t)

    # Kısmi eşleşme — bitki adı veritabanı anahtarını içeriyor mu?
    for key, vals in _DB.items():
        if key in normalized or normalized in key:
            return _to_dict(vals)

    # Kelime bazlı eşleşme
    words = normalized.split()
    for key, vals in _DB.items():
        key_words = key.split()
        if any(w in key_words for w in words):
            return _to_dict(vals)

    return _to_dict(_DEFAULT)


def _to_dict(t: tuple) -> PlantThresholds:
    return PlantThresholds(
        min_moisture=t[0],
        max_moisture=t[1],
        ideal_temp_min=t[2],
        ideal_temp_max=t[3],
        min_humidity=t[4],
        max_humidity=t[5],
        min_light_lux=t[6],
        max_light_lux=t[7],
    )
