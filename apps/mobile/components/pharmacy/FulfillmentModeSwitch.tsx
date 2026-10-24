// apps/mobile/components/pharmacy/FulfillmentModeSwitch.tsx
// Home Delivery vs Store Pickup toggle switch

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Truck, Store, Check } from 'lucide-react-native';
import { Mode } from '../../src/data/pharmacyData';
import { pharmacyCopy } from '../../src/i18n/pharmacyCopy';

interface FulfillmentModeSwitchProps {
  isHi: boolean;
  mode: Mode;
  onSelectMode: (m: Mode) => void;
}

export function FulfillmentModeSwitch({
  isHi,
  mode,
  onSelectMode,
}: FulfillmentModeSwitchProps) {
  const c = isHi ? pharmacyCopy.hi : pharmacyCopy.en;

  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#0F172A',
          marginBottom: 8,
          paddingHorizontal: 2,
        }}
      >
        {c.fulfillmentTitle}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Home Delivery */}
        <TouchableOpacity
          onPress={() => onSelectMode('delivery')}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: mode === 'delivery' ? '#EFF6FF' : '#FFFFFF',
            borderWidth: 1.5,
            borderColor: mode === 'delivery' ? '#2563EB' : '#E2E8F0',
            borderRadius: 16,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: mode === 'delivery' ? '#DBEAFE' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck
              size={18}
              color={mode === 'delivery' ? '#2563EB' : '#64748B'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: mode === 'delivery' ? '#1E40AF' : '#0F172A',
              }}
            >
              {c.deliveryLabel}
            </Text>
            <Text
              style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}
              numberOfLines={1}
            >
              {c.deliverySub}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Store Pickup */}
        <TouchableOpacity
          onPress={() => onSelectMode('pickup')}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: mode === 'pickup' ? '#EFF6FF' : '#FFFFFF',
            borderWidth: 1.5,
            borderColor: mode === 'pickup' ? '#2563EB' : '#E2E8F0',
            borderRadius: 16,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: mode === 'pickup' ? '#DBEAFE' : '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store
              size={18}
              color={mode === 'pickup' ? '#2563EB' : '#64748B'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: mode === 'pickup' ? '#1E40AF' : '#0F172A',
              }}
            >
              {c.pickupLabel}
            </Text>
            <Text
              style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}
              numberOfLines={1}
            >
              {c.pickupSub}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
