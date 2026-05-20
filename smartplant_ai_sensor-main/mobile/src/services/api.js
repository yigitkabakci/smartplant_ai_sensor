import axios from 'axios';

export const BASE_URL = 'http://172.20.10.3:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 2000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Mock veri üretici ──
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const MOCK_READINGS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  timestamp: ago((20 - i) * 8),
  moisture_pct:    55 + Math.sin(i * 0.5) * 18,
  temperature_c:   22 + Math.sin(i * 0.3) * 4,
  humidity_pct:    60 + Math.cos(i * 0.4) * 12,
  light_lux:       15000 + Math.sin(i * 0.6) * 8000,
  device_mac:      'AA:BB:CC:DD:EE:01',
}));

const MOCK_ALERTS = [
  { id: 1, level: 'warning',  message: 'Toprak nemi düşük seviyede (%32)', timestamp: ago(15), resolved: false },
  { id: 2, level: 'info',     message: 'Sulama zamanı yaklaşıyor',         timestamp: ago(42), resolved: false },
  { id: 3, level: 'critical', message: 'Sıcaklık kritik seviyede (38°C)',  timestamp: ago(90), resolved: false },
];

const MOCK_PLANTS = [
  { id: 1, name: 'Domates',  min_moisture: 40, max_moisture: 70, ideal_temp_min: 18, ideal_temp_max: 28, device_mac: 'AA:BB:CC:DD:EE:01' },
  { id: 2, name: 'Biber',    min_moisture: 35, max_moisture: 65, ideal_temp_min: 20, ideal_temp_max: 30, device_mac: null },
  { id: 3, name: 'Salatalık',min_moisture: 50, max_moisture: 80, ideal_temp_min: 18, ideal_temp_max: 26, device_mac: null },
];

const MOCK_DEVICES = [
  { mac: 'AA:BB:CC:DD:EE:01', name: 'Toprak Sensörü 1', location: 'Sera A', last_seen: ago(2),  firmware: 'v1.2.0' },
  { mac: 'AA:BB:CC:DD:EE:02', name: 'Hava Sensörü 1',   location: 'Tarla B', last_seen: ago(65), firmware: 'v1.1.3' },
];

const MOCK_WATERING = {
  status: 'watering_needed',
  hours_until_watering: 3.5,
  predicted_watering_time: new Date(Date.now() + 3.5 * 3600000).toISOString(),
  regression: { r_squared: 0.87 },
};

const MOCK_LEAF_HISTORY = [
  { id: 1, timestamp: ago(120), disease: 'Healthy',            confidence: 0.94, image_url: null },
  { id: 2, timestamp: ago(300), disease: 'Bacterial Spot',     confidence: 0.81, image_url: null },
  { id: 3, timestamp: ago(500), disease: 'Early Blight',       confidence: 0.76, image_url: null },
];

// ── Gerçek API'ye bağlan, hata varsa mock döndür ──
const withFallback = (apiFn, mockData) =>
  apiFn().catch(() => mockData);

// ── Sensör ──
export const getSensorReadings = (limit = 20) =>
  withFallback(
    () => api.get(`/api/sensor?limit=${limit}`).then(r => r.data),
    MOCK_READINGS.slice(0, limit)
  );

// ── Uyarılar ──
export const getAlerts = () =>
  withFallback(
    () => api.get('/api/alerts').then(r => r.data),
    MOCK_ALERTS
  );

export const getAlertHistory = (params = {}) => {
  const q = new URLSearchParams({ limit: 50, ...params }).toString();
  return withFallback(
    () => api.get(`/api/alerts/history?${q}`).then(r => r.data),
    MOCK_ALERTS
  );
};

// ── Sulama Tahmini ──
export const predictWatering = (device_mac = null) =>
  withFallback(
    () => api.post('/api/predict-watering', { device_mac, history_hours: 24 }).then(r => r.data),
    MOCK_WATERING
  );

// ── Bitkiler ──
let localPlants = [...MOCK_PLANTS];
let nextPlantId = MOCK_PLANTS.length + 1;

export const getPlants = () =>
  withFallback(
    () => api.get('/api/plants').then(r => r.data),
    [...localPlants]
  );

export const deletePlant = (id) =>
  api.delete(`/api/plants/${id}`).then(r => r.data).catch(() => {
    localPlants = localPlants.filter(p => p.id !== id);
    return { success: true };
  });

export const updatePlant = (id, data) =>
  api.put(`/api/plants/${id}`, data).then(r => r.data).catch(() => {
    const idx = localPlants.findIndex(p => p.id === id);
    if (idx !== -1) localPlants[idx] = { ...localPlants[idx], ...data };
    return localPlants[idx] || { id, ...data };
  });

export const createPlant = (data) =>
  api.post('/api/plants', data).then(r => r.data).catch(() => {
    const newPlant = { id: nextPlantId++, ...data };
    localPlants.push(newPlant);
    return newPlant;
  });

// ── Cihazlar ──
export const getDevices = () =>
  withFallback(
    () => api.get('/api/devices').then(r => r.data),
    MOCK_DEVICES
  );

export const createDevice = (data) =>
  api.post('/api/devices', data).then(r => r.data).catch(() => {
    return { mac: data.mac || 'NEW:DEVICE', ...data };
  });

// ── Yaprak Hastalık ──
export const predictLeafDisease = async (imageUri) => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    const r = await axios.post(`${BASE_URL}/leaf_disease/predict`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return r.data;
  } catch {
    return {
      top_prediction: { disease: 'Healthy', score: 0.91 },
      all_predictions: [
        { disease: 'Healthy',        score: 0.91 },
        { disease: 'Early Blight',   score: 0.06 },
        { disease: 'Bacterial Spot', score: 0.03 },
      ],
      mock: true,
    };
  }
};

// ── Yaprak Geçmişi ──
export const getLeafHistory = (limit = 15) =>
  withFallback(
    () => api.get(`/api/leaf-history?limit=${limit}`).then(r => r.data),
    MOCK_LEAF_HISTORY.slice(0, limit)
  );

export default api;
