import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity, Modal, StyleSheet, Switch } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeIcon from 'react-native-heroicons/outline/HomeIcon';
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import CameraIcon from 'react-native-heroicons/outline/CameraIcon';
import CpuChipIcon from 'react-native-heroicons/outline/CpuChipIcon';
import UserCircleIcon from 'react-native-heroicons/outline/UserCircleIcon';
import MoonIcon from 'react-native-heroicons/outline/MoonIcon';
import SunIcon from 'react-native-heroicons/outline/SunIcon';

import DashboardScreen from './src/screens/DashboardScreen';
import CropsScreen     from './src/screens/CropsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import DiseaseScreen   from './src/screens/DiseaseScreen';
import DevicesScreen   from './src/screens/DevicesScreen';
import AlertsScreen    from './src/screens/AlertsScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Typography, Radius } from './src/constants/theme';

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

function EmptyScreen() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

const Tab = createBottomTabNavigator();

function ProfileModal({ visible, onClose }) {
  const { isDark, colors, toggle } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
          onPress={onClose} activeOpacity={1}
        />
        <View style={{
          backgroundColor: colors.bg2,
          borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
          paddingTop: 12, paddingBottom: 44, paddingHorizontal: 20,
          borderTopWidth: 1, borderTopColor: colors.border,
        }}>
          <View style={{ width: 32, height: 3, backgroundColor: colors.sub, borderRadius: Radius.full, alignSelf: 'center', marginBottom: 20 }} />

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: colors.card, padding: 14, borderRadius: Radius.lg,
            borderWidth: 1, borderColor: colors.border, marginBottom: 12,
          }}>
            <View style={{ width: 52, height: 52, borderRadius: Radius.full, backgroundColor: colors.greenDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
              <UserCircleIcon size={36} color={colors.green} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Typography.md, fontWeight: '700', color: colors.cream }}>Berkay Aydoğdu</Text>
              <Text style={{ fontSize: Typography.sm, color: colors.sub2, marginTop: 2 }}>berkay42gs@gmail.com</Text>
            </View>
            <View style={{ width: 8, height: 8, borderRadius: Radius.full, backgroundColor: colors.green }} />
          </View>

          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.card, padding: 14, borderRadius: Radius.lg,
            borderWidth: 1, borderColor: colors.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isDark
                ? <MoonIcon size={18} color={colors.sub2} strokeWidth={1.8} />
                : <SunIcon size={18} color={colors.amber} strokeWidth={1.8} />
              }
              <Text style={{ fontSize: Typography.base, fontWeight: '600', color: colors.cream }}>
                {isDark ? 'Karanlık Mod' : 'Aydınlık Mod'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{ false: colors.card2, true: colors.greenDim }}
              thumbColor={isDark ? colors.green : colors.sub2}
            />
          </View>

          <TouchableOpacity style={{
            borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center',
            borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card2,
          }} onPress={onClose}>
            <Text style={{ fontSize: Typography.base, fontWeight: '600', color: colors.sub2 }}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);

  const tabIcon = (name, focused) => {
    const color = focused ? colors.green : colors.sub;
    const sw    = focused ? 2.2 : 1.8;
    const props = { size: 22, color, strokeWidth: sw };
    if (name === 'Dashboard') return <HomeIcon      {...props} />;
    if (name === 'Bitkiler')  return <LeafIcon      {...props} />;
    if (name === 'Analitik')  return <ChartBarIcon  {...props} />;
    if (name === 'Hastalik')  return <CameraIcon    {...props} />;
    if (name === 'Cihazlar')  return <CpuChipIcon   {...props} />;
    return null;
  };

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.bg2,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            fontSize: Typography.md,
            fontWeight: '600',
            color: colors.cream,
            letterSpacing: 0.3,
          },
          headerTintColor: colors.cream,
          tabBarStyle: {
            backgroundColor: colors.bg2,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: 6,
            paddingBottom: 8,
            height: 64,
          },
          tabBarActiveTintColor:   colors.green,
          tabBarInactiveTintColor: colors.sub,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
          tabBarItemStyle:  { flex: 1 },
          tabBarIcon: ({ focused }) => tabIcon(route.name, focused),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerTitle: 'AgroSense',    tabBarLabel: 'Panel'    }} />
        <Tab.Screen name="Bitkiler"  component={CropsScreen}     options={{ headerTitle: 'Bitkilerim',   tabBarLabel: 'Bitkiler' }} />
        <Tab.Screen name="Analitik"  component={AnalyticsScreen} options={{ headerTitle: 'Analitik',     tabBarLabel: 'Analitik' }} />
        <Tab.Screen name="Hastalik"  component={DiseaseScreen}   options={{ headerTitle: 'Yaprak Analizi', tabBarLabel: 'Hastalık' }} />
        <Tab.Screen
          name="Uyarilar"
          component={AlertsScreen}
          options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none', width: 0 }, headerTitle: 'Uyarılar' }}
        />
        <Tab.Screen name="Cihazlar"  component={DevicesScreen}   options={{ headerTitle: 'Cihazlarım',  tabBarLabel: 'Cihazlar' }} />
        <Tab.Screen
          name="Profil"
          component={EmptyScreen}
          options={{
            tabBarButton: () => (
              <TouchableOpacity
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 8 }}
                onPress={() => setProfileVisible(true)}
              >
                <UserCircleIcon size={22} color={colors.sub} strokeWidth={1.8} />
                <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2, color: colors.sub }}>Profil</Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Tab.Navigator>

      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
