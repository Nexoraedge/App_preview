// apps/mobile/components/pharmacy/PharmacyBillCard.tsx
// Itemized bill breakdown with in-app discount savings and payment CTAs

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BillLine, Pharmacy, getBillItemName } from '../../src/data/pharmacySample';
import { Mode } from '../../src/data/pharmacyData';
import { PrimaryButton } from '../ui/kit';
import { C, R, SHADOW, inr } from '../../src/theme';

interface PharmacyBillCardProps {
  items: BillLine[];
  shop: Pharmacy;
  subtotal: number;
  discount: number;
  total: number;
  mode: Mode;
  isHi: boolean;
  onPayInApp: () => void;
  onPayAtShop: () => void;
}

export function PharmacyBillCard({
  items,
  shop,
  subtotal,
  discount,
  total,
  mode,
  isHi,
  onPayInApp,
  onPayAtShop,
}: PharmacyBillCardProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: R.xl,
        borderWidth: 1,
        borderColor: C.line,
        padding: 16,
        marginTop: 14,
        ...SHADOW,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
        {isHi ? 'दवाओं का बिल' : 'Your bill'}
      </Text>

      <View style={{ marginTop: 10, gap: 8 }}>
        {items.map((l) => (
          <View
            key={l.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>
              {getBillItemName(l, isHi)}
              {l.qty > 1 ? `  ×${l.qty}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: C.ink, fontWeight: '600' }}>
              {inr(l.price * l.qty)}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: C.line,
          marginVertical: 12,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13.5, color: C.sub }}>
          {isHi ? 'उप-कुल (Subtotal)' : 'Subtotal'}
        </Text>
        <Text style={{ fontSize: 13.5, color: C.ink }}>{inr(subtotal)}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 5,
        }}
      >
        <Text style={{ fontSize: 13.5, color: C.good, fontWeight: '600' }}>
          {isHi
            ? `ऐप छूट (${shop.appDiscountPct}%)`
            : `In-app discount (${shop.appDiscountPct}%)`}
        </Text>
        <Text style={{ fontSize: 13.5, color: C.good, fontWeight: '600' }}>
          − {inr(discount)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
          {isHi ? 'कुल देय राशि' : 'Pay in app'}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
          {inr(total)}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 11,
          color: C.mute,
          marginTop: 8,
          lineHeight: 16,
        }}
      >
        {isHi
          ? 'डिलीवरी शुल्क (यदि कोई हो) फार्मेसी द्वारा निर्धारित होता है और अंतिम बिल में दर्शाया जाता है।'
          : 'Delivery charges, if any, are set by the pharmacy and shown on the final bill.'}
      </Text>

      <View style={{ gap: 8, marginTop: 14 }}>
        <PrimaryButton
          label={
            isHi
              ? `${inr(total)} भुगतान करें और ${inr(discount)} बचाएं`
              : `Pay ${inr(total)} and save ${inr(discount)}`
          }
          onPress={onPayInApp}
        />
        <Pressable
          onPress={onPayAtShop}
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: C.sub,
              textAlign: 'center',
            }}
          >
            {mode === 'pickup'
              ? isHi
                ? `दुकान पर भुगतान करें (${inr(subtotal)}, ऐप छूट नहीं)`
                : `Pay at the shop instead (${inr(subtotal)}, no in-app discount)`
              : isHi
              ? `डिलीवरी पर नकद भुगतान करें (${inr(subtotal)}, ऐप छूट नहीं)`
              : `Pay on delivery instead (${inr(subtotal)}, no in-app discount)`}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
