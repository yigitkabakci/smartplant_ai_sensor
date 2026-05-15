import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarChart } from 'react-native-chart-kit';
import { predictLeafDisease, getLeafHistory, BASE_URL } from '../services/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function DiseaseScreen() {
  const [image, setImage]       = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const h = await getLeafHistory(12);
      setHistory(h);
    } catch(e) {}
    setHistLoading(false);
  };

  const pickImage = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('İzin Gerekli', 'Lütfen izin verin.'); return; }

    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const res = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]) {
      analyze(res.assets[0].uri);
    }
  };

  const analyze = async (uri) => {
    setImage(uri);
    setResult(null);
    setLoading(true);
    try {
      const data = await predictLeafDisease(uri);
      setResult(data);
      loadHistory();
    } catch(e) {
      Alert.alert('Hata', 'Analiz sırasında hata oluştu: ' + (e.message || 'Bilinmeyen hata'));
    }
    setLoading(false);
  };

  const reset = () => { setImage(null); setResult(null); };

  // Chart data
  const chartData = result ? (() => {
    const preds = result.predictions?.slice(0,6) || [];
    return {
      labels: preds.map(p => p.disease?.split(' ').slice(-1)[0]?.substring(0,8) || 'N/A'),
      datasets: [{
        data: preds.map(p => {
          if (typeof p.confidence === 'string') return parseFloat(p.confidence) || (p.score * 100);
          return (p.score ?? 0) * 100;
        }),
      }],
    };
  })() : null;

  const confNum = result ? (() => {
    const top = result.top_prediction;
    if (typeof top?.confidence === 'string') return parseFloat(top.confidence) || 0;
    return (top?.score ?? 0) * 100;
  })() : 0;

  const isHealthy = (result?.top_prediction?.disease || '').toLowerCase().includes('healthy');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Upload Area */}
      {!image && !loading && (
        <Card style={styles.uploadCard}>
          <Text style={styles.uploadEmoji}>🍃</Text>
          <Text style={styles.uploadTitle}>Yaprak Görüntüsü Yükle</Text>
          <Text style={styles.uploadSub}>Fotoğraf çek veya galeriden seç. AI modelimiz hastalığı tespit eder.</Text>
          <View style={styles.uploadBtns}>
            <TouchableOpacity style={styles.camBtn} onPress={() => pickImage(true)}>
              <Text style={styles.camBtnText}>📷 Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galBtn} onPress={() => pickImage(false)}>
              <Text style={styles.galBtnText}>🖼️ Galeri</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 İpuçları</Text>
            <Text style={styles.tipText}>• Tek yaprak, net fotoğraf{'\n'}• İyi aydınlatılmış ortam{'\n'}• Hastalıklı bölgeyi çerçevele</Text>
          </View>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.green} />
          <Text style={styles.loadingTitle}>Yaprak analiz ediliyor...</Text>
          <Text style={styles.loadingSubtitle}>AI modelimiz görüntüyü inceliyor</Text>
          {image && <Image source={{ uri: image }} style={styles.previewSmall} />}
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <>
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultHeaderTitle}>🔬 Tanı Sonucu</Text>
                <Text style={styles.resultHeaderSub}>AI analiz tamamlandı</Text>
              </View>
              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetBtnText}>↺ Yeni</Text>
              </TouchableOpacity>
            </View>

            {/* Image */}
            <Image source={{ uri: image }} style={styles.resultImage} resizeMode="cover" />

            {/* Disease Info */}
            <View style={styles.diseaseInfo}>
              <Badge
                label={isHealthy ? '✅ Sağlıklı' : '⚠️ Hastalık Tespit Edildi'}
                variant={isHealthy ? 'green' : confNum > 70 ? 'red' : 'orange'}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.diseaseName}>{result.top_prediction?.disease || '--'}</Text>
              <Text style={styles.diseaseType}>{isHealthy ? 'Sağlıklı yaprak' : 'Bitki hastalığı'}</Text>

              {/* Confidence Bar */}
              <View style={styles.confRow}>
                <Text style={styles.confLabel}>Güven Skoru</Text>
                <Text style={[styles.confPct, { color: isHealthy ? Colors.green : Colors.orange }]}>
                  {confNum.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.confBar}>
                <View style={[styles.confFill, {
                  width: `${Math.min(confNum,100)}%`,
                  backgroundColor: isHealthy ? Colors.green : confNum > 70 ? Colors.red : Colors.orange,
                }]} />
              </View>
            </View>
          </Card>

          {/* Chart */}
          {chartData && (
            <Card style={{ marginTop: 12 }}>
              <SectionHeader title="📊 Tüm Tahminler" subtitle="Olasılık dağılımı" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={chartData}
                  width={Math.max(width - 48, chartData.labels.length * 70)}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
                    decimalPlaces: 1, strokeWidth: 2, color: () => Colors.green,
                    labelColor: () => Colors.textSub,
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

      {/* History */}
      <Card style={{ marginTop: 14 }}>
        <SectionHeader title="🕐 Analiz Geçmişi" subtitle={`${history.length} kayıt`} />
        {histLoading ? (
          <ActivityIndicator color={Colors.green} />
        ) : history.length === 0 ? (
          <Text style={styles.noData}>Henüz analiz yapılmadı</Text>
        ) : (
          history.map((item, i) => {
            const d = new Date(item.timestamp);
            const conf = item.confidence != null ? (item.confidence * 100).toFixed(1) : '--';
            const healthy = (item.label || '').toLowerCase().includes('healthy');
            return (
              <View key={i} style={[styles.histRow, i===history.length-1 && { borderBottomWidth:0 }]}>
                {item.image_path ? (
                  <Image source={{ uri: BASE_URL + item.image_path }} style={styles.histThumb}
                    defaultSource={require('../../assets/favicon.png')} />
                ) : (
                  <View style={styles.histThumbEmpty}><Text>🍃</Text></View>
                )}
                <View style={{ flex:1 }}>
                  <Text style={styles.histDisease} numberOfLines={1}>{item.label || '--'}</Text>
                  <Text style={styles.histTime}>{d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</Text>
                </View>
                <Text style={[styles.histConf, { color: healthy ? Colors.green : parseFloat(conf)>70 ? Colors.red : Colors.orange }]}>
                  {conf !== '--' ? conf + '%' : '--'}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:Colors.bg },
  content:      { padding:16, paddingBottom:40 },
  uploadCard:   { alignItems:'center', paddingVertical:30 },
  uploadEmoji:  { fontSize:64, marginBottom:12 },
  uploadTitle:  { fontSize:Typography.lg, fontWeight:'700', color:Colors.text, marginBottom:6 },
  uploadSub:    { fontSize:Typography.sm, color:Colors.textSub, textAlign:'center', marginBottom:20, lineHeight:20 },
  uploadBtns:   { flexDirection:'row', gap:12, marginBottom:20 },
  camBtn:       { flex:1, backgroundColor:Colors.green, borderRadius:Radius.md, paddingVertical:12, alignItems:'center', ...Shadow.sm },
  camBtnText:   { color:'#fff', fontWeight:'700', fontSize:Typography.base },
  galBtn:       { flex:1, backgroundColor:Colors.bgCard2, borderRadius:Radius.md, paddingVertical:12, alignItems:'center', borderWidth:1, borderColor:Colors.border },
  galBtnText:   { color:Colors.text, fontWeight:'700', fontSize:Typography.base },
  tipBox:       { backgroundColor:Colors.greenDim, borderRadius:Radius.md, padding:14, width:'100%' },
  tipTitle:     { fontSize:Typography.sm, fontWeight:'700', color:Colors.greenDark, marginBottom:6 },
  tipText:      { fontSize:Typography.sm, color:Colors.textSub, lineHeight:20 },
  loadingCard:  { alignItems:'center', paddingVertical:30 },
  loadingTitle: { fontSize:Typography.lg, fontWeight:'700', color:Colors.text, marginTop:14, marginBottom:4 },
  loadingSubtitle:{ fontSize:Typography.sm, color:Colors.textSub, marginBottom:16 },
  previewSmall: { width:120, height:90, borderRadius:Radius.md, opacity:0.6 },
  resultCard:   { padding:0, overflow:'hidden' },
  resultHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:14 },
  resultHeaderTitle:{ fontSize:Typography.md, fontWeight:'700', color:Colors.text },
  resultHeaderSub:  { fontSize:Typography.xs, color:Colors.textSub },
  resetBtn:     { backgroundColor:Colors.bgCard2, borderRadius:Radius.md, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:Colors.border },
  resetBtnText: { fontSize:Typography.sm, fontWeight:'600', color:Colors.textSub },
  resultImage:  { width:'100%', height:200 },
  diseaseInfo:  { padding:14 },
  diseaseName:  { fontSize:Typography.xl, fontWeight:'800', color:Colors.text, marginBottom:4 },
  diseaseType:  { fontSize:Typography.sm, color:Colors.textSub, marginBottom:12 },
  confRow:      { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  confLabel:    { fontSize:Typography.xs, color:Colors.textSub },
  confPct:      { fontSize:Typography.xs, fontWeight:'700' },
  confBar:      { height:8, backgroundColor:Colors.bgCard2, borderRadius:4, overflow:'hidden' },
  confFill:     { height:'100%', borderRadius:4 },
  histRow:      { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  histThumb:    { width:46, height:46, borderRadius:8 },
  histThumbEmpty:{ width:46, height:46, borderRadius:8, backgroundColor:Colors.bgCard2, alignItems:'center', justifyContent:'center' },
  histDisease:  { fontSize:Typography.sm, fontWeight:'600', color:Colors.text },
  histTime:     { fontSize:Typography.xs, color:Colors.textSub, marginTop:2 },
  histConf:     { fontSize:Typography.sm, fontWeight:'700' },
  noData:       { textAlign:'center', color:Colors.textSub, paddingVertical:16 },
});
