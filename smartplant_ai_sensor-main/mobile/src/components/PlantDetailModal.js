import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import XMarkIcon from 'react-native-heroicons/outline/XMarkIcon';
import PencilSquareIcon from 'react-native-heroicons/outline/PencilSquareIcon';
import CameraIcon from 'react-native-heroicons/outline/CameraIcon';
import PhotoIcon from 'react-native-heroicons/outline/PhotoIcon';
import TrashIcon from 'react-native-heroicons/outline/TrashIcon';
import BellIcon from 'react-native-heroicons/outline/BellIcon';
import ClipboardDocumentListIcon from 'react-native-heroicons/outline/ClipboardDocumentListIcon';
import { updatePlant } from '../services/api';
import { Colors, Typography, Radius } from '../constants/theme';

const REMINDER_TYPES = [
  { key: 'water',     label: 'Sulama',      icon: '💧' },
  { key: 'fertilize', label: 'Gübreleme',   icon: '🌿' },
  { key: 'check',     label: 'Kontrol',     icon: '🔍' },
];

const QUICK_HOURS = [
  { label: '1s',  hours: 1  },
  { label: '3s',  hours: 3  },
  { label: '6s',  hours: 6  },
  { label: '12s', hours: 12 },
  { label: '24s', hours: 24 },
];

const STORAGE_KEY = 'plant_reminders';

async function loadReminders(plantId) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[plantId] || [];
  } catch { return []; }
}

async function saveReminders(plantId, reminders) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[plantId] = reminders;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export default function PlantDetailModal({ plant, onClose, onUpdated }) {
  const [tab, setTab]           = useState('info'); // 'info' | 'remind'
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [reminders, setReminders] = useState([]);
  const [addingRemind, setAddingRemind] = useState(false);
  const [rForm, setRForm] = useState({
    type: 'water', hours: 12, repeat: false, intervalHours: 24, note: '',
  });

  useEffect(() => {
    if (!plant) return;
    setForm({
      name:           plant.name || '',
      min_moisture:   plant.min_moisture?.toString() || '',
      max_moisture:   plant.max_moisture?.toString() || '',
      ideal_temp_min: plant.ideal_temp_min?.toString() || '',
      ideal_temp_max: plant.ideal_temp_max?.toString() || '',
      photo_uri:      plant.photo_uri || null,
    });
    loadReminders(plant.id).then(setReminders);
  }, [plant]);

  if (!plant) return null;

  // ── Fotoğraf ──
  const pickPhoto = async (source) => {
    const ok = source === 'camera'
      ? (await ImagePicker.requestCameraPermissionsAsync()).status === 'granted'
      : (await ImagePicker.requestMediaLibraryPermissionsAsync()).status === 'granted';
    if (!ok) { Alert.alert('İzin Gerekli', 'Erişim izni verilmedi.'); return; }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4,3], quality: 0.7 });
    if (!result.canceled) setForm(f => ({ ...f, photo_uri: result.assets[0].uri }));
  };

  // ── Güncelle ──
  const saveEdit = async () => {
    if (!form.name.trim()) { Alert.alert('Hata', 'Bitki adı zorunlu'); return; }
    setSaving(true);
    try {
      await updatePlant(plant.id, {
        name:           form.name.trim(),
        min_moisture:   form.min_moisture   ? parseFloat(form.min_moisture)   : null,
        max_moisture:   form.max_moisture   ? parseFloat(form.max_moisture)   : null,
        ideal_temp_min: form.ideal_temp_min ? parseFloat(form.ideal_temp_min) : null,
        ideal_temp_max: form.ideal_temp_max ? parseFloat(form.ideal_temp_max) : null,
        photo_uri:      form.photo_uri || null,
      });
      setEditMode(false);
      onUpdated?.();
    } catch (e) {
      Alert.alert('Hata', 'Güncellenemedi.');
    }
    setSaving(false);
  };

  // ── Anımsatıcı ekle ──
  const addReminder = async () => {
    const typeInfo = REMINDER_TYPES.find(t => t.key === rForm.type);
    const notifId = `rem_${Date.now()}`;
    const newReminder = {
      id: notifId,
      type: rForm.type,
      icon: typeInfo.icon,
      label: typeInfo.label,
      hours: rForm.hours,
      repeat: rForm.repeat,
      intervalHours: rForm.intervalHours,
      note: rForm.note,
      createdAt: new Date().toISOString(),
      fireAt: new Date(Date.now() + rForm.hours * 3600000).toISOString(),
    };
    const updated = [...reminders, newReminder];
    setReminders(updated);
    await saveReminders(plant.id, updated);
    setAddingRemind(false);
    setRForm({ type: 'water', hours: 12, repeat: false, intervalHours: 24, note: '' });
    Alert.alert('✅ Anımsatıcı Eklendi', `${rForm.hours} saat sonra hatırlatılacak.`);
  };

  // ── Anımsatıcı sil ──
  const deleteReminder = async (remId) => {
    const updated = reminders.filter(r => r.id !== remId);
    setReminders(updated);
    await saveReminders(plant.id, updated);
  };

  const formatFireAt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const color = ['#16a34a','#7c3aed','#dc2626','#0284c7','#d97706'][plant.id % 5];

  return (
    <Modal visible={!!plant} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Banner */}
          <View style={[s.banner, { backgroundColor: color }]}>
            {form.photo_uri
              ? <Image source={{ uri: form.photo_uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : null}
            <View style={s.bannerOverlay} />
            <Text style={s.bannerName}>{plant.name}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <XMarkIcon size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            {[
              { key: 'info',   label: 'Bilgiler',      Icon: ClipboardDocumentListIcon },
              { key: 'remind', label: 'Anımsatıcılar', Icon: BellIcon },
            ].map(t => {
              const active = tab === t.key;
              const Icon = t.Icon;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.tab, active && s.tabActive]}
                  onPress={() => { setTab(t.key); setEditMode(false); setAddingRemind(false); }}
                >
                  <Icon size={14} color={active ? Colors.green : Colors.sub} strokeWidth={active ? 2.2 : 1.8} />
                  <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* ── BİLGİLER ── */}
            {tab === 'info' && !editMode && (
              <View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Nem Aralığı</Text>
                  <Text style={s.infoVal}>
                    {plant.min_moisture ?? '--'}% – {plant.max_moisture ?? '--'}%
                  </Text>
                </View>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Sıcaklık</Text>
                  <Text style={s.infoVal}>
                    {plant.ideal_temp_min ?? '--'}°C – {plant.ideal_temp_max ?? '--'}°C
                  </Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
                  <PencilSquareIcon size={15} color={Colors.green} strokeWidth={2} />
                  <Text style={s.editBtnText}>Bilgileri Düzenle</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── DÜZENLE ── */}
            {tab === 'info' && editMode && (
              <View>
                <Text style={s.sectionTitle}>Fotoğraf</Text>
                {form.photo_uri ? (
                  <View style={s.photoWrap}>
                    <Image source={{ uri: form.photo_uri }} style={s.photoPreview} resizeMode="cover" />
                    <View style={s.photoActions}>
                      <TouchableOpacity style={s.photoActionBtn} onPress={() => pickPhoto('camera')}>
                        <CameraIcon size={12} color="#fff" strokeWidth={2} />
                        <Text style={s.photoActionText}>Değiştir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.photoActionBtn, { backgroundColor: Colors.redDim }]}
                        onPress={() => setForm(f => ({ ...f, photo_uri: null }))}>
                        <XMarkIcon size={12} color={Colors.red} strokeWidth={2.5} />
                        <Text style={[s.photoActionText, { color: Colors.red }]}>Kaldır</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.photoBtnRow}>
                    <TouchableOpacity style={s.photoPickBtn} onPress={() => pickPhoto('camera')}>
                      <CameraIcon size={26} color={Colors.sub2} strokeWidth={1.5} />
                      <Text style={s.photoPickText}>Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.photoPickBtn} onPress={() => pickPhoto('gallery')}>
                      <PhotoIcon size={26} color={Colors.sub2} strokeWidth={1.5} />
                      <Text style={s.photoPickText}>Galeri</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[s.sectionTitle, { marginTop: 16 }]}>Bitki Adı *</Text>
                <TextInput style={s.input} value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholderTextColor={Colors.sub} />

                <Text style={s.sectionTitle}>Nem Aralığı (%)</Text>
                <View style={s.rowInputs}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Min" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.sub} value={form.min_moisture}
                    onChangeText={v => setForm(f => ({ ...f, min_moisture: v }))} />
                  <Text style={s.dash}>–</Text>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Max" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.sub} value={form.max_moisture}
                    onChangeText={v => setForm(f => ({ ...f, max_moisture: v }))} />
                </View>

                <Text style={s.sectionTitle}>Sıcaklık (°C)</Text>
                <View style={s.rowInputs}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Min" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.sub} value={form.ideal_temp_min}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_min: v }))} />
                  <Text style={s.dash}>–</Text>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Max" keyboardType="decimal-pad"
                    placeholderTextColor={Colors.sub} value={form.ideal_temp_max}
                    onChangeText={v => setForm(f => ({ ...f, ideal_temp_max: v }))} />
                </View>

                <View style={s.rowBtns}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditMode(false)}>
                    <Text style={s.cancelBtnText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={saveEdit} disabled={saving}>
                    <Text style={s.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── ANIMALTIRICILLAR ── */}
            {tab === 'remind' && (
              <View>
                {reminders.length === 0 && !addingRemind && (
                  <View style={s.emptyBox}>
                    <BellIcon size={36} color={Colors.sub} strokeWidth={1.2} />
                    <Text style={s.emptyText}>Henüz anımsatıcı eklenmedi</Text>
                  </View>
                )}

                {reminders.map(r => (
                  <View key={r.id} style={s.reminderCard}>
                    <View style={s.reminderLeft}>
                      <Text style={{ fontSize: 28 }}>{r.icon}</Text>
                      <View>
                        <Text style={s.reminderLabel}>{r.label}</Text>
                        <Text style={s.reminderTime}>
                          {formatFireAt(r.fireAt)}
                        </Text>
                        {r.repeat && (
                          <Text style={s.reminderRepeat}>
                            🔄 Her {r.intervalHours} saatte bir
                          </Text>
                        )}
                        {r.note ? <Text style={s.reminderNote}>{r.note}</Text> : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => deleteReminder(r.id)} style={s.delBtn}>
                      <TrashIcon size={17} color={Colors.sub} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Anımsatıcı ekleme formu */}
                {addingRemind ? (
                  <View style={s.addReminderBox}>
                    <Text style={s.sectionTitle}>Tür</Text>
                    <View style={s.typeRow}>
                      {REMINDER_TYPES.map(t => (
                        <TouchableOpacity
                          key={t.key}
                          style={[s.typeBtn, rForm.type === t.key && s.typeBtnActive]}
                          onPress={() => setRForm(f => ({ ...f, type: t.key }))}
                        >
                          <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                          <Text style={[s.typeBtnText, rForm.type === t.key && { color: Colors.gold }]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={s.sectionTitle}>Ne zaman?</Text>
                    <View style={s.quickRow}>
                      {QUICK_HOURS.map(q => (
                        <TouchableOpacity
                          key={q.hours}
                          style={[s.quickBtn, rForm.hours === q.hours && s.quickBtnActive]}
                          onPress={() => setRForm(f => ({ ...f, hours: q.hours }))}
                        >
                          <Text style={[s.quickBtnText, rForm.hours === q.hours && { color: Colors.gold }]}>
                            {q.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.rowInputs}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="Özel saat gir"
                        placeholderTextColor={Colors.sub}
                        keyboardType="decimal-pad"
                        value={rForm.hours !== QUICK_HOURS.find(q => q.hours === rForm.hours)?.hours ? rForm.hours.toString() : ''}
                        onChangeText={v => setRForm(f => ({ ...f, hours: parseFloat(v) || f.hours }))}
                      />
                      <Text style={[s.dash, { marginTop: 8 }]}>saat</Text>
                    </View>

                    <View style={s.repeatRow}>
                      <View>
                        <Text style={s.sectionTitle}>Tekrarla</Text>
                        <Text style={s.repeatSub}>
                          Her {rForm.intervalHours} saatte bir bildirim
                        </Text>
                      </View>
                      <Switch
                        value={rForm.repeat}
                        onValueChange={v => setRForm(f => ({ ...f, repeat: v }))}
                        trackColor={{ false: Colors.border, true: Colors.goldDim }}
                        thumbColor={rForm.repeat ? Colors.gold : Colors.sub}
                      />
                    </View>
                    {rForm.repeat && (
                      <TextInput
                        style={s.input}
                        placeholder="Tekrar aralığı (saat)"
                        placeholderTextColor={Colors.sub}
                        keyboardType="decimal-pad"
                        value={rForm.intervalHours.toString()}
                        onChangeText={v => setRForm(f => ({ ...f, intervalHours: parseFloat(v) || 24 }))}
                      />
                    )}

                    <Text style={s.sectionTitle}>Not (İsteğe Bağlı)</Text>
                    <TextInput
                      style={[s.input, { minHeight: 60 }]}
                      placeholder="örn. 200ml su ver"
                      placeholderTextColor={Colors.sub}
                      multiline
                      value={rForm.note}
                      onChangeText={v => setRForm(f => ({ ...f, note: v }))}
                    />

                    <View style={s.rowBtns}>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setAddingRemind(false)}>
                        <Text style={s.cancelBtnText}>Vazgeç</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.saveBtn} onPress={addReminder}>
                        <Text style={s.saveBtnText}>Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.addReminderBtn} onPress={() => setAddingRemind(true)}>
                    <Text style={s.addReminderBtnText}>+ Anımsatıcı Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg2,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', flex: 1,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.sub,
    borderRadius: Radius.full, alignSelf: 'center', marginVertical: 12,
  },

  banner: { height: 100, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerName: { fontSize: Typography.xl, fontWeight: '800', color: '#fff' },
  closeBtn: { position: 'absolute', top: 12, right: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 6 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.green },
  tabText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.sub },
  tabTextActive: { color: Colors.green },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderDim },
  infoLabel: { fontSize: Typography.base, color: Colors.sub2 },
  infoVal:   { fontSize: Typography.base, fontWeight: '700', color: Colors.cream },
  editBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.greenDim, borderRadius: Radius.md, paddingVertical: 12, borderWidth: 1, borderColor: Colors.green },
  editBtnText: { color: Colors.green, fontWeight: '700', fontSize: Typography.base },

  sectionTitle: { fontSize: Typography.xs, fontWeight: '700', color: Colors.green, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: Colors.card2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.base, color: Colors.cream, marginBottom: 12 },
  rowInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash: { color: Colors.sub, fontSize: Typography.md, marginBottom: 12 },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: Colors.card2, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.sub2, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.green, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  photoWrap: { borderRadius: Radius.md, overflow: 'hidden', height: 130, marginBottom: 12 },
  photoPreview: { width: '100%', height: '100%' },
  photoActions: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  photoActionText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  photoBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoPickBtn: { flex: 1, backgroundColor: Colors.card2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center', gap: 4 },
  photoPickText: { fontSize: Typography.xs, color: Colors.sub2, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { color: Colors.sub, fontSize: Typography.base },

  reminderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  reminderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  reminderLabel: { fontSize: Typography.base, fontWeight: '700', color: Colors.cream },
  reminderTime:  { fontSize: Typography.xs, color: Colors.sub2, marginTop: 2 },
  reminderRepeat:{ fontSize: Typography.xs, color: Colors.green, marginTop: 2 },
  reminderNote:  { fontSize: Typography.xs, color: Colors.sub, marginTop: 2, fontStyle: 'italic' },
  delBtn: { padding: 6 },

  addReminderBox: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginTop: 8 },
  addReminderBtn: { backgroundColor: Colors.goldDim, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.gold },
  addReminderBtnText: { color: Colors.gold, fontWeight: '700', fontSize: Typography.base },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, backgroundColor: Colors.card2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, alignItems: 'center', gap: 4 },
  typeBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  typeBtnText: { fontSize: Typography.xs, color: Colors.sub2, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickBtn: { flex: 1, backgroundColor: Colors.card2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, alignItems: 'center' },
  quickBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.goldDim },
  quickBtnText: { fontSize: Typography.xs, color: Colors.sub2, fontWeight: '700' },

  repeatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  repeatSub: { fontSize: Typography.xs, color: Colors.sub, marginTop: 2 },
});
