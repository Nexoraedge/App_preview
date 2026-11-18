// apps/mobile/components/pharmacy/PharmacyShopCard.tsx
// Partner pharmacy shop card with discount badge, distance, rating, and selection state

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Check, Truck, Store, Clock, Zap } from 'lucide-react-native';
import { Pharmacy, getPharmacyName, getPharmacyArea } from '../../src/data/pharmacySample';
import { PressableCard } from '../ui/PressableCard';
import { Chip } from '../ui/kit';
import { C, R, SHADOW } from '../../src/theme';

interface PharmacyShopCardProps {
  shop: Pharmacy & { km: number };
  isSelected: boolean;
  isHi: boolean;
  index: number;
  onSelect: (shopId: string) => void;
}

export function PharmacyShopCard({
  shop,
  isSelected,
  isHi,
  index,
  onSelect,
}: PharmacyShopCardProps) {
  const name = getPharmacyName(shop, isHi);
  const area = getPharmacyArea(shop, isHi);
  const estTime = isHi ? '24 घंटे से पहले' : 'Before 24 Hours';
  const deliveryBadge = shop.km < 0 || shop.km <= 3.0
    ? (isHi ? 'मुफ़्त डिलीवरी' : 'FREE Delivery')
    : (isHi ? '₹15 डिलीवरी' : '₹15 Delivery');

  return (
    <PressableCard
      index={index}
      onPress={() => onSelect(shop.id)}
      label={name}
    >
      <View
        style={{
          backgroundColor: isSelected ? C.brandSoft : '#FFFFFF',
          borderRadius: R.xl,
          padding: 15,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? C.brand : C.line,
          ...SHADOW,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{ fontSize: 15.5, fontWeight: '700', color: C.ink, flex: 1 }}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 3,
                flexWrap: 'wrap',
              }}
            >
              <MapPin size={12} color={C.sub} />
              <Text style={{ fontSize: 12, color: C.sub }}>
                {area} ·{' '}
                <Text style={{ fontWeight: '700', color: C.brand }}>
                  {shop.km >= 0 ? `${shop.km} ${isHi ? 'किमी' : 'km'}` : (isHi ? 'लोकेशन चुनें' : 'Location needed')}
                </Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Star size={11} color="#D97706" fill="#D97706" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                  {shop.rating}
                </Text>
              </View>
            </View>
          </View>
          {isSelected && (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: C.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
          }}
        >
          <Chip
            label={
              isHi
                ? `ऐप में ${shop.appDiscountPct}% बचत`
                : `Save ${shop.appDiscountPct}% in app`
            }
            tone="good"
          />
          <Chip
            label={estTime}
            icon={<Clock size={11} color="#2563EB" />}
          />
          {shop.delivery && (
            <Chip
              label={deliveryBadge}
              icon={<Truck size={11} color="#059669" />}
            />
          )}
          {shop.pickup && (
            <Chip
              label={isHi ? 'पिकअप' : 'Pickup'}
              icon={<Store size={11} color={C.sub} />}
            />
          )}
        </View>
      </View>
    </PressableCard>
  );
}
