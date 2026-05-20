import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { getPlantDetail } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';
const SEASON_TR = { spring: 'İlkbahar', summer: 'Yaz', autumn: 'Sonbahar', winter: 'Kış' };

function statusColor(s, colors) {
  if (s === 'healthy')  return '#4ade80';
  if (s === 'warning')  return '#fbbf24';
  if (s === 'critical') return '#f87171';
  return colors.sub2;
}
function statusLabel(s) {
  if (s === 'healthy')  return 'Sağlıklı';
  if (s === 'warning')  return 'Dikkat';
  if (s === 'critical') return 'Kritik';
  return 'Bilinmiyor';
}

function Section({ title, eyebrow, children, colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: colors.sub2 }]}>{eyebrow}</Text> : null}
      <Text style={[styles.cardTitle, { color: colors.cream }]}>{title}</Text>
      {children}
    </View>
  );
}

function SensorTile({ icon, label, value, unit, status, colors }) {
  const dotColor = status === 'ok' ? '#4ade80' : status === 'warn' ? '#fbbf24' : colors.sub;
  return (
    <View style={[styles.sensorTile, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
      <View style={[styles.sensorDot, { backgroundColor: dotColor }]} />
      <Text style={styles.sensorIcon}>{icon}</Text>
      <Text style={[styles.sensorVal, { color: colors.cream }]}>
        {value != null ? parseFloat(value).toFixed(1) : '—'}
        <Text style={[styles.sensorUnit, { color: colors.sub2 }]}>{unit}</Text>
      </Text>
      <Text style={[styles.sensorLbl, { color: colors.sub2 }]}>{label}</Text>
    </View>
  );
}

function sensorStatus(metric, val, care) {
  if (val == null || !care) return 'none';
  const ranges = {
    temperature_c: [care.temperature_min, care.temperature_max],
    humidity_pct:  [care.humidity_min,    care.humidity_max],
    moisture_pct:  [care.soil_moisture_min, care.soil_moisture_max],
  };
  const [lo, hi] = ranges[metric] || [];
  if ((lo != null && val < lo) || (hi != null && val > hi)) return 'warn';
  return 'ok';
}

export default function PlantDetailScreen({ navigation, route }) {
  const { plantId, plant: plantBasic } = route.params;
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerTitle: plantBasic?.name || 'Bitki Detayı' });
  }, []);

  useEffect(() => {
    getPlantDetail(plantId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError('Veri yüklenemedi.'); setLoading(false); });
  }, [plantId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={[styles.loadingText, { color: colors.sub2 }]}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error || !data?.success) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={styles.errorIcon}>🌿</Text>
        <Text style={[styles.errorTitle, { color: colors.cream }]}>{data?.plant?.name || 'Bitki'}</Text>
        <Text style={[styles.errorDesc, { color: colors.sub2 }]}>{data?.message || error || 'Bakım bilgisi bulunamadı.'}</Text>
      </View>
    );
  }

  const { plant, care, sensor, analysis, weather, special_notes, seasonal_tip } = data;
  const displayName = plant.display_name || plant.name;

  const tiles = [
    { icon: '🌡️', metric: 'temperature_c', val: sensor?.temperature_c, unit: '°C', lbl: 'Sıcaklık' },
    { icon: '💧', metric: 'humidity_pct',  val: sensor?.humidity_pct,  unit: '%',  lbl: 'Hava Nemi' },
    { icon: '🌱', metric: 'moisture_pct',  val: sensor?.moisture_pct,  unit: '%',  lbl: 'Toprak Nemi' },
    { icon: '☀️', metric: 'light_lux',     val: sensor?.light_lux,     unit: ' lx', lbl: 'Işık' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero image */}
      {plant.image_url ? (
        <Image
          source={{ uri: plant.image_url }}
          style={styles.heroImg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}>
          <Text style={styles.heroEmoji}>🌿</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={[styles.plantName, { color: colors.cream }]}>{displayName}</Text>
        <Text style={[styles.plantId, { color: colors.sub2 }]}>ID · {plant.id}</Text>

        {/* Care */}
        <Section title="Bakım Bilgileri" eyebrow="BAKIM REHBERİ" colors={colors}>
          {care?.summary ? (
            <Text style={[styles.careText, { color: colors.sub }]}>{care.summary}</Text>
          ) : null}
          {care?.watering ? (
            <View style={styles.careRow}>
              <Text style={styles.careIcon}>💧</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.careLabel, { color: colors.sub2 }]}>SULAMA</Text>
                <Text style={[styles.careValue, { color: colors.sub }]}>{care.watering}</Text>
              </View>
            </View>
          ) : null}
          {care?.light ? (
            <View style={styles.careRow}>
              <Text style={styles.careIcon}>☀️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.careLabel, { color: colors.sub2 }]}>IŞIK</Text>
                <Text style={[styles.careValue, { color: colors.sub }]}>{care.light}</Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rangeRow}>
            {care?.temperature_min != null && (
              <View style={styles.rangeItem}>
                <Text style={[styles.careLabel, { color: colors.sub2 }]}>SICAKLIK</Text>
                <Text style={[styles.rangeVal, { color: colors.cream }]}>{care.temperature_min}–{care.temperature_max}°C</Text>
              </View>
            )}
            {care?.humidity_min != null && (
              <View style={styles.rangeItem}>
                <Text style={[styles.careLabel, { color: colors.sub2 }]}>HAVA NEMİ</Text>
                <Text style={[styles.rangeVal, { color: colors.cream }]}>{care.humidity_min}–{care.humidity_max}%</Text>
              </View>
            )}
            {care?.soil_moisture_min != null && (
              <View style={styles.rangeItem}>
                <Text style={[styles.careLabel, { color: colors.sub2 }]}>TOPRAK NEMİ</Text>
                <Text style={[styles.rangeVal, { color: colors.cream }]}>{care.soil_moisture_min}–{care.soil_moisture_max}%</Text>
              </View>
            )}
          </View>
        </Section>

        {/* Sensor */}
        <Section title="Anlık Ölçümler" eyebrow="SENSÖR VERİLERİ" colors={colors}>
          {sensor ? (
            <>
              <View style={styles.sensorGrid}>
                {tiles.map(t => (
                  <SensorTile
                    key={t.metric}
                    icon={t.icon}
                    label={t.lbl}
                    value={t.val}
                    unit={t.unit}
                    status={sensorStatus(t.metric, t.val, care)}
                    colors={colors}
                  />
                ))}
              </View>
              {sensor.timestamp ? (
                <Text style={[styles.ts, { color: colors.sub2 }]}>
                  Son: {new Date(sensor.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {sensor.device_mac ? ' · ' + sensor.device_mac : ''}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.sub2 }]}>Henüz sensör verisi yok.</Text>
          )}
        </Section>

        {/* Analysis */}
        <Section title="Durum Değerlendirmesi" eyebrow="ÇEVRE ANALİZİ" colors={colors}>
          {analysis ? (
            <>
              <View style={styles.scoreRow}>
                <View style={[styles.scoreBadge, { backgroundColor: statusColor(analysis.status, colors) + '22', borderColor: statusColor(analysis.status, colors) + '44' }]}>
                  <Text style={[styles.scoreNum, { color: statusColor(analysis.status, colors) }]}>{analysis.score}</Text>
                  <Text style={[styles.scoreSub, { color: statusColor(analysis.status, colors) }]}>/ 100</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(analysis.status, colors) + '22', borderColor: statusColor(analysis.status, colors) + '44' }]}>
                  <Text style={[styles.statusPillText, { color: statusColor(analysis.status, colors) }]}>{statusLabel(analysis.status)}</Text>
                </View>
              </View>
              {(analysis.comments || []).map((c, i) => (
                <View key={i} style={[
                  styles.comment,
                  c.status === 'ok'
                    ? { backgroundColor: '#4ade8011', borderColor: '#4ade8033' }
                    : { backgroundColor: '#fbbf2411', borderColor: '#fbbf2433' },
                ]}>
                  <View style={[styles.commentDot, { backgroundColor: c.status === 'ok' ? '#4ade80' : '#fbbf24' }]} />
                  <Text style={[styles.commentText, { color: c.status === 'ok' ? '#4ade80cc' : '#fbbf24cc' }]}>{c.message}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.sub2 }]}>Analiz için sensör verisi gerekli.</Text>
          )}
        </Section>

        {/* Weather */}
        {weather && (
          <Section title="Konya İklim" eyebrow="HAVA DURUMU" colors={colors}>
            <View style={styles.weatherRow}>
              <Text style={[styles.weatherTemp, { color: colors.cream }]}>{weather.temp?.toFixed(1)}°C</Text>
              <View>
                <Text style={[styles.weatherCity, { color: colors.sub2 }]}>{weather.city}</Text>
                <Text style={[styles.weatherDesc, { color: colors.sub }]}>{weather.description}</Text>
              </View>
            </View>
            <View style={styles.weatherStats}>
              <View style={styles.wStat}>
                <Text style={[styles.wStatVal, { color: colors.cream }]}>{weather.humidity}%</Text>
                <Text style={[styles.wStatLbl, { color: colors.sub2 }]}>Nem</Text>
              </View>
              <View style={styles.wStat}>
                <Text style={[styles.wStatVal, { color: colors.cream }]}>{weather.wind_speed?.toFixed(1)}</Text>
                <Text style={[styles.wStatLbl, { color: colors.sub2 }]}>Rüzgar</Text>
              </View>
            </View>
          </Section>
        )}

        {/* Seasonal tip */}
        {seasonal_tip ? (
          <Section title="Bu Mevsim" eyebrow="MEVSİMSEL İPUCU" colors={colors}>
            <View style={[styles.seasonalTip, { borderLeftColor: colors.gold + '88', backgroundColor: colors.gold + '0a' }]}>
              <Text style={[styles.seasonalText, { color: colors.sub }]}>{seasonal_tip}</Text>
            </View>
          </Section>
        ) : null}

        {/* Special notes */}
        {special_notes?.length > 0 && (
          <Section title="Özel Notlar" eyebrow="DİKKAT EDİLECEKLER" colors={colors}>
            {special_notes.map((n, i) => (
              <View key={i} style={styles.noteRow}>
                <View style={[styles.noteDot, { backgroundColor: colors.sub2 + '88' }]} />
                <Text style={[styles.noteText, { color: colors.sub }]}>{n}</Text>
              </View>
            ))}
          </Section>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText:   { marginTop: 12, fontSize: Typography.sm, letterSpacing: 0.5 },
  errorIcon:     { fontSize: 48, marginBottom: 12, opacity: 0.4 },
  errorTitle:    { fontSize: Typography.lg, fontWeight: '300', marginBottom: 6, textAlign: 'center' },
  errorDesc:     { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  heroImg:       { width: '100%', height: 200 },
  heroPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  heroEmoji:     { fontSize: 56, opacity: 0.3 },
  body:          { padding: 16, paddingTop: 12 },
  plantName:     { fontSize: 26, fontWeight: '300', letterSpacing: 0.3, marginBottom: 2 },
  plantId:       { fontSize: Typography.xs, letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase' },
  card:          { borderWidth: 1, borderRadius: Radius.md, padding: 16, marginBottom: 12 },
  eyebrow:       { fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 },
  cardTitle:     { fontSize: Typography.md, fontWeight: '600', marginBottom: 12 },
  careText:      { fontSize: Typography.sm, lineHeight: 21, marginBottom: 12 },
  careRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  careIcon:      { fontSize: 18, marginTop: 2 },
  careLabel:     { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  careValue:     { fontSize: Typography.sm, lineHeight: 19 },
  divider:       { height: 1, marginVertical: 10 },
  rangeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rangeItem:     { minWidth: 90 },
  rangeVal:      { fontSize: Typography.base, fontWeight: '700', marginTop: 2 },
  sensorGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sensorTile:    { width: '47%', borderWidth: 1, borderRadius: Radius.sm, padding: 12, position: 'relative' },
  sensorDot:     { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
  sensorIcon:    { fontSize: 20, marginBottom: 4 },
  sensorVal:     { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  sensorUnit:    { fontSize: Typography.sm, fontWeight: '400' },
  sensorLbl:     { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  ts:            { fontSize: 10, marginTop: 8, letterSpacing: 0.3 },
  noData:        { fontSize: Typography.sm, textAlign: 'center', paddingVertical: 12, letterSpacing: 0.4 },
  scoreRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  scoreBadge:    { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  scoreNum:      { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  scoreSub:      { fontSize: Typography.sm, fontWeight: '600' },
  statusPill:    { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  statusPillText:{ fontSize: Typography.sm, fontWeight: '700', letterSpacing: 0.5 },
  comment:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: Radius.sm, padding: 10, marginBottom: 6 },
  commentDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  commentText:   { flex: 1, fontSize: Typography.sm, lineHeight: 18 },
  weatherRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  weatherTemp:   { fontSize: 36, fontWeight: '300', lineHeight: 40 },
  weatherCity:   { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  weatherDesc:   { fontSize: Typography.sm, textTransform: 'capitalize' },
  weatherStats:  { flexDirection: 'row', gap: 16 },
  wStat:         { alignItems: 'center' },
  wStatVal:      { fontSize: Typography.base, fontWeight: '700' },
  wStatLbl:      { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 },
  seasonalTip:   { borderLeftWidth: 2, borderRadius: Radius.sm, padding: 12 },
  seasonalText:  { fontSize: Typography.sm, lineHeight: 20 },
  noteRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  noteDot:       { width: 4, height: 4, borderRadius: 2, marginTop: 7, flexShrink: 0 },
  noteText:      { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
});
