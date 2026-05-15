"""
Sulama Tahmin Servisi — Birim ve Entegrasyon Testleri
=====================================================
prediction_service.py içindeki tüm kritik yollar test edilir:
  - Negatif eğim → tahmin üretilmesi
  - Pozitif/sıfır eğim → NoDeclineError
  - Yetersiz veri → InsufficientDataError
  - Eşik zaten aşılmış → ValueError
  - Bitki kütüphanesi eşik entegrasyonu
  - FastAPI endpoint yanıt doğrulaması
"""

import sys
import os
import pytest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import database
from services.prediction_service import (
    predict_next_watering,
    InsufficientDataError,
    NoDeclineError,
    _fit_linear_regression,
    _predict_crossing_time,
    RegressionResult,
    MIN_DATA_POINTS,
)
from models import SensorReading, Device, PlantLibrary


@pytest.fixture
def db_session(tmp_path):
    db_path = str(tmp_path / "pred_test.db")
    database.init_db(db_path)
    session = database.SessionLocal()
    yield session
    session.close()


def _insert_readings(session, count: int, start_moisture: float, slope_per_hour: float):
    """
    Belirtilen eğimde yapay sensör verisi oluşturur.
    Her kayıt 1 saat arayla eklenir.
    """
    now = datetime.utcnow()
    for i in range(count):
        ts = now - timedelta(hours=(count - 1 - i))
        moisture = start_moisture + slope_per_hour * i
        session.add(SensorReading(
            moisture_pct=max(0.0, moisture),
            temperature_c=22.0,
            humidity_pct=55.0,
            timestamp=ts,
        ))
    session.commit()


# ---------------------------------------------------------------------------
# _fit_linear_regression — birim testleri
# ---------------------------------------------------------------------------

class TestFitLinearRegression:

    def test_perfect_decline(self):
        """Mükemmel negatif eğimde R²=1.0 beklenir."""
        now = datetime.utcnow()
        timestamps = [now + timedelta(hours=i) for i in range(5)]
        moistures = [60.0, 55.0, 50.0, 45.0, 40.0]
        result = _fit_linear_regression(timestamps, moistures)
        assert result.slope < 0
        assert result.r_squared > 0.99
        assert result.data_points == 5

    def test_flat_trend(self):
        """Sabit nem değerlerinde eğim sıfıra yakın olmalı."""
        now = datetime.utcnow()
        timestamps = [now + timedelta(hours=i) for i in range(4)]
        moistures = [50.0, 50.0, 50.0, 50.0]
        result = _fit_linear_regression(timestamps, moistures)
        assert abs(result.slope) < 0.01

    def test_positive_slope(self):
        """Artan nem → pozitif eğim."""
        now = datetime.utcnow()
        timestamps = [now + timedelta(hours=i) for i in range(4)]
        moistures = [30.0, 40.0, 50.0, 60.0]
        result = _fit_linear_regression(timestamps, moistures)
        assert result.slope > 0

    def test_r_squared_bounds(self):
        """R² her zaman [0, 1] aralığında olmalı."""
        now = datetime.utcnow()
        timestamps = [now + timedelta(hours=i) for i in range(6)]
        moistures = [50.0, 48.0, 51.0, 47.0, 49.0, 46.0]
        result = _fit_linear_regression(timestamps, moistures)
        assert 0.0 <= result.r_squared <= 1.0


# ---------------------------------------------------------------------------
# _predict_crossing_time — birim testleri
# ---------------------------------------------------------------------------

class TestPredictCrossingTime:

    def make_regression(self, slope: float, intercept: float) -> RegressionResult:
        return RegressionResult(slope=slope, intercept=intercept, r_squared=0.95, data_points=10)

    def test_valid_prediction(self):
        """Negatif eğimde gelecekteki bir zaman döndürülmeli."""
        reg = self.make_regression(slope=-5.0, intercept=60.0)
        ref = datetime.utcnow()
        dt, hours = _predict_crossing_time(
            regression=reg,
            reference_time=ref,
            t_last_hours=5.0,
            threshold=25.0,
            current_moisture=35.0,
        )
        assert hours > 0
        assert dt > datetime.utcnow()

    def test_no_decline_raises(self):
        """Eğim ≥ 0 → NoDeclineError."""
        reg = self.make_regression(slope=0.5, intercept=40.0)
        with pytest.raises(NoDeclineError):
            _predict_crossing_time(
                regression=reg,
                reference_time=datetime.utcnow(),
                t_last_hours=3.0,
                threshold=25.0,
                current_moisture=45.0,
            )

    def test_threshold_already_breached(self):
        """Eşik zaten aşılmışsa ValueError."""
        reg = self.make_regression(slope=-5.0, intercept=60.0)
        with pytest.raises(ValueError):
            _predict_crossing_time(
                regression=reg,
                reference_time=datetime.utcnow(),
                t_last_hours=10.0,
                threshold=25.0,
                current_moisture=10.0,
            )


# ---------------------------------------------------------------------------
# predict_next_watering — entegrasyon testleri
# ---------------------------------------------------------------------------

class TestPredictNextWatering:

    def test_declining_moisture_produces_prediction(self, db_session):
        """Negatif trendde tahmin zamanı döndürülmeli."""
        _insert_readings(db_session, count=10, start_moisture=60.0, slope_per_hour=-3.5)
        result = predict_next_watering(db=db_session, device_mac=None)
        assert result["status"] == "watering_predicted"
        assert result["predicted_watering_time"] is not None
        assert result["hours_until_watering"] > 0
        assert result["regression"]["slope_per_hour"] < 0

    def test_stable_moisture_no_watering(self, db_session):
        """Sabit/artan trendde sulama gerekmemeli."""
        _insert_readings(db_session, count=8, start_moisture=55.0, slope_per_hour=1.0)
        result = predict_next_watering(db=db_session, device_mac=None)
        assert result["status"] == "no_watering_needed"
        assert result["predicted_watering_time"] is None
        assert result["hours_until_watering"] is None

    def test_insufficient_data_raises(self, db_session):
        """MIN_DATA_POINTS'ten az veri → InsufficientDataError."""
        _insert_readings(db_session, count=MIN_DATA_POINTS - 1, start_moisture=50.0, slope_per_hour=-2.0)
        with pytest.raises(InsufficientDataError):
            predict_next_watering(db=db_session, device_mac=None)

    def test_empty_db_raises(self, db_session):
        """Hiç veri yokken InsufficientDataError."""
        with pytest.raises(InsufficientDataError):
            predict_next_watering(db=db_session, device_mac=None)

    def test_plant_library_threshold_used(self, db_session):
        """Bitki kütüphanesindeki min_moisture eşik olarak kullanılmalı."""
        plant = PlantLibrary(name="Orchid", min_moisture=40.0, max_moisture=70.0)
        db_session.add(plant)
        db_session.commit()

        device = Device(device_mac="DE:AD:BE:EF:00:01", plant_type_id=plant.id)
        db_session.add(device)
        db_session.commit()

        # 10 kayıt × (-1.5/h) → son nem = 85 - 13.5 = 71.5% > 40% eşiği
        _insert_readings(db_session, count=10, start_moisture=85.0, slope_per_hour=-1.5)
        for row in db_session.query(SensorReading).all():
            row.device_mac = "DE:AD:BE:EF:00:01"
        db_session.commit()

        result = predict_next_watering(db=db_session, device_mac="DE:AD:BE:EF:00:01")
        assert result["critical_threshold_pct"] == 40.0

    def test_regression_metrics_present(self, db_session):
        """Yanıtta regresyon metrikleri eksiksiz olmalı."""
        _insert_readings(db_session, count=12, start_moisture=65.0, slope_per_hour=-2.0)
        result = predict_next_watering(db=db_session, device_mac=None)
        reg = result["regression"]
        assert "slope_per_hour" in reg
        assert "intercept" in reg
        assert "r_squared" in reg
        assert "data_points" in reg
        assert reg["data_points"] == 12


# ---------------------------------------------------------------------------
# FastAPI endpoint — HTTP düzeyi testleri
# ---------------------------------------------------------------------------

from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("services.ml_service.load_leaf_model", lambda: None)

    from config import Config
    cfg = Config()
    cfg.UPLOAD_FOLDER = str(tmp_path)
    cfg.DATABASE_PATH = str(tmp_path / "route_test.db")

    import main as app_module
    monkeypatch.setattr(app_module, "cfg", cfg)

    from main import app
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


class TestPredictWateringEndpoint:

    def test_insufficient_data_returns_422(self, client):
        resp = client.post("/api/predict-watering", json={"device_mac": None})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error"] == "insufficient_data"

    def test_declining_data_returns_200(self, client):
        from services import database
        session = database.SessionLocal()
        _insert_readings(session, count=10, start_moisture=60.0, slope_per_hour=-3.0)
        session.close()

        resp = client.post("/api/predict-watering", json={"device_mac": None})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "watering_predicted"
        assert data["predicted_watering_time"] is not None
        assert data["regression"]["r_squared"] >= 0.0

    def test_stable_data_returns_200_no_watering(self, client):
        from services import database
        session = database.SessionLocal()
        _insert_readings(session, count=8, start_moisture=55.0, slope_per_hour=0.5)
        session.close()

        resp = client.post("/api/predict-watering", json={"device_mac": None})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "no_watering_needed"
        assert data["predicted_watering_time"] is None
