import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { getPlants, createPlant, getDevices } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';

const EMOJIS = ['🌿','🌸','🍅','🥬','🌾','💧','🌱','🍇','🌻','🫑','🥦','🍆'];
const CARD_COLORS = ['#16a34a','#7c3aed','#dc2626','#0284c7','#d97706','#059669'];

export default function CropsScreen() {
  const [plants, setPlants]   = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]     = useState(false);
  const [search, setSearch]   = useState('');
  const [form, setForm]       = useState({ name:'', min_moisture:'', max_moisture:'', ideal_temp_min:'', ideal_temp_max:'' });
  const [saving, setSaving]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([getPlants(), getDevices()]);
      setPlants(p); setDevices(d);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const devCount = (plantId) => devices.filter(d => d.plant_type_id === plantId).length;
  const filtered = plants.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async () => {
    if (!form.name.trim()) { Alert.alert('Hata', 'Bitki adı zorunlu'); return; }
    setSaving(true);
    try {
      await createPlant({
        name: form.name.trim(),
        min_moisture:   form.min_moisture   ? parseFloat(form.min_moisture)   : null,
        max_moisture:   form.max_moisture   ? parseFloat(form.max_moisture)   : null,
        ideal_temp_min: form.ideal_temp_min ? parseFloat(form.ideal_temp_min) : null,
        ideal_temp_max: form.ideal_temp_max ? parseFloat(form.ideal_temp_max) : null,
      });
      setModal(false);
      setForm({ name:'', min_moisture:'', max_moisture:'', ideal_temp_min:'', ideal_temp_max:'' });
      fetchAll();
    } catch(e) {
      Alert.alert('Hata', e.response?.data?.detail || 'Bu bitki zaten kayıtlı olabilir');
    }
    setSaving(false);
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.green} /></View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
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
          const dc = devCount(p.id);
          return (
            <Card key={p.id} style={styles.plantCard}>
              {/* Colored Banner */}
              <View style={[styles.plantBanner, { backgroundColor: color }]}>
                <Text style={styles.plantEmoji}>{emoji}</Text>
                {dc > 0 && (
                  <View style={styles.deviceBadge}>
                    <Text style={styles.deviceBadgeText}>📡 {dc}</Text>
                  </View>
                )}
              </View>
              <View style={styles.plantBody}>
                <View style={styles.plantHeader}>
                  <Text style={styles.plantName}>{p.name}</Text>
                  <Badge label={dc > 0 ? `${dc} Cihaz` : 'Cihaz Yok'} variant={dc > 0 ? 'green' : 'gray'} />
                </View>
                <Text style={styles.plantId}>ID: #{p.id}</Text>
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
                {/* Progress bar */}
                <View style={styles.progressWrap}>
                  <View style={[styles.progressFill, { width: `${p.max_moisture ?? 70}%`, backgroundColor: Colors.blue }]} />
                </View>
              </View>
            </Card>
          );
        })
      )}

      {/* Device-Plant Table */}
      {devices.length > 0 && (
        <Card style={{ marginTop: 8 }}>
          <SectionHeader title="Cihaz — Bitki Eşleşmeleri" subtitle={`${devices.length} kayıtlı cihaz`} />
          {devices.map((d, i) => {
            const plant = plants.find(p => p.id === d.plant_type_id);
            const syncDate = d.last_sync ? new Date(d.last_sync) : null;
            const isOnline = syncDate && (Date.now() - syncDate.getTime()) < 300000;
            return (
              <View key={i} style={[styles.deviceRow, i === devices.length-1 && { borderBottomWidth:0 }]}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.green : Colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceMac}>{d.device_mac}</Text>
                  <Text style={styles.devicePlant}>{d.plant_name || '--'}</Text>
                </View>
                {plant && <Badge label={plant.name} variant="green" />}
              </View>
            );
          })}
        </Card>
      )}

      {/* Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Bitki Ekle</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={{ fontSize: 22, color: Colors.textSub }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Bitki Adı *</Text>
              <TextInput style={styles.input} placeholder="örn. Domates" value={form.name}
                onChangeText={v => setForm(f => ({...f, name:v}))} />
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min. Nem (%)</Text>
                  <TextInput style={styles.input} placeholder="20" keyboardType="decimal-pad"
                    value={form.min_moisture} onChangeText={v => setForm(f => ({...f, min_moisture:v}))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max. Nem (%)</Text>
                  <TextInput style={styles.input} placeholder="80" keyboardType="decimal-pad"
                    value={form.max_moisture} onChangeText={v => setForm(f => ({...f, max_moisture:v}))} />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min. Sıcaklık (°C)</Text>
                  <TextInput style={styles.input} placeholder="15" keyboardType="decimal-pad"
                    value={form.ideal_temp_min} onChangeText={v => setForm(f => ({...f, ideal_temp_min:v}))} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max. Sıcaklık (°C)</Text>
                  <TextInput style={styles.input} placeholder="30" keyboardType="decimal-pad"
                    value={form.ideal_temp_max} onChangeText={v => setForm(f => ({...f, ideal_temp_max:v}))} />
                </View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow:   { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: 16, marginBottom: 14, ...Shadow.sm, borderWidth:1, borderColor:Colors.border },
  statBox:    { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: Typography.xxl, fontWeight: '800', color: Colors.text },
  statLbl:    { fontSize: Typography.xs, color: Colors.textSub, marginTop: 2 },
  statDivider:{ width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  actionRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  searchInput:{ flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: Colors.text, borderWidth:1, borderColor:Colors.border },
  addBtn:     { backgroundColor: Colors.green, borderRadius: Radius.md, paddingHorizontal: 18, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.base },
  emptyCard:  { alignItems: 'center', paddingVertical: 30, marginTop: 8 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, marginTop: 12, marginBottom: 6 },
  emptySub:   { fontSize: Typography.sm, color: Colors.textSub, textAlign: 'center' },
  emptyBtn:   { backgroundColor: Colors.green, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  emptyBtnText:{ color: '#fff', fontWeight: '700' },
  plantCard:  { padding: 0, overflow: 'hidden', marginBottom: 12 },
  plantBanner:{ height: 80, alignItems: 'center', justifyContent: 'center' },
  plantEmoji: { fontSize: 38 },
  deviceBadge:{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  deviceBadgeText:{ color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  plantBody:  { padding: 14 },
  plantHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  plantName:  { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  plantId:    { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 10 },
  plantStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  plantStat:  { flex: 1 },
  plantStatLabel:{ fontSize: Typography.xs, color: Colors.textSub },
  plantStatVal:  { fontSize: Typography.sm, fontWeight: '700', marginTop: 2 },
  progressWrap:{ height: 5, backgroundColor: Colors.bgCard2, borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 3 },
  deviceRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderDim },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  deviceMac:  { fontSize: Typography.xs, fontFamily: 'monospace', color: Colors.text },
  devicePlant:{ fontSize: Typography.xs, color: Colors.textSub },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox:   { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text },
  inputLabel: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:      { backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: Colors.text, marginBottom: 14 },
  inputRow:   { flexDirection: 'row' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:  { flex: 1, backgroundColor: Colors.bgCard2, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:{ color: Colors.textSub, fontWeight: '600' },
  saveBtn:    { flex: 1, backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  saveBtnText:{ color: '#fff', fontWeight: '700' },
});
