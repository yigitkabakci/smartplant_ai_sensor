import io
import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("services.ml_service.load_leaf_model", lambda: None)

    from config import Config
    cfg = Config()
    cfg.UPLOAD_FOLDER = str(tmp_path)
    cfg.DATABASE_PATH = str(tmp_path / "test.db")

    import main as app_module
    monkeypatch.setattr(app_module, "cfg", cfg)

    from main import app

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


def test_homepage(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"html" in resp.content.lower()


def test_leaf_disease_page(client):
    resp = client.get("/leaf_disease")
    assert resp.status_code == 200


def test_sensor_docs_page(client):
    resp = client.get("/sensor_docs")
    assert resp.status_code == 200
    assert b"Ana Sayfaya" in resp.content


def test_leaf_predict_no_file(client):
    resp = client.post("/leaf_disease/predict")
    assert resp.status_code == 422


def test_leaf_predict_invalid_extension(client):
    resp = client.post(
        "/leaf_disease/predict",
        files={"file": ("test.pdf", io.BytesIO(b"fake"), "application/pdf")},
    )
    assert resp.status_code == 400
    assert "geçersiz" in resp.json().get("detail", "").lower()


def test_sensor_post(client):
    payload = {
        "moisture_pct": 45.0,
        "temperature_c": 22.5,
        "humidity_pct": 60.0,
        "light_lux": 500.0,
        "device_mac": None,
    }
    resp = client.post("/api/sensor", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["temperature_c"] == 22.5
    assert data["log_id"] is not None


def test_sensor_post_invalid(client):
    resp = client.post("/api/sensor", json={"moisture_pct": 999, "temperature_c": 25, "humidity_pct": 50})
    assert resp.status_code == 422


def test_sensor_get(client):
    resp = client.get("/api/sensor")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_alerts_empty(client):
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_leaf_history(client):
    resp = client.get("/api/leaf-history")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_devices_empty(client):
    resp = client.get("/api/devices")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_device_register(client):
    payload = {"device_mac": "AA:BB:CC:DD:EE:FF", "plant_name": "Tomato"}
    resp = client.post("/api/devices", json=payload)
    assert resp.status_code == 201
    assert resp.json()["device_mac"] == "AA:BB:CC:DD:EE:FF"


def test_device_register_upsert(client):
    payload = {"device_mac": "AA:BB:CC:DD:EE:FF", "plant_name": "Tomato"}
    client.post("/api/devices", json=payload)
    payload["plant_name"] = "Basil"
    resp = client.post("/api/devices", json=payload)
    assert resp.status_code == 201
    assert resp.json()["plant_name"] == "Basil"


def test_plants_empty(client):
    resp = client.get("/api/plants")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_plant_create(client):
    payload = {"name": "Tomato", "min_moisture": 30.0, "max_moisture": 70.0}
    resp = client.post("/api/plants", json=payload)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Tomato"


def test_plant_duplicate(client):
    payload = {"name": "Basil"}
    client.post("/api/plants", json=payload)
    resp = client.post("/api/plants", json=payload)
    assert resp.status_code == 409


def test_docs_accessible(client):
    resp = client.get("/docs")
    assert resp.status_code == 200


def test_openapi_json(client):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    paths = schema["paths"]
    assert "/" in paths
    assert "/leaf_disease" in paths
    assert "/leaf_disease/predict" in paths
    assert "/api/sensor" in paths
    assert "/api/alerts" in paths
    assert "/api/leaf-history" in paths
    assert "/api/devices" in paths
    assert "/api/plants" in paths
