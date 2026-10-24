// apps/mobile/components/home/FamilyVaultCard.tsx
// Adityam Family Health Vault Card with Gold Tier Pill, ABHA tag, and encryption guarantee

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Crown, IdCard, UsersRound, BadgePercent, ArrowRight } from 'lucide-react-native';
import { homeCopy } from '../../src/i18n/homeCopy';

interface FamilyVaultCardProps {
  isHi: boolean;
}

export function FamilyVaultCard({ isHi }: FamilyVaultCardProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={() => router.push('/family')}
        accessibilityRole="button"
        accessibilityLabel="Access Adityam Health Vault"
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#030E21',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={['#051329', '#0A254A', '#0D366B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: 18,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.35)',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(147, 197, 253, 0.35)',
              }}
            >
              <ShieldCheck size={22} color="#93C5FD" strokeWidth={2.2} />
            </View>

            <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {c.vaultTitle}
              </Text>
              <Text style={{ fontSize: 10.5, color: '#93C5FD', marginTop: 2 }}>
                {c.vaultSub}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 4,
                backgroundColor: '#F6D78C',
              }}
            >
              <Crown size={11} color="#78500D" strokeWidth={2.4} />
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#78500D', marginLeft: 3 }}>
                {c.vaultGoldTier}
              </Text>
            </View>
          </View>

          {/* Benefits Banner */}
          <View
            style={{
              marginTop: 14,
              borderRadius: 16,
              padding: 12,
              backgroundColor: 'rgba(3, 15, 38, 0.45)',
              borderWidth: 1,
              borderColor: 'rgba(147, 197, 253, 0.2)',
            }}
          >
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.8 }}>
              {c.vaultFamilyBadge}
            </Text>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF', marginTop: 4 }}>
              {c.vaultFamilyHeadline}
            </Text>
            <Text style={{ fontSize: 11, color: '#BFDBFE', marginTop: 2, lineHeight: 16 }}>
              {c.vaultDesc}
            </Text>
          </View>

          {/* Aligned Benefits */}
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <IdCard size={19} color="#60A5FA" strokeWidth={2} />
              <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                {c.vaultAbha}
              </Text>
              <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                {c.vaultAbhaSub}
              </Text>
            </View>

            <View style={{ width: 1, backgroundColor: 'rgba(147, 197, 253, 0.22)', marginRight: 10 }} />

            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <UsersRound size={19} color="#60A5FA" strokeWidth={2} />
              <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                {c.vaultFamily}
              </Text>
              <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                {c.vaultFamilySub}
              </Text>
            </View>

            <View style={{ width: 1, backgroundColor: 'rgba(147, 197, 253, 0.22)', marginHorizontal: 10 }} />

            <View style={{ flex: 1, paddingLeft: 4 }}>
              <BadgePercent size={19} color="#F6D78C" strokeWidth={2} />
              <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                {c.vaultSavings}
              </Text>
              <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                {c.vaultSavingsSub}
              </Text>
            </View>
          </View>

          {/* Action Footer */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(147, 197, 253, 0.22)',
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#BFDBFE' }}>
              {c.vaultSecureNote}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0A254A' }}>
                {c.vaultCta}
              </Text>
              <ArrowRight size={13} color="#0A254A" strokeWidth={2.4} style={{ marginLeft: 5 }} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
