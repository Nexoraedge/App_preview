// app/login.tsx
// Phone-number OTP login. Two steps on one screen: number -> 6-digit code.
// AUTH.demo = true (in src/config/brand.ts) lets you demo with no SMS provider; set it to false for real Supabase OTP.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { C, R } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { pickLoginCopy } from '../src/i18n/loginCopy';
import { AUTH, BRAND, LEGAL, ROUTES } from '../src/config/brand';
import { PrimaryButton } from '../components/ui/kit';
import { LogoMark } from '../components/brand/LogoMark';
import { LangToggle } from '../components/launch/LangToggle';
// import { getSupabaseClient } from '../src/lib/supabase'; // TODO: uncomment when AUTH.demo = false

const RESEND_SECONDS = 30;

export default function Login() {
  const router = useRouter();
  const { loginWithPhone } = useAuth();
  const { language } = useLanguage() as any;
  const t = pickLoginCopy(language);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // Indian mobile numbers are 10 digits starting with 6-9.
  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  const sendOtp = async () => {
    if (!phoneOk) { setError(t.invalidPhone); return; }
    setError(''); setBusy(true);
    try {
      if (!AUTH.demo) {
        // const { error: e } = await getSupabaseClient().auth.signInWithOtp({ phone: '+91' + phone });
        // if (e) throw e;
      }
      setStep('otp'); setOtp(''); setLeft(RESEND_SECONDS);
      setTimeout(() => otpRef.current?.focus(), 250);
    } catch (e: any) {
      setError(e?.status === 429 ? t.tooMany : t.failed);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (otp.length !== 6) { setError(t.wrongOtp); return; }
    setError(''); setBusy(true);
    try {
      if (AUTH.demo) {
        if (otp !== AUTH.demoOtp) {
          setError(t.wrongOtp);
          return;
        }
        loginWithPhone(phone, otp);
      } else {
        // const { error: e } = await getSupabaseClient().auth.verifyOtp({ phone: '+91' + phone, token: otp, type: 'sms' });
        // if (e) { setError(e.status === 429 ? t.tooMany : t.wrongOtp); return; }
        loginWithPhone(phone, otp);
      }
      router.replace(ROUTES.home as any);
    } catch {
      setError(t.failed);
    } finally { setBusy(false); }
  };

  const link = (label: string, url: string) => (
    <Text onPress={() => Linking.openURL(url).catch(() => {})} style={{ color: C.brand, fontWeight: '700' }}>{label}</Text>
  );

  const field = {
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: error ? C.danger : C.line,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient
        colors={['#0B1B4D', '#172554', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 270 }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, minHeight: 48 }}>
              {step === 'otp' ? (
                <Pressable onPress={() => { setStep('phone'); setError(''); }} hitSlop={12} accessibilityLabel={t.change} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeft size={22} color="#fff" />
                </Pressable>
              ) : <View style={{ width: 44 }} />}
              <LangToggle tone="light" />
            </View>

            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 24 }}>
              <LogoMark size={60} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: -0.3 }}>
                  {language === 'hi' ? 'आदित्यम्' : 'Adityam'}
                </Text>
                <Text style={{ color: '#38BDF8', fontSize: 21, fontWeight: '900', letterSpacing: -0.3 }}>
                  {language === 'hi' ? 'निरामया' : 'Niramayaa'}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 }}>
              <View style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, lineHeight: 36 }}>{step === 'phone' ? t.title : t.otpTitle}</Text>
                <Text style={{ fontSize: 15, color: C.sub, lineHeight: 24, marginTop: 4 }}>{step === 'phone' ? t.subtitle : t.otpSent(phone)}</Text>

                {step === 'phone' ? (
                  <View style={{ marginTop: 22 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.sub, marginBottom: 8 }}>{t.phoneLabel}</Text>
                    <View style={field}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginRight: 10 }}>+91</Text>
                      <View style={{ width: 1, height: 26, backgroundColor: C.line, marginRight: 12 }} />
                      <TextInput
                        value={phone}
                        onChangeText={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                        placeholder={t.phonePlaceholder}
                        placeholderTextColor={C.mute}
                        keyboardType="number-pad"
                        textContentType="telephoneNumber"
                        autoComplete="tel"
                        maxLength={10}
                        returnKeyType="done"
                        onSubmitEditing={sendOtp}
                        style={{ flex: 1, fontSize: 18, fontWeight: '600', color: C.ink, paddingVertical: 12 }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 22 }}>
                    <View style={field}>
                      <TextInput
                        ref={otpRef}
                        value={otp}
                        onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                        placeholder="••••••"
                        placeholderTextColor={C.mute}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        maxLength={6}
                        returnKeyType="done"
                        onSubmitEditing={verify}
                        style={{ flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: 8, color: C.ink, textAlign: 'center', paddingVertical: 12 }}
                      />
                    </View>
                    {AUTH.demo ? <Text style={{ fontSize: 13, color: C.warn, marginTop: 8, lineHeight: 20 }}>{t.demoNote(AUTH.demoOtp)}</Text> : null}
                  </View>
                )}

                {error ? <Text style={{ fontSize: 13.5, color: C.danger, marginTop: 10, lineHeight: 20 }}>{error}</Text> : null}

                <View style={{ marginTop: 20 }}>
                  <PrimaryButton
                    label={step === 'phone' ? t.sendOtp : t.verify}
                    onPress={step === 'phone' ? sendOtp : verify}
                    disabled={busy || (step === 'phone' ? !phoneOk : otp.length !== 6)}
                  />
                </View>

                {step === 'otp' ? (
                  <View style={{ alignItems: 'center', marginTop: 16 }}>
                    {left > 0 ? (
                      <Text style={{ color: C.sub, fontSize: 14, lineHeight: 22 }}>{t.resendIn(left)}</Text>
                    ) : (
                      <Pressable onPress={sendOtp} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text style={{ color: C.brand, fontSize: 14.5, fontWeight: '700' }}>{t.resend}</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 }}>
                  <ShieldCheck size={18} color={C.good} />
                  <Text style={{ flex: 1, fontSize: 13, color: C.sub, lineHeight: 20 }}>{t.secure}</Text>
                </View>

                <Text style={{ fontSize: 12.5, color: C.sub, lineHeight: 20, marginTop: 18, textAlign: 'center' }}>
                  {t.consentPre}{link(t.terms, LEGAL.terms)}{t.and}{link(t.privacy, LEGAL.privacy)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
