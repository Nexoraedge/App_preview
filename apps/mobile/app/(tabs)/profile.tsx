// apps/mobile/app/(tabs)/profile.tsx
// Ultra-lean, smooth, and premium Patient Profile screen for Adityam Niramayaa.
// Focuses on personal identity, health hub shortcuts, medical vitals, and clean navigation.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
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
  Languages,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Edit3,
  Camera,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage, type Language } from '../../src/context/LanguageContext';
import { useFamily } from '../../src/context/FamilyContext';
import { getLocalBookings, subscribeBookings, subscribeCloudBookings, isBookingUpcoming } from '../../src/services/bookingStorage';
import { VerifyPhoneModal } from '../../components/auth/VerifyPhoneModal';

function formatDisplayPhone(phone?: string | null, email?: string | null, isHi: boolean = false): string {
  if (phone) {
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+91')) {
      const digits = clean.slice(3);
      if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
      }
    } else if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return phone;
  }
  if (email) {
    return email;
  }
  return isHi ? '+91 (नंबर जोड़ें)' : '+91 (Add Phone)';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, dependents, logout, loginAsTestUser, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { members } = useFamily();
  const isHi = language === 'hi';

  const isDemo = user?.id === '00000000-0000-0000-0000-000000000001';
  const DEMO_PHONE = '+91 99999 99999';
  const cleanCity = user?.city || '';
  const cleanBlood = user?.blood_group || '';
  const cleanPhone = user?.phone && user.phone !== DEMO_PHONE && !user.phone.startsWith('+9100') ? user.phone : '';

  const [showReviewerDrawer, setShowReviewerDrawer] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);
  const [verifyPhoneTarget, setVerifyPhoneTarget] = useState('');
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(cleanPhone);
  const [editCity, setEditCity] = useState(cleanCity);
  const [editAge, setEditAge] = useState(user?.age ? String(user.age) : '');
  const [editGender, setEditGender] = useState(user?.gender || 'Male');
  const [editBloodGroup, setEditBloodGroup] = useState(cleanBlood);
  const [editAvatar, setEditAvatar] = useState<string | null>(user?.avatar_url || null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const bookings = await getLocalBookings();
        const isDemo = user?.id === '00000000-0000-0000-0000-000000000001';
        const userBookings = bookings.filter((b) => isDemo || (user?.id && b.user_id === user.id));
        const active = userBookings.filter((b) => isBookingUpcoming(b)).length;
        setScheduledCount(active);
      } catch {
        setScheduledCount(0);
      }
    };
    loadCount();
    const unsub = subscribeBookings(loadCount);
    const unsubCloud = subscribeCloudBookings(user?.id, loadCount);
    return () => {
      unsub();
      unsubCloud();
    };
  }, [user?.id]);

  // Keep edit state in sync with user changes
  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setEditPhone(cleanPhone);
      setEditCity(cleanCity);
      setEditAge(user.age ? String(user.age) : '');
      setEditGender(user.gender || 'Male');
      setEditBloodGroup(cleanBlood);
      setEditAvatar(user.avatar_url || null);
    }
  }, [user, cleanPhone, cleanCity, cleanBlood]);

  const handlePickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setEditAvatar(res.assets[0].uri);
      }
    } catch {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', isHi ? 'गैलरी खोलने में असमर्थ' : 'Unable to open image gallery');
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', isHi ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name');
      return;
    }
    updateUser({
      full_name: editName.trim(),
      phone: editPhone.trim() || undefined,
      city: editCity.trim(),
      age: parseInt(editAge, 10) || null,
      gender: editGender,
      blood_group: editBloodGroup || null,
      avatar_url: editAvatar,
    });
    setEditModalVisible(false);
    Alert.alert(
      isHi ? 'सफल' : 'Profile Updated',
      isHi ? 'आपकी जानकारी सहेज ली गई है और Supabase से सिंक हो गई है।' : 'Your profile details have been saved and synced to Supabase.'
    );
  };

  const handleTriggerVerifyPhone = (phoneToVerify?: string) => {
    const target = phoneToVerify || editPhone || user?.phone || '';
    const digits = target.replace(/\D/g, '').slice(-10);
    if (digits.length < 10) {
      Alert.alert(
        isHi ? 'अमान्य मोबाइल नंबर' : 'Invalid Mobile Number',
        isHi
          ? 'सत्यापन कोड (OTP) प्राप्त करने के लिए कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number to receive verification OTP.'
      );
      return;
    }
    setVerifyPhoneTarget(target);
    setIsVerifyPhoneOpen(true);
  };

  const handlePhoneVerified = (verifiedPhone: string) => {
    setEditPhone(verifiedPhone);
    updateUser({
      phone: verifiedPhone,
      is_verified: true,
    });
    setIsVerifyPhoneOpen(false);
    Alert.alert(
      isHi ? 'सत्यापन सफल' : 'Phone Verified',
      isHi
        ? `आपका मोबाइल नंबर ${verifiedPhone} सफलतापूर्वक सत्यापित हो गया है!`
        : `Your mobile number ${verifiedPhone} is now verified!`
    );
  };

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    setLanguage(newLang);
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await logout();
      router.replace('/login');
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        isHi ? 'क्या आप निश्चित रूप से अपने खाते से साइन आउट करना चाहते हैं?' : 'Are you sure you want to sign out?'
      );
      if (ok) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      isHi ? 'साइन आउट करें' : 'Sign Out',
      isHi ? 'क्या आप निश्चित रूप से अपने खाते से साइन आउट करना चाहते हैं?' : 'Are you sure you want to sign out?',
      [
        { text: isHi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHi ? 'हाँ, साइन आउट' : 'Sign Out',
          style: 'destructive',
          onPress: doLogout,
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

  const userName = user?.full_name || (isHi ? 'उपयोगकर्ता' : 'User');
  const userPhone = formatDisplayPhone(cleanPhone, user?.email, isHi);
  const userCity = cleanCity || (isHi ? 'स्थान निर्धारित नहीं' : 'Location Not Set');
  const linkedMembersCount = Math.max(0, members.length - 1);
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
              {/* Avatar Tile: Real photo or Royal Initials */}
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#BFDBFE',
                  }}
                />
              ) : (
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
              )}

              {/* Name & Details */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {userName}
                  </Text>
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

              {/* Quick Edit Profile CTA */}
              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  alignSelf: 'flex-start',
                }}
              >
                <Edit3 size={12} color="#2563EB" />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                  {isHi ? 'बदलें' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seamless ABHA & Digital Health Strip */}
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
                  backgroundColor: user?.abha_id ? '#F0FDF4' : '#F1F5F9',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: user?.abha_id ? '#BBF7D0' : '#E2E8F0',
                }}
              >
                <ShieldCheck size={14} color={user?.abha_id ? '#16A34A' : '#64748B'} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: user?.abha_id ? '#15803D' : '#475569' }}>
                  {user?.abha_id ? `ABHA: ${user.abha_id}` : (isHi ? 'ABHA आईडी लिंक करें' : 'Link ABHA ID')}
                </Text>
              </TouchableOpacity>

              {/* Phone Verification / Digital ID Pill */}
              {user?.is_verified ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#F0FDF4',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                  }}
                >
                  <CheckCircle2 size={13} color="#16A34A" />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#15803D' }}>
                    {isHi ? 'मोबाइल सत्यापित' : 'Phone Verified'}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleTriggerVerifyPhone(cleanPhone)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: '#EFF6FF',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <ShieldCheck size={13} color="#2563EB" />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                    {isHi ? 'नंबर सत्यापित करें' : 'Verify Phone'}
                  </Text>
                </TouchableOpacity>
              )}
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
                  {scheduledCount > 0 ? (isHi ? `${scheduledCount} सक्रिय विज़िट` : `${scheduledCount} Scheduled`) : (isHi ? 'कोई विज़िट नहीं' : '0 Scheduled')}
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
                  {linkedMembersCount > 0
                    ? `${linkedMembersCount} ${isHi ? 'सदस्य जुड़े हैं' : 'Members Linked'}`
                    : (isHi ? 'केवल आप (0 सदस्य)' : 'Self Only (0 Added)')}
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>
                  {user?.blood_group || (isHi ? 'निर्धारित नहीं' : 'Not Set')}
                </Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: '#E2E8F0' }} />
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{isHi ? 'एलर्जी' : 'Allergies'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: user?.allergies ? '#E11D48' : '#059669', marginTop: 2 }}>
                  {user?.allergies || (isHi ? 'कोई ज्ञात नहीं' : 'None Known')}
                </Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: '#E2E8F0' }} />
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>{isHi ? 'प्राथमिक डॉक्टर' : 'Primary Doctor'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 2 }}>
                  {user?.primary_doctor || (isHi ? 'असाइन नहीं' : 'None Assigned')}
                </Text>
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

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                {isHi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Avatar Picker */}
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                style={{ position: 'relative' }}
              >
                {editAvatar ? (
                  <Image
                    source={{ uri: editAvatar }}
                    style={{ width: 80, height: 80, borderRadius: 28 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 28,
                      backgroundColor: '#1E40AF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFFFFF' }}>{initial}</Text>
                  </View>
                )}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: '#2563EB',
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Camera size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 8 }}>
                {isHi ? 'फ़ोटो बदलें' : 'Change Photo'}
              </Text>
            </View>

            {/* Full Name */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                {isHi ? 'पूरा नाम' : 'Full Name'}
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder={isHi ? 'अपना नाम दर्ज करें' : 'Enter full name'}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0F172A',
                }}
              />
            </View>

            {/* Phone Number with Verification Action */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                  {isHi ? 'फ़ोन नंबर' : 'Phone Number'}
                </Text>
                {user?.is_verified && editPhone.replace(/\D/g, '').slice(-10) === (user?.phone?.replace(/\D/g, '').slice(-10) || '') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} color="#16A34A" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>
                      {isHi ? 'सत्यापित' : 'Verified'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleTriggerVerifyPhone(editPhone)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#EFF6FF',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                    }}
                  >
                    <ShieldCheck size={12} color="#2563EB" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                      {isHi ? 'सत्यापित करें' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="+91"
                  style={{
                    flex: 1,
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#0F172A',
                  }}
                />
                {(!user?.is_verified || editPhone.replace(/\D/g, '').slice(-10) !== (user?.phone?.replace(/\D/g, '').slice(-10) || '')) && (
                  <TouchableOpacity
                    onPress={() => handleTriggerVerifyPhone(editPhone)}
                    activeOpacity={0.88}
                    style={{
                      backgroundColor: '#2563EB',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#2563EB',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                      {isHi ? 'सत्यापित करें' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* City */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                {isHi ? 'शहर / क्षेत्र' : 'City / Region'}
              </Text>
              <TextInput
                value={editCity}
                onChangeText={setEditCity}
                placeholder={isHi ? 'जैसे जयपुर, दक्षिण दिल्ली' : 'e.g. South Delhi, Jaipur'}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0F172A',
                }}
              />
            </View>

            {/* Age & Gender Row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  {isHi ? 'आयु' : 'Age'}
                </Text>
                <TextInput
                  value={editAge}
                  onChangeText={setEditAge}
                  keyboardType="numeric"
                  placeholder={isHi ? 'जैसे 28' : 'e.g. 28'}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#0F172A',
                  }}
                />
              </View>

              <View style={{ flex: 1.5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                  {isHi ? 'लिंग' : 'Gender'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setEditGender(g)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: editGender === g ? '#EFF6FF' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: editGender === g ? '#2563EB' : '#E2E8F0',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: editGender === g ? '800' : '500',
                          color: editGender === g ? '#1E40AF' : '#64748B',
                        }}
                      >
                        {g === 'Male' ? (isHi ? 'पुरुष' : 'Male') : g === 'Female' ? (isHi ? 'महिला' : 'Female') : (isHi ? 'अन्य' : 'Other')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Blood Group */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                {isHi ? 'रक्त समूह' : 'Blood Group'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => setEditBloodGroup(editBloodGroup === bg ? '' : bg)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: editBloodGroup === bg ? '#EFF6FF' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: editBloodGroup === bg ? '#2563EB' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: editBloodGroup === bg ? '800' : '600',
                        color: editBloodGroup === bg ? '#1E40AF' : '#475569',
                      }}
                    >
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              activeOpacity={0.88}
              style={{
                backgroundColor: '#2563EB',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                {isHi ? 'जानकारी सहेजें' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Progressive Phone Verification Modal with OTP */}
      <VerifyPhoneModal
        visible={isVerifyPhoneOpen}
        onClose={() => setIsVerifyPhoneOpen(false)}
        initialPhone={verifyPhoneTarget}
        onSuccess={handlePhoneVerified}
        isHi={isHi}
        title={isHi ? 'मोबाइल नंबर सत्यापन' : 'Verify Mobile Number'}
        subtitle={
          isHi
            ? 'अपनी प्रोफ़ाइल व मेडिकल रिकॉर्ड सुरक्षित रखने के लिए 10-अंकों का फ़ोन नंबर सत्यापित करें।'
            : 'Verify your phone number with a quick 6-digit OTP to secure your account and OPD passes.'
        }
      />
    </View>
  );
}
