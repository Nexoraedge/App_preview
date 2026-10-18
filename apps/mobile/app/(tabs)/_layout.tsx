import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Stethoscope, FlaskConical, Pill, User, Bed } from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E1EBE8',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#182F3B',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#087F8C',
        tabBarInactiveTintColor: '#617581',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="w-8 h-1 bg-[#087F8C] rounded-full absolute -top-2" />
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
            <View className="items-center">
              {focused && (
                <View className="w-8 h-1 bg-[#087F8C] rounded-full absolute -top-2" />
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
            <View className="items-center">
              {focused && (
                <View className="w-8 h-1 bg-[#087F8C] rounded-full absolute -top-2" />
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
            <View className="items-center">
              {focused && (
                <View className="w-8 h-1 bg-[#087F8C] rounded-full absolute -top-2" />
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
            <View className="items-center">
              {focused && (
                <View className="w-8 h-1 bg-[#087F8C] rounded-full absolute -top-2" />
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
