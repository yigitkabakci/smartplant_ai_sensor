import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { getAlerts, getAlertHistory } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';
import FallingLeaves from '../components/FallingLeaves';

const FILTERS = [
  { key:'', label:'Tümü' },
  { key:'Critical', label:'Kritik' },
  { key:'Warning',  label:'Uyarı' },
  { key:'Info',     label:'Bilgi' },
];

const ICON = { Critical:'🔴', Warning:'🟠', Info:'🔵', warning:'🟠', critical:'🔴', info:'🔵' };
const VARIANT = { Critical:'red', Warning:'orange', Info:'blue', warning:'orange', critical:'red', info:'blue' };
const TR = { Critical:'Kritik', Warning:'Uyarı', Info:'Bilgi', warning:'Uyarı', critical:'Kritik', info:'Bilgi' };

const THRESHOLDS = [
  { icon:'💧', name:'Toprak Nemi', min:'20', max:'90', unit:'%',   level:'Uyarı' },
  { icon:'🌡️', name:'Sıcaklık',   min:'5',  max:'35', unit:'°C',  level:'Kritik' },
  { icon:'🌬️', name:'Hava Nemi',  min:'30', max:'95', unit:'%',   level:'Uyarı' },
  { icon:'☀️', name:'Işık',       min:'100',max:'100k',unit:'lux', level:'Bilgi' },
];

export default function AlertsScreen() {
  const [active, setActive]       = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [a, h] = await Promise.all([getAlerts(), getAlertHistory()]);
      setActive(a); setHistory(h);
    } catch(e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 30000); return () => clearInterval(t); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filtered = filter ? history.filter(h => h.severity === filter) : history;
  const critical = history.filter(h => h.severity === 'Critical').length;
  const warning  = history.filter(h => h.severity === 'Warning').length;
  const info     = history.filter(h => h.severity === 'Info').length;

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.green} /></View>
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
          <Text style={styles.statNum}>{history.length}</Text>
          <Text style={styles.statLbl}>Toplam</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color:Colors.red }]}>{critical}</Text>
          <Text style={styles.statLbl}>Kritik</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color:Colors.orange }]}>{warning}</Text>
          <Text style={styles.statLbl}>Uyarı</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color:Colors.blue }]}>{info}</Text>
          <Text style={styles.statLbl}>Bilgi</Text>
        </View>
      </View>

      {/* Active Alerts */}
      <Card style={styles.sectionCard}>
        <SectionHeader
          title="⚡ Aktif Uyarılar"
          subtitle={active.length > 0 ? `${active.length} aktif uyarı` : 'Sistem normal'}
        />
        {active.length === 0 ? (
          <View style={styles.allGood}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <View>
              <Text style={styles.allGoodTitle}>Tüm değerler normal</Text>
              <Text style={styles.allGoodSub}>Aktif eşik ihlali yok</Text>
            </View>
          </View>
        ) : (
          active.map((a, i) => (
            <View key={i} style={[styles.activeRow, i===active.length-1 && { borderBottomWidth:0 }]}>
              <View style={[styles.alertIconBox, { backgroundColor: a.level==='critical' ? Colors.redDim : a.level==='warning' ? Colors.orangeDim : Colors.blueDim }]}>
                <Text style={{ fontSize: 18 }}>{ICON[a.level]}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={styles.activeMsg}>{a.message}</Text>
                <Text style={styles.activeTime}>{a.timestamp}</Text>
              </View>
              <Badge label={TR[a.level] || a.level} variant={VARIANT[a.level] || 'gray'} />
            </View>
          ))
        )}
      </Card>

      {/* History */}
      <Card style={styles.sectionCard}>
        <SectionHeader title="📋 Uyarı Geçmişi" subtitle={`${filtered.length} kayıt`} />

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection:'row', gap:8 }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter===f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, filter===f.key && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.length === 0 ? (
          <Text style={styles.noData}>Bu kritere uyan uyarı yok</Text>
        ) : (
          filtered.slice(0, 30).map((a, i) => {
            const d = new Date(a.timestamp);
            const sev = a.severity || 'Info';
            return (
              <View key={i} style={[styles.histRow, i===filtered.slice(0,30).length-1 && { borderBottomWidth:0 }]}>
                <View style={[styles.histIcon, {
                  backgroundColor: sev==='Critical' ? Colors.redDim : sev==='Warning' ? Colors.orangeDim : Colors.blueDim
                }]}>
                  <Text style={{ fontSize: 16 }}>{ICON[sev]}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.histMsg}>{a.message || a.alert_type || '--'}</Text>
                  <View style={styles.histMeta}>
                    <Text style={styles.histTime}>{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text>
                    {a.sensor_value != null && (
                      <Text style={styles.histVal}>Değer: {parseFloat(a.sensor_value).toFixed(1)}</Text>
                    )}
                  </View>
                </View>
                <Badge label={TR[sev] || sev} variant={VARIANT[sev] || 'gray'} />
              </View>
            );
          })
        )}
      </Card>

      {/* Threshold Reference */}
      <Card style={styles.sectionCard}>
        <SectionHeader title="📏 Eşik Değerleri" subtitle="Uyarı için kullanılan sınırlar" />
        {THRESHOLDS.map((t, i) => (
          <View key={i} style={[styles.thRow, i===THRESHOLDS.length-1 && { borderBottomWidth:0 }]}>
            <Text style={{ fontSize:20, width:30 }}>{t.icon}</Text>
            <Text style={styles.thName}>{t.name}</Text>
            <View style={styles.thRange}>
              <Text style={styles.thMin}>{t.min}</Text>
              <Text style={styles.thSep}> – </Text>
              <Text style={styles.thMax}>{t.max}</Text>
              <Text style={styles.thUnit}> {t.unit}</Text>
            </View>
            <Badge label={t.level} variant={t.level==='Kritik' ? 'red' : t.level==='Uyarı' ? 'orange' : 'blue'} />
          </View>
        ))}
      </Card>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:Colors.bg },
  scroll:    { flex: 1 },
  content:     { padding:16, paddingBottom:40 },
  center:      { flex:1, alignItems:'center', justifyContent:'center' },
  statsRow:    { flexDirection:'row', backgroundColor:Colors.bgCard, borderRadius:Radius.lg, padding:14, marginBottom:14, ...Shadow.sm, borderWidth:1, borderColor:Colors.border },
  statBox:     { flex:1, alignItems:'center' },
  statNum:     { fontSize:Typography.xl, fontWeight:'800', color:Colors.text },
  statLbl:     { fontSize:Typography.xs, color:Colors.textSub, marginTop:2 },
  statDivider: { width:1, backgroundColor:Colors.border },
  sectionCard: { marginBottom:12 },
  allGood:     { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:8 },
  allGoodTitle:{ fontSize:Typography.base, fontWeight:'700', color:Colors.text },
  allGoodSub:  { fontSize:Typography.sm, color:Colors.textSub, marginTop:2 },
  activeRow:   { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  alertIconBox:{ width:38, height:38, borderRadius:Radius.sm, alignItems:'center', justifyContent:'center' },
  activeMsg:   { fontSize:Typography.sm, fontWeight:'600', color:Colors.text },
  activeTime:  { fontSize:Typography.xs, color:Colors.textSub, marginTop:1 },
  filterChip:  { paddingHorizontal:14, paddingVertical:7, borderRadius:Radius.full, backgroundColor:Colors.bgCard2, borderWidth:1, borderColor:Colors.border },
  filterChipActive:{ backgroundColor:Colors.goldDim, borderColor:Colors.gold },
  filterText:  { fontSize:Typography.xs, fontWeight:'600', color:Colors.textSub },
  filterTextActive:{ color:Colors.gold },
  histRow:     { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  histIcon:    { width:36, height:36, borderRadius:Radius.sm, alignItems:'center', justifyContent:'center' },
  histMsg:     { fontSize:Typography.sm, fontWeight:'600', color:Colors.text },
  histMeta:    { flexDirection:'row', gap:8, marginTop:2 },
  histTime:    { fontSize:Typography.xs, color:Colors.textSub },
  histVal:     { fontSize:Typography.xs, color:Colors.textMuted },
  thRow:       { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  thName:      { flex:1, fontSize:Typography.sm, fontWeight:'600', color:Colors.text },
  thRange:     { flexDirection:'row', alignItems:'center' },
  thMin:       { fontSize:Typography.sm, fontWeight:'700', color:Colors.blue },
  thSep:       { fontSize:Typography.sm, color:Colors.textSub },
  thMax:       { fontSize:Typography.sm, fontWeight:'700', color:Colors.blue },
  thUnit:      { fontSize:Typography.xs, color:Colors.textSub },
  noData:      { textAlign:'center', color:Colors.textSub, paddingVertical:20 },
});
