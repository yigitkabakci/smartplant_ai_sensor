import axios from 'axios';

// ── Değiştir: sunucunun IP'si ──
// Telefon ve bilgisayar aynı Wi-Fi'da olmalı.
// "localhost" yerine bilgisayarın yerel IP adresini yaz.
// Örnek: http://192.168.1.42:8000
export const BASE_URL = 'http://172.20.10.3:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Sensör ──
export const getSensorReadings = (limit = 20) =>
  api.get(`/api/sensor?limit=${limit}`).then(r => r.data);

// ── Uyarılar ──
export const getAlerts = () =>
  api.get('/api/alerts').then(r => r.data);

export const getAlertHistory = (params = {}) => {
  const q = new URLSearchParams({ limit: 50, ...params }).toString();
  return api.get(`/api/alerts/history?${q}`).then(r => r.data);
};

// ── Sulama Tahmini ──
export const predictWatering = (device_mac = null) =>
  api.post('/api/predict-watering', { device_mac, history_hours: 24 }).then(r => r.data);

// ── Bitkiler ──
export const getPlants = () =>
  api.get('/api/plants').then(r => r.data);

export const createPlant = (data) =>
  api.post('/api/plants', data).then(r => r.data);

// ── Cihazlar ──
export const getDevices = () =>
  api.get('/api/devices').then(r => r.data);

export const createDevice = (data) =>
  api.post('/api/devices', data).then(r => r.data);

// ── Yaprak Hastalık ──
export const predictLeafDisease = async (imageUri) => {
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
};

// ── Yaprak Geçmişi ──
export const getLeafHistory = (limit = 15) =>
  api.get(`/api/leaf-history?limit=${limit}`).then(r => r.data);

export default api;
