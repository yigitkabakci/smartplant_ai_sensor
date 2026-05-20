import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarChart } from 'react-native-chart-kit';
import CameraIcon from 'react-native-heroicons/outline/CameraIcon';
import PhotoIcon from 'react-native-heroicons/outline/PhotoIcon';
import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
import LightBulbIcon from 'react-native-heroicons/outline/LightBulbIcon';
import ArrowPathIcon from 'react-native-heroicons/outline/ArrowPathIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import CheckCircleIcon from 'react-native-heroicons/outline/CheckCircleIcon';
import ExclamationTriangleIcon from 'react-native-heroicons/outline/ExclamationTriangleIcon';
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import { predictLeafDisease, getLeafHistory, BASE_URL } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';
import FallingLeaves from '../components/FallingLeaves';

const { width } = Dimensions.get('window');

export default function DiseaseScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [image, setImage]             = useState(null);
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const h = await getLeafHistory(12);
      setHistory(h);
    } catch {}
    setHistLoading(false);
  };

  const pickImage = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('İzin Gerekli', 'Lütfen izin verin.'); return; }
    const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await picker({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (!res.canceled && res.assets[0]) analyze(res.assets[0].uri);
  };

  const analyze = async (uri) => {
    setImage(uri); setResult(null); setLoading(true);
    try {
      const data = await predictLeafDisease(uri);
      setResult(data);
      loadHistory();
    } catch (e) {
      Alert.alert('Hata', 'Analiz sırasında hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
    }
    setLoading(false);
  };

  const reset = () => { setImage(null); setResult(null); };

  const chartData = result ? (() => {
    const preds = result.predictions?.slice(0, 6) || [];
    return {
      labels: preds.map(p => p.disease?.split(' ').slice(-1)[0]?.substring(0, 8) || 'N/A'),
      datasets: [{ data: preds.map(p => {
        if (typeof p.confidence === 'string') return parseFloat(p.confidence) || (p.score * 100);
        return (p.score ?? 0) * 100;
      }) }],
    };
  })() : null;

  const confNum = result ? (() => {
    const top = result.top_prediction;
    if (typeof top?.confidence === 'string') return parseFloat(top.confidence) || 0;
    return (top?.score ?? 0) * 100;
  })() : 0;

  const isHealthy = (result?.top_prediction?.disease || '').toLowerCase().includes('healthy');

  return (
    <View style={s.container}>
      <FallingLeaves />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {!image && !loading && (
          <Card style={s.uploadCard}>
            <View style={s.uploadIconBox}>
              <SparklesIcon size={42} color={colors.green} strokeWidth={1.3} />
            </View>
            <Text style={s.uploadTitle}>Yaprak Görüntüsü Yükle</Text>
            <Text style={s.uploadSub}>
              Fotoğraf çek veya galeriden seç.{'\n'}AI modelimiz hastalığı tespit eder.
            </Text>
            <View style={s.uploadBtns}>
              <TouchableOpacity style={s.camBtn} onPress={() => pickImage(true)}>
                <CameraIcon size={18} color="#fff" strokeWidth={2} />
                <Text style={s.camBtnText}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.galBtn} onPress={() => pickImage(false)}>
                <PhotoIcon size={18} color={colors.cream} strokeWidth={2} />
                <Text style={s.galBtnText}>Galeri</Text>
              </TouchableOpacity>
            </View>
            <View style={s.tipBox}>
              <View style={s.tipHeader}>
                <LightBulbIcon size={14} color={colors.green} strokeWidth={2} />
                <Text style={s.tipTitle}>İpuçları</Text>
              </View>
              <Text style={s.tipText}>
                {'• Tek yaprak, net fotoğraf\n• İyi aydınlatılmış ortam\n• Hastalıklı bölgeyi çerçevele'}
              </Text>
            </View>
          </Card>
        )}

        {loading && (
          <Card style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={s.loadingTitle}>Yaprak analiz ediliyor...</Text>
            <Text style={s.loadingSubtitle}>AI modelimiz görüntüyü inceliyor</Text>
            {image && <Image source={{ uri: image }} style={s.previewSmall} />}
          </Card>
        )}

        {result && !loading && (
          <>
            <Card style={s.resultCard}>
              <View style={s.resultHeader}>
                <View style={s.resultHeaderLeft}>
                  <SparklesIcon size={16} color={colors.green} strokeWidth={2} />
                  <View>
                    <Text style={s.resultHeaderTitle}>Tanı Sonucu</Text>
                    <Text style={s.resultHeaderSub}>AI analiz tamamlandı</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.resetBtn} onPress={reset}>
                  <ArrowPathIcon size={14} color={colors.sub2} strokeWidth={2} />
                  <Text style={s.resetBtnText}>Yeni</Text>
                </TouchableOpacity>
              </View>
              <Image source={{ uri: image }} style={s.resultImage} resizeMode="cover" />
              <View style={s.diseaseInfo}>
                <View style={s.diseaseStatusRow}>
                  {isHealthy
                    ? <CheckCircleIcon size={18} color={colors.green} strokeWidth={2} />
                    : <ExclamationTriangleIcon size={18} color={confNum > 70 ? colors.red : colors.amber} strokeWidth={2} />
                  }
                  <Badge
                    label={isHealthy ? 'Sağlıklı' : 'Hastalık Tespit Edildi'}
                    variant={isHealthy ? 'green' : confNum > 70 ? 'red' : 'orange'}
                  />
                </View>
                <Text style={s.diseaseName}>{result.top_prediction?.disease || '--'}</Text>
                <Text style={s.diseaseType}>{isHealthy ? 'Sağlıklı yaprak' : 'Bitki hastalığı'}</Text>
                <View style={s.confRow}>
                  <Text style={s.confLabel}>Güven Skoru</Text>
                  <Text style={[s.confPct, { color: isHealthy ? colors.green : colors.amber }]}>
                    {confNum.toFixed(1)}%
                  </Text>
                </View>
                <View style={s.confBar}>
                  <View style={[s.confFill, {
                    width: `${Math.min(confNum, 100)}%`,
                    backgroundColor: isHealthy ? colors.green : confNum > 70 ? colors.red : colors.amber,
                  }]} />
                </View>
              </View>
            </Card>

            {chartData && (
              <Card style={{ marginTop: 12 }}>
                <View style={s.chartHeader}>
                  <ChartBarIcon size={14} color={colors.sub2} strokeWidth={2} />
                  <Text style={s.chartTitle}>Tüm Tahminler</Text>
                  <Text style={s.chartSub}>Olasılık dağılımı</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={chartData}
                    width={Math.max(width - 48, chartData.labels.length * 70)}
                    height={180}
                    chartConfig={{
                      backgroundColor: colors.card,
                      backgroundGradientFrom: colors.card,
                      backgroundGradientTo: colors.card,
                      decimalPlaces: 1, strokeWidth: 2,
                      color: () => colors.green,
                      labelColor: () => colors.sub2,
                    }}
                    style={{ borderRadius: 8 }}
                    showValuesOnTopOfBars
                    withInnerLines={false}
                  />
                </ScrollView>
              </Card>
            )}
          </>
        )}

        <Card style={{ marginTop: 14 }}>
          <View style={s.chartHeader}>
            <ClockIcon size={14} color={colors.sub2} strokeWidth={2} />
            <Text style={s.chartTitle}>Analiz Geçmişi</Text>
            <Text style={s.chartSub}>{history.length} kayıt</Text>
          </View>
          {histLoading ? (
            <ActivityIndicator color={colors.green} />
          ) : history.length === 0 ? (
            <Text style={s.noData}>Henüz analiz yapılmadı</Text>
          ) : (
            history.map((item, i) => {
              const d       = new Date(item.timestamp);
              const conf    = item.confidence != null ? (item.confidence * 100).toFixed(1) : '--';
              const healthy = (item.label || '').toLowerCase().includes('healthy');
              return (
                <View key={i} style={[s.histRow, i === history.length - 1 && { borderBottomWidth: 0 }]}>
                  {item.image_path ? (
                    <Image
                      source={{ uri: BASE_URL + item.image_path }}
                      style={s.histThumb}
                      defaultSource={require('../../assets/favicon.png')}
                    />
                  ) : (
                    <View style={s.histThumbEmpty}>
                      <SparklesIcon size={20} color={colors.sub} strokeWidth={1.5} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.histDisease} numberOfLines={1}>{item.label || '--'}</Text>
                    <Text style={s.histTime}>
                      {d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[s.histConf, {
                    color: healthy ? colors.green : parseFloat(conf) > 70 ? colors.red : colors.amber,
                  }]}>
                    {conf !== '--' ? conf + '%' : '--'}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    scroll:       { flex: 1 },
    content:      { padding: 16, paddingBottom: 40 },

    uploadCard:    { alignItems: 'center', paddingVertical: 32 },
    uploadIconBox: { width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: C.greenDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 16 },
    uploadTitle:   { fontSize: Typography.lg, fontWeight: '700', color: C.cream, marginBottom: 6 },
    uploadSub:     { fontSize: Typography.sm, color: C.sub2, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    uploadBtns:    { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
    camBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.green, borderRadius: Radius.md, paddingVertical: 12 },
    camBtnText:    { color: '#fff', fontWeight: '700', fontSize: Typography.base },
    galBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.card2, borderRadius: Radius.md, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    galBtnText:    { color: C.cream, fontWeight: '700', fontSize: Typography.base },
    tipBox:        { backgroundColor: C.greenDim, borderRadius: Radius.md, padding: 14, width: '100%', borderWidth: 1, borderColor: C.border },
    tipHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    tipTitle:      { fontSize: Typography.sm, fontWeight: '700', color: C.green },
    tipText:       { fontSize: Typography.sm, color: C.sub2, lineHeight: 20 },

    loadingCard:     { alignItems: 'center', paddingVertical: 30 },
    loadingTitle:    { fontSize: Typography.lg, fontWeight: '700', color: C.cream, marginTop: 14, marginBottom: 4 },
    loadingSubtitle: { fontSize: Typography.sm, color: C.sub2, marginBottom: 16 },
    previewSmall:    { width: 120, height: 90, borderRadius: Radius.md, opacity: 0.6 },

    resultCard:        { padding: 0, overflow: 'hidden' },
    resultHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    resultHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultHeaderTitle: { fontSize: Typography.base, fontWeight: '700', color: C.cream },
    resultHeaderSub:   { fontSize: Typography.xs, color: C.sub2 },
    resetBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card2, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    resetBtnText:      { fontSize: Typography.sm, fontWeight: '600', color: C.sub2 },
    resultImage:       { width: '100%', height: 200 },
    diseaseInfo:       { padding: 14 },
    diseaseStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    diseaseName:       { fontSize: Typography.xl, fontWeight: '800', color: C.cream, marginBottom: 4 },
    diseaseType:       { fontSize: Typography.sm, color: C.sub2, marginBottom: 12 },
    confRow:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    confLabel:         { fontSize: Typography.xs, color: C.sub2 },
    confPct:           { fontSize: Typography.xs, fontWeight: '700' },
    confBar:           { height: 6, backgroundColor: C.card2, borderRadius: 3, overflow: 'hidden' },
    confFill:          { height: '100%', borderRadius: 3 },

    chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    chartTitle:  { fontSize: Typography.base, fontWeight: '700', color: C.cream, flex: 1 },
    chartSub:    { fontSize: Typography.xs, color: C.sub2 },

    histRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderDim },
    histThumb:     { width: 46, height: 46, borderRadius: Radius.md },
    histThumbEmpty:{ width: 46, height: 46, borderRadius: Radius.md, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
    histDisease:   { fontSize: Typography.sm, fontWeight: '600', color: C.cream },
    histTime:      { fontSize: Typography.xs, color: C.sub2, marginTop: 2 },
    histConf:      { fontSize: Typography.sm, fontWeight: '700' },
    noData:        { textAlign: 'center', color: C.sub2, paddingVertical: 16 },
  });
}
