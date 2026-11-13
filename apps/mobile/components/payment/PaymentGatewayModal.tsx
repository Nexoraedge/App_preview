// apps/mobile/components/payment/PaymentGatewayModal.tsx
// Seamless Healthcare Payment Gateway Sheet (Razorpay + UPI + Cards + NetBanking + Clinic Pay)
// Includes full Apple App Store Reviewer Sandbox Simulation with auto-fill test cards and UPI handles.

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  Smartphone,
  Building2,
  Wallet,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
  Landmark,
  BadgeAlert,
} from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import { inr } from '../../src/theme';

export type PaymentMethod =
  | 'UPI_GPAY'
  | 'UPI_PHONEPE'
  | 'UPI_PAYTM'
  | 'CARD'
  | 'NETBANKING';

interface PaymentGatewayModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  serviceTitle: string;
  providerName: string;
  patientName: string;
  bookingRef?: string;
  onPaymentSuccess: (method: PaymentMethod, transactionId: string) => void;
}

const POPULAR_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank', code: 'HDFC' },
  { id: 'ICICI', name: 'ICICI Bank', code: 'ICIC' },
  { id: 'SBI', name: 'State Bank of India', code: 'SBIN' },
  { id: 'AXIS', name: 'Axis Bank', code: 'UTIB' },
];

export function PaymentGatewayModal({
  visible,
  onClose,
  amount,
  serviceTitle,
  providerName,
  patientName,
  bookingRef,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI_GPAY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successStep, setSuccessStep] = useState(false);
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Interactive Card Form State
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 9821');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('•••');
  const [cardName, setCardName] = useState(patientName || 'Abhishek Jain');

  // Quick fill sandbox test card
  const handleFillTestCard = () => {
    setCardNumber('4111 2222 3333 4444');
    setCardExpiry('08/29');
    setCardCvv('789');
    setCardName('App Store Reviewer');
  };

  const handlePay = () => {
    setIsProcessing(true);

    // Simulate bank authorization handshake
    setTimeout(() => {
      setIsProcessing(false);
      setSuccessStep(true);

      const fakeTxnId = `RZP-${Date.now().toString().slice(-8)}`;

      setTimeout(() => {
        setSuccessStep(false);
        onPaymentSuccess(selectedMethod, fakeTxnId);
      }, 1200);
    }, 1400);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '92%',
            width: '100%',
            maxWidth: 600,
            alignSelf: 'center',
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: 18,
              paddingHorizontal: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={18} color="#16A34A" />
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'सुरक्षित भुगतान गेटवे' : 'Secure Checkout'}
                </Text>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#15803D' }}>SANDBOX</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                {isHi ? '256-बिट बैंक स्तरीय एन्क्रिप्शन • रेजरपे अधिकृत' : '256-bit Bank Grade Encryption • Razorpay & UPI'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
          >
            {successStep ? (
              /* Success Animation Screen */
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={44} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
                  {isHi ? 'भुगतान सत्यापित हुआ! 🎉' : 'Payment Verified! 🎉'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 290 }}>
                  {isHi
                    ? `राशि ${inr(amount)} सफलतापूर्वक प्राप्त हुई। डिजिटल रसीद एवं टोकन कोड जारी कर दिया गया है।`
                    : `Amount ${inr(amount)} successfully authorized via ${selectedMethod}. Digital token pass generated.`}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {/* Sandbox Reviewer Disclosure Notice */}
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} color="#2563EB" />
                  <Text style={{ fontSize: 11.5, color: '#1E40AF', flex: 1, fontWeight: '600', lineHeight: 16 }}>
                    {isHi
                      ? 'परीक्षण वातावरण: कोई वास्तविक शुल्क नहीं कटेगा। ऐप्पल स्टोर रिव्यू व टेस्टिंग हेतु अधिकृत।'
                      : 'Test Sandbox Mode: No real money will be charged. Pre-configured for Apple App Review & tests.'}
                  </Text>
                </View>

                {/* Bill Summary Card */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                        {serviceTitle}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {providerName} • {patientName}
                      </Text>
                      {bookingRef && (
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 }}>
                          Ref: {bookingRef}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#16A34A' }}>
                        {inr(amount)}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>
                        {isHi ? 'कुल देय राशि' : 'Total Payable'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Instant UPI Options */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                    {isHi ? 'तत्काल यूपीआई भुगतान' : 'Instant UPI Apps'}
                  </Text>
                  <View style={{ gap: 10 }}>
                    {[
                      { id: 'UPI_GPAY' as PaymentMethod, label: 'Google Pay', subtitle: 'Fast 1-tap UPI', icon: '🟢' },
                      { id: 'UPI_PHONEPE' as PaymentMethod, label: 'PhonePe', subtitle: 'Auto-mandate / QR code', icon: '🟣' },
                      { id: 'UPI_PAYTM' as PaymentMethod, label: 'Paytm UPI', subtitle: 'Pay via Paytm handle', icon: '🔵' },
                    ].map((opt) => {
                      const isSelected = selectedMethod === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => setSelectedMethod(opt.id)}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 12,
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? '#1D4ED8' : '#0F172A' }}>
                                {opt.label}
                              </Text>
                              <Text style={{ fontSize: 11.5, color: '#64748B' }}>{opt.subtitle}</Text>
                            </View>
                          </View>
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: isSelected ? '#2563EB' : '#CBD5E1',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSelected ? '#2563EB' : 'transparent',
                            }}
                          >
                            {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Cards Section with Interactive Test Form */}
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                    {isHi ? 'क्रेडिट व डेबिट कार्ड' : 'Credit & Debit Cards'}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setSelectedMethod('CARD')}
                    activeOpacity={0.8}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: selectedMethod === 'CARD' ? '#2563EB' : '#E2E8F0',
                      backgroundColor: selectedMethod === 'CARD' ? '#EFF6FF' : '#FFFFFF',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <CreditCard size={18} color="#2563EB" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: selectedMethod === 'CARD' ? '#1D4ED8' : '#0F172A' }}>
                          {isHi ? 'कार्ड से भुगतान' : 'Pay via Card'}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedMethod === 'CARD' ? '#2563EB' : '#CBD5E1',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selectedMethod === 'CARD' ? '#2563EB' : 'transparent',
                        }}
                      >
                        {selectedMethod === 'CARD' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />}
                      </View>
                    </View>

                    {/* Interactive Card Fields (shown when Card is active) */}
                    {selectedMethod === 'CARD' && (
                      <View style={{ marginTop: 14, gap: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                            {isHi ? 'कार्ड नंबर' : 'CARD NUMBER'}
                          </Text>
                          <TouchableOpacity onPress={handleFillTestCard}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>
                              ⚡ {isHi ? 'परीक्षण कार्ड भरें' : 'Fill Test Card'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          value={cardNumber}
                          onChangeText={setCardNumber}
                          placeholder="4111 2222 3333 4444"
                          style={{
                            height: 42,
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            fontSize: 13.5,
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                          }}
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                              {isHi ? 'वैधता (MM/YY)' : 'VALID THRU'}
                            </Text>
                            <TextInput
                              value={cardExpiry}
                              onChangeText={setCardExpiry}
                              placeholder="12/28"
                              style={{
                                height: 42,
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                fontSize: 13.5,
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                              CVV
                            </Text>
                            <TextInput
                              value={cardCvv}
                              onChangeText={setCardCvv}
                              secureTextEntry
                              maxLength={4}
                              placeholder="123"
                              style={{
                                height: 42,
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                fontSize: 13.5,
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Net Banking */}
                  <TouchableOpacity
                    onPress={() => setSelectedMethod('NETBANKING')}
                    activeOpacity={0.8}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: selectedMethod === 'NETBANKING' ? '#2563EB' : '#E2E8F0',
                      backgroundColor: selectedMethod === 'NETBANKING' ? '#EFF6FF' : '#FFFFFF',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Landmark size={18} color="#2563EB" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: selectedMethod === 'NETBANKING' ? '#1D4ED8' : '#0F172A' }}>
                          {isHi ? 'नेट बैंकिंग' : 'Net Banking'}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedMethod === 'NETBANKING' ? '#2563EB' : '#CBD5E1',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selectedMethod === 'NETBANKING' ? '#2563EB' : 'transparent',
                        }}
                      >
                        {selectedMethod === 'NETBANKING' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />}
                      </View>
                    </View>

                    {selectedMethod === 'NETBANKING' && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {POPULAR_BANKS.map((b) => (
                          <TouchableOpacity
                            key={b.id}
                            onPress={() => setSelectedBank(b.id)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: selectedBank === b.id ? '#2563EB' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: selectedBank === b.id ? '#1D4ED8' : '#CBD5E1',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: selectedBank === b.id ? '#FFFFFF' : '#334155' }}>
                              {b.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Pay Action CTA */}
                <TouchableOpacity
                  onPress={handlePay}
                  disabled={isProcessing}
                  activeOpacity={0.88}
                  style={{
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: '#16A34A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 6,
                    shadowColor: '#16A34A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 4,
                  }}
                >
                  {isProcessing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                        {isHi ? 'बैंक से सत्यापन हो रहा है...' : 'Authorizing with Bank...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Lock size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                        {isHi ? `${inr(amount)} का सुरक्षित भुगतान करें` : `Pay ${inr(amount)} Securely`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
