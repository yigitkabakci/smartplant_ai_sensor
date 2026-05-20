import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import SignalIcon from 'react-native-heroicons/outline/SignalIcon';
import CpuChipIcon from 'react-native-heroicons/outline/CpuChipIcon';
import PlusIcon from 'react-native-heroicons/outline/PlusIcon';
import XMarkIcon from 'react-native-heroicons/outline/XMarkIcon';
import BeakerIcon from 'react-native-heroicons/outline/BeakerIcon';
import FireIcon from 'react-native-heroicons/outline/FireIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import BoltIcon from 'react-native-heroicons/outline/BoltIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import { getDevices, createDevice, getPlants } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import FallingLeaves from '../components/FallingLeaves';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';

export default function DevicesScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [devices, setDevices]       = useState([]);
  const [plants, setPlants]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ device_mac: '', plant_name: '', plant_type_id: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([getDevices(), getPlants()]);
      setDevices(d); setPlants(p);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const online = devices.filter(d => {
    if (!d.last_sync) return false;
    return (Date.now() - new Date(d.last_sync).getTime()) < 300000;
  }).length;

  const submit = async () => {
    if (!form.device_mac.trim()) { Alert.alert('Hata', 'MAC adresi zorunlu'); return; }
    const mac = form.device_mac.trim().toUpperCase();
    if (!/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/.test(mac)) {
      Alert.alert('Hata', 'Geçersiz MAC formatı\nÖrnek: AA:BB:CC:DD:EE:FF'); return;
    }
    setSaving(true);
    try {
      await createDevice({
        device_mac: mac,
        plant_name: form.plant_name.trim() || null,
        plant_type_id: form.plant_type_id ? parseInt(form.plant_type_id) : null,
      });
      setModal(false);
      setForm({ device_mac: '', plant_name: '', plant_type_id: '' });
      fetchAll();
    } catch (e) {
      Alert.alert('Hata', e.response?.data?.detail || 'Bir hata oluştu');
    }
    setSaving(false);
  };

  const closeModal = () => { setModal(false); setForm({ device_mac: '', plant_name: '', plant_type_id: '' }); };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={colors.green} /></View>
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
            <Text style={s.statNum}>{devices.length}</Text>
            <Text style={s.statLbl}>Toplam</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.green }]}>{online}</Text>
            <Text style={s.statLbl}>Çevrimiçi</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.sub2 }]}>{devices.length - online}</Text>
            <Text style={s.statLbl}>Çevrimdışı</Text>
          </View>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <PlusIcon size={18} color="#fff" strokeWidth={2.5} />
          <Text style={s.addBtnText}>Yeni Cihaz Ekle</Text>
        </TouchableOpacity>

        {devices.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconBox}>
              <CpuChipIcon size={40} color={colors.sub} strokeWidth={1.2} />
            </View>
            <Text style={s.emptyTitle}>Cihaz bulunamadı</Text>
            <Text style={s.emptySub}>İlk ESP32 sensör cihazını ekle</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setModal(true)}>
              <PlusIcon size={15} color="#fff" strokeWidth={2.5} />
              <Text style={s.emptyBtnText}>Cihaz Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          devices.map((d, i) => {
            const plant = plants.find(p => p.id === d.plant_type_id);
            const syncDate = d.last_sync ? new Date(d.last_sync) : null;
            const isOnline = syncDate && (Date.now() - syncDate.getTime()) < 300000;
            const syncStr = syncDate
              ? syncDate.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
              : 'Hiç senkronize edilmedi';

            return (
              <View key={i} style={[s.deviceCard, { borderLeftColor: isOnline ? colors.green : colors.sub }]}>
                <View style={s.deviceHead}>
                  <View style={[s.deviceIconBox, { backgroundColor: isOnline ? colors.greenDim : colors.card2 }]}>
                    <SignalIcon size={22} color={isOnline ? colors.green : colors.sub} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.deviceNameRow}>
                      <Text style={s.deviceName} numberOfLines={1}>{d.plant_name || 'İsimsiz Cihaz'}</Text>
                      <Badge label={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} variant={isOnline ? 'green' : 'gray'} />
                    </View>
                    <Text style={s.deviceMac}>{d.device_mac}</Text>
                  </View>
                </View>
                <View style={s.cardDivider} />
                <View style={s.deviceStats}>
                  <View style={s.dStat}>
                    <CpuChipIcon size={12} color={colors.sub2} strokeWidth={2} />
                    <Text style={s.dStatLbl}>Bitki Türü</Text>
                    <Text style={s.dStatVal}>{plant ? plant.name : '--'}</Text>
                  </View>
                  {plant && (
                    <>
                      <View style={s.dStat}>
                        <BeakerIcon size={12} color={colors.blue} strokeWidth={2} />
                        <Text style={s.dStatLbl}>Nem Aralığı</Text>
                        <Text style={[s.dStatVal, { color: colors.blue }]}>
                          {plant.min_moisture?.toFixed(0) ?? '--'}–{plant.max_moisture?.toFixed(0) ?? '--'}%
                        </Text>
                      </View>
                      <View style={s.dStat}>
                        <FireIcon size={12} color={colors.orange} strokeWidth={2} />
                        <Text style={s.dStatLbl}>Sıcaklık</Text>
                        <Text style={[s.dStatVal, { color: colors.orange }]}>
                          {plant.ideal_temp_min?.toFixed(0) ?? '--'}–{plant.ideal_temp_max?.toFixed(0) ?? '--'}°C
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <View style={s.deviceFooter}>
                  <ClockIcon size={11} color={colors.sub} strokeWidth={2} />
                  <Text style={s.lastSeen}>{syncStr}</Text>
                </View>
              </View>
            );
          })
        )}

        <Card style={s.guideCard}>
          <View style={s.guideHeader}>
            <BoltIcon size={14} color={colors.amber} strokeWidth={2} />
            <Text style={s.guideTitle}>Hızlı Kurulum</Text>
            <Text style={s.guideSub}>ESP32'yi sisteme bağla</Text>
          </View>
          {[
            { n: 1, title: 'Cihazı Kaydet',  desc: 'MAC adresini sisteme ekle',          color: colors.green  },
            { n: 2, title: 'Veri Gönder',    desc: 'POST /api/sensor — JSON formatında', color: colors.blue   },
            { n: 3, title: 'Canlı İzle',     desc: "Dashboard'dan verileri takip et",    color: colors.purple },
          ].map((step, i, arr) => (
            <View key={step.n} style={[s.step, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.stepNum, { backgroundColor: `${step.color}18` }]}>
                <Text style={[s.stepNumText, { color: step.color }]}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
              <CheckCircleIcon size={14} color={`${step.color}60`} strokeWidth={2} />
            </View>
          ))}
        </Card>
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} onPress={closeModal} activeOpacity={1} />
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Yeni Cihaz Ekle</Text>
              <TouchableOpacity onPress={closeModal}>
                <XMarkIcon size={22} color={colors.sub2} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>MAC Adresi *</Text>
              <TextInput
                style={s.input} placeholder="AA:BB:CC:DD:EE:FF"
                placeholderTextColor={colors.sub} autoCapitalize="characters"
                value={form.device_mac} onChangeText={v => setForm(f => ({ ...f, device_mac: v }))}
              />
              <Text style={s.inputLabel}>Konum / İsim</Text>
              <TextInput
                style={s.input} placeholder="örn. Sera A — Domates"
                placeholderTextColor={colors.sub} value={form.plant_name}
                onChangeText={v => setForm(f => ({ ...f, plant_name: v }))}
              />
              {plants.length > 0 && (
                <>
                  <Text style={s.inputLabel}>Bitki Türü (İsteğe Bağlı)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.chip, !form.plant_type_id && s.chipActive]}
                        onPress={() => setForm(f => ({ ...f, plant_type_id: '' }))}
                      >
                        <Text style={[s.chipText, !form.plant_type_id && s.chipTextActive]}>Seçme</Text>
                      </TouchableOpacity>
                      {plants.map(p => (
                        <TouchableOpacity
                          key={p.id}
                          style={[s.chip, form.plant_type_id == p.id && s.chipActive]}
                          onPress={() => setForm(f => ({ ...f, plant_type_id: String(p.id) }))}
                        >
                          <Text style={[s.chipText, form.plant_type_id == p.id && s.chipTextActive]}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                  <Text style={s.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={submit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnText}>Ekle</Text>
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

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll:    { flex: 1 },
    content:   { padding: 16, paddingBottom: 40 },
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

    statsRow: { flexDirection: 'row', backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 14 },
    statBox:  { flex: 1, alignItems: 'center' },
    statNum:  { fontSize: Typography.xxl, fontWeight: '800', color: C.cream },
    statLbl:  { fontSize: Typography.xs, color: C.sub2, marginTop: 2 },
    statDiv:  { width: 1, backgroundColor: C.border },

    addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.green, borderRadius: Radius.md, paddingVertical: 13, marginBottom: 14 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.base },

    emptyWrap:    { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyIconBox: { width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 4 },
    emptyTitle:   { fontSize: Typography.lg, fontWeight: '700', color: C.cream },
    emptySub:     { fontSize: Typography.sm, color: C.sub2, textAlign: 'center' },
    emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.green, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
    emptyBtnText: { color: '#fff', fontWeight: '700' },

    deviceCard:    { backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, marginBottom: 12, overflow: 'hidden' },
    deviceHead:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    deviceIconBox: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    deviceNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    deviceName:    { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1, marginRight: 8 },
    deviceMac:     { fontSize: Typography.xs, color: C.sub, fontFamily: 'monospace' },
    cardDivider:   { height: 1, backgroundColor: C.borderDim },
    deviceStats:   { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 14 },
    dStat:         { gap: 3 },
    dStatLbl:      { fontSize: 10, color: C.sub2, fontWeight: '500' },
    dStatVal:      { fontSize: Typography.sm, fontWeight: '700', color: C.cream },
    deviceFooter:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingBottom: 12 },
    lastSeen:      { fontSize: Typography.xs, color: C.sub },

    guideCard:   { marginTop: 4 },
    guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    guideTitle:  { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1 },
    guideSub:    { fontSize: Typography.xs, color: C.sub2 },
    step:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderDim },
    stepNum:     { width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: Typography.sm, fontWeight: '800' },
    stepTitle:   { fontSize: Typography.sm, fontWeight: '700', color: C.cream },
    stepDesc:    { fontSize: Typography.xs, color: C.sub2, marginTop: 2 },

    modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    modalBox:      { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%', borderTopWidth: 1, borderTopColor: C.border },
    modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:    { fontSize: Typography.lg, fontWeight: '700', color: C.cream },
    inputLabel:    { fontSize: Typography.xs, fontWeight: '600', color: C.sub2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input:         { backgroundColor: C.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: C.cream, marginBottom: 14 },
    chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
    chipActive:    { backgroundColor: C.greenDim, borderColor: C.green },
    chipText:      { fontSize: Typography.xs, fontWeight: '600', color: C.sub2 },
    chipTextActive:{ color: C.green },
    modalActions:  { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn:     { flex: 1, backgroundColor: C.card2, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { color: C.sub2, fontWeight: '600' },
    saveBtn:       { flex: 1, backgroundColor: C.green, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
    saveBtnText:   { color: '#fff', fontWeight: '700' },
  });
}
