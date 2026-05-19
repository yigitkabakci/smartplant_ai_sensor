import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import FallingLeaves from '../components/FallingLeaves';
import { getAlerts } from '../services/api';
import { Colors, Typography, Radius } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const [alertCount, setAlertCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const a = await getAlerts();
      setAlertCount(Array.isArray(a) ? a.length : 0);
    } catch (e) {}
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAlerts(); };

  return (
    <View style={styles.container}>
    <FallingLeaves />
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
      }
    >
      {/* ── Banner ── */}
      <LinearGradient
        colors={['#0d1f0a', '#162012', '#0a1208']}
        style={styles.banner}
        start={[0, 0]} end={[1, 1]}
      >
        <Text style={styles.bannerBrand} adjustsFontSizeToFit numberOfLines={1}>
          AgroSense
        </Text>
        <View style={styles.bannerDivider} />
        <Text style={styles.bannerTagline}>Ak&#x131;ll&#x131; Bitki &#x130;zleme Sistemi</Text>
      </LinearGradient>

      {/* ── Bitkilerim ── */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => navigation.navigate('Bitkiler')}
      >
        <LinearGradient
          colors={['#0d2d0a', '#142410', '#0a1a08']}
          style={styles.navCard}
          start={[0, 0]} end={[1, 1]}
        >
          <View style={styles.navLeft}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.greenDim }]}>
              <Text style={styles.navIcon}>🌿</Text>
            </View>
            <View>
              <Text style={styles.navTitle}>Bitkilerim</Text>
              <Text style={styles.navSub}>Tüm bitkilerini yönet ve takip et</Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Analiz + AI Analiz ── */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.half}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Analitik')}
        >
          <LinearGradient
            colors={['#0a1830', '#0d2040']}
            style={styles.halfCard}
            start={[0, 0]} end={[1, 1]}
          >
            <Text style={styles.halfIcon}>📊</Text>
            <Text style={styles.halfTitle}>Analiz</Text>
            <Text style={styles.halfSub}>Sensör{'\n'}verileri</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.half}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('Hastalik')}
        >
          <LinearGradient
            colors={['#1a0830', '#280d40']}
            style={styles.halfCard}
            start={[0, 0]} end={[1, 1]}
          >
            <Ionicons name="camera-outline" size={44} color={Colors.cream} />
            <Text style={styles.halfTitle}>AI Analiz</Text>
            <Text style={styles.halfSub}>Hastalık{'\n'}tespiti</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Uyarılar ── */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => navigation.navigate('Uyarilar')}
      >
        <LinearGradient
          colors={alertCount > 0 ? ['#301808', '#401c08'] : ['#0f150a', '#141c0e']}
          style={styles.navCard}
          start={[0, 0]} end={[1, 1]}
        >
          <View style={styles.navLeft}>
            <View style={[styles.iconWrap, {
              backgroundColor: alertCount > 0 ? Colors.orangeDim : Colors.goldDim,
            }]}>
              <Text style={styles.navIcon}>🔔</Text>
            </View>
            <View>
              <Text style={styles.navTitle}>Uyarılar</Text>
              <Text style={styles.navSub}>
                {alertCount > 0
                  ? `${alertCount} aktif uyarı var`
                  : 'Tüm sistemler normal'}
              </Text>
            </View>
          </View>
          <View style={styles.navRight}>
            {alertCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertCount}</Text>
              </View>
            )}
            <Text style={styles.arrow}>›</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll:    { flex: 1 },
  content:   { padding: 16, paddingBottom: 40 },

  // Banner
  banner: {
    borderRadius: Radius.xl,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  bannerBrand: {
    fontStyle: 'italic',
    fontSize: 48,
    fontWeight: '700',
    color: Colors.cream,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bannerDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  bannerTagline: {
    fontSize: 11,
    color: Colors.sub2,
    letterSpacing: 2,
    fontWeight: '400',
    fontStyle: 'italic',
    paddingBottom: 2,
    textAlign: 'center',
  },

  // Full-width nav card
  navCard: {
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  navRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 52, height: 52,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  navIcon:  { fontSize: 28 },
  navTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.cream },
  navSub:   { fontSize: Typography.sm, color: Colors.sub2, marginTop: 2 },
  arrow:    { fontSize: 26, color: Colors.sub, fontWeight: '200' },

  badge: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Half-width cards
  row:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  half:    { flex: 1 },
  halfCard: {
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 148,
    borderWidth: 1, borderColor: Colors.border,
    gap: 6,
  },
  halfIcon:  { fontSize: 44 },
  halfTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.cream },
  halfSub:   { fontSize: Typography.xs, color: Colors.sub2, textAlign: 'center', lineHeight: 16 },
});
