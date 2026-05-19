import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getPlants, createPlant, deletePlant, getDevices } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import FallingLeaves from '../components/FallingLeaves';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';

const EMOJIS      = ['🌿','🌸','🍅','🥬','🌾','💧','🌱','🍇','🌻','🫑','🥦','🍆'];
const CARD_COLORS = ['#16a34a','#7c3aed','#dc2626','#0284c7','#d97706','#059669'];

const EMPTY_FORM = {
  name: '', min_moisture: '', max_moisture: '',
  ideal_temp_min: '', ideal_temp_max: '', photo_uri: null,
};

export default function CropsScreen() {
  const [plants, setPlants]     = useState([]);
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);
  const [search, setSearch]     = useState('');
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([getPlants(), getDevices()]);
      setPlants(p); setDevices(d);
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Fotoğraf seçimi ──
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi verilmedi.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setForm(f => ({ ...f, photo_uri: result.assets[0].uri }));
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi verilmedi.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setForm(f => ({ ...f, photo_uri: result.assets[0].uri }));
  };

  // ── Kaydet ──
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
      });
      setModal(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (e) {
      Alert.alert('Hata', e.response?.data?.detail || 'Bir hata oluştu');
    }
    setSaving(false);
  };

  // ── Sil ──
  const confirmDelete = (id, name) => {
    Alert.alert(
      'Bitki Sil',
      `"${name}" bitkisini silmek istediğine emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: async () => {
            await deletePlant(id);
            fetchAll();
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.gold} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FallingLeaves />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{plants.length}</Text>
            <Text style={styles.statLbl}>Toplam Bitki</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.green }]}>{devices.length}</Text>
            <Text style={styles.statLbl}>Bağlı Cihaz</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.blue }]}>{plants.length}</Text>
            <Text style={styles.statLbl}>Tür</Text>
          </View>
        </View>

        {/* Search + Add */}
        <View style={styles.actionRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Bitki ara..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Plant Cards */}
        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>🌱</Text>
            <Text style={styles.emptyTitle}>Henüz bitki eklenmedi</Text>
            <Text style={styles.emptySub}>İlk bitkini eklemek için "+ Ekle" butonuna tıkla</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModal(true)}>
              <Text style={styles.emptyBtnText}>Bitki Ekle</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          filtered.map((p, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            const emoji = EMOJIS[i % EMOJIS.length];
            const dc = devices.filter(d => d.plant_type_id === p.id).length;
            return (
              <Card key={p.id} style={styles.plantCard}>
                {/* Banner — fotoğraf varsa göster */}
                <View style={[styles.plantBanner, { backgroundColor: color }]}>
                  {p.photo_uri ? (
                    <Image
                      source={{ uri: p.photo_uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.bannerOverlay} />
                  <Text style={styles.plantEmoji}>{p.photo_uri ? '' : emoji}</Text>
                  {dc > 0 && (
                    <View style={styles.deviceBadge}>
                      <Text style={styles.deviceBadgeText}>📡 {dc}</Text>
                    </View>
                  )}
                  {/* Sil butonu */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(p.id, p.name)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.plantBody}>
                  <View style={styles.plantHeader}>
                    <Text style={styles.plantName}>{p.name}</Text>
                    <Badge
                      label={dc > 0 ? `${dc} Cihaz` : 'Cihaz Yok'}
                      variant={dc > 0 ? 'green' : 'gray'}
                    />
                  </View>
                  <View style={styles.plantStats}>
                    <View style={styles.plantStat}>
                      <Text style={styles.plantStatLabel}>💧 Nem Aralığı</Text>
                      <Text style={[styles.plantStatVal, { color: Colors.blue }]}>
                        {p.min_moisture?.toFixed(0) ?? '--'}% – {p.max_moisture?.toFixed(0) ?? '--'}%
                      </Text>
                    </View>
                    <View style={styles.plantStat}>
                      <Text style={styles.plantStatLabel}>🌡️ Sıcaklık</Text>
                      <Text style={[styles.plantStatVal, { color: Colors.orange }]}>
                        {p.ideal_temp_min?.toFixed(0) ?? '--'}°C – {p.ideal_temp_max?.toFixed(0) ?? '--'}°C
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressWrap}>
                    <View style={[styles.progressFill, {
                      width: `${p.max_moisture ?? 70}%`,
                      backgroundColor: Colors.blue,
                    }]} />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* ── Modal ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Bitki Ekle</Text>
              <TouchableOpacity onPress={() => { setModal(false); setForm(EMPTY_FORM); }}>
                <Text style={{ fontSize: 22, color: Colors.textSub }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Fotoğraf */}
              <Text style={styles.inputLabel}>Fotoğraf (İsteğe Bağlı)</Text>
              {form.photo_uri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: form.photo_uri }} style={styles.photoPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setForm(f => ({ ...f, photo_uri: null }))}
                  >
                    <Text style={{ color: '#fff', fontSize: Typography.xs, fontWeight: '700' }}>✕ Kaldır</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoBtnRow}>
                  <TouchableOpacity style={styles.photoPickBtn} onPress={pickFromCamera}>
                    <Text style={styles.photoPickIcon}>📷</Text>
                    <Text style={styles.photoPickText}>Kamera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoPickBtn} onPress={pickFromGallery}>
                    <Text style={styles.photoPickIcon}>🖼️</Text>
                    <Text style={styles.photoPickText}>Galeri</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bitki Adı */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Bitki Adı *</Text>
              <TextInput
                style={styles.input}
                placeholder="örn. Domates"
                placeholderTextColor={Colors.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              {/* Nem */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min. Nem (%)</Text>
                  <TextInput style={styles.input} placeholder="20" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    value={form.min_moisture}
                    onChangeText={v => setForm(f => ({ ...f, min_moisture: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max. Nem (%)</Text>
                  <TextInput style={styles.input} placeholder="80" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    value={form.max_moisture}
                    onChangeText={v => setForm(f => ({ ...f, max_moisture: v }))} />
                </View>
              </View>

              {/* Sıcaklık */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min. Sıcaklık (°C)</Text>
                  <TextInput style={styles.input} placeholder="15" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    value={form.ideal_temp_min}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_min: v }))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max. Sıcaklık (°C)</Text>
                  <TextInput style={styles.input} placeholder="30" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    value={form.ideal_temp_max}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_max: v }))} />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModal(false); setForm(EMPTY_FORM); }}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Kaydet</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  scroll:      { flex: 1 },
  content:     { padding: 16, paddingBottom: 40 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  statsRow:    { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  statBox:     { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: Typography.xxl, fontWeight: '800', color: Colors.text },
  statLbl:     { fontSize: Typography.xs, color: Colors.textSub, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },

  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  addBtn:      { backgroundColor: Colors.green, borderRadius: Radius.md, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: Typography.base },

  emptyCard:   { alignItems: 'center', paddingVertical: 30, marginTop: 8 },
  emptyTitle:  { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, marginTop: 12, marginBottom: 6 },
  emptySub:    { fontSize: Typography.sm, color: Colors.textSub, textAlign: 'center' },
  emptyBtn:    { backgroundColor: Colors.green, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  emptyBtnText:{ color: '#fff', fontWeight: '700' },

  plantCard:   { padding: 0, overflow: 'hidden', marginBottom: 12 },
  plantBanner: { height: 90, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  plantEmoji:  { fontSize: 38 },
  deviceBadge: { position: 'absolute', top: 10, right: 44, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  deviceBadgeText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  deleteBtn:   { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 6 },
  deleteBtnText: { fontSize: 16 },

  plantBody:   { padding: 14 },
  plantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  plantName:   { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  plantStats:  { flexDirection: 'row', gap: 16, marginBottom: 10 },
  plantStat:   { flex: 1 },
  plantStatLabel: { fontSize: Typography.xs, color: Colors.textSub },
  plantStatVal:   { fontSize: Typography.sm, fontWeight: '700', marginTop: 2 },
  progressWrap:{ height: 5, backgroundColor: Colors.bgCard2, borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 3 },

  // Fotoğraf seçici
  photoBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  photoPickBtn:{ flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center', gap: 6 },
  photoPickIcon: { fontSize: 28 },
  photoPickText: { fontSize: Typography.sm, color: Colors.textSub, fontWeight: '600' },
  photoPreviewWrap: { borderRadius: Radius.md, overflow: 'hidden', marginBottom: 4, height: 140 },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },

  // Modal
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  inputLabel:  { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: Colors.text, marginBottom: 14 },
  inputRow:    { flexDirection: 'row' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn:   { flex: 1, backgroundColor: Colors.bgCard2, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSub, fontWeight: '600' },
  saveBtn:     { flex: 1, backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
