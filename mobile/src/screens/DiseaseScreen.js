import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { predictLeafDisease, getLeafHistory, BASE_URL } from '../services/api';
import { getDiseaseInfo } from '../utils/diseaseUtils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { Colors, Typography, Radius, Shadow } from '../constants/theme';
import FallingLeaves from '../components/FallingLeaves';

const { width } = Dimensions.get('window');

function CareCard({ icon, label, min, max, unit }) {
  return (
    <View style={styles.careCard}>
      <Text style={styles.careIcon}>{icon}</Text>
      <Text style={styles.careLabel}>{label}</Text>
      <Text style={styles.careRange}>
        {min}–{max}{unit}
      </Text>
    </View>
  );
}

export default function DiseaseScreen({ navigation }) {
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

  const confPct = result ? Math.round((result.confidence || 0) * 100) : 0;
  const diseaseConfPct = result?.disease_confidence != null ? Math.round(result.disease_confidence * 100) : null;
  const isHealthy = !result?.disease;
  const isFallback = result?.fallback === true;
  const diseaseInfo = result ? getDiseaseInfo(result.disease || (isHealthy ? 'Healthy' : null)) : null;

  return (
    <View style={styles.container}>
    <FallingLeaves />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

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
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingTitle}>Yaprak analiz ediliyor...</Text>
          <Text style={styles.loadingSubtitle}>AI modelimiz görüntüyü inceliyor</Text>
          {image && <Image source={{ uri: image }} style={styles.previewSmall} />}
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <>
          {/* Main result card */}
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

            <Image source={{ uri: image }} style={styles.resultImage} resizeMode="cover" />

            <View style={styles.diseaseInfo}>
              {/* Plant name */}
              {result.plant ? (
                <Text style={styles.plantName}>🌿 {result.plant}</Text>
              ) : null}

              {isFallback ? (
                /* Fallback: show care analysis */
                <>
                  <Badge label="🔍 Bakım Analizi" variant="orange" style={{ marginBottom: 8 }} />
                  <Text style={styles.diseaseName}>Yeterli güven sağlanamadı</Text>
                  <Text style={styles.messageText}>{result.message}</Text>
                </>
              ) : isHealthy ? (
                /* Healthy */
                <>
                  <Badge label="✅ Sağlıklı" variant="green" style={{ marginBottom: 8 }} />
                  <Text style={styles.diseaseName}>Yaprak Sağlıklı</Text>
                  <Text style={styles.messageText}>{result.message}</Text>
                  <View style={styles.confRow}>
                    <Text style={styles.confLabel}>Güven Skoru</Text>
                    <Text style={[styles.confPct, { color: Colors.green }]}>{confPct}%</Text>
                  </View>
                  <View style={styles.confBar}>
                    <View style={[styles.confFill, { width: `${Math.min(confPct, 100)}%`, backgroundColor: Colors.green }]} />
                  </View>
                </>
              ) : (
                /* Disease detected */
                <>
                  <Badge
                    label="⚠️ Hastalık Tespit Edildi"
                    variant={confPct > 70 ? 'red' : 'orange'}
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={styles.diseaseName}>{result.disease}</Text>
                  {diseaseInfo && (
                    <>
                      <Text style={styles.diseaseTr}>{diseaseInfo.tr}</Text>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxText}>{diseaseInfo.info}</Text>
                      </View>
                    </>
                  )}
                  <Text style={styles.messageText}>{result.message}</Text>
                  <View style={styles.confRow}>
                    <Text style={styles.confLabel}>Bitki Tanıma</Text>
                    <Text style={[styles.confPct, { color: confPct > 70 ? Colors.red : Colors.orange }]}>{confPct}%</Text>
                  </View>
                  <View style={styles.confBar}>
                    <View style={[styles.confFill, {
                      width: `${Math.min(confPct, 100)}%`,
                      backgroundColor: confPct > 70 ? Colors.red : Colors.orange,
                    }]} />
                  </View>
                  {diseaseConfPct != null && (
                    <>
                      <View style={[styles.confRow, { marginTop: 8 }]}>
                        <Text style={styles.confLabel}>Hastalık Tespiti</Text>
                        <Text style={[styles.confPct, { color: diseaseConfPct > 70 ? Colors.red : Colors.orange }]}>{diseaseConfPct}%</Text>
                      </View>
                      <View style={styles.confBar}>
                        <View style={[styles.confFill, {
                          width: `${Math.min(diseaseConfPct, 100)}%`,
                          backgroundColor: diseaseConfPct > 70 ? Colors.red : Colors.orange,
                        }]} />
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          </Card>

          {/* Care cards */}
          {result.care && (
            <Card style={{ marginTop: 12 }}>
              <SectionHeader
                title={isFallback ? '🌱 Bakım Analizi' : '🌱 Bakım Önerileri'}
                subtitle="Sensör eşik değerleri"
              />
              <View style={styles.careRow}>
                <CareCard
                  icon="💧"
                  label="Nem"
                  min={result.care.humidity_min}
                  max={result.care.humidity_max}
                  unit="%"
                />
                <CareCard
                  icon="☀️"
                  label="Işık"
                  min={result.care.light_min}
                  max={result.care.light_max}
                  unit=" lux"
                />
                <CareCard
                  icon="🌍"
                  label="Toprak"
                  min={result.care.soil_moisture_min}
                  max={result.care.soil_moisture_max}
                  unit="%"
                />
              </View>
              {result.care.watering ? (
                <View style={styles.wateringBox}>
                  <Text style={styles.wateringTitle}>💦 Sulama</Text>
                  <Text style={styles.wateringText}>{result.care.watering}</Text>
                </View>
              ) : null}
              {result.care.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>📝 {result.care.notes}</Text>
                </View>
              ) : null}
            </Card>
          )}
          {result && !loading && result.plant && (
            <Card style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.addPlantBtn}
                onPress={() => navigation.navigate('Bitkiler', { prefilledName: result.plant })}
              >
                <Text style={styles.addPlantBtnText}>🌱 "{result.plant}" Bitkisi Ekle</Text>
              </TouchableOpacity>
            </Card>
          )}
        </>
      )}

      {/* History */}
      <Card style={{ marginTop: 14 }}>
        <SectionHeader title="🕐 Analiz Geçmişi" subtitle={`${history.length} kayıt`} />
        {histLoading ? (
          <ActivityIndicator color={Colors.gold} />
        ) : history.length === 0 ? (
          <Text style={styles.noData}>Henüz analiz yapılmadı</Text>
        ) : (
          history.map((item, i) => {
            const d = new Date(item.timestamp);
            const conf = item.confidence != null ? (item.confidence * 100).toFixed(1) : '--';
            const healthy = (item.label || '').toLowerCase().includes('healthy');
            const histDiseaseInfo = getDiseaseInfo(item.label);
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
                  {histDiseaseInfo && !healthy && (
                    <Text style={styles.histDiseaseTr} numberOfLines={1}>{histDiseaseInfo.tr}</Text>
                  )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:Colors.bg },
  scroll:       { flex: 1 },
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
  plantName:    { fontSize:Typography.sm, color:Colors.textSub, marginBottom:10, fontWeight:'600' },
  diseaseName:  { fontSize:Typography.xl, fontWeight:'800', color:Colors.text, marginBottom:4 },
  messageText:  { fontSize:Typography.sm, color:Colors.textSub, marginBottom:12, lineHeight:18 },
  confRow:      { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  confLabel:    { fontSize:Typography.xs, color:Colors.textSub },
  confPct:      { fontSize:Typography.xs, fontWeight:'700' },
  confBar:      { height:8, backgroundColor:Colors.bgCard2, borderRadius:4, overflow:'hidden' },
  confFill:     { height:'100%', borderRadius:4 },
  careRow:      { flexDirection:'row', gap:8, marginTop:8, marginBottom:12 },
  careCard:     { flex:1, backgroundColor:Colors.bgCard2, borderRadius:Radius.md, padding:10, alignItems:'center' },
  careIcon:     { fontSize:20, marginBottom:4 },
  careLabel:    { fontSize:Typography.xs, color:Colors.textSub, marginBottom:2 },
  careRange:    { fontSize:Typography.xs, fontWeight:'700', color:Colors.text, textAlign:'center' },
  wateringBox:  { backgroundColor:Colors.greenDim, borderRadius:Radius.md, padding:12, marginBottom:8 },
  wateringTitle:{ fontSize:Typography.sm, fontWeight:'700', color:Colors.greenDark, marginBottom:4 },
  wateringText: { fontSize:Typography.sm, color:Colors.textSub, lineHeight:18 },
  notesBox:     { backgroundColor:Colors.bgCard2, borderRadius:Radius.md, padding:10 },
  notesText:    { fontSize:Typography.xs, color:Colors.textSub, lineHeight:16 },
  histRow:      { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.borderDim },
  histThumb:    { width:46, height:46, borderRadius:8 },
  histThumbEmpty:{ width:46, height:46, borderRadius:8, backgroundColor:Colors.bgCard2, alignItems:'center', justifyContent:'center' },
  histDisease:    { fontSize:Typography.sm, fontWeight:'600', color:Colors.text },
  histDiseaseTr:  { fontSize:Typography.xs, color:Colors.gold, fontStyle:'italic', marginTop:1 },
  histTime:       { fontSize:Typography.xs, color:Colors.textSub, marginTop:2 },
  histConf:     { fontSize:Typography.sm, fontWeight:'700' },
  noData:       { textAlign:'center', color:Colors.textSub, paddingVertical:16 },
  diseaseTr:    { fontSize: Typography.sm, color: Colors.gold, fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  infoBox:      { backgroundColor: Colors.bgCard2, borderRadius: Radius.md, padding: 10, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: Colors.gold },
  infoBoxText:  { fontSize: Typography.xs, color: Colors.textSub, lineHeight: 17 },
  addPlantBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
  addPlantBtnText: { fontSize: Typography.base, fontWeight: '700', color: Colors.green },
});
