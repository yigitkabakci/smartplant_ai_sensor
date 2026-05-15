# SmartAgriculture: Akıllı Bitki İzleme ve Hastalık Tespit Sistemi

Tarımsal karar vermeyi destekleyen kapsamlı bir web uygulaması: bitki hastalığı tespiti, optimum tohum ekim rehberliği ve sensör verisi izleme.

## Özellikler

- **Yaprak Hastalığı Tespiti:** Bitki yaprağı görseli yükleyerek MobileNetV2 derin öğrenme modeli ile hastalık analizi
- **Tohum Ekim Rehberliği:** Mahsul türü, bölge, mevsim, toprak tipi, sıcaklık, nem ve pH değerlerine göre tohum boyutu, ekim derinliği ve bitki aralığı tahmini
- **Gerçek Zamanlı Hava Durumu:** Open-Meteo API ile konum bazlı anlık hava verisi (API anahtarı gerektirmez)
- **Sensör Entegrasyonu:** ESP32/Arduino sensörlerinden sıcaklık, nem ve toprak nemi verisi otomatik çekme
- **Sensör & Tahmin Geçmişi:** SQLite veritabanı ile tüm ölçüm ve tahminler saklanır

## Kurulum

1. **Depoyu klonlayın:**
   ```bash
   git clone <repo-url>
   cd SmartAgriculture
   ```

2. **Sanal ortam oluşturun:**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Bağımlılıkları yükleyin:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Ortam değişkenlerini ayarlayın:**
   ```bash
   cp .env.example .env
   # .env dosyasını düzenleyerek SECRET_KEY'i değiştirin
   ```

## Uygulamayı Çalıştırma

```bash
python app.py
```

Tarayıcıda `http://localhost:8000` adresine gidin.

## Testleri Çalıştırma

```bash
pytest tests/
```

## Proje Yapısı

```
SmartAgriculture/
├── app.py                  # Uygulama fabrikası
├── config.py               # Merkezi konfigürasyon
├── routes/
│   ├── main.py             # Ana sayfa ve genel rotalar
│   ├── leaf_disease.py     # Yaprak hastalığı rotaları
│   ├── seed_size.py        # Tohum analizi rotaları
│   └── api.py              # REST API rotaları (hava, toprak, sensör, geçmiş)
├── services/
│   ├── ml_service.py       # ML model yükleme ve tahmin
│   ├── agriculture_data.py # Toprak, bölge, mevsim ve mahsul verileri
│   └── database.py         # SQLite veritabanı işlemleri
├── tests/
│   ├── test_routes.py      # Route testleri
│   └── test_services.py    # Servis katmanı testleri
├── templates/              # HTML şablonları
├── static/                 # CSS, JS, görseller
│   └── js/
│       └── weatherService.js  # Flask proxy üzerinden hava verisi
├── seedSize/sensorData/    # Mock sensör verisi
├── agricultural_models.pkl # Eğitilmiş ML modelleri
├── unique_values.pkl       # Label encoder değerleri
├── .env.example            # Ortam değişkeni şablonu
├── requirements.txt
└── Procfile
```

## Teknik Detaylar

- **Backend:** Flask, Python 3.x
- **ML Modelleri:** MobileNetV2 (Hugging Face), RandomForestClassifier/Regressor (scikit-learn)
- **Veritabanı:** SQLite (sensör ve tahmin geçmişi)
- **Hava Durumu:** Open-Meteo API (ücretsiz, API anahtarı gerektirmez)
- **Frontend:** Bootstrap 5, Chart.js, Tailwind CSS, JavaScript ES6+

## API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/` | GET | Ana sayfa |
| `/leaf_disease/` | GET | Yaprak hastalığı UI |
| `/leaf_disease/predict` | POST | Görsel tahmin |
| `/seed_size/` | GET | Tohum analizi UI |
| `/seed_size/predict` | POST | Tohum tahmini |
| `/sensor_docs` | GET | ESP32 kurulum belgesi |
| `/api/soil-types` | GET | Toprak tipi detayları |
| `/api/weather-proxy` | GET | Hava durumu proxy |
| `/api/sensor-history` | GET | Sensör geçmişi |
| `/api/prediction-history` | GET | Tahmin geçmişi |
| `/sensorData/plant_data.json` | GET | Mock sensör verisi |
| `/api/update-sensor-data` | POST | Mock sensör güncelle |
