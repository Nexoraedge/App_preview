import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Phone, KeyRound, Sparkles, ArrowRight, CheckCircle2, Languages } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithPhone, loginAsTestUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = () => {
    if (phone.length < 10) {
      Alert.alert(
        language === 'hi' ? 'अमान्य मोबाइल नंबर' : 'Invalid Number',
        language === 'hi'
          ? 'कृपया एक मान्य 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit Indian mobile number.'
      );
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      if (phone.includes('9999999999')) {
        setOtp('123456');
      }
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      Alert.alert(
        language === 'hi' ? 'अधूरा OTP' : 'Incomplete OTP',
        language === 'hi'
          ? 'कृपया SMS द्वारा प्राप्त 6-अंकीय OTP कोड दर्ज करें।'
          : 'Please enter the 6-digit OTP received via SMS.'
      );
      return;
    }
    const success = loginWithPhone(phone, otp);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleBypassTestUser = () => {
    loginAsTestUser();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#2E4A70]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Language Selection Header */}
        <View className="pt-12 px-6 flex-row justify-end">
          <View className="bg-white/10 p-1 rounded-xl flex-row items-center border border-white/20">
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg ${language === 'en' ? 'bg-[#24B0BA]' : ''}`}
            >
              <Text className={`text-xs font-bold ${language === 'en' ? 'text-white' : 'text-slate-200'}`}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLanguage('hi')}
              className={`px-3 py-1 rounded-lg ${language === 'hi' ? 'bg-[#24B0BA]' : ''}`}
            >
              <Text className={`text-xs font-bold ${language === 'hi' ? 'text-white' : 'text-slate-200'}`}>
                हिंदी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Branding Section */}
        <View className="px-6 pt-4 pb-8 items-center">
          <View className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#24B0BA] to-[#73C7E3] items-center justify-center shadow-lg mb-4">
            <Text className="text-[#2E4A70] font-black text-2xl tracking-tighter">AN</Text>
          </View>
          <Text className="text-3xl font-bold text-white text-center font-serif">
            {t.appName}
          </Text>
          <Text className="text-sm text-[#73C7E3] mt-1 text-center font-medium tracking-wide">
            {t.tagline}
          </Text>
        </View>

        {/* Main Form Sheet */}
        <View className="flex-1 bg-[#F0F2F2] rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl justify-between">
          <View>
            <Text className="text-xl font-bold text-[#2E4A70] mb-1">
              {step === 'phone'
                ? language === 'hi' ? 'स्वागत है' : 'Welcome Patient'
                : language === 'hi' ? 'मोबाइल नंबर सत्यापित करें' : 'Verify Mobile Number'}
            </Text>
            <Text className="text-xs text-slate-500 mb-6">
              {step === 'phone'
                ? language === 'hi'
                  ? 'अस्पताल, फैमिली वॉल्ट और 25% छूट के लिए साइन इन करें।'
                  : 'Sign in to access partner hospitals, family vault, and instant 25% pharmacy discount.'
                : language === 'hi'
                  ? `+91 ${phone} पर भेजा गया 6-अंकीय कोड दर्ज करें`
                  : `Enter the 6-digit code sent to +91 ${phone}`}
            </Text>

            {step === 'phone' ? (
              <View className="space-y-4">
                <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider">
                  {language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}
                </Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <Text className="text-sm font-bold text-[#2E4A70] mr-2">🇮🇳 +91</Text>
                  <View className="w-px h-6 bg-slate-200 mr-3" />
                  <TextInput
                    placeholder={language === 'hi' ? '10-अंकीय नंबर दर्ज करें' : 'Enter 10-digit number'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    className="flex-1 text-sm font-semibold text-slate-900"
                  />
                  <Phone size={18} color="#24B0BA" />
                </View>

                {/* Primary Action Button (Turquoise #24B0BA) */}
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  className="bg-[#24B0BA] active:bg-[#1E97A0] py-3.5 rounded-xl items-center shadow-md shadow-[#24B0BA]/20 mt-2 flex-row justify-center space-x-2"
                >
                  <Text className="text-white font-bold text-sm">
                    {isLoading
                      ? language === 'hi' ? 'OTP भेजा जा रहा है...' : 'Sending OTP...'
                      : language === 'hi' ? 'SMS पर OTP प्राप्त करें' : 'Get OTP on SMS'}
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4">
                <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider">
                  {language === 'hi' ? '6-अंकीय OTP कोड' : '6-Digit OTP Code'}
                </Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <KeyRound size={18} color="#24B0BA" className="mr-3" />
                  <TextInput
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    className="flex-1 text-base font-bold tracking-widest text-[#2E4A70]"
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  className="bg-[#2E4A70] active:bg-[#233956] py-3.5 rounded-xl items-center shadow-md mt-2 flex-row justify-center space-x-2"
                >
                  <CheckCircle2 size={16} color="#24B0BA" />
                  <Text className="text-white font-bold text-sm">
                    {language === 'hi' ? 'सत्यापित करें और साइन इन करें' : 'Verify & Sign In'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStep('phone')}
                  className="py-2 items-center"
                >
                  <Text className="text-xs font-semibold text-[#24B0BA]">
                    {language === 'hi' ? 'मोबाइल नंबर बदलें' : 'Change Mobile Number'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* App Store Review Bypass Card */}
          <View className="mt-8 bg-[#FFF9F0] border border-[#CF8A40]/40 rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center space-x-2 mb-2">
              <Sparkles size={16} color="#CF8A40" />
              <Text className="text-xs font-bold text-[#CF8A40] uppercase tracking-wider">
                App Store Review Bypass
              </Text>
            </View>
            <Text className="text-[11px] text-slate-700 mb-3 leading-relaxed">
              Apple & Google test review account preconfigured with ₹2,500 wallet balance and verified dependents.
            </Text>
            <TouchableOpacity
              onPress={handleBypassTestUser}
              className="bg-[#2E4A70] active:bg-[#233956] py-2.5 px-4 rounded-lg items-center flex-row justify-center space-x-2"
            >
              <ShieldCheck size={16} color="#73C7E3" />
              <Text className="text-[#73C7E3] font-bold text-xs">
                1-Tap Login as Review Test User
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
