import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Stethoscope, FlaskConical, Pill, User, Bed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';

export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset + 2,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    width: 20,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#2563EB',
                    position: 'absolute',
                    top: -8,
                  }}
                />
              )}
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="opd"
        options={{
          title: t.tabOpd,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    width: 20,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#2563EB',
                    position: 'absolute',
                    top: -8,
                  }}
                />
              )}
              <Stethoscope size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="labs"
        options={{
          title: t.tabLabs,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    width: 20,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#2563EB',
                    position: 'absolute',
                    top: -8,
                  }}
                />
              )}
              <FlaskConical size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pharmacy"
        options={{
          title: t.tabPharmacy,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    width: 20,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#2563EB',
                    position: 'absolute',
                    top: -8,
                  }}
                />
              )}
              <Pill size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ipd"
        options={{
          title: t.tabIpd,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View
                  style={{
                    width: 20,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#2563EB',
                    position: 'absolute',
                    top: -8,
                  }}
                />
              )}
              <Bed size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          href: null,
          title: 'Family Vault',
        }}
      />
    </Tabs>
  );
}
