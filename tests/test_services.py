import sys
import os
import pytest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import database
from models import SensorReading, LeafAnalysis, PlantLibrary, Device


@pytest.fixture
def db_session(tmp_path):
    db_path = str(tmp_path / "test.db")
    database.init_db(db_path)
    session = database.SessionLocal()
    yield session
    session.close()


def test_sensor_reading_save_and_retrieve(db_session):
    row = SensorReading(
        moisture_pct=45.0,
        temperature_c=22.5,
        humidity_pct=60.0,
        light_lux=500.0,
        timestamp=datetime.utcnow(),
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)

    assert row.log_id is not None
    assert row.temperature_c == 22.5

    result = db_session.query(SensorReading).filter(SensorReading.log_id == row.log_id).first()
    assert result.moisture_pct == 45.0


def test_sensor_reading_multiple(db_session):
    for i in range(5):
        db_session.add(SensorReading(
            moisture_pct=float(i * 10),
            temperature_c=20.0 + i,
            humidity_pct=50.0,
            timestamp=datetime.utcnow(),
        ))
    db_session.commit()

    rows = db_session.query(SensorReading).order_by(SensorReading.log_id.desc()).limit(3).all()
    assert len(rows) == 3


def test_leaf_analysis_save_and_retrieve(db_session):
    record = LeafAnalysis(
        image_path="/static/uploads/leaf.jpg",
        label="Healthy",
        confidence=0.97,
        timestamp=datetime.utcnow(),
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)

    assert record.id is not None
    result = db_session.query(LeafAnalysis).first()
    assert result.label == "Healthy"
    assert abs(result.confidence - 0.97) < 0.001


def test_plant_library_unique_constraint(db_session):
    from sqlalchemy.exc import IntegrityError

    db_session.add(PlantLibrary(name="Tomato", min_moisture=30.0, max_moisture=70.0))
    db_session.commit()

    db_session.add(PlantLibrary(name="Tomato"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_device_sensor_relationship(db_session):
    plant = PlantLibrary(name="Basil", min_moisture=40.0, max_moisture=80.0)
    db_session.add(plant)
    db_session.commit()

    device = Device(device_mac="AA:BB:CC:DD:EE:FF", plant_name="Basil", plant_type_id=plant.id)
    db_session.add(device)
    db_session.commit()

    reading = SensorReading(
        device_mac="AA:BB:CC:DD:EE:FF",
        moisture_pct=55.0,
        temperature_c=24.0,
        humidity_pct=65.0,
        timestamp=datetime.utcnow(),
    )
    db_session.add(reading)
    db_session.commit()
    db_session.refresh(device)

    assert len(device.sensor_readings) == 1
    assert device.sensor_readings[0].moisture_pct == 55.0


def test_empty_tables(db_session):
    assert db_session.query(SensorReading).count() == 0
    assert db_session.query(LeafAnalysis).count() == 0
    assert db_session.query(PlantLibrary).count() == 0
    assert db_session.query(Device).count() == 0
