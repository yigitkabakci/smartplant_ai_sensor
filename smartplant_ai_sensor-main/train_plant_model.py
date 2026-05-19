"""
Bitki Hastalık Tespit Modeli — Transfer Learning (ViT)
=======================================================
İki dataset birleştirilerek eğitim yapılır:
  1. Kaggle Indoor Plant Disease Dataset (16 sınıf - ev bitkileri)
  2. PlantVillage Augmented Dataset      (38 sınıf - tarla bitkileri)
  Toplam: 54 sınıf

Lightning AI'a yüklemeden önce aşağıdaki iki klasörü yükle:
  - indoor/          (archive/indoor)
  - plantvillage/    (New Plant Diseases Dataset(Augmented)/New Plant Diseases Dataset(Augmented))

Kurulum:
    pip install transformers torch torchvision pillow tqdm

Kullanım:
    python train_plant_model.py

Çıktı:
    trained_model/   ← Bu klasörü projenin models/leaf_disease_model/ klasörüne koy
"""

import json
import os
import torch
from pathlib import Path
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from transformers import AutoImageProcessor, AutoModelForImageClassification
from tqdm import tqdm

# ------------------------------------------------------------------
# Ayarlar
# ------------------------------------------------------------------
# Lightning AI'da bu yolları kendi klasör yapınıza göre ayarlayın:
#   INDOOR_DIR      → archive/indoor klasörü (train/ valid/ test/ içeren)
#   PLANTVILLAGE_DIR → "New Plant Diseases Dataset(Augmented)" içindeki
#                      iç içe aynı isimli klasör (train/ ve valid/ içeren)
INDOOR_DIR       = Path("indoor")
PLANTVILLAGE_DIR = Path("plantvillage")

OUTPUT_DIR  = Path("trained_model")
BASE_MODEL  = "google/vit-base-patch16-224"
EPOCHS      = 10
BATCH_SIZE  = 32
LR          = 2e-5
IMG_SIZE    = 224
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"

# Windows'ta multiprocessing desteklenmez, Linux/Mac'te 4 worker kullan
NUM_WORKERS = 0 if os.name == "nt" else 4
PIN_MEMORY  = DEVICE == "cuda"

print(f"Cihaz: {DEVICE}")
if DEVICE == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")


# ------------------------------------------------------------------
# Dataset
# ------------------------------------------------------------------
class PlantDataset(Dataset):
    def __init__(self, samples, processor):
        self.samples   = samples
        self.processor = processor

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (128, 128, 128))
        inputs = self.processor(images=img, return_tensors="pt")
        return {
            "pixel_values": inputs["pixel_values"].squeeze(0),
            "labels": torch.tensor(label),
        }


def collect_classes(dirs: list[Path]) -> tuple[dict, dict]:
    """Tüm dataset klasörlerinden sınıf isimlerini toplar."""
    classes = set()
    for base_dir in dirs:
        train_dir = base_dir / "train"
        if not train_dir.exists():
            continue
        for d in train_dir.iterdir():
            if d.is_dir():
                classes.add(d.name)
    classes = sorted(classes)
    label2id = {name: i for i, name in enumerate(classes)}
    id2label = {i: name for i, name in enumerate(classes)}
    return label2id, id2label


def load_split(base_dir: Path, split: str, label2id: dict) -> list:
    """Bir dataset klasöründen belirtilen split'i yükler."""
    split_dir = base_dir / split
    if not split_dir.exists():
        return []
    samples = []
    for class_dir in split_dir.iterdir():
        if not class_dir.is_dir() or class_dir.name not in label2id:
            continue
        label_id = label2id[class_dir.name]
        for img_path in class_dir.glob("*"):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                samples.append((img_path, label_id))
    return samples


# ------------------------------------------------------------------
# Eğitim
# ------------------------------------------------------------------
def train():
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Hangi datasetler mevcut?
    available = []
    if (INDOOR_DIR / "train").exists():
        available.append(INDOOR_DIR)
        print(f"✓ Indoor dataset bulundu: {INDOOR_DIR.absolute()}")
    else:
        print(f"⚠ Indoor dataset bulunamadı: {INDOOR_DIR.absolute()}")

    if (PLANTVILLAGE_DIR / "train").exists():
        available.append(PLANTVILLAGE_DIR)
        print(f"✓ PlantVillage dataset bulundu: {PLANTVILLAGE_DIR.absolute()}")
    else:
        print(f"⚠ PlantVillage dataset bulunamadı: {PLANTVILLAGE_DIR.absolute()}")

    if not available:
        print("\nHATA: Hiç dataset bulunamadı!")
        print("INDOOR_DIR ve PLANTVILLAGE_DIR yollarını kontrol et.")
        return

    print(f"\n1. Sınıf haritası oluşturuluyor ({len(available)} dataset)...")
    label2id, id2label = collect_classes(available)
    print(f"   Toplam {len(label2id)} sınıf:")
    for name in sorted(label2id):
        print(f"   [{label2id[name]:>2}] {name}")

    print("\n2. Veri seti yükleniyor...")
    train_samples, val_samples, test_samples = [], [], []
    for ds_dir in available:
        t  = load_split(ds_dir, "train", label2id)
        v  = load_split(ds_dir, "valid", label2id)
        te = load_split(ds_dir, "test",  label2id)
        print(f"   {ds_dir.name}: train={len(t)}, valid={len(v)}, test={len(te)}")
        train_samples += t
        val_samples   += v
        test_samples  += te

    print(f"\n   TOPLAM → train={len(train_samples)}, valid={len(val_samples)}, test={len(test_samples)}")

    if not train_samples:
        print("HATA: Train verisi yok!")
        return

    print("\n3. Model yükleniyor...")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,
    )
    model = model.to(DEVICE)

    train_loader = DataLoader(
        PlantDataset(train_samples, processor),
        batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
    )
    val_loader = DataLoader(
        PlantDataset(val_samples, processor),
        batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
    )

    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS)

    print(f"\n4. Eğitim başlıyor ({EPOCHS} epoch, {DEVICE})...\n")
    best_val_acc = 0.0

    for epoch in range(1, EPOCHS + 1):
        # --- Train ---
        model.train()
        train_loss, correct, total = 0.0, 0, 0
        for batch in tqdm(train_loader, desc=f"Epoch {epoch}/{EPOCHS} [Train]", ncols=80):
            pixel_values = batch["pixel_values"].to(DEVICE)
            labels       = batch["labels"].to(DEVICE)
            outputs      = model(pixel_values=pixel_values, labels=labels)
            loss         = outputs.loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item()
            preds       = outputs.logits.argmax(-1)
            correct    += (preds == labels).sum().item()
            total      += labels.size(0)

        scheduler.step()
        train_acc = correct / total

        # --- Validation ---
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for batch in tqdm(val_loader, desc=f"Epoch {epoch}/{EPOCHS} [Val]  ", ncols=80):
                pixel_values = batch["pixel_values"].to(DEVICE)
                labels       = batch["labels"].to(DEVICE)
                outputs      = model(pixel_values=pixel_values, labels=labels)
                preds        = outputs.logits.argmax(-1)
                val_correct += (preds == labels).sum().item()
                val_total   += labels.size(0)

        val_acc = val_correct / val_total
        print(f"\n  Epoch {epoch}: train_acc={train_acc:.3f}  val_acc={val_acc:.3f}  "
              f"train_loss={train_loss/len(train_loader):.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model.save_pretrained(OUTPUT_DIR)
            processor.save_pretrained(OUTPUT_DIR)
            print(f"  ✓ En iyi model kaydedildi! (val_acc={val_acc:.3f})")

    # Etiket haritasını kaydet
    with open(OUTPUT_DIR / "label_map.json", "w", encoding="utf-8") as f:
        json.dump({"label2id": label2id, "id2label": id2label}, f, ensure_ascii=False, indent=2)

    # --- Test ---
    if test_samples:
        print("\n5. Test seti değerlendiriliyor...")
        model.eval()
        test_loader = DataLoader(
            PlantDataset(test_samples, processor),
            batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
        )
        test_correct, test_total = 0, 0
        with torch.no_grad():
            for batch in tqdm(test_loader, desc="Test", ncols=80):
                pixel_values = batch["pixel_values"].to(DEVICE)
                labels       = batch["labels"].to(DEVICE)
                outputs      = model(pixel_values=pixel_values, labels=labels)
                preds        = outputs.logits.argmax(-1)
                test_correct += (preds == labels).sum().item()
                test_total   += labels.size(0)
        test_acc = test_correct / test_total
        print(f"  Test accuracy: {test_acc:.3f} ({test_acc*100:.1f}%)")

    print(f"\n{'='*55}")
    print(f"Eğitim tamamlandı!")
    print(f"En iyi validation accuracy: {best_val_acc:.3f} ({best_val_acc*100:.1f}%)")
    print(f"Toplam sınıf: {len(label2id)}")
    print(f"Model: {OUTPUT_DIR.absolute()}")
    print(f"{'='*55}")
    print(f"\nSonraki adım:")
    print(f"  trained_model/ klasörünü projenin")
    print(f"  models/leaf_disease_model/ klasörüne kopyala.")


if __name__ == "__main__":
    train()
