import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { getDevices, createDevice, getPlants } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';

export default function DevicesScreen() {
  const [devices, setDevices] = useState([]);
  const [plants, setPlants]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ device_mac:'', plant_name:'', plant_type_id:'' });

  const fetchAll = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([getDevices(), getPlants()]);
      setDevices(d); setPlants(p);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 60000); return () => clearInterval(t); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const online = devices.filter(d => {
    if (!d.last_sync) return false;
    return (Date.now() - new Date(d.last_sync).getTime()) < 300000;
  }).length;

  const submit = async () => {
    if (!form.device_mac.trim()) { Alert.alert('Hata', 'MAC adresi zorunlu'); return; }
    const mac = form.device_mac.trim().toUpperCase();
    const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    if (!macRegex.test(mac)) { Alert.alert('Hata', 'Geçersiz MAC formatı (AA:BB:CC:DD:EE:FF)'); return; }
    setSaving(true);
    try {
      await createDevice({
        device_mac: mac,
        plant_name: form.plant_name.trim() || null,
        plant_type_id: form.plant_type_id ? parseInt(form.plant_type_id) : null,
      });
      setModal(false);
      setForm({ device_mac:'', plant_name:'', plant_type_id:'' });
      fetchAll();
    } catch(e) {
      Alert.alert('Hata', e.response?.data?.detail || 'Hata oluştu');
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
          <Text style={styles.statNum}>{devices.length}</Text>
          <Text style={styles.statLbl}>Toplam Cihaz</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.green }]}>{online}</Text>
          <Text style={styles.statLbl}>Çevrimiçi</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.textMuted }]}>{devices.length - online}</Text>
          <Text style={styles.statLbl}>Çevrimdışı</Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
        <Text style={styles.addBtnText}>+ Yeni Cihaz Ekle</Text>
      </TouchableOpacity>

      {/* Device List */}
      {devices.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={{ fontSize: 56, textAlign:'center', marginBottom: 12 }}>📡</Text>
          <Text style={styles.emptyTitle}>Cihaz bulunamadı</Text>
          <Text style={styles.emptySub}>İlk ESP32 cihazını ekle</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModal(true)}>
            <Text style={styles.emptyBtnText}>Cihaz Ekle</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        devices.map((d, i) => {
          const plant = plants.find(p => p.id === d.plant_type_id);
          const syncDate = d.last_sync ? new Date(d.last_sync) : null;
          const isOnline = syncDate && (Date.now() - syncDate.getTime()) < 300000;
          const syncStr = syncDate
            ? syncDate.toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' })
            : 'Hiç senkronize edilmedi';
          return (
            <Card key={i} style={styles.deviceCard}>
              <View style={styles.deviceTop}>
                <View style={[styles.deviceIcon, { backgroundColor: isOnline ? Colors.greenDim : Colors.bgCard2 }]}>
                  <Text style={{ fontSize: 24 }}>📡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{d.plant_name || 'İsimsiz Cihaz'}</Text>
                    <Badge label={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} variant={isOnline ? 'green' : 'gray'} />
                  </View>
                  <Text style={styles.deviceMac}>{d.device_mac}</Text>
                </View>
              </View>
              <View style={styles.deviceDivider} />
              <View style={styles.deviceStats}>
                <View style={styles.deviceStat}>
                  <Text style={styles.dStatLabel}>🌱 Bitki Türü</Text>
                  <Text style={styles.dStatValue}>{plant ? plant.name : '--'}</Text>
                </View>
                {plant && (
                  <>
                    <View style={styles.deviceStat}>
                      <Text style={styles.dStatLabel}>💧 Nem</Text>
                      <Text style={[styles.dStatValue, { color: Colors.blue }]}>
                        {plant.min_moisture?.toFixed(0) ?? '--'}–{plant.max_moisture?.toFixed(0) ?? '--'}%
                      </Text>
                    </View>
                    <View style={styles.deviceStat}>
                      <Text style={styles.dStatLabel}>🌡️ Sıcaklık</Text>
                      <Text style={[styles.dStatValue, { color: Colors.orange }]}>
                        {plant.ideal_temp_min?.toFixed(0) ?? '--'}–{plant.ideal_temp_max?.toFixed(0) ?? '--'}°C
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.deviceFooter}>
                <Text style={styles.lastSeen}>🕐 {syncStr}</Text>
              </View>
            </Card>
          );
        })
      )}

      {/* Setup Guide */}
      <Card style={{ marginTop: 8 }}>
        <SectionHeader title="⚡ Hızlı Kurulum" subtitle="ESP32'yi sisteme bağla" />
        {[
          { n:1, title:'Cihazı Kaydet', desc:'MAC adresini sisteme ekle' },
          { n:2, title:'Veri Gönder', desc:'POST /api/sensor — JSON formatında' },
          { n:3, title:'İzle', desc:'Dashboard\'dan verileri takip et' },
        ].map(s => (
          <View key={s.n} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.n}</Text></View>
            <View>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Cihaz Ekle</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={{ fontSize: 22, color: Colors.textSub }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>MAC Adresi *</Text>
            <TextInput style={styles.input} placeholder="AA:BB:CC:DD:EE:FF"
              placeholderTextColor={Colors.textMuted} autoCapitalize="characters"
              value={form.device_mac} onChangeText={v => setForm(f => ({...f, device_mac:v}))} />
            <Text style={styles.inputLabel}>Bitki Adı</Text>
            <TextInput style={styles.input} placeholder="örn. Domates Tarlası A"
              placeholderTextColor={Colors.textMuted}
              value={form.plant_name} onChangeText={v => setForm(f => ({...f, plant_name:v}))} />
            <Text style={styles.inputLabel}>Bitki Türü ID (opsiyonel)</Text>
            {plants.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection:'row', gap:8 }}>
                  <TouchableOpacity
                    style={[styles.plantChip, !form.plant_type_id && styles.plantChipActive]}
                    onPress={() => setForm(f => ({...f, plant_type_id:''}))}
                  >
                    <Text style={[styles.plantChipText, !form.plant_type_id && { color:Colors.greenDark }]}>Seçme</Text>
                  </TouchableOpacity>
                  {plants.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.plantChip, form.plant_type_id==p.id && styles.plantChipActive]}
                      onPress={() => setForm(f => ({...f, plant_type_id:String(p.id)}))}
                    >
                      <Text style={[styles.plantChipText, form.plant_type_id==p.id && { color:Colors.greenDark }]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Ekle</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:Colors.bg },
  content:     { padding:16, paddingBottom:40 },
  center:      { flex:1, alignItems:'center', justifyContent:'center' },
  statsRow:    { flexDirection:'row', backgroundColor:Colors.bgCard, borderRadius:Radius.lg, padding:16, marginBottom:14, ...Shadow.sm, borderWidth:1, borderColor:Colors.border },
  statBox:     { flex:1, alignItems:'center' },
  statNum:     { fontSize:Typography.xxl, fontWeight:'800', color:Colors.text },
  statLbl:     { fontSize:Typography.xs, color:Colors.textSub, marginTop:2 },
  statDivider: { width:1, backgroundColor:Colors.border },
  addBtn:      { backgroundColor:Colors.green, borderRadius:Radius.md, paddingVertical:13, alignItems:'center', marginBottom:14, ...Shadow.sm },
  addBtnText:  { color:'#fff', fontWeight:'700', fontSize:Typography.base },
  emptyCard:   { alignItems:'center', paddingVertical:30 },
  emptyTitle:  { fontSize:Typography.lg, fontWeight:'700', color:Colors.text, marginBottom:6 },
  emptySub:    { fontSize:Typography.sm, color:Colors.textSub },
  emptyBtn:    { backgroundColor:Colors.green, borderRadius:Radius.full, paddingHorizontal:24, paddingVertical:10, marginTop:16 },
  emptyBtnText:{ color:'#fff', fontWeight:'700' },
  deviceCard:  { marginBottom:12 },
  deviceTop:   { flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 },
  deviceIcon:  { width:50, height:50, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
  deviceNameRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  deviceName:  { fontSize:Typography.md, fontWeight:'700', color:Colors.text, flex:1 },
  deviceMac:   { fontFamily:'monospace', fontSize:Typography.xs, color:Colors.textSub },
  deviceDivider:{ height:1, backgroundColor:Colors.borderDim, marginBottom:12 },
  deviceStats: { flexDirection:'row', flexWrap:'wrap', gap:12, marginBottom:10 },
  deviceStat:  { minWidth:'30%' },
  dStatLabel:  { fontSize:Typography.xs, color:Colors.textSub },
  dStatValue:  { fontSize:Typography.sm, fontWeight:'700', color:Colors.text, marginTop:2 },
  deviceFooter:{ borderTopWidth:1, borderTopColor:Colors.borderDim, paddingTop:10 },
  lastSeen:    { fontSize:Typography.xs, color:Colors.textSub },
  step:        { flexDirection:'row', gap:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  stepNum:     { width:26, height:26, borderRadius:13, backgroundColor:Colors.blueDim, alignItems:'center', justifyContent:'center' },
  stepNumText: { fontSize:Typography.xs, fontWeight:'700', color:Colors.blue },
  stepTitle:   { fontSize:Typography.sm, fontWeight:'700', color:Colors.text },
  stepDesc:    { fontSize:Typography.xs, color:Colors.textSub, marginTop:2 },
  modalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  modalBox:    { backgroundColor:Colors.bgCard, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  modalTitle:  { fontSize:Typography.lg, fontWeight:'700', color:Colors.text },
  inputLabel:  { fontSize:Typography.xs, fontWeight:'600', color:Colors.textSub, marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 },
  input:       { backgroundColor:Colors.bg, borderRadius:Radius.md, borderWidth:1, borderColor:Colors.border, paddingHorizontal:14, paddingVertical:10, fontSize:Typography.base, color:Colors.text, marginBottom:14 },
  plantChip:   { paddingHorizontal:12, paddingVertical:7, borderRadius:Radius.full, backgroundColor:Colors.bgCard2, borderWidth:1, borderColor:Colors.border },
  plantChipActive:{ backgroundColor:Colors.greenDim, borderColor:Colors.green },
  plantChipText:{ fontSize:Typography.xs, fontWeight:'600', color:Colors.textSub },
  modalActions:{ flexDirection:'row', gap:12, marginTop:8 },
  cancelBtn:   { flex:1, backgroundColor:Colors.bgCard2, borderRadius:Radius.md, paddingVertical:12, alignItems:'center' },
  cancelBtnText:{ color:Colors.textSub, fontWeight:'600' },
  saveBtn:     { flex:1, backgroundColor:Colors.green, borderRadius:Radius.md, paddingVertical:12, alignItems:'center' },
  saveBtnText: { color:'#fff', fontWeight:'700' },
});
