"""
Indoor Bitki Hastalık Modeli — Transfer Learning (ViT)
=======================================================
Dataset: C:/Users/yigit/Desktop/yenidataset/indoor
Sınıflar (16):
  Aloe         → Anthracnose, Healthy, LeafSpot, Rust, Sunburn
  Cactus       → Dactylopius_Opuntia, Healthy
  Money_Plant  → Bacterial_wilt_disease, Healthy, Manganese_Toxicity
  Snake_Plant  → Anthracnose, Healthy, Leaf_Withering
  Spider_Plant → Fungal_leaf_spot, Healthy, Leaf_Tip_Necrosis

Kullanım:
    py -3.10 train_indoor_model.py

Çıktı:
    models/indoor_model/  ← sistem bu klasörü otomatik yükler
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
# Ayarlar — Kaggle ve local ortam otomatik algılanır
# ------------------------------------------------------------------
ON_KAGGLE  = Path("/kaggle/input").exists()

INDOOR_DIR = Path("/kaggle/input/datasets/yiitkabakc/ev-bitkileri-dataset/yenidataset/indoor") if ON_KAGGLE \
             else Path(r"C:\Users\yigit\Desktop\yenidataset\indoor")
OUTPUT_DIR = Path("/kaggle/working/indoor_model") if ON_KAGGLE \
             else Path("models/indoor_model")

BASE_MODEL  = "google/vit-base-patch16-224"
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"
EPOCHS      = 10 if DEVICE == "cuda" else 5
BATCH_SIZE  = 32 if DEVICE == "cuda" else 16
LR          = 2e-5
IMG_SIZE    = 224
NUM_WORKERS = 4 if ON_KAGGLE else 0   # Windows'ta 0, Kaggle/Linux'ta 4
PIN_MEMORY  = DEVICE == "cuda"

print(f"Ortam : {'Kaggle' if ON_KAGGLE else 'Local'}")
print(f"Cihaz : {DEVICE}")
print(f"Epoch : {EPOCHS}  |  Batch: {BATCH_SIZE}  |  Workers: {NUM_WORKERS}")
if DEVICE == "cuda":
    print(f"GPU   : {torch.cuda.get_device_name(0)}")


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
            "labels":       torch.tensor(label),
        }


def collect_classes(base_dir: Path) -> tuple[dict, dict]:
    train_dir = base_dir / "train"
    classes = sorted(d.name for d in train_dir.iterdir() if d.is_dir())
    label2id = {name: i for i, name in enumerate(classes)}
    id2label = {i: name for i, name in enumerate(classes)}
    return label2id, id2label


def load_split(base_dir: Path, split: str, label2id: dict) -> list:
    split_dir = base_dir / split
    if not split_dir.exists():
        return []
    samples = []
    for class_dir in split_dir.iterdir():
        if not class_dir.is_dir() or class_dir.name not in label2id:
            continue
        for img_path in class_dir.glob("*"):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                samples.append((img_path, label2id[class_dir.name]))
    return samples


# ------------------------------------------------------------------
# Eğitim
# ------------------------------------------------------------------
def train():
    if not (INDOOR_DIR / "train").exists():
        print(f"HATA: Dataset bulunamadı → {INDOOR_DIR.absolute()}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n1. Sınıf haritası oluşturuluyor...")
    label2id, id2label = collect_classes(INDOOR_DIR)
    print(f"   {len(label2id)} sınıf:")
    for name, idx in sorted(label2id.items(), key=lambda x: x[1]):
        print(f"   [{idx:>2}] {name}")

    print("\n2. Veri yükleniyor...")
    train_s = load_split(INDOOR_DIR, "train", label2id)
    val_s   = load_split(INDOOR_DIR, "valid", label2id)
    test_s  = load_split(INDOOR_DIR, "test",  label2id)
    print(f"   train={len(train_s)}  valid={len(val_s)}  test={len(test_s)}")

    print("\n3. Model yükleniyor (ViT-Base)...")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(label2id),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True,
    ).to(DEVICE)

    train_loader = DataLoader(
        PlantDataset(train_s, processor),
        batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
    )
    val_loader = DataLoader(
        PlantDataset(val_s, processor),
        batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
    )

    optimizer = AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS)

    print(f"\n4. Eğitim başlıyor ({EPOCHS} epoch, {DEVICE})...\n")
    best_val_acc = 0.0

    for epoch in range(1, EPOCHS + 1):
        model.train()
        train_loss, correct, total = 0.0, 0, 0
        for batch in tqdm(train_loader, desc=f"Epoch {epoch}/{EPOCHS} [Train]", ncols=80):
            pv     = batch["pixel_values"].to(DEVICE)
            labels = batch["labels"].to(DEVICE)
            out    = model(pixel_values=pv, labels=labels)

            optimizer.zero_grad()
            out.loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += out.loss.item()
            correct    += (out.logits.argmax(-1) == labels).sum().item()
            total      += labels.size(0)

        scheduler.step()

        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for batch in tqdm(val_loader, desc=f"Epoch {epoch}/{EPOCHS} [Val]  ", ncols=80):
                pv     = batch["pixel_values"].to(DEVICE)
                labels = batch["labels"].to(DEVICE)
                out    = model(pixel_values=pv, labels=labels)
                val_correct += (out.logits.argmax(-1) == labels).sum().item()
                val_total   += labels.size(0)

        train_acc = correct / total
        val_acc   = val_correct / val_total
        print(f"\n  Epoch {epoch}: train={train_acc:.3f}  val={val_acc:.3f}  "
              f"loss={train_loss/len(train_loader):.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model.save_pretrained(OUTPUT_DIR)
            processor.save_pretrained(OUTPUT_DIR)
            print(f"  ✓ Kaydedildi (val_acc={val_acc:.3f})")

    # Etiket haritasını kaydet
    with open(OUTPUT_DIR / "label_map.json", "w", encoding="utf-8") as f:
        json.dump({"label2id": label2id, "id2label": {str(k): v for k, v in id2label.items()}},
                  f, ensure_ascii=False, indent=2)

    # Test
    if test_s:
        print("\n5. Test değerlendirmesi...")
        test_loader = DataLoader(
            PlantDataset(test_s, processor),
            batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY,
        )
        model.eval()
        tc, tt = 0, 0
        with torch.no_grad():
            for batch in tqdm(test_loader, desc="Test", ncols=80):
                pv     = batch["pixel_values"].to(DEVICE)
                labels = batch["labels"].to(DEVICE)
                out    = model(pixel_values=pv, labels=labels)
                tc    += (out.logits.argmax(-1) == labels).sum().item()
                tt    += labels.size(0)
        print(f"  Test accuracy: {tc/tt:.3f} ({tc/tt*100:.1f}%)")

    print(f"\n{'='*55}")
    print(f"Eğitim tamamlandı!")
    print(f"En iyi val accuracy : {best_val_acc:.3f} ({best_val_acc*100:.1f}%)")
    print(f"Model kaydedildi    : {OUTPUT_DIR.absolute()}")
    print(f"{'='*55}")


if __name__ == "__main__":
    train()
