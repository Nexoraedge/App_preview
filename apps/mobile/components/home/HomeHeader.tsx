// apps/mobile/components/home/HomeHeader.tsx
// Royal Medical Curved Header with Brand Logo, City Switcher, Profile Avatar, and Search Bar

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, ChevronDown, User } from 'lucide-react-native';
import { AppSearchBar } from '../ui/AppSearchBar';
import { homeCopy } from '../../src/i18n/homeCopy';

interface HomeHeaderProps {
  isHi: boolean;
  topInset: number;
  selectedCity: string;
  onCycleCity: () => void;
  onOpenProfile: () => void;
  onSearchPress: () => void;
}

export function HomeHeader({
  isHi,
  topInset,
  selectedCity,
  onCycleCity,
  onOpenProfile,
  onSearchPress,
}: HomeHeaderProps) {
  const c = isHi ? homeCopy.hi : homeCopy.en;

  const getCityLabel = (raw: string) => {
    if (!isHi) return raw;
    if (raw.includes('Bengaluru')) return c.cityBengaluru;
    if (raw.includes('Jaipur')) return c.cityJaipur;
    return c.citySaket;
  };

  return (
    <LinearGradient
      colors={['#172554', '#1E40AF', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: Math.max(topInset, 14) + 6,
        paddingHorizontal: 18,
        paddingBottom: 22,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle decorative ambient light orb */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
      />

      {/* Top Row: Brand & Location Left + Profile Avatar Right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Brand Name & Location Pill */}
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 }}>
              {c.brandFirst}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#BFDBFE', letterSpacing: -0.3 }}>
              {c.brandSecond}
            </Text>
          </View>

          {/* Location Selector Capsule Pill */}
          <TouchableOpacity
            onPress={onCycleCity}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.28)',
              alignSelf: 'flex-start',
            }}
          >
            <MapPin size={10} color="#BFDBFE" strokeWidth={2.4} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
              {getCityLabel(selectedCity)}
            </Text>
            <ChevronDown size={10} color="#BFDBFE" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Right Action: Profile Avatar with Active Status Indicator */}
        <TouchableOpacity
          onPress={onOpenProfile}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <User size={19} color="#FFFFFF" strokeWidth={2.4} />
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#34D399',
              position: 'absolute',
              top: 2,
              right: 2,
              borderWidth: 2,
              borderColor: '#1E40AF',
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Hero Tagline / Greeting */}
      <View style={{ marginTop: 14 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
          {c.taglineTitle}
        </Text>
        <Text style={{ color: '#DBEAFE', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
          {c.taglineSubtitle}
        </Text>
      </View>

      {/* Unified App Search Bar */}
      <AppSearchBar
        onPress={onSearchPress}
        placeholder={c.searchPlaceholder}
        style={{ marginTop: 14 }}
      />
    </LinearGradient>
  );
}
