from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional


# --- Sensor ---

class SensorReadingCreate(BaseModel):
    moisture_pct: float = Field(..., ge=0, le=100, description="Toprak nemi yüzdesi")
    temperature_c: float = Field(..., ge=-50, le=100, description="Sıcaklık (°C)")
    humidity_pct: float = Field(..., ge=0, le=100, description="Hava nemi (%)")
    light_lux: Optional[float] = Field(None, ge=0, description="Işık yoğunluğu (lux)")
    device_mac: Optional[str] = None


class SensorReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: int
    device_mac: Optional[str]
    timestamp: datetime
    moisture_pct: Optional[float]
    temperature_c: Optional[float]
    humidity_pct: Optional[float]
    light_lux: Optional[float]


# --- Leaf Disease ---

class DiseaseResult(BaseModel):
    disease: str
    confidence: str
    score: float


class LeafAnalysisResponse(BaseModel):
    success: bool
    predictions: List[DiseaseResult]
    top_prediction: DiseaseResult
    image_path: str


# --- Alerts ---

class AlertResponse(BaseModel):
    level: str = Field(..., description="'info' | 'warning' | 'critical'")
    message: str
    timestamp: str


class AlertDbResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_mac: Optional[str]
    alert_type: str
    severity: str
    message: str
    sensor_value: Optional[float]
    threshold_value: Optional[float]
    timestamp: datetime


# --- Leaf Analysis History ---

class LeafAnalysisHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_path: Optional[str]
    label: Optional[str]
    confidence: Optional[float]
    timestamp: datetime


# --- Device ---

class DeviceCreate(BaseModel):
    device_mac: str
    plant_name: Optional[str] = None
    plant_type_id: Optional[int] = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_mac: str
    plant_name: Optional[str]
    plant_type_id: Optional[int]
    last_sync: Optional[datetime]


# --- Watering Prediction ---

class WateringPredictionRequest(BaseModel):
    device_mac: Optional[str] = Field(
        None,
        description="Tahmin yapılacak ESP32 cihazının MAC adresi. "
                    "Boş bırakılırsa tüm cihazların verisi kullanılır.",
    )
    history_hours: int = Field(
        24, ge=1, le=168,
        description="Geriye dönük kaç saatlik veri kullanılacağı (1–168).",
    )


class RegressionMetrics(BaseModel):
    slope_per_hour: float = Field(
        ..., description="Regresyon eğimi: saat başına nem değişimi (Δ%/h)."
    )
    intercept: float = Field(
        ..., description="y-kesim noktası: t=0 anındaki tahmin edilen nem (%)."
    )
    r_squared: float = Field(
        ..., ge=0.0, le=1.0,
        description="Determinasyon katsayısı R². 1'e yakın → yüksek doğrusal uyum.",
    )
    data_points: int = Field(
        ..., description="Hesaplamada kullanılan örneklem sayısı."
    )


class WateringPredictionResponse(BaseModel):
    device_mac: Optional[str]
    status: str = Field(
        ..., description="'watering_predicted' | 'no_watering_needed'"
    )
    message: str
    current_moisture_pct: float
    critical_threshold_pct: float
    regression: RegressionMetrics
    predicted_watering_time: Optional[str] = Field(
        None, description="ISO 8601 UTC; status='watering_predicted' ise dolu gelir."
    )
    hours_until_watering: Optional[float] = Field(
        None, description="Şu andan tahmini sulama zamanına kalan süre (saat)."
    )


# --- Plant Library ---

class PlantLibraryCreate(BaseModel):
    name: str
    min_moisture: Optional[float] = None
    max_moisture: Optional[float] = None
    ideal_temp_min: Optional[float] = None
    ideal_temp_max: Optional[float] = None


class PlantLibraryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    min_moisture: Optional[float]
    max_moisture: Optional[float]
    ideal_temp_min: Optional[float]
    ideal_temp_max: Optional[float]
