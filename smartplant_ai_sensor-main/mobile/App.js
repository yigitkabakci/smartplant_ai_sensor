import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Text, View, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';

import DashboardScreen  from './src/screens/DashboardScreen';
import CropsScreen      from './src/screens/CropsScreen';
import AnalyticsScreen  from './src/screens/AnalyticsScreen';
import DiseaseScreen    from './src/screens/DiseaseScreen';
import DevicesScreen    from './src/screens/DevicesScreen';
import AlertsScreen     from './src/screens/AlertsScreen';

import { Colors, Typography, Radius } from './src/constants/theme';

const Tab = createBottomTabNavigator();
const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: Colors.bg }} />;

const TAB_ICONS = {
  Dashboard: '🌿',
  Bitkiler:  '🌱',
  Analitik:  '📊',
  Hastalik:  '🔬',
};

function ProfileModal({ visible, onClose }) {
  const devices = [
    { id: 1, name: 'Toprak Sensörü', location: 'Sera A',   status: 'online'  },
    { id: 2, name: 'Hava Sensörü',   location: 'Tarla B',  status: 'offline' },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={ms.overlay}>
        <TouchableOpacity style={ms.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={ms.sheet}>
          <View style={ms.handle} />

          <LinearGradient colors={['#0d1f0a', '#162012']} style={ms.userRow} start={[0,0]} end={[1,1]}>
            <View style={ms.avatar}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.userName}>Berkay Aydoğdu</Text>
              <Text style={ms.userEmail}>berkay42gs@gmail.com</Text>
            </View>
          </LinearGradient>

          <View style={ms.divider} />

          <Text style={ms.sectionTitle}>Cihazlarım</Text>
          {devices.map(d => (
            <View key={d.id} style={ms.deviceRow}>
              <View style={[ms.dot, {
                backgroundColor: d.status === 'online' ? Colors.green : Colors.sub,
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={ms.deviceName}>{d.name}</Text>
                <Text style={ms.deviceLoc}>{d.location}</Text>
              </View>
              <Text style={[ms.deviceStatus, {
                color: d.status === 'online' ? Colors.green : Colors.sub,
              }]}>
                {d.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
            <Text style={ms.closeBtnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg2,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 12, paddingBottom: 40, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.sub,
    borderRadius: Radius.full, alignSelf: 'center', marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: Colors.greenDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  userName:  { fontSize: Typography.md, fontWeight: '700', color: Colors.cream },
  userEmail: { fontSize: Typography.sm, color: Colors.sub2, marginTop: 2 },
  divider:   { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  sectionTitle: {
    fontSize: Typography.sm, fontWeight: '700', color: Colors.gold,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderDim,
  },
  dot:          { width: 8, height: 8, borderRadius: Radius.full },
  deviceName:   { fontSize: Typography.base, fontWeight: '600', color: Colors.cream },
  deviceLoc:    { fontSize: Typography.xs, color: Colors.sub2, marginTop: 1 },
  deviceStatus: { fontSize: Typography.xs, fontWeight: '600' },
  closeBtn: {
    marginTop: 20, backgroundColor: Colors.card2, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  closeBtnText: { fontSize: Typography.base, fontWeight: '600', color: Colors.sub2 },
});

export default function App() {
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.bg2,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          },
          headerTitleStyle: {
            fontSize: Typography.md,
            fontWeight: '600',
            color: Colors.cream,
            letterSpacing: 0.3,
          },
          headerTintColor: Colors.cream,
          tabBarStyle: {
            backgroundColor: Colors.bg2,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingTop: 4,
            paddingBottom: 6,
            height: 62,
          },
          tabBarActiveTintColor:   Colors.gold,
          tabBarInactiveTintColor: Colors.sub,
          tabBarLabelStyle: {
            fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2,
          },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
              {TAB_ICONS[route.name] || '⚙️'}
            </Text>
          ),
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerTitle: 'AgroSense', tabBarLabel: 'Panel' }}
        />
        <Tab.Screen
          name="Bitkiler"
          component={CropsScreen}
          options={{ headerTitle: 'Bitkilerim', tabBarLabel: 'Bitkiler' }}
        />
        <Tab.Screen
          name="Analitik"
          component={AnalyticsScreen}
          options={{ headerTitle: 'Analitik', tabBarLabel: 'Analitik' }}
        />
        <Tab.Screen
          name="Hastalik"
          component={DiseaseScreen}
          options={{ headerTitle: 'Yaprak Analizi', tabBarLabel: 'Hastalık' }}
        />
        <Tab.Screen
          name="Profil"
          component={EmptyScreen}
          options={{
            tabBarButton: () => (
              <TouchableOpacity
                style={ts.profileBtn}
                onPress={() => setProfileVisible(true)}
              >
                <Text style={{ fontSize: 20, opacity: 0.55 }}>👤</Text>
                <Text style={ts.profileLabel}>Profil</Text>
              </TouchableOpacity>
            ),
          }}
        />
        {/* Hidden screens — navigable from Dashboard cards, take no tab bar space */}
        <Tab.Screen
          name="Uyarilar"
          component={AlertsScreen}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none', width: 0 },
            headerTitle: 'Uyarılar',
          }}
        />
        <Tab.Screen
          name="Cihazlar"
          component={DevicesScreen}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none', width: 0 },
            headerTitle: 'Cihazlarım',
          }}
        />
      </Tab.Navigator>

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </NavigationContainer>
  );
}

const ts = StyleSheet.create({
  profileBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 4, paddingBottom: 6,
  },
  profileLabel: {
    fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2, color: Colors.sub,
  },
});
