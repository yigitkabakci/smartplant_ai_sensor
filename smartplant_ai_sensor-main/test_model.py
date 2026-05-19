"""
Eğitilmiş modeli test eder.
Kullanım: python test_model.py
"""
import json
import torch
from pathlib import Path
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

MODEL_DIR = Path("models/leaf_disease_model")

print("Model yükleniyor...")
processor = AutoImageProcessor.from_pretrained(MODEL_DIR)
model = AutoModelForImageClassification.from_pretrained(MODEL_DIR)
model.eval()
print("Model hazır!\n")

with open(MODEL_DIR / "label_map.json", encoding="utf-8") as f:
    label_map = json.load(f)
id2label = label_map["id2label"]


def predict(image_path: str):
    img = Image.open(image_path).convert("RGB")
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]
    top5 = torch.topk(probs, 5)
    print(f"\nGörüntü: {image_path}")
    print("-" * 50)
    for score, idx in zip(top5.values, top5.indices):
        label = id2label[str(idx.item())]
        print(f"  {label:<45} %{score.item()*100:.2f}")


# Her sınıftan 1 örnek alarak doğruluğu ölç
import random
base = Path(r"C:\Users\yigit\Downloads\archive (1)\New Plant Diseases Dataset(Augmented)\New Plant Diseases Dataset(Augmented)\valid")

correct = 0
total = 0
wrong_list = []

if base.exists():
    class_dirs = [d for d in base.iterdir() if d.is_dir()]
    print(f"{len(class_dirs)} sınıf test ediliyor (her sınıftan 3 görüntü)...\n")
    for class_dir in class_dirs:
        images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.JPG")) + list(class_dir.glob("*.png"))
        if not images:
            continue
        samples = random.sample(images, min(3, len(images)))
        for img_path in samples:
            true_label = class_dir.name
            img = Image.open(img_path).convert("RGB")
            inputs = processor(images=img, return_tensors="pt")
            with torch.no_grad():
                logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)[0]
            pred_id = probs.argmax().item()
            pred_label = id2label[str(pred_id)]
            confidence = probs[pred_id].item() * 100
            is_correct = pred_label == true_label
            if is_correct:
                correct += 1
            else:
                wrong_list.append((true_label, pred_label, confidence))
            total += 1

    print(f"\n{'='*55}")
    print(f"SONUÇ: {correct}/{total} doğru")
    print(f"Doğruluk: %{correct/total*100:.2f}")
    print(f"{'='*55}")
    if wrong_list:
        print(f"\nYanlış tahminler ({len(wrong_list)} adet):")
        for true, pred, conf in wrong_list[:10]:
            print(f"  Gerçek: {true}")
            print(f"  Tahmin: {pred} (%{conf:.1f})")
            print()
else:
    print("Validation klasörü bulunamadı.")
