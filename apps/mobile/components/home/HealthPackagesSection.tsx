// apps/mobile/components/home/HealthPackagesSection.tsx
// Comprehensive Health Checkup Packages Card

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock } from 'lucide-react-native';
import { homeCopy } from '../../src/i18n/homeCopy';

interface HealthPackagesSectionProps {
  isHi: boolean;
}

export function HealthPackagesSection({ isHi }: HealthPackagesSectionProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <TouchableOpacity
        onPress={() => router.push('/labs')}
        activeOpacity={0.92}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: '#DBEAFE',
          shadowColor: '#1E293B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Top Badges Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              paddingHorizontal: 9,
              paddingVertical: 3.5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB' }}>
              {c.discount50}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#2563EB' }}>
              {c.nablAccredited}
            </Text>
          </View>
        </View>

        {/* Middle Row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', lineHeight: 21 }}>
              {c.fullBodyPkg}
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#2563EB', marginTop: 4 }}>
              {c.checkupPkgTestsCount}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B', marginTop: 2, lineHeight: 16 }}>
              {c.checkupPkgOrgans}
            </Text>

            <View style={{ marginTop: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>{c.homeSample}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Clock size={12} color="#2563EB" strokeWidth={2.2} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>{c.fastReports}</Text>
              </View>
            </View>
          </View>

          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 18,
              backgroundColor: '#EFF6FF',
              padding: 4,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#DBEAFE',
            }}
          >
            <Image
              source={require('../../assets/ic.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bottom Row: Price & CTA */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
          }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#182F3B' }}>₹1,499</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>
                ₹3,000
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB', marginTop: 1 }}>
              {c.payInAppSave}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#2563EB',
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>{c.bookNowCta}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
