// apps/mobile/app/login.tsx
// Seamless Phone OTP Login with 6-cell auto-advance input & Supabase integration

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  ArrowLeft,
  User as UserIcon,
  Phone,
  Sparkles,
  Lock,
  Edit2,
} from 'lucide-react-native';

import { C, R } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { pickLoginCopy } from '../src/i18n/loginCopy';
import { AUTH, LEGAL, ROUTES } from '../src/config/brand';
import { PrimaryButton } from '../components/ui/kit';
import { LogoMark } from '../components/brand/LogoMark';
import { LangToggle } from '../components/launch/LangToggle';
import { OtpInputBoxes } from '../components/auth/OtpInputBoxes';
import { requestOtp, verifyPhoneOtp } from '../src/lib/supabase';

const RESEND_SECONDS = 30;

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithPhone } = useAuth();
  const { language } = useLanguage() as any;
  const isHi = language === 'hi';
  const t = pickLoginCopy(language);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (left <= 0) return;
    const timerId = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timerId);
  }, [left]);

  // Indian mobile number validation (10 digits starting with 6-9)
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const nameOk = fullName.trim().length >= 2;

  // Reviewer / Demo Quick Fill Helper
  const handleReviewerFill = () => {
    setFullName('Abhishek Jain');
    setPhone('9999999999');
    setError('');
  };

  const handleSendOtp = async () => {
    if (!nameOk) {
      setError(t.nameRequired);
      return;
    }
    if (!phoneOk) {
      setError(t.invalidPhone);
      return;
    }

    setError('');
    setBusy(true);

    try {
      const res = await requestOtp(phone);
      if (!res.success && res.error) {
        setError(res.error);
        return;
      }
      setStep('otp');
      setOtp('');
      setLeft(RESEND_SECONDS);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (code.length !== 6) {
      setError(t.wrongOtp);
      return;
    }

    setError('');
    setBusy(true);

    try {
      const res = await verifyPhoneOtp(phone, code);
      if (!res.success) {
        setError(res.error || t.wrongOtp);
        return;
      }

      // Persist session to AuthContext and local storage
      loginWithPhone(phone, code, fullName.trim());
      router.replace(ROUTES.home as any);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const openLink = (label: string, url: string) => (
    <Text
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={{ color: C.brand, fontWeight: '700' }}
    >
      {label}
    </Text>
  );

  const inputContainerStyle = {
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: error ? C.danger : C.line,
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Dynamic Brand Gradient Background */}
      <LinearGradient
        colors={['#0B1B4D', '#172554', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 270,
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Navigation Bar: Back Button & Language Switcher */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 6,
                minHeight: 48,
              }}
            >
              {step === 'otp' ? (
                <Pressable
                  onPress={() => {
                    setStep('phone');
                    setError('');
                  }}
                  hitSlop={12}
                  accessibilityLabel={t.change}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={22} color="#fff" />
                </Pressable>
              ) : (
                <View style={{ width: 44 }} />
              )}
              <LangToggle tone="light" />
            </View>

            {/* Brand Header & Logo */}
            <View
              style={{
                alignItems: 'center',
                paddingTop: 8,
                paddingBottom: 24,
              }}
            >
              <LogoMark size={60} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 22,
                    fontWeight: '900',
                    letterSpacing: -0.3,
                  }}
                >
                  {isHi ? 'आदित्यम्' : 'Adityam'}
                </Text>
                <Text
                  style={{
                    color: '#38BDF8',
                    fontSize: 22,
                    fontWeight: '900',
                    letterSpacing: -0.3,
                  }}
                >
                  {isHi ? 'निरामया' : 'Niramayaa'}
                </Text>
              </View>
            </View>

            {/* Main Interactive Form Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: '#fff',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: 24,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
              }}
            >
              <View
                style={{
                  maxWidth: 480,
                  width: '100%',
                  alignSelf: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: C.ink,
                    lineHeight: 34,
                  }}
                >
                  {step === 'phone' ? t.title : t.otpTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 14.5,
                    color: C.sub,
                    lineHeight: 22,
                    marginTop: 4,
                  }}
                >
                  {step === 'phone' ? t.subtitle : t.otpSent(phone)}
                </Text>

                {step === 'phone' ? (
                  <View style={{ marginTop: 22 }}>
                    {/* Full Name Input */}
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: '700',
                          color: C.sub,
                          marginBottom: 8,
                        }}
                      >
                        {t.fullNameLabel}
                      </Text>
                      <View style={inputContainerStyle}>
                        <UserIcon
                          size={18}
                          color={C.mute}
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          value={fullName}
                          onChangeText={(v) => {
                            setFullName(v);
                            setError('');
                          }}
                          placeholder={t.fullNamePlaceholder}
                          placeholderTextColor={C.mute}
                          autoCapitalize="words"
                          autoComplete="name"
                          returnKeyType="next"
                          style={[
                            {
                              flex: 1,
                              fontSize: 16,
                              fontWeight: '600',
                              color: C.ink,
                              paddingVertical: 12,
                            },
                            Platform.OS === 'web' &&
                              ({
                                outline: 'none',
                                outlineStyle: 'none',
                              } as any),
                          ]}
                        />
                      </View>
                    </View>

                    {/* Mobile Number Input */}
                    <View style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: '700',
                            color: C.sub,
                          }}
                        >
                          {t.phoneLabel}
                        </Text>
                        {/* 1-Tap Reviewer / Demo Fill */}
                        <TouchableOpacity
                          onPress={handleReviewerFill}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            backgroundColor: '#EFF6FF',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                          }}
                        >
                          <Sparkles size={11} color="#2563EB" />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: '#1D4ED8',
                            }}
                          >
                            {t.reviewerFill}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={inputContainerStyle}>
                        <Text
                          style={{
                            fontSize: 16.5,
                            fontWeight: '700',
                            color: C.ink,
                            marginRight: 10,
                          }}
                        >
                          +91
                        </Text>
                        <View
                          style={{
                            width: 1,
                            height: 24,
                            backgroundColor: C.line,
                            marginRight: 12,
                          }}
                        />
                        <TextInput
                          value={phone}
                          onChangeText={(v) => {
                            setPhone(v.replace(/\D/g, '').slice(0, 10));
                            setError('');
                          }}
                          placeholder={t.phonePlaceholder}
                          placeholderTextColor={C.mute}
                          keyboardType="number-pad"
                          textContentType="telephoneNumber"
                          autoComplete="tel"
                          maxLength={10}
                          returnKeyType="done"
                          onSubmitEditing={handleSendOtp}
                          style={[
                            {
                              flex: 1,
                              fontSize: 17,
                              fontWeight: '600',
                              color: C.ink,
                              paddingVertical: 12,
                              letterSpacing: 1,
                            },
                            Platform.OS === 'web' &&
                              ({
                                outline: 'none',
                                outlineStyle: 'none',
                              } as any),
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 20 }}>
                    {/* Phone Number Display with Edit Trigger */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F8FAFC',
                        borderRadius: R.md,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Phone size={15} color={C.sub} />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: C.ink,
                          }}
                        >
                          +91 {phone}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setStep('phone');
                          setError('');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: '#EFF6FF',
                        }}
                      >
                        <Edit2 size={12} color={C.brand} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: C.brand,
                          }}
                        >
                          {isHi ? 'बदलें' : 'Edit'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Modern 6-Box Individual OTP Cells */}
                    <OtpInputBoxes
                      value={otp}
                      onChange={(newCode) => {
                        setOtp(newCode);
                        setError('');
                      }}
                      error={!!error}
                      onComplete={(fullCode) => handleVerifyOtp(fullCode)}
                    />

                    {/* Test & Reviewer Hint Banner */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#FFFBEB',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        marginTop: 4,
                      }}
                    >
                      <Lock size={13} color="#D97706" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#B45309',
                          fontWeight: '600',
                        }}
                      >
                        {t.demoNote(AUTH.demoOtp)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Inline Error Toast */}
                {error ? (
                  <View
                    style={{
                      backgroundColor: '#FEF2F2',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: C.danger,
                        fontWeight: '600',
                      }}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Primary Action Button */}
                <View style={{ marginTop: 22 }}>
                  <PrimaryButton
                    label={
                      step === 'phone'
                        ? t.sendOtp
                        : busy
                        ? isHi
                          ? 'सत्यापित हो रहा है...'
                          : 'Verifying...'
                        : t.verify
                    }
                    onPress={
                      step === 'phone' ? handleSendOtp : () => handleVerifyOtp()
                    }
                    disabled={
                      busy ||
                      (step === 'phone'
                        ? !phoneOk || !nameOk
                        : otp.length !== 6)
                    }
                  />

                  {/* 1-Tap Instant Reviewer & Team Sign-In */}
                  {step === 'phone' && (
                    <TouchableOpacity
                      onPress={() => {
                        loginWithPhone('9999999999', '123456', 'Abhishek Jain');
                        router.replace(ROUTES.home as any);
                      }}
                      activeOpacity={0.8}
                      style={{
                        marginTop: 12,
                        height: 48,
                        borderRadius: R.pill,
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1.5,
                        borderColor: '#BFDBFE',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <Sparkles size={16} color="#1D4ED8" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#1D4ED8',
                        }}
                      >
                        {isHi
                          ? '1-क्लिक रिव्यूअर / डेमो प्रवेश'
                          : '1-Tap Reviewer / Demo Access'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Resend Countdown in OTP Step */}
                {step === 'otp' ? (
                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    {left > 0 ? (
                      <Text
                        style={{
                          color: C.sub,
                          fontSize: 13.5,
                          lineHeight: 20,
                        }}
                      >
                        {t.resendIn(left)}
                      </Text>
                    ) : (
                      <Pressable
                        onPress={handleSendOtp}
                        hitSlop={10}
                        style={{
                          minHeight: 40,
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: C.brand,
                            fontSize: 14,
                            fontWeight: '700',
                          }}
                        >
                          {t.resend}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                {/* Security Trust Badge */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 24,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                  }}
                >
                  <ShieldCheck size={18} color={C.good} />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: C.sub,
                      lineHeight: 18,
                    }}
                  >
                    {t.secure}
                  </Text>
                </View>

                {/* Legal Consent Links */}
                <Text
                  style={{
                    fontSize: 12,
                    color: C.mute,
                    lineHeight: 18,
                    marginTop: 14,
                    textAlign: 'center',
                  }}
                >
                  {t.consentPre}
                  {openLink(t.terms, LEGAL.terms)}
                  {t.and}
                  {openLink(t.privacy, LEGAL.privacy)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
