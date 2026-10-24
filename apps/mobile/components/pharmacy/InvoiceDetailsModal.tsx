// apps/mobile/components/pharmacy/InvoiceDetailsModal.tsx
// Order details and tax invoice bottom sheet viewer

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import {
  Check,
  Clock,
  Truck,
  Store,
  Phone,
  Download,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HistoryItem } from '../../src/data/pharmacyData';
import { SheetFrame, PrimaryButton } from '../ui/kit';
import { C, R, inr } from '../../src/theme';

interface InvoiceDetailsModalProps {
  order: HistoryItem | null;
  onClose: () => void;
  isHi: boolean;
  onDownloadInvoice: (order: HistoryItem) => void;
}

export function InvoiceDetailsModal({
  order,
  onClose,
  isHi,
  onDownloadInvoice,
}: InvoiceDetailsModalProps) {
  const insets = useSafeAreaInsets();
  if (!order) return null;

  return (
    <SheetFrame
      visible={!!order}
      onClose={onClose}
      title={isHi ? 'ऑर्डर ट्रैकिंग व इनवॉइस' : 'Order Tracking & Invoice'}
    >
      <ScrollView
        style={{ maxHeight: 620 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Hero Card */}
        <View
          style={{
            backgroundColor: '#F0FDF4',
            borderWidth: 1,
            borderColor: '#BBF7D0',
            borderRadius: R.xl,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#16A34A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}
              >
                {isHi ? 'ऑर्डर डिलीवर हो गया' : 'Order Delivered'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: R.pill,
                borderWidth: 1,
                borderColor: '#BBF7D0',
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}
              >
                #{order.ref}
              </Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 13,
              color: '#334155',
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            {isHi
              ? `आपकी दवाइयां ${
                  order.shopHi || order.shop
                } द्वारा सफलतापूर्वक आपके पते पर पहुंचा दी गई हैं।`
              : `Your medicines from ${order.shop} were safely delivered to your address.`}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#DCFCE7',
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Clock size={13} color="#15803D" />
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}
              >
                {order.date}
              </Text>
            </View>
            <Text style={{ color: '#86EFAC' }}>•</Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              {order.mode === 'delivery' ? (
                <Truck size={13} color="#15803D" />
              ) : (
                <Store size={13} color="#15803D" />
              )}
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}
              >
                {order.mode === 'delivery'
                  ? isHi
                    ? 'होम डिलीवरी'
                    : 'Doorstep Delivery'
                  : isHi
                  ? 'स्टोर पिकअप'
                  : 'Store Pickup'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pharmacy Info & Helpline */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: R.lg,
            borderWidth: 1,
            borderColor: C.line,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
              {order.shop}
            </Text>
            <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
              {order.shopAddress || 'Saket Main Market, New Delhi'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL(`tel:${order.shopPhone || '+919811234567'}`).catch(
                () => {}
              )
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#EFF6FF',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#BFDBFE',
            }}
          >
            <Phone size={14} color="#2563EB" />
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}
            >
              {isHi ? 'कॉल करें' : 'Call'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Itemized Medicines List */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: R.lg,
            borderWidth: 1,
            borderColor: C.line,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: C.ink,
              marginBottom: 10,
            }}
          >
            {isHi ? 'आइटम व दवाएं' : 'Medicines Billed'}
          </Text>

          <View style={{ gap: 8 }}>
            {order.items.map((it) => (
              <View
                key={it.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>
                  {isHi && it.nameHi ? it.nameHi : it.name}
                  {it.qty > 1 ? `  ×${it.qty}` : ''}
                </Text>
                <Text
                  style={{ fontSize: 13, color: C.ink, fontWeight: '600' }}
                >
                  {inr(it.price * it.qty)}
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

          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 13, color: C.sub }}>
              {isHi ? 'एमआरपी योग' : 'MRP Subtotal'}
            </Text>
            <Text style={{ fontSize: 13, color: C.ink }}>
              {inr(order.subtotal)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '600' }}>
              {isHi ? 'आदित्यम नेटवर्क छूट' : 'Adityam Network Discount'}
            </Text>
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '600' }}>
              − {inr(order.discount)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
              {isHi ? 'कुल भुगतान' : 'Total Paid'}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
              {inr(order.total)}
            </Text>
          </View>
        </View>

        {/* Download Invoice Button */}
        <PrimaryButton
          label={isHi ? 'टैक्स इनवॉइस डाउनलोड करें' : 'Download Tax Invoice'}
          onPress={() => onDownloadInvoice(order)}
        />
      </ScrollView>
    </SheetFrame>
  );
}
