// apps/mobile/components/home/PartnerOffersSection.tsx
// Partner Offers & Discounts Horizontal Cards

import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { homeCopy } from '../../src/i18n/homeCopy';

interface PartnerOffersSectionProps {
  isHi: boolean;
}

export function PartnerOffersSection({ isHi }: PartnerOffersSectionProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  const offers = useMemo(
    () => [
      {
        id: 'offer-1',
        title: c.offerFlat20,
        subtitle: c.offerMedicinesSub,
        route: '/pharmacy' as const,
        bgColor: '#EFF6FF',
        accentColor: '#2563EB',
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
        ctaText: isHi ? 'दवाइयां मंगवाएं ›' : 'Order Meds ›',
      },
      {
        id: 'offer-2',
        title: c.offer50Checkup,
        subtitle: isHi ? 'NABL प्रमाणित लैब्स • घर से मुफ़्त सैंपल' : '100% NABL Labs • Free Home Sample',
        route: '/labs' as const,
        bgColor: '#F5F3FF',
        accentColor: '#7C3AED',
        imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=80',
        ctaText: isHi ? 'ऑफ़र देखें ›' : 'View Offers ›',
      },
    ],
    [isHi, c]
  );

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
        {offers.map((offer) => (
          <TouchableOpacity
            key={offer.id}
            onPress={() => router.push(offer.route as any)}
            activeOpacity={0.9}
            style={{
              width: 275,
              backgroundColor: offer.bgColor,
              borderRadius: 22,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.06)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#182F3B' }}>
                {offer.title}
              </Text>
              {offer.subtitle ? (
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  {offer.subtitle}
                </Text>
              ) : null}
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: offer.accentColor,
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{offer.ctaText}</Text>
              </View>
            </View>

            <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <Image
                source={{
                  uri: offer.imageUrl,
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
