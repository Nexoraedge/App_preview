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
  if (history.length === 0) {
    return (
      <View style={{ marginTop: 22 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 10 }}>
          {isHi ? 'हाल के ऑर्डर व अनुरोध' : 'Recent requests'}
        </Text>
        <View
          style={{
            padding: 20,
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
          }}
        >
          <Pill size={28} color="#94A3B8" />
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#334155', marginTop: 8 }}>
            {isHi ? 'कोई ऑर्डर नहीं' : 'No recent orders'}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
            {isHi
              ? 'आपके फार्मेसी ऑर्डर यहाँ दिखाई देंगे।'
              : 'Your pharmacy orders will appear here.'}
          </Text>
        </View>
      </View>
    );
  }

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
                {(() => {
                  const isCancelled = h.status === 'cancelled';
                  const isAwaitingQuote = !isCancelled && h.total === 0;
                  const isDone = h.status === 'delivered' || h.status === 'picked_up';
                  const isOut = h.status === 'out_for_delivery';
                  const badgeBg = isCancelled
                    ? '#FEE2E2'
                    : isDone
                      ? '#DCFCE7'
                      : isAwaitingQuote
                        ? '#DBEAFE'
                        : h.paidInApp
                          ? '#DCFCE7'
                          : '#FEF3C7';
                  const badgeColor = isCancelled
                    ? '#B91C1C'
                    : isDone
                      ? '#166534'
                      : isAwaitingQuote
                        ? '#1D4ED8'
                        : h.paidInApp
                          ? '#166534'
                          : '#B45309';
                  const badgeText = isCancelled
                    ? isHi ? 'रद्द / स्टॉक नहीं' : 'Cancelled'
                    : isAwaitingQuote
                      ? isHi ? 'समीक्षाधीन' : 'Under Review'
                      : isDone
                        ? h.status === 'picked_up'
                          ? isHi ? 'पिकअप पूर्ण' : 'Picked Up'
                          : isHi ? 'डिलीवर हुआ' : 'Delivered'
                        : isOut
                          ? isHi ? 'डिलीवरी के लिए निकला' : 'Out for Delivery'
                          : h.paidInApp
                            ? isHi ? 'भुगतान पूर्ण' : 'Paid · Packing'
                            : isHi ? 'बिल तैयार · भुगतान शेष' : 'Bill Ready';
                  return (
                    <View
                      style={{
                        backgroundColor: badgeBg,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: R.pill,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: badgeColor,
                        }}
                      >
                        {badgeText}
                      </Text>
                    </View>
                  );
                })()}
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
                {h.status === 'cancelled'
                  ? isHi
                    ? 'फार्मेसी द्वारा अस्वीकृत'
                    : 'Declined / Out of stock'
                  : h.total === 0
                    ? isHi
                      ? 'बिल प्रतीक्षित'
                      : 'Awaiting bill'
                    : h.paidInApp
                      ? isHi
                        ? 'ऐप में भुगतान'
                        : 'Paid in app'
                      : isHi
                      ? 'भुगतान शेष'
                      : 'Payment pending'}
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
