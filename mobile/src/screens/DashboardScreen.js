import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Animated, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import CameraIcon from 'react-native-heroicons/outline/CameraIcon';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import ChevronRightIcon from 'react-native-heroicons/outline/ChevronRightIcon';
import BeakerIcon from 'react-native-heroicons/outline/BeakerIcon';
import FireIcon from 'react-native-heroicons/outline/FireIcon';
import CloudIcon from 'react-native-heroicons/outline/CloudIcon';
import SunIcon from 'react-native-heroicons/outline/SunIcon';
import ExclamationTriangleIcon from 'react-native-heroicons/outline/ExclamationTriangleIcon';
import CpuChipIcon from 'react-native-heroicons/outline/CpuChipIcon';
import MapPinIcon from 'react-native-heroicons/outline/MapPinIcon';
import FallingLeaves from '../components/FallingLeaves';
import { getAlerts, getWeather } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';

function LeafIcon({ size = 24, color = '#000', strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8 5 5 9 5 13C5 17.5 8.1 21 12 21C15.9 21 19 17.5 19 13C19 9 16 5 12 2Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M12 21L12 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

function HandwrittenLogo() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });
  const letters  = 'AgroSense'.split('');
  const anims    = useRef(letters.map(() => new Animated.Value(0))).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.sequence([
      Animated.delay(200),
      Animated.stagger(95, anims.map(a =>
        Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })
      )),
    ]).start(() => {
      Animated.timing(lineAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ height: 90 }} />;

  return (
    <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {letters.map((char, i) => (
          <Animated.Text
            key={i}
            style={{
              fontFamily: 'DancingScript_700Bold',
              fontSize: 54, color: colors.green, lineHeight: 66,
              textShadowColor: `${colors.green}59`,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 14,
              opacity: anims[i],
              transform: [
                { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                { scale:      anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
              ],
            }}
          >
            {char}
          </Animated.Text>
        ))}
      </View>
      <Animated.View style={{
        height: 1.5, backgroundColor: colors.green, opacity: 0.45,
        borderRadius: 1, marginTop: 4, alignSelf: 'center',
        width: lineAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '72%'] }),
      }} />
    </View>
  );
}

const SUBTITLES = [
  'Akıllı Bitki İzleme Sistemi',
  'AI Bitki Analizi',
  'Bitki Hastalık Tespiti',
];

function TypewriterSubtitle() {
  const { colors } = useTheme();
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const phrase = SUBTITLES[phraseIdx];
    const run = async () => {
      await new Promise(r =>
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(r)
      );
      for (let i = 0; i <= phrase.length; i++) {
        if (cancelled) return;
        setDisplayed(phrase.slice(0, i));
        await new Promise(r => setTimeout(r, 58));
      }
      await new Promise(r => setTimeout(r, 2100));
      if (cancelled) return;
      await new Promise(r =>
        Animated.timing(fadeAnim, { toValue: 0, duration: 550, useNativeDriver: true }).start(r)
      );
      if (cancelled) return;
      await new Promise(r => setTimeout(r, 160));
      setPhraseIdx(idx => (idx + 1) % SUBTITLES.length);
    };
    run();
    return () => { cancelled = true; };
  }, [phraseIdx]);

  return (
    <Animated.View style={{ height: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: -4, opacity: fadeAnim }}>
      <Text style={{ fontSize: 13, color: colors.sub2, fontWeight: '500', letterSpacing: 0.5 }}>{displayed}</Text>
    </Animated.View>
  );
}

function WeatherCard() {
  const { colors } = useTheme();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeather().then(d => { setWeather(d); setLoading(false); });
  }, []);

  const iconForDesc = (desc = '') => {
    const d = desc.toLowerCase();
    if (d.includes('yağ') || d.includes('rain') || d.includes('drizzle')) return <BeakerIcon size={48} color="rgba(100,160,220,0.75)" strokeWidth={1.2} />;
    if (d.includes('bulut') || d.includes('cloud') || d.includes('sis')) return <CloudIcon size={48} color="rgba(160,180,200,0.65)" strokeWidth={1.2} />;
    return <SunIcon size={48} color="rgba(250,200,80,0.8)" strokeWidth={1.2} />;
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 14, padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.green} />
        <Text style={{ fontSize: Typography.xs, color: colors.sub2, marginTop: 8 }}>Hava durumu yükleniyor...</Text>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 14, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPinIcon size={11} color={colors.sub} strokeWidth={2.5} />
          <Text style={{ fontSize: Typography.xs, color: colors.sub2 }}>Konya, Türkiye</Text>
        </View>
        <Text style={{ fontSize: Typography.xs, color: colors.sub, marginTop: 8 }}>Hava durumu alınamadı — API anahtarı kontrol edin.</Text>
      </View>
    );
  }

  const temp     = Math.round(weather.temp ?? 0);
  const feels    = Math.round(weather.feels_like ?? 0);
  const humidity = weather.humidity ?? 0;
  const windKmh  = Math.round((weather.wind_speed ?? 0) * 3.6);
  const desc     = weather.description ?? '';
  const city     = weather.city ?? 'Konya';

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 14, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderDim }}>
        <MapPinIcon size={11} color={colors.green} strokeWidth={2.5} />
        <Text style={{ flex: 1, fontSize: Typography.xs, color: colors.sub2, fontWeight: '600', letterSpacing: 0.3 }}>{city}, Türkiye</Text>
        <View style={{ backgroundColor: colors.greenDim, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, color: colors.green, fontWeight: '800', letterSpacing: 0.8 }}>CANLI</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
        <View style={{ alignItems: 'flex-start', gap: 6 }}>
          {iconForDesc(desc)}
          <Text style={{ fontSize: Typography.base, color: colors.cream, fontWeight: '700', textTransform: 'capitalize' }}>{desc}</Text>
          <Text style={{ fontSize: Typography.xs, color: colors.sub2 }}>Dışarıda</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 60, fontWeight: '800', color: colors.cream, lineHeight: 66 }}>{temp}°</Text>
          <Text style={{ fontSize: Typography.base, color: colors.sub2, fontWeight: '600', marginTop: 10 }}>C</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.borderDim, marginHorizontal: 14 }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 }}>
        {[
          { Icon: BeakerIcon, val: `${humidity}%`,  lbl: 'Nem',        color: colors.blue   },
          { Icon: FireIcon,   val: `${feels}°C`,    lbl: 'Hissedilen', color: colors.orange },
          { Icon: CloudIcon,  val: `${windKmh}km/s`,lbl: 'Rüzgar',     color: colors.sub2   },
        ].map(({ Icon, val, lbl, color }, i, arr) => (
          <React.Fragment key={lbl}>
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Icon size={14} color={color} strokeWidth={2} />
              <Text style={{ fontSize: Typography.sm, fontWeight: '800', color }}>{val}</Text>
              <Text style={{ fontSize: 9, color: colors.sub2, fontWeight: '600' }}>{lbl}</Text>
            </View>
            {i < arr.length - 1 && <View style={{ width: 1, backgroundColor: colors.borderDim, marginVertical: 4 }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function NavCard({ icon, accent, title, sub, badge, onPress }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={s.navCardWrap}>
      <View style={[s.navCard, { borderLeftColor: accent }]}>
        <View style={s.navLeft}>
          <View style={[s.iconBox, { backgroundColor: `${accent}18` }]}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={s.navTitle}>{title}</Text>
            <Text style={s.navSub}>{sub}</Text>
          </View>
        </View>
        <View style={s.navRight}>
          {badge != null && (
            <View style={[s.badge, { backgroundColor: accent }]}>
              <Text style={s.badgeText}>{badge}</Text>
            </View>
          )}
          <ChevronRightIcon size={16} color={colors.sub} strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HalfCard({ icon, title, sub, accent, onPress }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.78} style={s.halfWrap} onPress={onPress}>
      <View style={[s.halfCard, { borderTopColor: accent }]}>
        {icon}
        <Text style={s.halfTitle}>{title}</Text>
        <Text style={s.halfSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [alertCount, setAlertCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const alerts = await getAlerts();
      setAlertCount(Array.isArray(alerts) ? alerts.length : 0);
    } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <View style={s.container}>
      <FallingLeaves />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        <HandwrittenLogo />
        <TypewriterSubtitle />
        <WeatherCard />

        <View style={s.row}>
          <HalfCard
            icon={<LeafIcon size={28} color={colors.green} strokeWidth={1.6} />}
            title="Bitkilerim" sub={'Bitkileri\nyönet'} accent={colors.green}
            onPress={() => navigation.navigate('Bitkiler')}
          />
          <HalfCard
            icon={<ChartBarIcon size={28} color={colors.blue} strokeWidth={1.6} />}
            title="Analiz" sub={'Sensör\nverileri'} accent={colors.blue}
            onPress={() => navigation.navigate('Analitik')}
          />
        </View>
        <View style={s.row}>
          <HalfCard
            icon={<CameraIcon size={28} color={colors.purple} strokeWidth={1.6} />}
            title="AI Analiz" sub={'Hastalık\ntespiti'} accent={colors.purple}
            onPress={() => navigation.navigate('Hastalik')}
          />
          <HalfCard
            icon={<CpuChipIcon size={28} color={colors.amber} strokeWidth={1.6} />}
            title="Cihazlarım" sub={'Sensör\ncihazları'} accent={colors.amber}
            onPress={() => navigation.navigate('Cihazlar')}
          />
        </View>

        <NavCard
          icon={
            alertCount > 0
              ? <ExclamationTriangleIcon size={20} color={colors.amber} strokeWidth={1.8} />
              : <BellAlertIcon size={20} color={colors.sub2} strokeWidth={1.8} />
          }
          accent={alertCount > 0 ? colors.amber : colors.border}
          title="Uyarılar"
          sub={alertCount > 0 ? `${alertCount} aktif uyarı var` : 'Tüm sistemler normal'}
          badge={alertCount > 0 ? alertCount : null}
          onPress={() => navigation.navigate('Uyarilar')}
        />
      </ScrollView>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll:    { flex: 1 },
    content:   { padding: 16, paddingBottom: 40 },

    navCardWrap: { marginBottom: 10 },
    navCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, paddingVertical: 14, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    navLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox:  { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    navTitle: { fontSize: Typography.base, fontWeight: '700', color: C.cream },
    navSub:   { fontSize: Typography.sm, color: C.sub2, marginTop: 2 },
    badge:     { borderRadius: Radius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    row:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
    halfWrap: { flex: 1 },
    halfCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      borderTopWidth: 2, padding: 18, alignItems: 'flex-start', minHeight: 130, gap: 8,
    },
    halfTitle: { fontSize: Typography.base, fontWeight: '700', color: C.cream },
    halfSub:   { fontSize: Typography.xs, color: C.sub2, lineHeight: 16 },
  });
}
