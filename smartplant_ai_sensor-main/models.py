from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint,
    Boolean, Enum as SAEnum
)
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()


class UserRole(enum.Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class PlantLibrary(Base):
    __tablename__ = "plant_library"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    min_moisture = Column(Float, nullable=True)
    max_moisture = Column(Float, nullable=True)
    ideal_temp_min = Column(Float, nullable=True)
    ideal_temp_max = Column(Float, nullable=True)
    min_humidity = Column(Float, nullable=True)
    max_humidity = Column(Float, nullable=True)
    min_light_lux = Column(Float, nullable=True)
    max_light_lux = Column(Float, nullable=True)

    devices = relationship("Device", back_populates="plant_type")


class Device(Base):
    __tablename__ = "devices"

    device_mac = Column(String, primary_key=True)
    plant_name = Column(String, nullable=True)
    plant_type_id = Column(Integer, ForeignKey("plant_library.id"), nullable=True)
    last_sync = Column(DateTime, default=datetime.utcnow)

    plant_type = relationship("PlantLibrary", back_populates="devices")
    sensor_readings = relationship("SensorReading", back_populates="device")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    device_mac = Column(String, ForeignKey("devices.device_mac"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    moisture_pct = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    light_lux = Column(Float, nullable=True)

    device = relationship("Device", back_populates="sensor_readings")


class LeafAnalysis(Base):
    __tablename__ = "leaf_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_path = Column(String, nullable=True)
    label = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_mac = Column(String, ForeignKey("devices.device_mac"), nullable=True)
    alert_type = Column(String, nullable=False)   # "Moisture" | "Temperature" | "Humidity" | "Light"
    severity = Column(String, nullable=False)      # "Critical" | "Warning" | "Info"
    message = Column(String, nullable=False)
    sensor_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    device = relationship("Device")
