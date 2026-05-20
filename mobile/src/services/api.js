import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export const BASE_URL = API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Sensör ──
export const getSensorReadings = (limit = 20) =>
  api.get(`/api/sensor?limit=${limit}`).then(r => r.data).catch(() => []);

// ── Uyarılar ──
export const getAlerts = () =>
  api.get('/api/alerts').then(r => r.data).catch(() => []);

export const getAlertHistory = (params = {}) => {
  const q = new URLSearchParams({ limit: 50, ...params }).toString();
  return api.get(`/api/alerts/history?${q}`).then(r => r.data).catch(() => []);
};

// ── Sulama Tahmini ──
export const predictWatering = (device_mac = null) =>
  api.post('/api/predict-watering', { device_mac, history_hours: 24 }).then(r => r.data).catch(() => null);

// ── Bitkiler ──
export const getPlants = () =>
  api.get('/api/plants').then(r => r.data).catch(() => []);

export const deletePlant = (id) =>
  api.delete(`/api/plants/${id}`).then(r => r.data);

export const updatePlant = (id, data) =>
  api.put(`/api/plants/${id}`, data).then(r => r.data);

export const createPlant = (data) =>
  api.post('/api/plants', data).then(r => r.data);

// ── Cihazlar ──
export const getDevices = () =>
  api.get('/api/devices').then(r => r.data).catch(() => []);

export const createDevice = (data) =>
  api.post('/api/devices', data).then(r => r.data);

// ── Yaprak Hastalık ──
export const predictLeafDisease = async (imageUri, plantId = null, plantName = null) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  formData.append('file', {
    uri: imageUri,
    name: filename,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  if (plantId   != null) formData.append('plant_id',   String(plantId));
  if (plantName != null) formData.append('plant_name', plantName);
  const r = await axios.post(`${BASE_URL}/predict-disease`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return r.data;
};

// ── Yaprak Geçmişi ──
export const getLeafHistory = (limit = 15, plantId = null) => {
  const q = plantId != null ? `&plant_id=${plantId}` : '';
  return api.get(`/api/leaf-history?limit=${limit}${q}`).then(r => r.data).catch(() => []);
};

// ── Sensör Analizi ──
export const analyzeSensorData = (plant, sensorData) =>
  api.post('/api/analyze-sensor-data', { plant, sensor_data: sensorData }).then(r => r.data);

// ── Hava Durumu ──
export const getWeather = () =>
  api.get('/api/weather').then(r => r.data).catch(() => null);

// ── Bitki Detayı ──
export const getPlantDetail = (plantId) =>
  api.get(`/api/plants/${plantId}/detail`).then(r => r.data);

// ── Son Sensör Verisi ──
export const getLatestSensorData = (device_mac = null) => {
  const q = device_mac ? `?device_mac=${encodeURIComponent(device_mac)}` : '';
  return api.get(`/api/latest-data${q}`).then(r => r.data).catch(() => null);
};

export default api;
