import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import ExclamationCircleIcon from 'react-native-heroicons/outline/ExclamationCircleIcon';
import ExclamationTriangleIcon from 'react-native-heroicons/outline/ExclamationTriangleIcon';
import InformationCircleIcon from 'react-native-heroicons/outline/InformationCircleIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import BeakerIcon from 'react-native-heroicons/outline/BeakerIcon';
import FireIcon from 'react-native-heroicons/outline/FireIcon';
import CloudIcon from 'react-native-heroicons/outline/CloudIcon';
import SunIcon from 'react-native-heroicons/outline/SunIcon';
import AdjustmentsHorizontalIcon from 'react-native-heroicons/outline/AdjustmentsHorizontalIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import BoltIcon from 'react-native-heroicons/outline/BoltIcon';
import { getAlerts, getAlertHistory } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';
import FallingLeaves from '../components/FallingLeaves';

const FILTERS = [
  { key: '',         label: 'Tümü'  },
  { key: 'Critical', label: 'Kritik' },
  { key: 'Warning',  label: 'Uyarı'  },
  { key: 'Info',     label: 'Bilgi'  },
];

const VARIANT = {
  Critical: 'red', Warning: 'orange', Info: 'blue',
  warning: 'orange', critical: 'red', info: 'blue',
};
const TR = {
  Critical: 'Kritik', Warning: 'Uyarı', Info: 'Bilgi',
  warning: 'Uyarı', critical: 'Kritik', info: 'Bilgi',
};

function AlertIcon({ level, size = 18 }) {
  const { colors } = useTheme();
  const l = (level || '').toLowerCase();
  if (l === 'critical') return <ExclamationCircleIcon size={size} color={colors.red}   strokeWidth={2} />;
  if (l === 'warning')  return <ExclamationTriangleIcon size={size} color={colors.amber} strokeWidth={2} />;
  return                       <InformationCircleIcon  size={size} color={colors.blue}  strokeWidth={2} />;
}

export default function AlertsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const THRESHOLDS = useMemo(() => [
    { Icon: BeakerIcon, name: 'Toprak Nemi', min: '20',  max: '90',   unit: '%',   level: 'Uyarı',  color: colors.blue   },
    { Icon: FireIcon,   name: 'Sıcaklık',   min: '5',   max: '35',   unit: '°C',  level: 'Kritik', color: colors.orange },
    { Icon: CloudIcon,  name: 'Hava Nemi',  min: '30',  max: '95',   unit: '%',   level: 'Uyarı',  color: colors.purple },
    { Icon: SunIcon,    name: 'Işık',       min: '100', max: '100k', unit: 'lux', level: 'Bilgi',  color: colors.amber  },
  ], [colors]);

  const [active, setActive]         = useState([]);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [a, h] = await Promise.all([getAlerts(), getAlertHistory()]);
      setActive(a); setHistory(h);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filtered = filter ? history.filter(h => h.severity === filter) : history;
  const critical = history.filter(h => h.severity === 'Critical').length;
  const warning  = history.filter(h => h.severity === 'Warning').length;
  const info     = history.filter(h => h.severity === 'Info').length;

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
            <Text style={s.statNum}>{history.length}</Text>
            <Text style={s.statLbl}>Toplam</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.red }]}>{critical}</Text>
            <Text style={s.statLbl}>Kritik</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.amber }]}>{warning}</Text>
            <Text style={s.statLbl}>Uyarı</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: colors.blue }]}>{info}</Text>
            <Text style={s.statLbl}>Bilgi</Text>
          </View>
        </View>

        <Card style={s.sectionCard}>
          <View style={s.sectionHead}>
            <BoltIcon size={14} color={colors.amber} strokeWidth={2} />
            <Text style={s.sectionTitle}>Aktif Uyarılar</Text>
            <Text style={s.sectionSub}>{active.length > 0 ? `${active.length} aktif` : 'Sistem normal'}</Text>
          </View>
          {active.length === 0 ? (
            <View style={s.allGood}>
              <CheckCircleIcon size={28} color={colors.green} strokeWidth={1.8} />
              <View>
                <Text style={s.allGoodTitle}>Tüm değerler normal</Text>
                <Text style={s.allGoodSub}>Aktif eşik ihlali yok</Text>
              </View>
            </View>
          ) : (
            active.map((a, i) => (
              <View key={i} style={[s.activeRow, i === active.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.alertIconBox, {
                  backgroundColor: a.level === 'critical' ? colors.redDim : a.level === 'warning' ? colors.amberDim : colors.blueDim,
                }]}>
                  <AlertIcon level={a.level} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.activeMsg}>{a.message}</Text>
                  <Text style={s.activeTime}>{a.timestamp}</Text>
                </View>
                <Badge label={TR[a.level] || a.level} variant={VARIANT[a.level] || 'gray'} />
              </View>
            ))
          )}
        </Card>

        <Card style={s.sectionCard}>
          <View style={s.sectionHead}>
            <ClockIcon size={14} color={colors.sub2} strokeWidth={2} />
            <Text style={s.sectionTitle}>Uyarı Geçmişi</Text>
            <Text style={s.sectionSub}>{filtered.length} kayıt</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterChip, filter === f.key && s.filterChipActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {filtered.length === 0 ? (
            <Text style={s.noData}>Bu kritere uyan uyarı yok</Text>
          ) : (
            filtered.slice(0, 30).map((a, i) => {
              const d   = new Date(a.timestamp);
              const sev = a.severity || 'Info';
              return (
                <View key={i} style={[s.histRow, i === filtered.slice(0, 30).length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[s.histIcon, {
                    backgroundColor: sev === 'Critical' ? colors.redDim : sev === 'Warning' ? colors.amberDim : colors.blueDim,
                  }]}>
                    <AlertIcon level={sev.toLowerCase()} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histMsg}>{a.message || a.alert_type || '--'}</Text>
                    <View style={s.histMeta}>
                      <Text style={s.histTime}>
                        {d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {a.sensor_value != null && (
                        <Text style={s.histVal}>Değer: {parseFloat(a.sensor_value).toFixed(1)}</Text>
                      )}
                    </View>
                  </View>
                  <Badge label={TR[sev] || sev} variant={VARIANT[sev] || 'gray'} />
                </View>
              );
            })
          )}
        </Card>

        <Card style={s.sectionCard}>
          <View style={s.sectionHead}>
            <AdjustmentsHorizontalIcon size={14} color={colors.sub2} strokeWidth={2} />
            <Text style={s.sectionTitle}>Eşik Değerleri</Text>
            <Text style={s.sectionSub}>Uyarı için kullanılan sınırlar</Text>
          </View>
          {THRESHOLDS.map((t, i) => {
            const Icon = t.Icon;
            return (
              <View key={i} style={[s.thRow, i === THRESHOLDS.length - 1 && { borderBottomWidth: 0 }]}>
                <Icon size={18} color={t.color} strokeWidth={1.8} style={{ width: 26 }} />
                <Text style={s.thName}>{t.name}</Text>
                <View style={s.thRange}>
                  <Text style={[s.thMin, { color: t.color }]}>{t.min}</Text>
                  <Text style={s.thSep}> – </Text>
                  <Text style={[s.thMax, { color: t.color }]}>{t.max}</Text>
                  <Text style={s.thUnit}> {t.unit}</Text>
                </View>
                <Badge label={t.level} variant={t.level === 'Kritik' ? 'red' : t.level === 'Uyarı' ? 'orange' : 'blue'} />
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    scroll:      { flex: 1 },
    content:     { padding: 16, paddingBottom: 40 },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

    statsRow:    { flexDirection: 'row', backgroundColor: C.card, borderRadius: Radius.lg, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
    statBox:     { flex: 1, alignItems: 'center' },
    statNum:     { fontSize: Typography.xl, fontWeight: '800', color: C.cream },
    statLbl:     { fontSize: Typography.xs, color: C.sub2, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: C.border },

    sectionCard:  { marginBottom: 12 },
    sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    sectionTitle: { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1 },
    sectionSub:   { fontSize: Typography.xs, color: C.sub2 },

    allGood:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    allGoodTitle: { fontSize: Typography.base, fontWeight: '700', color: C.cream },
    allGoodSub:   { fontSize: Typography.sm, color: C.sub2, marginTop: 2 },

    activeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderDim },
    alertIconBox: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    activeMsg:    { fontSize: Typography.sm, fontWeight: '600', color: C.cream },
    activeTime:   { fontSize: Typography.xs, color: C.sub2, marginTop: 1 },

    filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
    filterChipActive: { backgroundColor: C.greenDim, borderColor: C.green },
    filterText:       { fontSize: Typography.xs, fontWeight: '600', color: C.sub2 },
    filterTextActive: { color: C.green },

    histRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderDim },
    histIcon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    histMsg:  { fontSize: Typography.sm, fontWeight: '600', color: C.cream },
    histMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
    histTime: { fontSize: Typography.xs, color: C.sub2 },
    histVal:  { fontSize: Typography.xs, color: C.sub },

    thRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderDim },
    thName:  { flex: 1, fontSize: Typography.sm, fontWeight: '600', color: C.cream },
    thRange: { flexDirection: 'row', alignItems: 'center' },
    thMin:   { fontSize: Typography.sm, fontWeight: '700' },
    thSep:   { fontSize: Typography.sm, color: C.sub2 },
    thMax:   { fontSize: Typography.sm, fontWeight: '700' },
    thUnit:  { fontSize: Typography.xs, color: C.sub2 },
    noData:  { textAlign: 'center', color: C.sub2, paddingVertical: 20 },
  });
}
