import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getSensorReadings, getAlerts, predictWatering } from '../services/api';
import MetricCard from '../components/MetricCard';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

export default function DashboardScreen({ navigation }) {
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [watering, setWatering] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMetric, setChartMetric] = useState('moisture');

  const latest = readings[0] || {};

  const fetchAll = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([
        getSensorReadings(20),
        getAlerts(),
      ]);
      setReadings(r);
      setAlerts(a);
    } catch (e) {}
    try {
      const w = await predictWatering(null);
      setWatering(w);
    } catch (e) { setWatering({ error: true }); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 30000); return () => clearInterval(t); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Chart data
  const sorted = [...readings].reverse();
  const chartData = {
    labels: sorted.slice(-7).map(r => {
      const d = new Date(r.timestamp);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }),
    datasets: [{
      data: sorted.slice(-7).map(r =>
        chartMetric === 'moisture' ? (r.moisture_pct ?? 0) :
        chartMetric === 'temp'     ? (r.temperature_c ?? 0) :
                                     (r.humidity_pct ?? 0)
      ),
      strokeWidth: 2,
    }],
  };
  const chartColor = chartMetric === 'moisture' ? Colors.blue :
                     chartMetric === 'temp'     ? Colors.orange : Colors.purple;

  const statusBadge = (val, lo, hi) => {
    if (val == null) return { label: 'N/A', variant: 'gray' };
    if (val < lo)   return { label: 'Düşük', variant: 'blue' };
    if (val > hi)   return { label: 'Yüksek', variant: 'red' };
    return { label: 'Normal', variant: 'green' };
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.green} />
      <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {/* Header Banner */}
      <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.banner} start={[0, 0]} end={[1, 1]}>
        <Text style={styles.bannerTitle}>🌿 AgroSense</Text>
        <Text style={styles.bannerSub}>Farm Dashboard</Text>
        {alerts.length > 0 && (
          <View style={styles.alertBubble}>
            <Text style={styles.alertBubbleText}>{alerts.length} Uyarı</Text>
          </View>
        )}
      </LinearGradient>

      {/* 4 Metric Cards */}
      <View style={styles.metricsRow}>
        <MetricCard
          icon="💧" label="Toprak Nemi" unit="%"
          value={latest.moisture_pct?.toFixed(1)}
          color={Colors.blue}
          subText={(() => { const b = statusBadge(latest.moisture_pct,20,90); return b.label; })()}
        />
        <View style={{ width: 10 }} />
        <MetricCard
          icon="🌡️" label="Sıcaklık" unit="°C"
          value={latest.temperature_c?.toFixed(1)}
          color={Colors.orange}
          subText={(() => { const b = statusBadge(latest.temperature_c,5,35); return b.label; })()}
        />
      </View>
      <View style={[styles.metricsRow, { marginTop: 10 }]}>
        <MetricCard
          icon="🌬️" label="Hava Nemi" unit="%"
          value={latest.humidity_pct?.toFixed(1)}
          color={Colors.purple}
          subText={(() => { const b = statusBadge(latest.humidity_pct,30,95); return b.label; })()}
        />
        <View style={{ width: 10 }} />
        <MetricCard
          icon="☀️" label="Işık" unit="lux"
          value={latest.light_lux != null ? (latest.light_lux >= 1000 ? (latest.light_lux/1000).toFixed(1)+'k' : latest.light_lux.toFixed(0)) : null}
          color={Colors.green}
          subText={(() => { const b = statusBadge(latest.light_lux,100,100000); return b.label; })()}
        />
      </View>

      {/* Trend Chart */}
      <Card style={styles.chartCard}>
        <SectionHeader title="Sensör Trendi" subtitle="Son 7 okuma" />
        <View style={styles.chartTabs}>
          {[{k:'moisture',l:'Nem',c:Colors.blue},{k:'temp',l:'Sıcaklık',c:Colors.orange},{k:'humidity',l:'Hava',c:Colors.purple}].map(m => (
            <TouchableOpacity
              key={m.k}
              style={[styles.chartTab, chartMetric===m.k && { backgroundColor: m.c + '20', borderColor: m.c }]}
              onPress={() => setChartMetric(m.k)}
            >
              <Text style={[styles.chartTabText, chartMetric===m.k && { color: m.c }]}>{m.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {sorted.length > 1 ? (
          <LineChart
            data={chartData}
            width={CHART_W - 32}
            height={160}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              strokeWidth: 2,
              color: () => chartColor,
              labelColor: () => Colors.textSub,
            }}
            bezier
            style={{ marginTop: 6, borderRadius: 8 }}
            withInnerLines={false}
            withDots={false}
          />
        ) : (
          <Text style={styles.noData}>Yeterli veri yok</Text>
        )}
      </Card>

      {/* Watering Prediction */}
      <Card style={styles.sectionCard}>
        <SectionHeader title="💧 Sulama Tahmini" subtitle="Lineer regresyon analizi" />
        {!watering ? (
          <ActivityIndicator color={Colors.green} />
        ) : watering.error ? (
          <Text style={styles.noData}>Hesaplanamadı — yeterli veri yok</Text>
        ) : watering.status === 'no_watering_needed' ? (
          <View style={styles.wateringGood}>
            <Text style={styles.wateringEmoji}>✅</Text>
            <View>
              <Text style={styles.wateringTitle}>Sulama Gerekmiyor</Text>
              <Text style={styles.wateringSubtitle}>Toprak nemi yeterli seviyede</Text>
            </View>
          </View>
        ) : (
          <View style={styles.wateringAlert}>
            <Text style={styles.wateringEmoji}>🌊</Text>
            <View>
              <Text style={[styles.wateringTitle, { color: Colors.blue }]}>
                {watering.hours_until_watering?.toFixed(1)} saat sonra
              </Text>
              <Text style={styles.wateringSubtitle}>
                {watering.predicted_watering_time
                  ? new Date(watering.predicted_watering_time).toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' })
                  : ''}
              </Text>
              {watering.regression?.r_squared != null && (
                <Text style={styles.wateringR2}>R² = {watering.regression.r_squared.toFixed(2)}</Text>
              )}
            </View>
          </View>
        )}
      </Card>

      {/* Active Alerts */}
      <Card style={styles.sectionCard}>
        <SectionHeader
          title="⚠️ Aktif Uyarılar"
          subtitle={alerts.length > 0 ? `${alerts.length} uyarı var` : 'Sistem normal'}
          onAction={() => navigation.navigate('Alerts')}
          actionLabel="Tümü"
        />
        {alerts.length === 0 ? (
          <View style={styles.allGoodRow}>
            <Text style={{ fontSize: 22 }}>✅</Text>
            <Text style={styles.allGoodText}>Tüm değerler normal aralıkta</Text>
          </View>
        ) : (
          alerts.slice(0,3).map((a, i) => (
            <View key={i} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: a.level === 'critical' ? Colors.red : a.level === 'warning' ? Colors.orange : Colors.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertMsg}>{a.message}</Text>
                <Text style={styles.alertTime}>{a.timestamp}</Text>
              </View>
              <Badge
                label={a.level === 'critical' ? 'Kritik' : a.level === 'warning' ? 'Uyarı' : 'Bilgi'}
                variant={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'orange' : 'blue'}
              />
            </View>
          ))
        )}
      </Card>

      {/* Recent Readings */}
      <Card style={styles.sectionCard}>
        <SectionHeader title="📋 Son Okumalar" subtitle={`Son güncelleme: ${new Date().toLocaleTimeString('tr-TR')}`} />
        {readings.slice(0,5).map((r, i) => {
          const d = new Date(r.timestamp);
          return (
            <View key={i} style={[styles.readingRow, i === readings.slice(0,5).length-1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.readingTime}>{d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text>
              <Text style={[styles.readingVal, { color: Colors.blue }]}>{r.moisture_pct?.toFixed(0)}%</Text>
              <Text style={[styles.readingVal, { color: Colors.orange }]}>{r.temperature_c?.toFixed(1)}°</Text>
              <Text style={[styles.readingVal, { color: Colors.purple }]}>{r.humidity_pct?.toFixed(0)}%</Text>
              <Text style={[styles.readingVal, { color: Colors.green }]}>{r.light_lux?.toFixed(0)} lx</Text>
            </View>
          );
        })}
        {readings.length === 0 && <Text style={styles.noData}>Henüz veri yok</Text>}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  content:     { padding: 16, paddingBottom: 40 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  loadingText: { marginTop: 12, color: Colors.textSub, fontSize: Typography.base },
  banner: {
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 18,
    ...Shadow.lg,
  },
  bannerTitle:  { fontSize: Typography.xxl, fontWeight: '800', color: '#fff' },
  bannerSub:    { fontSize: Typography.base, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  alertBubble: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: Colors.red, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  alertBubbleText: { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  metricsRow:  { flexDirection: 'row' },
  chartCard:   { marginTop: 16 },
  chartTabs:   { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chartTab: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard2,
  },
  chartTabText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textSub },
  sectionCard: { marginTop: 14 },
  noData:      { textAlign: 'center', color: Colors.textSub, fontSize: Typography.base, paddingVertical: 16 },
  wateringGood:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  wateringAlert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  wateringEmoji: { fontSize: 32 },
  wateringTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.text },
  wateringSubtitle: { fontSize: Typography.sm, color: Colors.textSub, marginTop: 2 },
  wateringR2:    { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  allGoodRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  allGoodText:  { fontSize: Typography.base, color: Colors.textSub },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderDim,
  },
  alertDot:   { width: 8, height: 8, borderRadius: 4 },
  alertMsg:   { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  alertTime:  { fontSize: Typography.xs, color: Colors.textSub, marginTop: 1 },
  readingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderDim,
    gap: 4,
  },
  readingTime: { fontSize: Typography.xs, color: Colors.textSub, width: 44 },
  readingVal:  { fontSize: Typography.xs, fontWeight: '700', flex: 1, textAlign: 'right' },
});
