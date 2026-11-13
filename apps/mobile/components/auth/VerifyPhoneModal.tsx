// apps/mobile/components/auth/VerifyPhoneModal.tsx
// Progressive Profiling: Verify Phone Number before booking consultations or services
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Phone, ShieldCheck, X, Sparkles, MessageCircle, Lock, Edit2, CheckCircle2 } from 'lucide-react-native';
import { OtpInputBoxes } from './OtpInputBoxes';
import { useAuth } from '../../src/context/AuthContext';
import { requestOtp, verifyPhoneOtp } from '../../src/lib/supabase';
import { C, R } from '../../src/theme';

interface VerifyPhoneModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (verifiedPhone: string) => void;
  initialPhone?: string;
  title?: string;
  subtitle?: string;
  isHi?: boolean;
}

export function VerifyPhoneModal({
  visible,
  onClose,
  onSuccess,
  initialPhone,
  title,
  subtitle,
  isHi = false,
}: VerifyPhoneModalProps) {
  const { user, verifyAndAttachPhone } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setStep('phone');
      const base = initialPhone || user?.phone || '';
      setPhone(base.replace(/\D/g, '').slice(-10));
      setOtp('');
      setError('');
      setBusy(false);
      setCountdown(0);
    }
  }, [visible, user, initialPhone]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  const handleReviewerFill = () => {
    setPhone('9999999999');
    setError('');
  };

  const handleSendOtp = async (targetChannel: 'whatsapp' | 'sms' = channel) => {
    if (!phoneOk) {
      setError(isHi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setBusy(true);
    setChannel(targetChannel);

    try {
      const res = await requestOtp(phone, targetChannel);
      if (!res.success && res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      setStep('otp');
      setCountdown(30);
    } catch {
      setStep('otp');
      setCountdown(30);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify: string = otp) => {
    const cleanCode = codeToVerify.trim();
    if (cleanCode.length !== 6) {
      setError(isHi ? 'कृपया 6 अंकों का OTP दर्ज करें' : 'Please enter 6-digit OTP');
      return;
    }

    setError('');
    setBusy(true);

    try {
      const res = await verifyPhoneOtp(phone, cleanCode);
      if (!res.success && res.error && cleanCode !== '123456') {
        setError(res.error);
        setBusy(false);
        return;
      }

      const formatted = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
      await verifyAndAttachPhone(phone, cleanCode);

      setStep('success');
      setTimeout(() => {
        onSuccess(formatted);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || (isHi ? 'सत्यापन विफल' : 'Verification failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            {/* Header with Close */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Phone size={19} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {title || (isHi ? 'मोबाइल नंबर सत्यापन' : 'Verify Mobile Number')}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#16A34A' }}>
                    {isHi ? 'डिजिटल पास व अस्पताल सुरक्षा हेतु' : 'Required for digital pass & hospital desk'}
                  </Text>
                </View>
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

            {/* Subtitle / Explainer */}
            <Text
              style={{
                fontSize: 12.5,
                color: '#64748B',
                lineHeight: 18,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              {subtitle ||
                (isHi
                  ? 'अस्पताल और डॉक्टर डेस्क आपके पंजीकृत नंबर पर प्रवेश पास, पर्चा व टेली-कंसल्टेशन सूचना भेजते हैं।'
                  : 'Hospital doctors & pharmacy desks require your active mobile number to dispatch token slips, digital passes, and tele-concierge calls.')}
            </Text>

            {step === 'phone' ? (
              <View>
                {/* Phone input with +91 and 1-tap fill */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#334155' }}>
                    {isHi ? '10-अंकों का मोबाइल नंबर' : '10-Digit Mobile Number'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleReviewerFill}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: '#EFF6FF',
                      borderRadius: 6,
                    }}
                  >
                    <Sparkles size={11} color="#2563EB" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                      {isHi ? 'डेमो भरें' : 'Demo Fill'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: error ? '#EF4444' : '#E2E8F0',
                    paddingHorizontal: 12,
                    height: 52,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginRight: 10 }}>
                    🇮🇳 +91
                  </Text>
                  <View style={{ width: 1, height: 22, backgroundColor: '#CBD5E1', marginRight: 10 }} />
                  <TextInput
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v.replace(/\D/g, '').slice(0, 10));
                      setError('');
                    }}
                    placeholder={isHi ? '98765 43210' : '98765 43210'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    style={[
                      {
                        flex: 1,
                        fontSize: 16.5,
                        fontWeight: '700',
                        color: '#0F172A',
                        letterSpacing: 1,
                      },
                      Platform.OS === 'web' && ({ outline: 'none' } as any),
                    ]}
                  />
                </View>

                {error ? (
                  <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 8 }}>
                    {error}
                  </Text>
                ) : null}

                {/* Primary Action Button: WhatsApp OTP */}
                <TouchableOpacity
                  onPress={() => handleSendOtp('whatsapp')}
                  disabled={busy || !phoneOk}
                  activeOpacity={0.8}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: busy || !phoneOk ? '#CBD5E1' : '#16A34A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <MessageCircle size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>
                    {busy && channel === 'whatsapp'
                      ? isHi ? 'भेजा जा रहा है...' : 'Sending...'
                      : isHi ? 'व्हाट्सएप पर OTP पाएं' : 'Get OTP on WhatsApp'}
                  </Text>
                </TouchableOpacity>

                {/* Secondary: SMS OTP */}
                <TouchableOpacity
                  onPress={() => handleSendOtp('sms')}
                  disabled={busy || !phoneOk}
                  activeOpacity={0.8}
                  style={{
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Phone size={15} color="#475569" />
                  <Text style={{ color: '#334155', fontSize: 13.5, fontWeight: '600' }}>
                    {busy && channel === 'sms'
                      ? isHi ? 'भेजा जा रहा है...' : 'Sending...'
                      : isHi ? 'SMS द्वारा OTP पाएं' : 'Get OTP via SMS'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : step === 'otp' ? (
              <View>
                {/* Active Phone Display */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    marginBottom: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} color="#64748B" />
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                      +91 {phone}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setStep('phone')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Edit2 size={12} color="#2563EB" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                      {isHi ? 'बदलें' : 'Change'}
                    </Text>
                  </Pressable>
                </View>

                {/* 6-digit OTP Inputs */}
                <OtpInputBoxes
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    setError('');
                  }}
                  error={!!error}
                  onComplete={(c) => handleVerifyOtp(c)}
                />

                {/* Demo Hint */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#FFFBEB',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  <Lock size={12} color="#D97706" />
                  <Text style={{ fontSize: 11.5, color: '#B45309', fontWeight: '600' }}>
                    {isHi ? 'डेमो / टेस्ट OTP: 123456' : 'Demo / Test OTP: 123456'}
                  </Text>
                </View>

                {error ? (
                  <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 8 }}>
                    {error}
                  </Text>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={() => handleVerifyOtp()}
                  disabled={busy || otp.length !== 6}
                  activeOpacity={0.85}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: busy || otp.length !== 6 ? '#CBD5E1' : '#2563EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 16,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                    {busy
                      ? isHi ? 'सत्यापित हो रहा है...' : 'Verifying...'
                      : isHi ? 'सत्यापित करें व जारी रखें' : 'Verify & Continue'}
                  </Text>
                </TouchableOpacity>

                {/* Resend Controls */}
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  {countdown > 0 ? (
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {isHi ? `${countdown}s में पुनः भेजें` : `Resend in ${countdown}s`}
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={() => handleSendOtp(channel)}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#2563EB' }}>
                        {isHi ? 'OTP पुनः भेजें' : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <CheckCircle2 size={48} color="#16A34A" />
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A', marginTop: 10 }}>
                  {isHi ? 'नंबर सफलतापूर्वक सत्यापित!' : 'Phone Verified Successfully!'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  {isHi ? 'बुकिंग जारी रखी जा रही है...' : 'Proceeding with your booking...'}
                </Text>
              </View>
            )}

            {/* Bottom Security Assurance */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 18,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={14} color="#16A34A" />
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>
                {isHi ? '100% गोपनीय व सुरक्षित (Exotel मास्क कॉलिंग सक्षम)' : '100% Confidential with Masked Calling'}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

