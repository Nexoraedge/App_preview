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
  onPayOrder?: (order: HistoryItem) => Promise<void> | void;
  onReorder?: (order: HistoryItem) => void;
}

export function InvoiceDetailsModal({
  order,
  onClose,
  isHi,
  onDownloadInvoice,
  onPayOrder,
  onReorder,
}: InvoiceDetailsModalProps) {
  const insets = useSafeAreaInsets();
  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const isAwaitingQuote = !isCancelled && (order.total === 0 || order.items.length === 0);
  const isDelivered = order.status === 'delivered' || order.status === 'picked_up';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isBlueTheme = !isCancelled && (isAwaitingQuote || !isDelivered);

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
            backgroundColor: isCancelled ? '#FEF2F2' : isAwaitingQuote ? '#EFF6FF' : '#F0FDF4',
            borderWidth: 1,
            borderColor: isCancelled ? '#FECACA' : isAwaitingQuote ? '#BFDBFE' : '#BBF7D0',
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
                  backgroundColor: isCancelled ? '#DC2626' : isBlueTheme ? '#2563EB' : '#16A34A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCancelled || isBlueTheme ? (
                  <Clock size={16} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                )}
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: '800', color: isCancelled ? '#B91C1C' : isBlueTheme ? '#1D4ED8' : '#166534' }}
              >
                {isCancelled
                  ? (isHi ? 'ऑर्डर रद्द • स्टॉक उपलब्ध नहीं' : 'Order Cancelled / Out of Stock')
                  : isAwaitingQuote
                    ? (isHi ? 'पर्चा प्राप्त • सत्यापन जारी' : 'Prescription Under Review')
                    : isDelivered
                      ? (isHi ? 'ऑर्डर डिलीवर हो गया' : order.status === 'picked_up' ? 'Order Picked Up' : 'Order Delivered')
                      : isOutForDelivery
                        ? (isHi ? 'डिलीवरी के लिए निकला' : 'Out for Delivery')
                        : order.paidInApp
                          ? (isHi ? 'ऑर्डर कन्फर्म • भुगतान प्राप्त' : 'Order Confirmed • Paid')
                          : (isHi ? 'बिल तैयार • भुगतान शेष' : 'Bill Quoted • Awaiting Payment')}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: R.pill,
                borderWidth: 1,
                borderColor: isCancelled ? '#FECACA' : isBlueTheme ? '#BFDBFE' : '#BBF7D0',
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '800', color: isCancelled ? '#B91C1C' : isBlueTheme ? '#1D4ED8' : '#166534' }}
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
            {isCancelled
              ? (order.cancelReason || (isHi ? 'फार्मेसी में कुछ दवाइयां उपलब्ध नहीं थीं। कृपया दूसरी फार्मेसी चुनें।' : `${order.shop} could not fulfill this prescription (out of stock). Please select another pharmacy.`))
              : isAwaitingQuote
                ? (isHi
                    ? `${order.shopHi || order.shop} द्वारा आपका पर्चा प्राप्त हो गया है। फार्मासिस्ट दवाओं की उपलब्धता जांच कर डिजिटल बिल तैयार कर रहे हैं।`
                    : `Your prescription slip has been received by ${order.shop}. The pharmacist is checking stocks and preparing your digital invoice.`)
                : isDelivered
                  ? (isHi
                      ? `आपकी दवाइयां ${order.shopHi || order.shop} द्वारा सफलतापूर्वक पहुंचा दी गई हैं।`
                      : `Your medicines from ${order.shop} were safely delivered.`)
                  : isOutForDelivery
                    ? (isHi
                        ? `${order.shopHi || order.shop} से आपकी दवाइयां डिलीवरी के लिए निकल चुकी हैं।`
                        : `Your medicines from ${order.shop} are out for delivery.`)
                    : order.paidInApp
                      ? (isHi
                          ? `${order.shopHi || order.shop} ने आपका भुगतान प्राप्त कर लिया है। यह आपको 24 घंटे से पहले डिलीवर कर दिया जाएगा।`
                          : `${order.shop} has received your payment. It will be delivered to you before 24 hours.`)
                      : (isHi
                          ? `${order.shopHi || order.shop} ने आपका डिजिटल बिल तैयार कर दिया है। पैकिंग शुरू करने के लिए भुगतान पूरा करें।`
                          : `${order.shop} has prepared your bill. Complete payment to start packing & dispatch.`)}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: isBlueTheme ? '#DBEAFE' : '#DCFCE7',
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Clock size={13} color={isBlueTheme ? '#1D4ED8' : '#15803D'} />
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: isBlueTheme ? '#1D4ED8' : '#15803D' }}
              >
                {isAwaitingQuote
                  ? (isHi ? `भेजा गया: ${order.date}` : `Submitted: ${order.date}`)
                  : order.date}
              </Text>
            </View>
            <Text style={{ color: isAwaitingQuote ? '#93C5FD' : '#86EFAC' }}>•</Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              {order.mode === 'delivery' ? (
                <Truck size={13} color={isAwaitingQuote ? '#1D4ED8' : '#15803D'} />
              ) : (
                <Store size={13} color={isAwaitingQuote ? '#1D4ED8' : '#15803D'} />
              )}
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: isAwaitingQuote ? '#1D4ED8' : '#15803D' }}
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

        {/* Delivery / Pickup Secret 4-Digit Verification PIN (shown only to customer after payment) */}
        {order.paidInApp && !isDelivered && order.verificationCode ? (
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              borderRadius: R.xl,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#1E3A8A' }}>
                {isHi ? 'डिलीवरी / पिकअप सत्यापन पिन' : 'Delivery / Pickup Verification PIN'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#1D4ED8', marginTop: 2, lineHeight: 16 }}>
                {isHi
                  ? 'दवाइयां प्राप्त करते समय केवल डिलीवरी कर्मी / काउंटर पर बताएं।'
                  : 'Share this 4-digit PIN only when receiving your medicines.'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#2563EB',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D4ED8', letterSpacing: 4 }}>
                {order.verificationCode}
              </Text>
            </View>
          </View>
        ) : null}

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
              {order.shopAddress || 'Jaipur Network Partner'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL(`tel:${order.shopPhone || '+911412601122'}`).catch(
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
            {isHi ? 'दवाओं का विवरण' : 'Medicines & Prescription'}
          </Text>

          {isAwaitingQuote ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', gap: 6 }}>
              <Clock size={24} color="#2563EB" />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                {isHi ? 'पर्चे का सत्यापन जारी है' : 'Prescription Under Pharmacist Review'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 17 }}>
                {isHi
                  ? 'फार्मासिस्ट आपके पर्चे की जांच कर रहे हैं। दवाओं की उपलब्धता व बिल तैयार होते ही आपको सूचित किया जाएगा।'
                  : 'The pharmacist has received your prescription slip and is matching stocks. The itemized bill will be ready shortly.'}
              </Text>
            </View>
          ) : (
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
          )}

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
              {isAwaitingQuote ? (isHi ? 'बिलिंग प्रतीक्षारत' : 'Pending Quote') : inr(order.subtotal)}
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
              {isAwaitingQuote ? (isHi ? 'बिल पर लागू होगी' : 'Applicable on Bill') : `− ${inr(order.discount)}`}
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
              {order.paidInApp
                ? (isHi ? 'कुल भुगतान' : 'Total Paid')
                : (isHi ? 'कुल देय राशि' : 'Net Payable')}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: isAwaitingQuote ? '#2563EB' : C.ink }}>
              {isAwaitingQuote ? (isHi ? 'मूल्यांकन जारी' : 'Quote In Progress') : inr(order.total)}
            </Text>
          </View>
        </View>

        {/* Pay Now (before payment) OR Download Invoice (only after payment) */}
        {!isCancelled && !isAwaitingQuote && !order.paidInApp && onPayOrder && (
          <PrimaryButton
            label={isHi ? `अभी भुगतान करें • ${inr(order.total)}` : `Pay ${inr(order.total)} Now`}
            onPress={() => onPayOrder(order)}
          />
        )}
        {!isCancelled && !isAwaitingQuote && order.paidInApp && (
          <PrimaryButton
            label={isHi ? 'टैक्स इनवॉइस डाउनलोड करें' : 'Download Tax Invoice'}
            onPress={() => onDownloadInvoice(order)}
          />
        )}
        {onReorder && (isCancelled || (!isAwaitingQuote && order.paidInApp)) && (
          <PrimaryButton
            tone={isCancelled ? 'brand' : 'ghost'}
            label={
              isCancelled
                ? isHi
                  ? 'दूसरी फार्मेसी से ऑर्डर करें'
                  : 'Order from Another Store'
                : isHi
                  ? 'फिर से ऑर्डर करें (समान / नई दुकान)'
                  : 'Order Again (Same / Different Store)'
            }
            onPress={() => onReorder(order)}
          />
        )}
      </ScrollView>
    </SheetFrame>
  );
}
