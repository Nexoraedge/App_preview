// apps/mobile/components/ipd/IpdHeroHeader.tsx
// Top hero header with AppHeader, Search Bar, and Doctor Advice Slip Upload card

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Upload, Sparkles, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '../ui/AppHeader';
import { AppSearchBar } from '../ui/AppSearchBar';
import { ipdCopy } from '../../src/i18n/ipdCopy';

interface IpdHeroHeaderProps {
  isHi: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenProfile: () => void;
  onOpenAdviceUpload: () => void;
}

export function IpdHeroHeader({
  isHi,
  searchQuery,
  onSearchChange,
  onOpenProfile,
  onOpenAdviceUpload,
}: IpdHeroHeaderProps) {
  const c = isHi ? ipdCopy.hi : ipdCopy.en;

  return (
    <View
      style={{
        backgroundColor: '#0F172A',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        paddingBottom: 20,
      }}
    >
      <AppHeader
        title={c.headerTitle}
        subtitle={c.headerSubtitle}
        onPressProfile={onOpenProfile}
      />

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <AppSearchBar
          placeholder={c.searchPlaceholder}
          value={searchQuery}
          onChangeText={onSearchChange}
        />

        {/* Doctor Advice Slip Quick Upload Card */}
        <TouchableOpacity
          onPress={onOpenAdviceUpload}
          activeOpacity={0.9}
          style={{ marginTop: 14 }}
        >
          <LinearGradient
            colors={['#1E3A8A', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <FileText size={22} color="#FFFFFF" strokeWidth={2.2} />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 2,
                }}
              >
                <Sparkles size={12} color="#FBBF24" />
                <Text
                  style={{
                    color: '#FBBF24',
                    fontSize: 10.5,
                    fontWeight: '800',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {isHi ? 'त्वरित सहायता' : 'Fast-Track Pre-Auth'}
                </Text>
              </View>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '800',
                  lineHeight: 18,
                }}
              >
                {c.uploadSlipTitle}
              </Text>
              <Text
                style={{
                  color: '#DBEAFE',
                  fontSize: 11.5,
                  marginTop: 2,
                  lineHeight: 15,
                }}
                numberOfLines={2}
              >
                {c.uploadSlipSubtitle}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Upload size={13} color="#1E3A8A" strokeWidth={2.5} />
              <Text
                style={{
                  color: '#1E3A8A',
                  fontSize: 11,
                  fontWeight: '800',
                }}
              >
                {isHi ? 'अपलोड' : 'Upload'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
