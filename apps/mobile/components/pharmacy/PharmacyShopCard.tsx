// apps/mobile/components/pharmacy/PharmacyShopCard.tsx
// Partner pharmacy shop card with discount badge, distance, rating, and selection state

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Check, Truck, Store } from 'lucide-react-native';
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
            <Text
              style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}
            >
              {name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 3,
              }}
            >
              <MapPin size={12} color={C.sub} />
              <Text style={{ fontSize: 12, color: C.sub }}>
                {area} · {shop.km} {isHi ? 'किमी' : 'km'}
              </Text>
              <Star size={11} color="#D97706" fill="#D97706" />
              <Text style={{ fontSize: 12, color: C.sub }}>
                {shop.rating}
              </Text>
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
          {shop.delivery && (
            <Chip
              label={isHi ? 'होम डिलीवरी' : 'Delivers'}
              icon={<Truck size={11} color={C.sub} />}
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
