// apps/mobile/components/pharmacy/OrderHistorySection.tsx
// Order history section for pharmacy requests and past orders

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Pill, ChevronRight } from 'lucide-react-native';
import { HistoryItem } from '../../src/data/pharmacyData';
import { C, R, SHADOW, inr } from '../../src/theme';
import { tap } from '../ui/kit';

interface OrderHistorySectionProps {
  history: HistoryItem[];
  isHi: boolean;
  onSelectOrder: (order: HistoryItem) => void;
}

export function OrderHistorySection({
  history,
  isHi,
  onSelectOrder,
}: OrderHistorySectionProps) {
  if (history.length === 0) return null;

  return (
    <View style={{ marginTop: 22 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
          {isHi ? 'हाल के ऑर्डर व अनुरोध' : 'Recent requests'}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: C.brand }}>
          {isHi ? 'विवरण देखने के लिए टैप करें' : 'Tap for details & invoice'}
        </Text>
      </View>

      <View style={{ gap: 9 }}>
        {history.map((h) => (
          <Pressable
            key={h.ref}
            onPress={() => {
              tap();
              onSelectOrder(h);
            }}
            accessibilityRole="button"
            accessibilityLabel={`View details and invoice for order ${h.ref}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#FFFFFF',
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: pressed ? C.brand : C.line,
              padding: 13,
              opacity: pressed ? 0.92 : 1,
              ...SHADOW,
            })}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#EAF1FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pill size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14.5,
                    fontWeight: '700',
                    color: C.ink,
                    flex: 1,
                  }}
                >
                  {isHi && h.shopHi ? h.shopHi : h.shop}
                </Text>
                <View
                  style={{
                    backgroundColor: '#DCFCE7',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: R.pill,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#166534',
                    }}
                  >
                    {isHi ? 'डिलीवर हुआ' : 'Delivered'}
                  </Text>
                </View>
              </View>
              <Text
                style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}
              >
                {h.ref} ·{' '}
                {h.mode === 'delivery'
                  ? isHi
                    ? 'होम डिलीवरी'
                    : 'Delivery'
                  : isHi
                  ? 'पिकअप'
                  : 'Pickup'}{' '}
                ·{' '}
                {h.paidInApp
                  ? isHi
                    ? 'ऐप में भुगतान'
                    : 'Paid in app'
                  : isHi
                  ? 'दुकान पर देय'
                  : 'Pay at shop'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text
                style={{ fontSize: 15, fontWeight: '800', color: C.ink }}
              >
                {inr(h.total)}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: C.brand,
                  }}
                >
                  {isHi ? 'विवरण' : 'Track'}
                </Text>
                <ChevronRight
                  size={13}
                  color={C.brand}
                  strokeWidth={2.5}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
