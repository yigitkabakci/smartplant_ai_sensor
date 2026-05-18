import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen  from './src/screens/DashboardScreen';
import CropsScreen      from './src/screens/CropsScreen';
import AnalyticsScreen  from './src/screens/AnalyticsScreen';
import DiseaseScreen    from './src/screens/DiseaseScreen';
import DevicesScreen    from './src/screens/DevicesScreen';
import AlertsScreen     from './src/screens/AlertsScreen';

import { Colors, Typography } from './src/constants/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: '🏠',
  Bitkiler:  '🌿',
  Analitik:  '📊',
  Hastalık:  '🔬',
  Cihazlar:  '📡',
  Uyarılar:  '🔔',
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={Colors.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.bgCard,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          },
          headerTitleStyle: {
            fontSize: Typography.md,
            fontWeight: '700',
            color: Colors.text,
          },
          tabBarStyle: {
            backgroundColor: Colors.bgCard,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingTop: 4,
            paddingBottom: 6,
            height: 62,
          },
          tabBarActiveTintColor: Colors.green,
          tabBarInactiveTintColor: Colors.textSub,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
              {TAB_ICONS[route.name] || '●'}
            </Text>
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerTitle: '🌱 AgroSense' }} />
        <Tab.Screen name="Bitkiler"  component={CropsScreen}     options={{ headerTitle: '🌿 Bitkilerim' }} />
        <Tab.Screen name="Analitik"  component={AnalyticsScreen} options={{ headerTitle: '📊 Analitik' }} />
        <Tab.Screen name="Hastalık"  component={DiseaseScreen}   options={{ headerTitle: '🔬 Yaprak Analizi' }} />
        <Tab.Screen name="Cihazlar"  component={DevicesScreen}   options={{ headerTitle: '📡 Cihazlarım' }} />
        <Tab.Screen name="Uyarılar"  component={AlertsScreen}    options={{ headerTitle: '🔔 Uyarılar' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
