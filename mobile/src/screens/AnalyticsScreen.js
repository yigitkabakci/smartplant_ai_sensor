import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getSensorReadings } from '../services/api';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius } from '../constants/theme';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

const PERIODS = [
  { label: '24s', hours: 24 },
  { label: '3g',  hours: 72 },
  { label: '7g',  hours: 168 },
  { label: 'Tümü', hours: 0 },
];

const avg = (arr, key) => {
  const vals = arr.map(r => r[key]).filter(v => v != null);
  return vals.length ? (vals.reduce((a,b) => a+b,0) / vals.length) : null;
};
const minMaxOf = (arr, key) => {
  const vals = arr.map(r => r[key]).filter(v => v != null);
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
};

export default function AnalyticsScreen() {
  const [all, setAll]         = useState([]);
  const [period, setPeriod]   = useState(72);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getSensorReadings(100);
      setAll(data);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Filter
  const filtered = (() => {
    let d = [...all];
    if (period > 0) {
      const cutoff = Date.now() - period * 3600000;
      d = d.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    return d.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  })();

  const labels = filtered.slice(-8).map(r => {
    const d = new Date(r.timestamp);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  });

  const makeChartData = (key) => ({
    labels,
    datasets: [{ data: filtered.slice(-8).map(r => r[key] ?? 0), strokeWidth: 2 }],
  });

  const chartCfg = (color) => ({
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
    decimalPlaces: 1, strokeWidth: 2, color: () => color, labelColor: () => Colors.textSub,
  });

  const SummaryBox = ({ icon, label, value, unit, mm, color }) => (
    <View style={[styles.summaryBox, { borderTopColor: color }]}>
      <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text>
      <Text style={[styles.summaryVal, { color }]}>{value != null ? value.toFixed(1) : '--'}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {mm && <Text style={styles.summaryMM}>↓{mm.min.toFixed(1)} ↑{mm.max.toFixed(1)}</Text>}
    </View>
  );

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.green} /></View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
    >
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.hours}
            style={[styles.periodBtn, period === p.hours && styles.periodBtnActive]}
            onPress={() => setPeriod(p.hours)}
          >
            <Text style={[styles.periodText, period === p.hours && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.dataCount}>{filtered.length} okuma gösteriliyor</Text>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryBox icon="🌡️" label="Ort. Sıcaklık" unit="°C"
          value={avg(filtered,'temperature_c')} mm={minMaxOf(filtered,'temperature_c')} color={Colors.orange} />
        <SummaryBox icon="🌬️" label="Ort. Hava Nemi" unit="%"
          value={avg(filtered,'humidity_pct')} mm={minMaxOf(filtered,'humidity_pct')} color={Colors.purple} />
        <SummaryBox icon="💧" label="Ort. Toprak" unit="%"
          value={avg(filtered,'moisture_pct')} mm={minMaxOf(filtered,'moisture_pct')} color={Colors.blue} />
        <SummaryBox icon="☀️" label="Ort. Işık" unit="lx"
          value={avg(filtered,'light_lux')} mm={minMaxOf(filtered,'light_lux')} color={Colors.green} />
      </View>

      {/* Charts */}
      {filtered.length > 1 ? (
        <>
          <Card style={styles.chartCard}>
            <SectionHeader title="🌡️ Sıcaklık" subtitle="°C" />
            <LineChart data={makeChartData('temperature_c')} width={CHART_W-32} height={140}
              chartConfig={chartCfg(Colors.orange)} bezier style={styles.chart} withInnerLines={false} withDots={false} />
          </Card>

          <Card style={styles.chartCard}>
            <SectionHeader title="🌬️ Hava Nemi" subtitle="%" />
            <LineChart data={makeChartData('humidity_pct')} width={CHART_W-32} height={140}
              chartConfig={chartCfg(Colors.purple)} bezier style={styles.chart} withInnerLines={false} withDots={false} />
          </Card>

          <Card style={styles.chartCard}>
            <SectionHeader title="💧 Toprak Nemi" subtitle="%" />
            <LineChart data={makeChartData('moisture_pct')} width={CHART_W-32} height={140}
              chartConfig={chartCfg(Colors.blue)} bezier style={styles.chart} withInnerLines={false} withDots={false} />
          </Card>

          <Card style={styles.chartCard}>
            <SectionHeader title="☀️ Işık" subtitle="lux" />
            <LineChart data={makeChartData('light_lux')} width={CHART_W-32} height={140}
              chartConfig={chartCfg(Colors.green)} bezier style={styles.chart} withInnerLines={false} withDots={false} />
          </Card>
        </>
      ) : (
        <Card style={{ marginTop: 8 }}>
          <Text style={styles.noData}>Bu periyotta yeterli veri yok</Text>
        </Card>
      )}

      {/* Raw Table */}
      <Card style={{ marginTop: 8 }}>
        <SectionHeader title="📋 Ham Veri" subtitle={`Son ${Math.min(filtered.length, 10)} okuma`} />
        <View style={styles.tableHead}>
          <Text style={[styles.thCell, { flex:1.4 }]}>Zaman</Text>
          <Text style={styles.thCell}>Nem%</Text>
          <Text style={styles.thCell}>Sıcaklık</Text>
          <Text style={styles.thCell}>Hava</Text>
          <Text style={styles.thCell}>Işık</Text>
        </View>
        {filtered.slice(-10).reverse().map((r, i) => {
          const d = new Date(r.timestamp);
          return (
            <View key={i} style={[styles.tableRow, i%2===1 && { backgroundColor: Colors.bgCard2 }]}>
              <Text style={[styles.tdCell, { flex:1.4, color:Colors.textSub }]}>
                {d.toLocaleDateString('tr-TR',{month:'2-digit',day:'2-digit'})} {d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
              </Text>
              <Text style={[styles.tdCell, { color:Colors.blue }]}>{r.moisture_pct?.toFixed(1)}%</Text>
              <Text style={[styles.tdCell, { color:Colors.orange }]}>{r.temperature_c?.toFixed(1)}°</Text>
              <Text style={[styles.tdCell, { color:Colors.purple }]}>{r.humidity_pct?.toFixed(1)}%</Text>
              <Text style={[styles.tdCell, { color:Colors.green }]}>{r.light_lux?.toFixed(0)}</Text>
            </View>
          );
        })}
        {filtered.length === 0 && <Text style={styles.noData}>Veri yok</Text>}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, alignItems:'center', justifyContent:'center' },
  periodRow:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  periodBtn:  { flex:1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bgCard, alignItems:'center', borderWidth:1, borderColor:Colors.border },
  periodBtnActive:{ backgroundColor: Colors.greenDim, borderColor: Colors.green },
  periodText: { fontSize: Typography.sm, fontWeight:'600', color:Colors.textSub },
  periodTextActive:{ color:Colors.greenDark },
  dataCount:  { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 12, textAlign:'right' },
  summaryGrid:{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:14 },
  summaryBox: {
    flex:1, minWidth:'44%', backgroundColor:Colors.bgCard,
    borderRadius:Radius.lg, padding:14, alignItems:'center',
    borderWidth:1, borderColor:Colors.border, borderTopWidth:3,
  },
  summaryVal:  { fontSize: Typography.xl, fontWeight:'800' },
  summaryUnit: { fontSize: Typography.xs, color:Colors.textSub },
  summaryLabel:{ fontSize: Typography.xs, color:Colors.textSub, marginTop:4, textAlign:'center' },
  summaryMM:   { fontSize: 10, color:Colors.textMuted, marginTop:3 },
  chartCard:  { marginBottom: 12 },
  chart:      { marginTop:6, borderRadius:8 },
  tableHead:  { flexDirection:'row', paddingVertical:8, borderBottomWidth:1, borderBottomColor:Colors.border },
  thCell:     { flex:1, fontSize:Typography.xs, fontWeight:'700', color:Colors.textSub, textAlign:'center', textTransform:'uppercase' },
  tableRow:   { flexDirection:'row', paddingVertical:8, borderRadius:6 },
  tdCell:     { flex:1, fontSize:Typography.xs, fontWeight:'600', textAlign:'center' },
  noData:     { textAlign:'center', color:Colors.textSub, paddingVertical:20 },
});
