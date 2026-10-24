// apps/mobile/components/opd/OpdSegmentedHeader.tsx
// Header with segmented switch (Hospitals vs Doctors) and app search bar

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppHeader } from '../ui/AppHeader';
import { AppSearchBar } from '../ui/AppSearchBar';
import { opdCopy } from '../../src/i18n/opdCopy';

interface OpdSegmentedHeaderProps {
  isHi: boolean;
  activeTab: 'hospitals' | 'doctors';
  onTabSwitch: (tab: 'hospitals' | 'doctors') => void;
  onOpenProfile: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function OpdSegmentedHeader({
  isHi,
  activeTab,
  onTabSwitch,
  onOpenProfile,
  searchQuery,
  onSearchChange,
}: OpdSegmentedHeaderProps) {
  const c = isHi ? opdCopy.hi : opdCopy.en;

  return (
    <View style={{ backgroundColor: '#172554', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 16 }}>
      <AppHeader
        title={c.headerTitle}
        subtitle={c.headerSubtitle}
        onPressProfile={onOpenProfile}
      />

      {/* Segmented Switch: Hospitals vs Doctors */}
      <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.18)',
          }}
        >
          <TouchableOpacity
            onPress={() => onTabSwitch('hospitals')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: activeTab === 'hospitals' ? '#FFFFFF' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: activeTab === 'hospitals' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === 'hospitals' ? 0.15 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'hospitals' ? 3 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '800',
                color: activeTab === 'hospitals' ? '#1E40AF' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {c.tabHospitals}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onTabSwitch('doctors')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 12,
              backgroundColor: activeTab === 'doctors' ? '#FFFFFF' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: activeTab === 'doctors' ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === 'doctors' ? 0.15 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'doctors' ? 3 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '800',
                color: activeTab === 'doctors' ? '#1E40AF' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {c.tabDoctors}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <AppSearchBar
          placeholder={activeTab === 'hospitals' ? c.searchPlaceholderHospitals : c.searchPlaceholderDoctors}
          value={searchQuery}
          onChangeText={onSearchChange}
          style={{ marginTop: 12 }}
        />
      </View>
    </View>
  );
}
