"""
iNaturalist Bitki Veri Seti İndirici
=====================================
Tüm bitki türleri için research-grade fotoğrafları indirir.
Klasör yapısı: dataset/species_name/img_001.jpg

Kullanım:
    pip install requests pillow tqdm
    python download_dataset.py
"""

import os
import time
import requests
from pathlib import Path
from tqdm import tqdm

# ------------------------------------------------------------------
# İndirilecek Bitki Listesi — (klasör_adı, iNaturalist bilimsel adı)
# ------------------------------------------------------------------
PLANTS = {
    # Yapraklı Bitkiler
    "monstera":          "Monstera deliciosa",
    "pothos":            "Epipremnum aureum",
    "ficus":             "Ficus elastica",
    "dracaena":          "Dracaena fragrans",
    "schefflera":        "Schefflera arboricola",
    "syngonium":         "Syngonium podophyllum",
    "zz_plant":          "Zamioculcas zamiifolia",
    "philodendron":      "Philodendron hederaceum",
    # Çiçekli Bitkiler
    "geranium":          "Pelargonium hortorum",
    "begonia":           "Begonia",
    "orchid":            "Phalaenopsis",
    "kalanchoe":         "Kalanchoe blossfeldiana",
    "cyclamen":          "Cyclamen persicum",
    "petunia":           "Petunia",
    "lavender":          "Lavandula angustifolia",
    "carnation":         "Dianthus caryophyllus",
    "gardenia":          "Gardenia jasminoides",
    # Sukulent & Kaktüs
    "aloe_vera":         "Aloe vera",
    "echeveria":         "Echeveria",
    "haworthia":         "Haworthiopsis",
    "jade_plant":        "Crassula ovata",
    "sedum":             "Sedum",
    # Asılı Saksı
    "tradescantia":      "Tradescantia zebrina",
    "spider_plant":      "Chlorophytum comosum",
    "string_of_pearls":  "Curio rowleyanus",
}

MAX_PER_SPECIES  = 250   # Her tür için max fotoğraf
DATASET_DIR      = Path("dataset")
API_BASE         = "https://api.inaturalist.org/v1/observations"
SLEEP_BETWEEN    = 1.2   # API rate limit için bekleme (saniye)
IMG_TIMEOUT      = 15    # Fotoğraf indirme timeout (saniye)

HEADERS = {"User-Agent": "SmartAgriculture-DatasetBuilder/1.0"}


def fetch_observation_pages(taxon_name: str, max_photos: int) -> list[str]:
    """iNaturalist API'den fotoğraf URL'lerini toplar."""
    urls = []
    page = 1
    per_page = min(200, max_photos)

    while len(urls) < max_photos:
        params = {
            "taxon_name":    taxon_name,
            "quality_grade": "research",       # Doğrulanmış gözlemler
            "photos":        "true",
            "per_page":      per_page,
            "page":          page,
            "order":         "votes",           # En çok oylananlar önce
            "order_by":      "votes",
            "license":       "cc-by,cc-by-nc,cc0,cc-by-nd,cc-by-sa,cc-by-nc-nd,cc-by-nc-sa",
        }

        try:
            r = requests.get(API_BASE, params=params, headers=HEADERS, timeout=20)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"  [API HATA] {taxon_name} — {e}")
            break

        results = data.get("results", [])
        if not results:
            break

        for obs in results:
            for photo in obs.get("photos", []):
                url = photo.get("url", "")
                if url:
                    # Küçük boyut yerine orta boy al (medium)
                    url = url.replace("square", "medium")
                    urls.append(url)
                    if len(urls) >= max_photos:
                        break
            if len(urls) >= max_photos:
                break

        total_available = data.get("total_results", 0)
        if len(results) < per_page or len(urls) >= total_available:
            break

        page += 1
        time.sleep(SLEEP_BETWEEN)

    return urls[:max_photos]


def download_image(url: str, save_path: Path) -> bool:
    """Tek bir fotoğrafı indirir. Başarılıysa True döner."""
    try:
        r = requests.get(url, timeout=IMG_TIMEOUT, headers=HEADERS, stream=True)
        r.raise_for_status()
        content_type = r.headers.get("content-type", "")
        if "image" not in content_type:
            return False
        with open(save_path, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception:
        return False


def download_species(folder_name: str, taxon_name: str):
    save_dir = DATASET_DIR / folder_name
    save_dir.mkdir(parents=True, exist_ok=True)

    # Zaten indirilenler
    existing = len(list(save_dir.glob("*.jpg"))) + len(list(save_dir.glob("*.jpeg")))
    if existing >= MAX_PER_SPECIES:
        print(f"  ✓ {folder_name}: {existing} fotoğraf zaten mevcut, atlanıyor.")
        return

    needed = MAX_PER_SPECIES - existing
    print(f"\n→ {folder_name} ({taxon_name}) — {existing} mevcut, {needed} daha lazım")

    urls = fetch_observation_pages(taxon_name, needed)
    if not urls:
        print(f"  ✗ Fotoğraf bulunamadı.")
        return

    print(f"  {len(urls)} URL bulundu, indiriliyor...")
    success = 0
    for i, url in enumerate(tqdm(urls, desc=f"  {folder_name}", ncols=70)):
        ext = ".jpg"
        filename = save_dir / f"img_{existing + i + 1:04d}{ext}"
        if download_image(url, filename):
            success += 1
        time.sleep(0.3)

    print(f"  ✓ {success}/{len(urls)} fotoğraf indirildi → {save_dir}")


def print_summary():
    print("\n" + "="*50)
    print("ÖZET")
    print("="*50)
    total = 0
    for folder in sorted(DATASET_DIR.iterdir()):
        if folder.is_dir():
            count = len(list(folder.glob("*.jpg"))) + len(list(folder.glob("*.jpeg")))
            total += count
            status = "✓" if count >= 150 else "⚠" if count >= 50 else "✗"
            print(f"  {status} {folder.name:<20} {count:>4} fotoğraf")
    print(f"\n  TOPLAM: {total} fotoğraf, {len(PLANTS)} tür")
    print("="*50)


if __name__ == "__main__":
    print("iNaturalist Bitki Veri Seti İndirici")
    print(f"Hedef: {len(PLANTS)} tür × max {MAX_PER_SPECIES} fotoğraf")
    print(f"Kayıt dizini: {DATASET_DIR.absolute()}\n")

    DATASET_DIR.mkdir(exist_ok=True)

    for folder_name, taxon_name in PLANTS.items():
        download_species(folder_name, taxon_name)
        time.sleep(SLEEP_BETWEEN)

    print_summary()
    print("\nVeri seti hazır! Lightning AI'a yükleyebilirsin.")
