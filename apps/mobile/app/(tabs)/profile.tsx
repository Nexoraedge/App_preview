import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  Phone,
  Wallet,
  MapPin,
  Sparkles,
  LogOut,
  HelpCircle,
  FileText,
  RotateCcw,
  Languages,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, loginAsTestUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleResetReviewerAccount = () => {
    loginAsTestUser();
    Alert.alert(
      language === 'hi' ? 'रिव्यूअर अकाउंट तैयार' : 'Reviewer Account Ready',
      language === 'hi'
        ? 'डॉ. विक्रम मल्होत्रा टेस्ट प्रोफाइल (₹2,500 वॉलेट) पर स्विच किया गया।'
        : 'Switched to Dr. Vikram Malhotra test profile with ₹2,500 wallet.'
    );
  };

  return (
    <ScrollView className="flex-1 bg-[#F0F2F2] px-5 pt-14" showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm mb-4">
        <View className="flex-row items-center space-x-3 mb-4">
          <View className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#2E4A70] to-[#24B0BA] items-center justify-center shadow-md">
            <UserIcon size={28} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-[#2E4A70]">
              {user?.full_name || (language === 'hi' ? 'डॉ. विक्रम मल्होत्रा' : 'Dr. Vikram Malhotra')}
            </Text>
            <View className="flex-row items-center space-x-1 mt-0.5">
              <Phone size={12} color="#64748B" />
              <Text className="text-xs font-mono text-slate-500">
                {user?.phone || '+91 99999 99999'}
              </Text>
            </View>
            <View className="flex-row items-center space-x-1 mt-1">
              <MapPin size={12} color="#24B0BA" />
              <Text className="text-[11px] font-semibold text-[#24B0BA]">
                {language === 'hi' ? 'जयपुर / दिल्ली' : 'Jaipur / Delhi NCR'}
              </Text>
            </View>
          </View>
        </View>

        {/* Wallet Balance Pill */}
        <View className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <Wallet size={16} color="#CF8A40" />
            <Text className="text-xs font-bold text-slate-700">
              {language === 'hi' ? 'हेल्थ कैश बैलेंस' : 'Health Cash Balance'}
            </Text>
          </View>
          <Text className="text-base font-black text-[#2E4A70]">
            ₹{user?.wallet_balance?.toLocaleString('en-IN') || '2,500'}
          </Text>
        </View>
      </View>

      {/* Language Preferences Card */}
      <View className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm mb-4">
        <View className="flex-row items-center space-x-2 mb-3">
          <Languages size={18} color="#24B0BA" />
          <Text className="text-xs font-bold text-[#2E4A70] uppercase tracking-wider">
            {language === 'hi' ? 'ऐप की भाषा / App Language' : 'App Language / भाषा'}
          </Text>
        </View>

        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={() => setLanguage('en')}
            className={`flex-1 p-3 rounded-xl border flex-row items-center justify-between ${
              language === 'en'
                ? 'bg-[#E6F8F9] border-[#24B0BA]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View>
              <Text className="text-xs font-bold text-[#2E4A70]">English</Text>
              <Text className="text-[10px] text-slate-500">Default language</Text>
            </View>
            {language === 'en' && <Check size={16} color="#24B0BA" strokeWidth={2.5} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLanguage('hi')}
            className={`flex-1 p-3 rounded-xl border flex-row items-center justify-between ${
              language === 'hi'
                ? 'bg-[#E6F8F9] border-[#24B0BA]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <View>
              <Text className="text-xs font-bold text-[#2E4A70]">हिंदी (Hindi)</Text>
              <Text className="text-[10px] text-slate-500">भारत की भाषा</Text>
            </View>
            {language === 'hi' && <Check size={16} color="#24B0BA" strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* App Store Reviewer Card */}
      <View className="bg-[#FFF9F0] p-5 rounded-2xl border border-[#CF8A40]/40 shadow-sm mb-4">
        <View className="flex-row items-center space-x-2 mb-2">
          <Sparkles size={16} color="#CF8A40" />
          <Text className="text-[#CF8A40] text-xs font-black uppercase tracking-wider">
            {language === 'hi' ? 'ऐप स्टोर रिव्यूअर एक्सेस' : 'For Apple / Google App Store Reviewers'}
          </Text>
        </View>
        <Text className="text-slate-700 text-xs leading-relaxed">
          {language === 'hi'
            ? 'इस बिल्ड में बिना SMS गेटवे के सत्यापन के लिए प्री-कॉन्फिगर रिव्यूअर बाईपास शामिल है।'
            : 'This build includes an active test bypass user configured to pass App Store review guidelines without requiring an active Indian SMS gateway.'}
        </Text>

        <View className="bg-white/80 p-3 rounded-xl mt-3 space-y-1 font-mono border border-[#CF8A40]/20">
          <Text className="text-xs text-slate-700">
            • {language === 'hi' ? 'फोन' : 'Phone'}: <Text className="text-[#2E4A70] font-bold">+91 99999 99999</Text>
          </Text>
          <Text className="text-xs text-slate-700">
            • OTP: <Text className="text-[#2E4A70] font-bold">123456</Text>
          </Text>
          <Text className="text-xs text-slate-700">
            • {language === 'hi' ? 'स्टेटस' : 'Status'}: <Text className="text-[#24B0BA] font-bold">Auto-Verified</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleResetReviewerAccount}
          className="mt-4 bg-[#24B0BA] active:bg-[#1E97A0] py-2.5 px-4 rounded-xl flex-row items-center justify-center space-x-2 shadow-sm"
        >
          <RotateCcw size={14} color="#FFFFFF" />
          <Text className="text-white font-bold text-xs">
            {language === 'hi' ? 'रिव्यूअर अकाउंट रीसेट करें' : 'Reset Test User State'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings / Links */}
      <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
        <TouchableOpacity
          onPress={() => alert('Adityam Niramayaa Healthcare Trust Network v1.0.0')}
          className="p-4 flex-row items-center justify-between border-b border-slate-100"
        >
          <View className="flex-row items-center space-x-3">
            <FileText size={18} color="#2E4A70" />
            <Text className="text-xs font-semibold text-slate-800">
              {language === 'hi' ? 'नियम और मेडिकल डिस्क्लेमर' : 'Terms & Medical Disclaimer'}
            </Text>
          </View>
          <Text className="text-xs text-slate-400">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => alert('Support helpline: +91 11 4000 8800')}
          className="p-4 flex-row items-center justify-between border-b border-slate-100"
        >
          <View className="flex-row items-center space-x-3">
            <HelpCircle size={18} color="#2E4A70" />
            <Text className="text-xs font-semibold text-slate-800">
              {language === 'hi' ? '24x7 सहायता और हेल्पलाइन' : '24x7 Support & Helpline'}
            </Text>
          </View>
          <Text className="text-xs text-slate-400">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="p-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center space-x-3">
            <LogOut size={18} color="#DC2626" />
            <Text className="text-xs font-bold text-rose-600">
              {language === 'hi' ? 'साइन आउट' : 'Sign Out'}
            </Text>
          </View>
          <Text className="text-xs text-rose-400">›</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-center text-[10px] text-slate-400 mb-8 font-mono">
        Adityam Niramayaa App • Version 1.0.0 (Launch Build)
      </Text>
    </ScrollView>
  );
}
