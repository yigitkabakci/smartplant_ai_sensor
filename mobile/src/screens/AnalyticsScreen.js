import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import FireIcon from 'react-native-heroicons/outline/FireIcon';
import CloudIcon from 'react-native-heroicons/outline/CloudIcon';
import BeakerIcon from 'react-native-heroicons/outline/BeakerIcon';
import SunIcon from 'react-native-heroicons/outline/SunIcon';
import TableCellsIcon from 'react-native-heroicons/outline/TableCellsIcon';
import { getSensorReadings } from '../services/api';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';
import FallingLeaves from '../components/FallingLeaves';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

const PERIODS = [
  { label: '24s', hours: 24  },
  { label: '3g',  hours: 72  },
  { label: '7g',  hours: 168 },
  { label: 'Tümü', hours: 0  },
];

const avg = (arr, key) => {
  const vals = arr.map(r => r[key]).filter(v => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};
const minMaxOf = (arr, key) => {
  const vals = arr.map(r => r[key]).filter(v => v != null);
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
};

function SummaryBox({ IconComponent, label, value, unit, mm, color }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeSummaryStyles(colors), [colors]);
  return (
    <View style={[s.box, { borderTopColor: color }]}>
      <IconComponent size={18} color={color} strokeWidth={1.8} />
      <Text style={[s.val, { color }]}>{value != null ? value.toFixed(1) : '--'}</Text>
      <Text style={s.unit}>{unit}</Text>
      <Text style={s.label}>{label}</Text>
      {mm && <Text style={s.mm}>↓{mm.min.toFixed(1)} ↑{mm.max.toFixed(1)}</Text>}
    </View>
  );
}

function makeSummaryStyles(C) {
  return StyleSheet.create({
    box:   { flex: 1, minWidth: '44%', backgroundColor: C.card, borderRadius: Radius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderTopWidth: 2, gap: 2 },
    val:   { fontSize: Typography.xl, fontWeight: '800', marginTop: 4 },
    unit:  { fontSize: Typography.xs, color: C.sub2 },
    label: { fontSize: Typography.xs, color: C.sub2, marginTop: 2, textAlign: 'center' },
    mm:    { fontSize: 10, color: C.sub, marginTop: 2 },
  });
}

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [all, setAll]               = useState([]);
  const [period, setPeriod]         = useState(72);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getSensorReadings(100);
      setAll(data);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = (() => {
    let d = [...all];
    if (period > 0) {
      const cutoff = Date.now() - period * 3600000;
      d = d.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    return d.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  })();

  const labels = filtered.slice(-8).map(r => {
    const d = new Date(r.timestamp);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const makeChartData = (key) => ({
    labels,
    datasets: [{ data: filtered.slice(-8).map(r => r[key] ?? 0), strokeWidth: 2 }],
  });

  const chartCfg = (color) => ({
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1, strokeWidth: 2,
    color: () => color,
    labelColor: () => colors.sub2,
    propsForBackgroundLines: { stroke: colors.borderDim },
  });

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
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.hours}
              style={[s.periodBtn, period === p.hours && s.periodBtnActive]}
              onPress={() => setPeriod(p.hours)}
            >
              <Text style={[s.periodText, period === p.hours && s.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.dataCount}>{filtered.length} okuma gösteriliyor</Text>

        <View style={s.summaryGrid}>
          <SummaryBox IconComponent={FireIcon}   label="Ort. Sıcaklık"  unit="°C" value={avg(filtered, 'temperature_c')} mm={minMaxOf(filtered, 'temperature_c')} color={colors.orange} />
          <SummaryBox IconComponent={CloudIcon}  label="Ort. Hava Nemi" unit="%"  value={avg(filtered, 'humidity_pct')}  mm={minMaxOf(filtered, 'humidity_pct')}  color={colors.purple} />
          <SummaryBox IconComponent={BeakerIcon} label="Ort. Toprak"    unit="%"  value={avg(filtered, 'moisture_pct')}  mm={minMaxOf(filtered, 'moisture_pct')}  color={colors.blue}   />
          <SummaryBox IconComponent={SunIcon}    label="Ort. Işık"      unit="lx" value={avg(filtered, 'light_lux')}     mm={minMaxOf(filtered, 'light_lux')}     color={colors.amber}  />
        </View>

        {filtered.length > 1 ? (
          <>
            {[
              { key: 'temperature_c', label: 'Sıcaklık',    unit: '°C', color: colors.orange, Icon: FireIcon   },
              { key: 'humidity_pct',  label: 'Hava Nemi',   unit: '%',  color: colors.purple, Icon: CloudIcon  },
              { key: 'moisture_pct',  label: 'Toprak Nemi', unit: '%',  color: colors.blue,   Icon: BeakerIcon },
              { key: 'light_lux',     label: 'Işık',        unit: 'lx', color: colors.amber,  Icon: SunIcon    },
            ].map(({ key, label, unit, color, Icon }) => (
              <Card key={key} style={s.chartCard}>
                <View style={s.chartHeader}>
                  <Icon size={14} color={color} strokeWidth={2} />
                  <Text style={s.chartTitle}>{label}</Text>
                  <Text style={s.chartUnit}>{unit}</Text>
                </View>
                <LineChart
                  data={makeChartData(key)}
                  width={CHART_W - 32}
                  height={140}
                  chartConfig={chartCfg(color)}
                  bezier style={s.chart}
                  withInnerLines={false} withDots={false}
                />
              </Card>
            ))}
          </>
        ) : (
          <Card style={{ marginTop: 8 }}>
            <Text style={s.noData}>Bu periyotta yeterli veri yok</Text>
          </Card>
        )}

        <Card style={{ marginTop: 8 }}>
          <View style={s.chartHeader}>
            <TableCellsIcon size={14} color={colors.sub2} strokeWidth={2} />
            <Text style={s.chartTitle}>Ham Veri</Text>
            <Text style={s.chartUnit}>Son {Math.min(filtered.length, 10)} okuma</Text>
          </View>
          <View style={s.tableHead}>
            <Text style={[s.thCell, { flex: 1.4 }]}>Zaman</Text>
            <Text style={s.thCell}>Nem%</Text>
            <Text style={s.thCell}>Sıcaklık</Text>
            <Text style={s.thCell}>Hava</Text>
            <Text style={s.thCell}>Işık</Text>
          </View>
          {filtered.slice(-10).reverse().map((r, i) => {
            const d = new Date(r.timestamp);
            return (
              <View key={i} style={[s.tableRow, i % 2 === 1 && { backgroundColor: colors.card2 }]}>
                <Text style={[s.tdCell, { flex: 1.4, color: colors.sub2 }]}>
                  {d.toLocaleDateString('tr-TR', { month: '2-digit', day: '2-digit' })}{' '}
                  {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[s.tdCell, { color: colors.blue   }]}>{r.moisture_pct?.toFixed(1)}%</Text>
                <Text style={[s.tdCell, { color: colors.orange }]}>{r.temperature_c?.toFixed(1)}°</Text>
                <Text style={[s.tdCell, { color: colors.purple }]}>{r.humidity_pct?.toFixed(1)}%</Text>
                <Text style={[s.tdCell, { color: colors.amber  }]}>{r.light_lux?.toFixed(0)}</Text>
              </View>
            );
          })}
          {filtered.length === 0 && <Text style={s.noData}>Veri yok</Text>}
        </Card>
      </ScrollView>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    scroll:     { flex: 1 },
    content:    { padding: 16, paddingBottom: 40 },
    center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

    periodRow:       { flexDirection: 'row', gap: 8, marginBottom: 10 },
    periodBtn:       { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    periodBtnActive: { backgroundColor: C.greenDim, borderColor: C.green },
    periodText:      { fontSize: Typography.sm, fontWeight: '600', color: C.sub2 },
    periodTextActive:{ color: C.green },
    dataCount:       { fontSize: Typography.xs, color: C.sub, marginBottom: 12, textAlign: 'right' },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },

    chartCard:   { marginBottom: 12 },
    chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    chartTitle:  { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1 },
    chartUnit:   { fontSize: Typography.xs, color: C.sub2 },
    chart:       { marginTop: 4, borderRadius: 8 },

    tableHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    thCell:    { flex: 1, fontSize: Typography.xs, fontWeight: '700', color: C.sub2, textAlign: 'center', textTransform: 'uppercase' },
    tableRow:  { flexDirection: 'row', paddingVertical: 8, borderRadius: 6 },
    tdCell:    { flex: 1, fontSize: Typography.xs, fontWeight: '600', textAlign: 'center' },
    noData:    { textAlign: 'center', color: C.sub2, paddingVertical: 20 },
  });
}
