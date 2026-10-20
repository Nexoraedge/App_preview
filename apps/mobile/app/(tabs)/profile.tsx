// apps/mobile/app/(tabs)/profile.tsx
// Ultra-lean, smooth, and premium Patient Profile screen for Adityam Niramayaa.
// Focuses on personal identity, health hub shortcuts, medical vitals, and clean navigation.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  MapPin,
  Wallet,
  ShieldCheck,
  Calendar,
  Users,
  FlaskConical,
  Pill,
  Settings,
  ChevronRight,
  LogOut,
  HelpCircle,
  FileText,
  HeartPulse,
  Crown,
  Languages,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage, type Language } from '../../src/context/LanguageContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, dependents, logout, loginAsTestUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isHi = language === 'hi';

  const [showReviewerDrawer, setShowReviewerDrawer] = useState(false);

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    setLanguage(newLang);
  };

  const handleLogout = () => {
    Alert.alert(
      isHi ? 'साइन आउट करें' : 'Sign Out',
      isHi ? 'क्या आप निश्चित रूप से अपने खाते से साइन आउट करना चाहते हैं?' : 'Are you sure you want to sign out?',
      [
        { text: isHi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHi ? 'हाँ, साइन आउट' : 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleResetReviewerAccount = () => {
    loginAsTestUser();
    Alert.alert(
      isHi ? 'रिव्यूअर अकाउंट तैयार' : 'Reviewer Account Ready',
      isHi
        ? 'अभिषेक जैन टेस्ट प्रोफाइल (₹2,500 वॉलेट) पर स्विच किया गया।'
        : 'Switched to Abhishek Jain test profile with ₹2,500 wallet.'
    );
  };

  const userName = user?.full_name || (isHi ? 'अभिषेक जैन' : 'Abhishek Jain');
  const userPhone = user?.phone || '+91 99999 99999';
  const userCity = user?.city || (isHi ? 'दिल्ली एनसीआर' : 'Delhi NCR');
  const initial = userName.charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Main Container constrained for tablets and web */}
      <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* TOP BAR */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color="#0F172A" />
            </TouchableOpacity>

            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {isHi ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B', marginTop: 1 }}>
                {isHi ? 'व्यक्तिगत स्वास्थ्य पहचान व रिकॉर्ड' : 'Personal Health Identity & Hub'}
              </Text>
            </View>
          </View>

          {/* Quick Settings Gear Icon */}
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Settings size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* SCROLLABLE PROFILE BODY */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          }}
        >
          {/* 1. HERO PATIENT IDENTITY CARD */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {/* Initials Avatar Tile */}
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  backgroundColor: '#1E40AF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#1E40AF',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{initial}</Text>
              </View>

              {/* Name & Details */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {userName}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                    }}
                  >
                    <Crown size={11} color="#D97706" strokeWidth={2.5} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Phone size={12} color="#64748B" />
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748B' }}>{userPhone}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={12} color="#0D9488" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0D9488' }}>{userCity}</Text>
                </View>
              </View>
            </View>

            {/* Seamless ABHA & Wallet Strip */}
            <View
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* ABHA Badge */}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#F0FDF4',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                }}
              >
                <ShieldCheck size={14} color="#16A34A" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                  {isHi ? 'ABHA: 91-4582-9011' : 'ABHA: 91-4582-9011'}
                </Text>
              </TouchableOpacity>

              {/* Wallet Pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <Wallet size={14} color="#2563EB" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                  ₹{user?.wallet_balance?.toLocaleString('en-IN') || '2,500'}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. LEAN HEALTH HUB (Smooth 4-Tile Grid) */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 }}>
              {isHi ? 'स्वास्थ्य हब' : 'Health Hub'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {/* Tile 1: Appointments */}
              <TouchableOpacity
                onPress={() => router.push('/appointments')}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Calendar size={18} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'अपॉइंटमेंट्स' : 'Appointments'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563EB', marginTop: 2 }}>
                  {isHi ? '2 सक्रिय विज़िट' : '2 Scheduled'}
                </Text>
              </TouchableOpacity>

              {/* Tile 2: Family Vault */}
              <TouchableOpacity
                onPress={() => router.push('/family')}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#F0FDF4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Users size={18} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'परिवार वॉल्ट' : 'Family Vault'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#16A34A', marginTop: 2 }}>
                  {dependents?.length || 2} {isHi ? 'सदस्य जुड़े हैं' : 'Members Linked'}
                </Text>
              </TouchableOpacity>

              {/* Tile 3: Lab Tests & Scans */}
              <TouchableOpacity
                onPress={() => router.push('/labs')}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <FlaskConical size={18} color="#D97706" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'लैब व स्कैन' : 'Lab & Scans'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#D97706', marginTop: 2 }}>
                  {isHi ? 'रिपोर्ट्स व टेस्ट' : 'Reports & Tests'}
                </Text>
              </TouchableOpacity>

              {/* Tile 4: Pharmacy & Prescriptions */}
              <TouchableOpacity
                onPress={() => router.push('/pharmacy')}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#F3E8FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Pill size={18} color="#9333EA" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'दवाएं व पर्चे' : 'Prescriptions'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#9333EA', marginTop: 2 }}>
                  {isHi ? 'रीऑर्डर व ट्रैकिंग' : 'Orders & Refills'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. CLINICAL SUMMARY (Compact, Lean Vitals Strip) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <HeartPulse size={16} color="#E11D48" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {isHi ? 'क्लिनिकल सारांश' : 'Clinical Summary'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{isHi ? 'रक्त समूह' : 'Blood Group'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>O+ Positive</Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: '#E2E8F0' }} />
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{isHi ? 'एलर्जी' : 'Allergies'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669', marginTop: 2 }}>{isHi ? 'कोई ज्ञात नहीं' : 'None Known'}</Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: '#E2E8F0' }} />
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{isHi ? 'प्राथमिक डॉक्टर' : 'Primary Doctor'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>Dr. Satish ji</Text>
              </View>
            </View>
          </View>

          {/* 4. LANGUAGE INLINE TOGGLE (Compact & Smooth) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Languages size={16} color="#2563EB" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                {isHi ? 'ऐप भाषा' : 'App Language'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 }}>
              <TouchableOpacity
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: language === 'en' ? '#FFFFFF' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: language === 'en' ? '800' : '600', color: language === 'en' ? '#1E40AF' : '#64748B' }}>
                  English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleLanguageChange('hi')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: language === 'hi' ? '#FFFFFF' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: language === 'hi' ? '800' : '600', color: language === 'hi' ? '#1E40AF' : '#64748B' }}>
                  हिंदी
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. SMOOTH SETTINGS & ACTION LIST */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {/* Settings & Privacy (Dedicated Entry) */}
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings size={18} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                    {isHi ? 'सेटिंग्स और गोपनीयता' : 'Settings & Privacy'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {isHi ? 'सूचनाएं, ABHA सिंक, सुरक्षा व खाता प्रबंधन' : 'ABHA Sync, Security, Notifications & Data'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Support Helpline */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  isHi ? '24x7 क्लिनिकल सहायता' : '24x7 Patient Concierge',
                  isHi
                    ? 'आदित्यम निरामया सहायता डेस्क:\nफोन: +91 11 4000 8800\nईमेल: care@adityam.health'
                    : 'Adityam Niramayaa Clinical Support:\nPhone: +91 11 4000 8800\nEmail: care@adityam.health'
                )
              }
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HelpCircle size={18} color="#475569" />
                </View>
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                    {isHi ? '24x7 सहायता व क्लिनिकल डेस्क' : '24x7 Support & Helpline'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {isHi ? 'अपॉइंटमेंट व दवा सहायता' : 'Speak to a care coordinator'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Terms & Medical Disclaimer */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Terms & Medical Disclaimer',
                  'Adityam Niramayaa is a healthcare facilitator conforming to NMC Telemedicine guidelines. In emergencies, please dial 112 or visit the nearest emergency room immediately.'
                )
              }
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#F8FAFC',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} color="#475569" />
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'नियम और मेडिकल डिस्क्लेमर' : 'Terms & Medical Disclaimer'}
                </Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LogOut size={18} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#DC2626' }}>
                  {isHi ? 'साइन आउट' : 'Sign Out'}
                </Text>
              </View>
              <ChevronRight size={16} color="#FCA5A5" />
            </TouchableOpacity>
          </View>

          {/* Discrete App Store Reviewer Pill (Foldable / Non-Intrusive) */}
          <TouchableOpacity
            onPress={() => setShowReviewerDrawer(!showReviewerDrawer)}
            activeOpacity={0.7}
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: '#FFFBEB',
              borderWidth: 1,
              borderColor: '#FDE68A',
              marginBottom: 10,
            }}
          >
            <Sparkles size={12} color="#D97706" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
              {showReviewerDrawer
                ? (isHi ? 'रिव्यूअर जानकारी छिपाएं' : 'Hide Reviewer Access')
                : (isHi ? 'ऐप स्टोर रिव्यूअर एक्सेस' : 'App Store Reviewer Mode')}
            </Text>
          </TouchableOpacity>

          {showReviewerDrawer && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#FDE68A',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                Test Account Bypass: Phone <Text style={{ fontWeight: '700', color: '#0F172A' }}>+91 99999 99999</Text> • OTP <Text style={{ fontWeight: '700', color: '#0F172A' }}>123456</Text>
              </Text>
              <TouchableOpacity
                onPress={handleResetReviewerAccount}
                style={{
                  marginTop: 8,
                  backgroundColor: '#D97706',
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <RotateCcw size={12} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                  {isHi ? 'टेस्ट प्रोफ़ाइल रीसेट' : 'Reset Test Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Branding */}
          <Text style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            Adityam Niramayaa Health Trust Network
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>
            Version 1.0.4 • Launch Build 2026.10
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
