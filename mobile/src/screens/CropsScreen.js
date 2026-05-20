import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PlusIcon from 'react-native-heroicons/outline/PlusIcon';
import MagnifyingGlassIcon from 'react-native-heroicons/outline/MagnifyingGlassIcon';
import TrashIcon from 'react-native-heroicons/outline/TrashIcon';
import CameraIcon from 'react-native-heroicons/outline/CameraIcon';
import PhotoIcon from 'react-native-heroicons/outline/PhotoIcon';
import RectangleGroupIcon from 'react-native-heroicons/outline/RectangleGroupIcon';
import SignalIcon from 'react-native-heroicons/outline/SignalIcon';
import BeakerIcon from 'react-native-heroicons/outline/BeakerIcon';
import FireIcon from 'react-native-heroicons/outline/FireIcon';
import XMarkIcon from 'react-native-heroicons/outline/XMarkIcon';
import { getPlants, createPlant, deletePlant, getDevices, getLatestSensorData } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import FallingLeaves from '../components/FallingLeaves';
import PlantDetailModal from '../components/PlantDetailModal';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';

const PLANT_EMOJI_MAP = [
  { keys: ['domates', 'tomato'],                                    emoji: '🍅' },
  { keys: ['biber', 'pepper', 'chili'],                             emoji: '🌶️' },
  { keys: ['salatalık', 'salatalik', 'cucumber'],                   emoji: '🥒' },
  { keys: ['marul', 'lettuce'],                                     emoji: '🥬' },
  { keys: ['soğan', 'sogan', 'onion'],                              emoji: '🧅' },
  { keys: ['sarımsak', 'sarimsak', 'garlic'],                       emoji: '🧄' },
  { keys: ['patates', 'potato'],                                    emoji: '🥔' },
  { keys: ['havuç', 'havuc', 'carrot'],                             emoji: '🥕' },
  { keys: ['brokoli', 'broccoli'],                                  emoji: '🥦' },
  { keys: ['lahana', 'cabbage'],                                    emoji: '🥬' },
  { keys: ['ıspanak', 'ispanak', 'spinach'],                        emoji: '🥬' },
  { keys: ['patlıcan', 'patlican', 'eggplant'],                     emoji: '🍆' },
  { keys: ['kabak', 'zucchini', 'squash'],                          emoji: '🥒' },
  { keys: ['fasulye', 'bean'],                                      emoji: '🫘' },
  { keys: ['bezelye', 'pea'],                                       emoji: '🌿' },
  { keys: ['mısır', 'misir', 'corn'],                               emoji: '🌽' },
  { keys: ['çilek', 'cilek', 'strawberry'],                         emoji: '🍓' },
  { keys: ['karpuz', 'watermelon'],                                 emoji: '🍉' },
  { keys: ['kavun', 'melon'],                                       emoji: '🍈' },
  { keys: ['elma', 'apple'],                                        emoji: '🍎' },
  { keys: ['armut', 'pear'],                                        emoji: '🍐' },
  { keys: ['portakal', 'orange'],                                   emoji: '🍊' },
  { keys: ['limon', 'lemon'],                                       emoji: '🍋' },
  { keys: ['muz', 'banana'],                                        emoji: '🍌' },
  { keys: ['üzüm', 'uzum', 'grape'],                                emoji: '🍇' },
  { keys: ['kiraz', 'cherry'],                                      emoji: '🍒' },
  { keys: ['kayısı', 'kayisi', 'apricot', 'şeftali', 'seftali'],   emoji: '🍑' },
  { keys: ['ananas', 'pineapple'],                                  emoji: '🍍' },
  { keys: ['mantar', 'mushroom'],                                   emoji: '🍄' },
  { keys: ['gül', 'gul', 'rose'],                                   emoji: '🌹' },
  { keys: ['papatya', 'daisy'],                                     emoji: '🌼' },
  { keys: ['çiçek', 'cicek', 'flower'],                             emoji: '🌸' },
  { keys: ['lavanta', 'lavender'],                                  emoji: '🌿' },
  { keys: ['nane', 'mint'],                                         emoji: '🌿' },
  { keys: ['fesleğen', 'feslegen', 'basil'],                        emoji: '🌿' },
  { keys: ['roka', 'arugula'],                                      emoji: '🥬' },
  { keys: ['kereviz', 'celery'],                                    emoji: '🥬' },
  { keys: ['reyhan'],                                               emoji: '🌿' },
];

function getPlantEmoji(name) {
  const lower = (name || '').toLowerCase();
  for (const entry of PLANT_EMOJI_MAP) {
    if (entry.keys.some(k => lower.includes(k))) return entry.emoji;
  }
  return '🌱';
}

const EMPTY_FORM = {
  name: '', min_moisture: '', max_moisture: '',
  ideal_temp_min: '', ideal_temp_max: '', photo_uri: null,
  min_light_lux: '', max_light_lux: '',
};

export default function CropsScreen({ route }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const ACCENT_COLORS = useMemo(() => [
    colors.green, colors.blue, colors.orange, colors.purple, colors.amber, colors.red,
  ], [colors]);

  const [plants, setPlants]         = useState([]);
  const [devices, setDevices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [search, setSearch]         = useState('');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [sensorLoading, setSensorLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([getPlants(), getDevices()]);
      setPlants(p); setDevices(d);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  React.useEffect(() => {
    if (route?.params?.prefilledName) {
      setForm(f => ({ ...f, name: route.params.prefilledName }));
      setModal(true);
    }
  }, [route?.params?.prefilledName]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const pullFromSensor = async () => {
    setSensorLoading(true);
    try {
      const sensor = await getLatestSensorData();
      if (!sensor) { Alert.alert('Uyarı', 'ESP32 verisi bulunamadı. Cihazın bağlı olduğundan emin ol.'); setSensorLoading(false); return; }
      setForm(f => ({
        ...f,
        min_moisture:   sensor.moisture_pct != null ? String(Math.max(0, Math.round(sensor.moisture_pct - 10))) : f.min_moisture,
        max_moisture:   sensor.moisture_pct != null ? String(Math.min(100, Math.round(sensor.moisture_pct + 10))) : f.max_moisture,
        ideal_temp_min: sensor.temperature_c != null ? String(Math.round(sensor.temperature_c - 3)) : f.ideal_temp_min,
        ideal_temp_max: sensor.temperature_c != null ? String(Math.round(sensor.temperature_c + 3)) : f.ideal_temp_max,
      }));
      Alert.alert('✅ Sensör Verileri Alındı', `Nem: ${sensor.moisture_pct?.toFixed(1)}%  Sıcaklık: ${sensor.temperature_c?.toFixed(1)}°C\nDeğerler ±tolerans ile forma yazıldı.`);
    } catch { Alert.alert('Hata', 'Sensör verisi alınamadı.'); }
    setSensorLoading(false);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Kamera erişimi verilmedi.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setForm(f => ({ ...f, photo_uri: result.assets[0].uri }));
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeri erişimi verilmedi.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setForm(f => ({ ...f, photo_uri: result.assets[0].uri }));
  };

  const submit = async () => {
    if (!form.name.trim()) { Alert.alert('Hata', 'Bitki adı zorunlu'); return; }
    setSaving(true);
    try {
      await createPlant({
        name:           form.name.trim(),
        min_moisture:   form.min_moisture   ? parseFloat(form.min_moisture)   : null,
        max_moisture:   form.max_moisture   ? parseFloat(form.max_moisture)   : null,
        ideal_temp_min: form.ideal_temp_min ? parseFloat(form.ideal_temp_min) : null,
        ideal_temp_max: form.ideal_temp_max ? parseFloat(form.ideal_temp_max) : null,
        photo_uri:      form.photo_uri || null,
        min_light_lux:  form.min_light_lux ? parseFloat(form.min_light_lux) : null,
        max_light_lux:  form.max_light_lux ? parseFloat(form.max_light_lux) : null,
      });
      setModal(false); setForm(EMPTY_FORM); fetchAll();
    } catch (e) {
      Alert.alert('Hata', e.response?.data?.detail || 'Bir hata oluştu');
    }
    setSaving(false);
  };

  const confirmDelete = (id, name) => {
    Alert.alert('Bitki Sil', `"${name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deletePlant(id); fetchAll(); } },
    ]);
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );

  return (
    <View style={s.container}>
      <FallingLeaves />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{plants.length}</Text>
            <Text style={s.statLbl}>Toplam Bitki</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.green }]}>{devices.length}</Text>
            <Text style={s.statLbl}>Bağlı Cihaz</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.blue }]}>{plants.length}</Text>
            <Text style={s.statLbl}>Tür</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <View style={s.searchWrap}>
            <MagnifyingGlassIcon size={16} color={colors.sub} strokeWidth={2} />
            <TextInput
              style={s.searchInput}
              placeholder="Bitki ara..."
              placeholderTextColor={colors.sub}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
            <PlusIcon size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconBox}>
              <RectangleGroupIcon size={40} color={colors.sub} strokeWidth={1.2} />
            </View>
            <Text style={s.emptyTitle}>Henüz bitki eklenmedi</Text>
            <Text style={s.emptySub}>İlk bitkini eklemek için Ekle butonuna tıkla</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setModal(true)}>
              <PlusIcon size={16} color="#fff" strokeWidth={2.5} />
              <Text style={s.emptyBtnText}>Bitki Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((p, i) => {
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
            const dc = devices.filter(d => d.plant_type_id === p.id).length;
            return (
              <TouchableOpacity key={p.id} activeOpacity={0.82} onPress={() => setSelectedPlant(p)}>
                <View style={[s.plantCard, { borderLeftColor: accent }]}>
                  {p.photo_uri ? (
                    <Image source={{ uri: p.photo_uri }} style={s.plantPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[s.plantIconBox, { backgroundColor: `${accent}18` }]}>
                      <Text style={s.plantEmoji}>{getPlantEmoji(p.name)}</Text>
                    </View>
                  )}
                  <View style={s.plantInfo}>
                    <View style={s.plantHeader}>
                      <Text style={s.plantName} numberOfLines={1}>{p.name}</Text>
                      <Badge label={dc > 0 ? `${dc} Cihaz` : 'Cihaz Yok'} variant={dc > 0 ? 'green' : 'gray'} />
                    </View>
                    <View style={s.plantMetrics}>
                      <View style={s.metricChip}>
                        <BeakerIcon size={11} color={colors.blue} strokeWidth={2} />
                        <Text style={[s.metricText, { color: colors.blue }]}>
                          {p.min_moisture?.toFixed(0) ?? '--'}–{p.max_moisture?.toFixed(0) ?? '--'}%
                        </Text>
                      </View>
                      <View style={s.metricChip}>
                        <FireIcon size={11} color={colors.orange} strokeWidth={2} />
                        <Text style={[s.metricText, { color: colors.orange }]}>
                          {p.ideal_temp_min?.toFixed(0) ?? '--'}–{p.ideal_temp_max?.toFixed(0) ?? '--'}°C
                        </Text>
                      </View>
                      {dc > 0 && (
                        <View style={s.metricChip}>
                          <SignalIcon size={11} color={colors.green} strokeWidth={2} />
                          <Text style={[s.metricText, { color: colors.green }]}>{dc}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => confirmDelete(p.id, p.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <TrashIcon size={16} color={colors.sub} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Yeni Bitki Ekle</Text>
              <TouchableOpacity onPress={() => { setModal(false); setForm(EMPTY_FORM); }}>
                <XMarkIcon size={22} color={colors.sub2} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Fotoğraf (İsteğe Bağlı)</Text>
              {form.photo_uri ? (
                <View style={s.photoPreviewWrap}>
                  <Image source={{ uri: form.photo_uri }} style={s.photoPreview} resizeMode="cover" />
                  <TouchableOpacity style={s.removePhotoBtn} onPress={() => setForm(f => ({ ...f, photo_uri: null }))}>
                    <XMarkIcon size={12} color="#fff" strokeWidth={2.5} />
                    <Text style={{ color: '#fff', fontSize: Typography.xs, fontWeight: '700' }}>Kaldır</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.photoBtnRow}>
                  <TouchableOpacity style={s.photoPickBtn} onPress={pickFromCamera}>
                    <CameraIcon size={26} color={colors.sub2} strokeWidth={1.5} />
                    <Text style={s.photoPickText}>Kamera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoPickBtn} onPress={pickFromGallery}>
                    <PhotoIcon size={26} color={colors.sub2} strokeWidth={1.5} />
                    <Text style={s.photoPickText}>Galeri</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* ESP32'den veri al */}
              <TouchableOpacity
                style={[s.sensorBtn, sensorLoading && { opacity: 0.6 }]}
                onPress={pullFromSensor}
                disabled={sensorLoading}
              >
                <SignalIcon size={16} color={colors.green} strokeWidth={2} />
                <Text style={[s.sensorBtnText, { color: colors.green }]}>
                  {sensorLoading ? 'Veri alınıyor...' : 'ESP32\'den Değerleri Al'}
                </Text>
              </TouchableOpacity>

              <Text style={[s.inputLabel, { marginTop: 14 }]}>Bitki Adı *</Text>
              <TextInput
                style={s.input} placeholder="örn. Domates"
                placeholderTextColor={colors.sub} value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />
              <View style={s.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Min. Nem (%)</Text>
                  <TextInput style={s.input} placeholder="20" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.min_moisture}
                    onChangeText={v => setForm(f => ({ ...f, min_moisture: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Max. Nem (%)</Text>
                  <TextInput style={s.input} placeholder="80" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.max_moisture}
                    onChangeText={v => setForm(f => ({ ...f, max_moisture: v }))} />
                </View>
              </View>
              <View style={s.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Min. Sıcaklık (°C)</Text>
                  <TextInput style={s.input} placeholder="15" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.ideal_temp_min}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_min: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Max. Sıcaklık (°C)</Text>
                  <TextInput style={s.input} placeholder="30" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.ideal_temp_max}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_max: v }))} />
                </View>
              </View>
              <View style={s.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Min. Işık (lux)</Text>
                  <TextInput style={s.input} placeholder="1000" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.min_light_lux}
                    onChangeText={v => setForm(f => ({ ...f, min_light_lux: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Max. Işık (lux)</Text>
                  <TextInput style={s.input} placeholder="50000" keyboardType="decimal-pad"
                    placeholderTextColor={colors.sub} value={form.max_light_lux}
                    onChangeText={v => setForm(f => ({ ...f, max_light_lux: v }))} />
                </View>
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setModal(false); setForm(EMPTY_FORM); }}>
                  <Text style={s.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={submit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnText}>Kaydet</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PlantDetailModal
        plant={selectedPlant}
        onClose={() => setSelectedPlant(null)}
        onUpdated={() => { fetchAll(); setSelectedPlant(null); }}
      />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    scroll:      { flex: 1 },
    content:     { padding: 16, paddingBottom: 40 },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

    statsRow:    { flexDirection: 'row', backgroundColor: C.card, borderRadius: Radius.lg, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
    statBox:     { flex: 1, alignItems: 'center' },
    statNum:     { fontSize: Typography.xxl, fontWeight: '800', color: C.cream },
    statLbl:     { fontSize: Typography.xs, color: C.sub2, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 8 },

    actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
    searchWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: Radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: Typography.base, color: C.cream },
    addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
    addBtnText:  { color: '#fff', fontWeight: '700', fontSize: Typography.base },

    emptyCard:    { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyIconBox: { width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 4 },
    emptyTitle:   { fontSize: Typography.lg, fontWeight: '700', color: C.cream },
    emptySub:     { fontSize: Typography.sm, color: C.sub2, textAlign: 'center', lineHeight: 18 },
    emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },

    plantCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, padding: 12, marginBottom: 10,
    },
    plantPhoto:   { width: 52, height: 52, borderRadius: Radius.md },
    plantIconBox: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    plantEmoji:   { fontSize: 28 },
    plantInfo:    { flex: 1 },
    plantHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    plantName:    { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1, marginRight: 8 },
    plantMetrics: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    metricChip:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metricText:   { fontSize: Typography.xs, fontWeight: '700' },
    deleteBtn:    { padding: 4 },

    sensorBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: C.green, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4 },
    sensorBtnText: { fontSize: Typography.sm, fontWeight: '700' },
    photoBtnRow:      { flexDirection: 'row', gap: 12, marginBottom: 4 },
    photoPickBtn:     { flex: 1, backgroundColor: C.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, paddingVertical: 14, alignItems: 'center', gap: 6 },
    photoPickText:    { fontSize: Typography.sm, color: C.sub2, fontWeight: '600' },
    photoPreviewWrap: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: 4, height: 140 },
    photoPreview:     { width: '100%', height: '100%' },
    removePhotoBtn:   { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox:     { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: Typography.lg, fontWeight: '700', color: C.cream },
    inputLabel:   { fontSize: Typography.xs, fontWeight: '600', color: C.sub2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input:        { backgroundColor: C.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: C.cream, marginBottom: 14 },
    inputRow:     { flexDirection: 'row' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
    cancelBtn:    { flex: 1, backgroundColor: C.card2, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
    cancelBtnText:{ color: C.sub2, fontWeight: '600' },
    saveBtn:      { flex: 1, backgroundColor: C.green, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
    saveBtnText:  { color: '#fff', fontWeight: '700' },
  });
}
