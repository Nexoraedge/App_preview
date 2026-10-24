// apps/mobile/components/home/PartnerOffersSection.tsx
// Partner Offers & Discounts Horizontal Cards

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { homeCopy } from '../../src/i18n/homeCopy';

interface PartnerOffersSectionProps {
  isHi: boolean;
}

export function PartnerOffersSection({ isHi }: PartnerOffersSectionProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
          {c.exclusiveOffers}
        </Text>
        <TouchableOpacity onPress={() => router.push('/pharmacy')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
            {c.viewAll}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {/* Offer 1: Pharmacy */}
        <TouchableOpacity
          onPress={() => router.push('/pharmacy')}
          activeOpacity={0.9}
          style={{
            width: 275,
            backgroundColor: '#EFF6FF',
            borderRadius: 22,
            padding: 14,
            borderWidth: 1,
            borderColor: '#DBEAFE',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#182F3B' }}>
              {c.offerFlat20}
            </Text>
            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              {c.offerMedicinesSub}
            </Text>
            <View
              style={{
                marginTop: 10,
                backgroundColor: '#2563EB',
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderRadius: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{c.shopNow}</Text>
            </View>
          </View>

          <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        {/* Offer 2: Health Checkups */}
        <TouchableOpacity
          onPress={() => router.push('/labs')}
          activeOpacity={0.9}
          style={{
            width: 275,
            backgroundColor: '#F5F3FF',
            borderRadius: 22,
            padding: 14,
            borderWidth: 1,
            borderColor: '#E9E5FF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#5B21B6' }}>
              {c.offer50Checkup}
            </Text>
            <View
              style={{
                marginTop: 10,
                backgroundColor: '#8B70D6',
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderRadius: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{c.viewOffersBtn}</Text>
            </View>
          </View>

          <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=80',
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
