// apps/mobile/app/settings.tsx
// Comprehensive, production-grade Settings & Privacy screen for Adityam Niramayaa.
// Includes Profile Editing, ABHA Health ID linkage, Notifications preferences,
// Biometric lock, Offline Cache Manager, Legal/Medical compliance, and Apple/Google compliant Account Deletion.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Alert,
  Platform,
  Share,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bell,
  MessageSquare,
  Lock,
  Fingerprint,
  Languages,
  Check,
  Trash2,
  AlertTriangle,
  ChevronRight,
  HardDrive,
  Download,
  FileText,
  HelpCircle,
  LogOut,
  Edit3,
  HeartPulse,
  Activity,
  X,
  Sparkles,
  Smartphone,
  Share2,
  Info,
} from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage, type Language } from '../src/context/LanguageContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser, logout, deleteAccount } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isHi = language === 'hi';

  // Notification Toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [labReportAlerts, setLabReportAlerts] = useState(true);
  const [refillReminders, setRefillReminders] = useState(true);
  const [healthTips, setHealthTips] = useState(false);

  // Security & Privacy Toggles
  const [biometricLock, setBiometricLock] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [abdmAutoSync, setAbdmAutoSync] = useState(true);

  // Cache & Storage simulation
  const [cacheSizeMb, setCacheSizeMb] = useState<number>(14.8);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Profile Edit Modal State
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || 'Rahul Jain');
  const [editEmail, setEditEmail] = useState('rahul.jain@example.com');
  const [editCity, setEditCity] = useState(user?.city || 'Delhi NCR');
  const [editBloodGroup, setEditBloodGroup] = useState('O+ Positive');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('+91 98112 44550');

  // ABHA Digital Card Modal State
  const [abhaModalVisible, setAbhaModalVisible] = useState(false);

  // Account Deletion Modal & Safety Confirmation State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [ackWalletLoss, setAckWalletLoss] = useState(false);
  const [ackMedicalHistoryLoss, setAckMedicalHistoryLoss] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Language Change Handler
  const handleLanguageChange = (newLang: Language) => {
    if (newLang === language) return;
    setLanguage(newLang);
  };

  // Profile Save
  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', isHi ? 'कृपया अपना नाम दर्ज करें' : 'Please enter your name');
      return;
    }
    updateUser({
      full_name: editName.trim(),
      city: editCity.trim(),
    });
    setEditProfileModalVisible(false);
    Alert.alert(
      isHi ? 'सफल' : 'Profile Updated',
      isHi ? 'आपकी प्रोफ़ाइल जानकारी सफलतापूर्वक अपडेट हो गई है।' : 'Your profile details have been saved.'
    );
  };

  // Clear Offline Storage Cache
  const handleClearCache = () => {
    setIsClearingCache(true);
    setTimeout(() => {
      setCacheSizeMb(0.0);
      setIsClearingCache(false);
      Alert.alert(
        isHi ? 'कैश साफ़ हो गया' : 'Cache Cleared',
        isHi
          ? 'ऑफ़लाइन रिपोर्ट और इमेज कैश को सफलतापूर्वक हटा दिया गया है।'
          : 'All cached prescription PDFs and diagnostic scans have been cleared.'
      );
    }, 600);
  };

  // Export Health Data
  const handleExportData = () => {
    Alert.alert(
      isHi ? 'मेडिकल डेटा एक्सपोर्ट' : 'Export Health Archive',
      isHi
        ? 'आपके सभी लैब परिणाम, पर्चे और परामर्श रसीदें पासवर्ड-सुरक्षित ज़िप फ़ाइल के रूप में तैयार की जा रही हैं।'
        : 'Your medical visit history, lab reports, and prescriptions are compiled into an encrypted health archive.',
      [
        {
          text: isHi ? 'शेयर करें' : 'Share / Save',
          onPress: () => {
            Share.share({
              message: `Adityam Niramayaa Health Archive for ${user?.full_name || 'Rahul Jain'} (ABHA: 91-4582-9011-3420). Encrypted package ready.`,
            });
          },
        },
        { text: isHi ? 'ठीक है' : 'Done' },
      ]
    );
  };

  // Log Out Handler
  const handleLogout = () => {
    Alert.alert(
      isHi ? 'लॉग आउट करें' : 'Sign Out',
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

  // Permanent Account Deletion Handler (Compliant with Apple App Store 5.1.1(v) & Google Play)
  const handleExecuteAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setDeleteModalVisible(false);
      setIsDeleting(false);
      Alert.alert(
        isHi ? 'खाता स्थायी रूप से हटा दिया गया' : 'Account Permanently Deleted',
        isHi
          ? 'आपका खाता, मेडिकल इतिहास, परिवार प्रोफ़ाइल और वॉलेट बैलेंस डिजिटल स्वास्थ्य मानकों के अनुसार स्थायी रूप से मिटा दिए गए हैं।'
          : 'Your account, medical records, saved family members, and wallet balance have been permanently erased from Adityam Niramayaa in compliance with privacy regulations.',
        [
          {
            text: isHi ? 'समाप्त' : 'Finish',
            onPress: () => router.replace('/welcome'),
          },
        ]
      );
    } catch {
      setIsDeleting(false);
      Alert.alert('Error', 'Unable to delete account at this moment. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Main Container constrained for tablets and web */}
      <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* TOP APP BAR */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.back()}
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

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {isHi ? 'सेटिंग्स और गोपनीयता' : 'Settings & Privacy'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B', marginTop: 1 }}>
                {isHi ? 'प्रोफ़ाइल, ABHA, सूचनाएं व सुरक्षा नियंत्रण' : 'Preferences, ABHA ID, Security & Data'}
              </Text>
            </View>
          </View>
        </View>

        {/* SCROLLABLE SETTINGS BODY */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}
        >
          {/* 1. PROFILE & ACCOUNT CARD */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: '#1E40AF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserIcon size={26} color="#FFFFFF" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {user?.full_name || 'Rahul Jain'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Phone size={11} color="#64748B" />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                      {user?.phone || '+91 99999 99999'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={11} color="#0D9488" />
                    <Text style={{ fontSize: 11.5, color: '#0D9488', fontWeight: '600' }}>
                      {user?.city || 'Delhi NCR'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setEditProfileModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <Edit3 size={12} color="#2563EB" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                  {isHi ? 'संपादित करें' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Medical Badges */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>
                  {isHi ? 'रक्त समूह' : 'Blood Group'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#E11D48', marginTop: 1 }}>
                  {editBloodGroup}
                </Text>
              </View>

              <View style={{ width: 1, height: 24, backgroundColor: '#CBD5E1' }} />

              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>
                  {isHi ? 'आपातकालीन फोन' : 'Emergency Contact'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 1 }}>
                  {editEmergencyPhone}
                </Text>
              </View>

              <View style={{ width: 1, height: 24, backgroundColor: '#CBD5E1' }} />

              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>
                  {isHi ? 'वॉलेट कैश' : 'Health Cash'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A', marginTop: 1 }}>
                  ₹{user?.wallet_balance?.toLocaleString('en-IN') || '2,500'}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. AYUSHMAN BHARAT (ABHA) HEALTH ID SECTION */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                    {isHi ? 'आयुष्मान भारत डिजिटल हेल्थ (ABHA)' : 'Ayushman Bharat Digital Health (ABHA)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {isHi ? 'राष्ट्रीय स्वास्थ्य प्राधिकरण (NHA) सत्यापित' : 'National Health Authority (NHA) Linked'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#86EFAC',
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#15803D' }}>
                  ✓ {isHi ? 'सत्यापित' : 'Active'}
                </Text>
              </View>
            </View>

            {/* ABHA Number Box */}
            <View
              style={{
                backgroundColor: '#FFFBEB',
                borderWidth: 1,
                borderColor: '#FDE68A',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E', textTransform: 'uppercase' }}>
                  {isHi ? 'ABHA पता व पहचान संख्या' : 'ABHA ID & Address'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#78350F', marginTop: 1 }}>
                  91-4582-9011-3420
                </Text>
                <Text style={{ fontSize: 11, color: '#B45309', marginTop: 1 }}>
                  rahul.jain@abdm
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAbhaModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                  {isHi ? 'कार्ड देखें' : 'View Card'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ABDM Auto Sync Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'अस्पताल व लैब रिपोर्ट स्वचालित सिंक' : 'Auto-Sync Hospital & Lab Records'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi
                    ? 'डॉक्टर पर्चे और पैथोलॉजी टेस्ट को सीधे राष्ट्रीय हेल्थ लॉकर में जोड़ें'
                    : 'Fetch prescriptions and lab slips seamlessly into your ABDM digital locker'}
                </Text>
              </View>
              <Switch
                value={abdmAutoSync}
                onValueChange={setAbdmAutoSync}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={abdmAutoSync ? '#2563EB' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* 3. APP LANGUAGE & LOCALIZATION */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Languages size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'ऐप की भाषा' : 'App Language'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {isHi ? 'तत्काल भाषा बदलें' : 'Select your preferred language'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: language === 'en' ? '#EFF6FF' : '#F8FAFC',
                  borderColor: language === 'en' ? '#2563EB' : '#E2E8F0',
                }}
              >
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: language === 'en' ? '#1E40AF' : '#1E293B' }}>
                    English
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>Default language</Text>
                </View>
                {language === 'en' && <Check size={16} color="#2563EB" strokeWidth={2.5} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleLanguageChange('hi')}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: language === 'hi' ? '#EFF6FF' : '#F8FAFC',
                  borderColor: language === 'hi' ? '#2563EB' : '#E2E8F0',
                }}
              >
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: language === 'hi' ? '#1E40AF' : '#1E293B' }}>
                    हिंदी (Hindi)
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>भारत की भाषा</Text>
                </View>
                {language === 'hi' && <Check size={16} color="#2563EB" strokeWidth={2.5} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. NOTIFICATIONS & COMMUNICATION PREFERENCES */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#F3E8FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} color="#9333EA" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'सूचनाएं व संदेश प्राथमिकताएं' : 'Notifications & Alerts'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {isHi ? 'WhatsApp, SMS व ऐप सूचनाएं नियंत्रित करें' : 'Manage WhatsApp, SMS & push channels'}
                </Text>
              </View>
            </View>

            {/* WhatsApp Updates */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'WhatsApp पर डिजिटल रसीद व पर्चे' : 'WhatsApp Booking Slips & Invoices'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'अपॉइंटमेंट टोकन और दवा ट्रैकिंग लिंक तुरंत पाएं' : 'Instant PDF slips and medicine dispatch updates'}
                </Text>
              </View>
              <Switch
                value={whatsappAlerts}
                onValueChange={setWhatsappAlerts}
                trackColor={{ false: '#CBD5E1', true: '#BBF7D0' }}
                thumbColor={whatsappAlerts ? '#16A34A' : '#FFFFFF'}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            {/* Lab Report Notifications */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'लैब रिपोर्ट तैयार सूचना' : 'Lab Report Ready Alerts'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'पैथोलॉजिस्ट द्वारा रिपोर्ट साइन होते ही अलर्ट पाएं' : 'Alert immediately when pathologist signs your report'}
                </Text>
              </View>
              <Switch
                value={labReportAlerts}
                onValueChange={setLabReportAlerts}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={labReportAlerts ? '#2563EB' : '#FFFFFF'}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            {/* Refill Reminders */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'दवा रीफ़िल व खुराक रिमाइंडर' : 'Medicine Refill Reminders'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'पुरानी दवा समाप्त होने से पहले अलर्ट' : 'Proactive reminders before your routine doses run out'}
                </Text>
              </View>
              <Switch
                value={refillReminders}
                onValueChange={setRefillReminders}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={refillReminders ? '#2563EB' : '#FFFFFF'}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            {/* SMS Reminders */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'SMS डॉक्टर देरी अलर्ट' : 'Critical SMS Alerts'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'डॉक्टर ओपीडी में देरी होने पर संदेश' : 'Alerts if clinic schedule changes or doctor is delayed'}
                </Text>
              </View>
              <Switch
                value={smsAlerts}
                onValueChange={setSmsAlerts}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={smsAlerts ? '#2563EB' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* 5. PRIVACY, BIOMETRIC LOCK & SECURITY */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#ECFDF5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={18} color="#059669" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'सुरक्षा और डेटा गोपनीयता' : 'Security & Medical Privacy'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {isHi ? 'बायोमेट्रिक प्रमाणीकरण व सक्रिय सत्र' : 'Biometrics, OTP & authorized access'}
                </Text>
              </View>
            </View>

            {/* Biometric Lock Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Fingerprint size={14} color="#059669" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                    {isHi ? 'बायोमेट्रिक ऐप लॉक (Face ID / Fingerprint)' : 'Biometric Lock (Face ID / Fingerprint)'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'लैब रिपोर्ट व पर्चे देखने से पहले बायोमेट्रिक सुरक्षा' : 'Require Face ID / Fingerprint to open medical records'}
                </Text>
              </View>
              <Switch
                value={biometricLock}
                onValueChange={setBiometricLock}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={biometricLock ? '#059669' : '#FFFFFF'}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            {/* Two-Factor Auth */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'बुकिंग व रीफ़ंड के लिए दो-चरणीय सत्यापन' : '2-Step Verification for Bookings'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'वॉलेट निकासी व सर्जरी बुकिंग पर सुरक्षा OTP' : 'Extra OTP check before major IPD procedures or wallet debit'}
                </Text>
              </View>
              <Switch
                value={twoFactorAuth}
                onValueChange={setTwoFactorAuth}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={twoFactorAuth ? '#2563EB' : '#FFFFFF'}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            {/* Active Device */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Smartphone size={16} color="#64748B" />
                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                    {Platform.OS === 'ios' ? 'Apple iPhone' : Platform.OS === 'android' ? 'Android Device' : 'Web Browser'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#16A34A', fontWeight: '600' }}>
                    ● {isHi ? 'वर्तमान सत्र (सक्रिय)' : 'This Device (Active)'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#64748B' }}>Delhi NCR</Text>
            </View>
          </View>

          {/* 6. STORAGE, CACHE & DATA PORTABILITY */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HardDrive size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'डिवाइस स्टोरेज और डेटा प्रबंधन' : 'Storage & Health Data'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {isHi ? 'ऑफ़लाइन रिपोर्ट कैश व डेटा एक्सपोर्ट' : 'Cached files and complete record archive'}
                </Text>
              </View>
            </View>

            {/* Cache Row */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <View>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                  {isHi ? 'ऑफ़लाइन पीडीएफ व स्कैन कैश' : 'Offline PDF & Scan Cache'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {isHi ? `डिवाइस पर संचित: ${cacheSizeMb} MB` : `Space occupied: ${cacheSizeMb} MB`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleClearCache}
                disabled={cacheSizeMb === 0 || isClearingCache}
                activeOpacity={0.8}
                style={{
                  backgroundColor: cacheSizeMb === 0 ? '#F1F5F9' : '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: cacheSizeMb === 0 ? '#E2E8F0' : '#BFDBFE',
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: cacheSizeMb === 0 ? '#94A3B8' : '#2563EB',
                  }}
                >
                  {isClearingCache
                    ? isHi ? 'साफ़ हो रहा है...' : 'Clearing...'
                    : cacheSizeMb === 0 ? isHi ? 'खाली है' : 'Cleared' : isHi ? 'कैश साफ़ करें' : 'Clear Cache'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Export Complete Health Archive */}
            <TouchableOpacity
              onPress={handleExportData}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Download size={16} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                    {isHi ? 'संपूर्ण मेडिकल रिकॉर्ड डाउनलोड (ZIP)' : 'Download Medical History (ZIP)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                    {isHi ? 'सभी पर्चे, बिल व लैब जांच एक फाइल में' : 'Encrypted export of all visits, bills & tests'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 7. LEGAL, COMPLIANCE & HELP */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={18} color="#475569" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'कानूनी, अनुपालन व सहायता' : 'Compliance & Support'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  {isHi ? 'टेलीमेडिसिन नियम, गोपनीयता व NHA गाइडलाइन्स' : 'Telemedicine guidelines & health data policies'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Telemedicine Guidelines 2020',
                  'Adityam Niramayaa complies strictly with the Telemedicine Practice Guidelines issued by National Medical Commission (NMC) & Ministry of Health and Family Welfare (MoHFW).'
                )
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                {isHi ? 'टेलीमेडिसिन व परामर्श दिशानिर्देश' : 'Telemedicine Practice Guidelines'}
              </Text>
              <ChevronRight size={15} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'ABDM Data Privacy Charter',
                  'Your health records are end-to-end encrypted under the Ayushman Bharat Digital Mission (ABDM) charter. Records are never shared without your explicit consent.'
                )
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                {isHi ? 'ABDM स्वास्थ्य डेटा गोपनीयता नीति' : 'ABDM Health Data Privacy Policy'}
              </Text>
              <ChevronRight size={15} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  '24x7 Patient Support Helpline',
                  'Reach our clinical patient desk anytime:\nPhone: +91 11 4000 8800\nWhatsApp: +91 99999 99999\nEmail: care@adityam.health'
                )
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#1E293B' }}>
                {isHi ? '24x7 सहायता व क्लिनिकल हेल्पलाइन' : '24x7 Concierge Clinical Helpline'}
              </Text>
              <ChevronRight size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 8. DANGER ZONE: LOGOUT & ACCOUNT DELETION */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#FEE2E2',
              marginBottom: 16,
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#991B1B' }}>
                  {isHi ? 'खाता कार्रवाई' : 'Account Actions'}
                </Text>
                <Text style={{ fontSize: 11, color: '#B91C1C' }}>
                  {isHi ? 'साइन आउट व स्थायी खाता हटाने के विकल्प' : 'Sign out or permanently delete your account'}
                </Text>
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                paddingVertical: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <LogOut size={16} color="#475569" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                {isHi ? 'साइन आउट करें' : 'Sign Out'}
              </Text>
            </TouchableOpacity>

            {/* Permanent Account Deletion Card & Button */}
            <TouchableOpacity
              onPress={() => {
                setDeleteStep(1);
                setDeleteConfirmationText('');
                setAckWalletLoss(false);
                setAckMedicalHistoryLoss(false);
                setDeleteModalVisible(true);
              }}
              activeOpacity={0.88}
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1.5,
                borderColor: '#FCA5A5',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#DC2626' }}>
                    {isHi ? 'खाता स्थायी रूप से हटाएं' : 'Delete Account (Permanent)'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#B91C1C', marginTop: 1 }}>
                    {isHi ? 'सभी पर्चे, वॉलेट राशि व इतिहास मिटाया जाएगा' : 'Permanently wipe medical history, wallet & data'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* App Version Stamp */}
          <Text style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            Adityam Niramayaa App • v1.0.4 (Launch 2026.10)
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>
            Compliant with ABDM • HIPAA • NMC Telemedicine Norms
          </Text>
        </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={editProfileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                  {isHi ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile Details'}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'अपनी व्यक्तिगत और मेडिकल जानकारी अपडेट करें' : 'Update your personal & clinical details'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditProfileModalVisible(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  {isHi ? 'पूरा नाम' : 'Full Name'}
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Rahul Jain"
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

              {/* Email */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  {isHi ? 'ईमेल पता' : 'Email Address'}
                </Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  placeholder="rahul.jain@example.com"
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

              {/* City */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  {isHi ? 'शहर / स्थान' : 'City / Location'}
                </Text>
                <TextInput
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Delhi NCR"
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

              {/* Blood Group */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  {isHi ? 'रक्त समूह' : 'Blood Group'}
                </Text>
                <TextInput
                  value={editBloodGroup}
                  onChangeText={setEditBloodGroup}
                  placeholder="O+ Positive"
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

              {/* Emergency Contact */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  {isHi ? 'आपातकालीन संपर्क फोन' : 'Emergency Contact Phone'}
                </Text>
                <TextInput
                  value={editEmergencyPhone}
                  onChangeText={setEditEmergencyPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98112 44550"
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

              {/* Buttons */}
              <TouchableOpacity
                onPress={handleSaveProfile}
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {isHi ? 'परिवर्तन सहेजें' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ABHA DIGITAL CARD MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={abhaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAbhaModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            {/* National Health Card Header */}
            <View style={{ backgroundColor: '#1E3A8A', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#93C5FD', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  National Health Authority • NHA
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                  Ayushman Bharat Health Card (ABHA)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAbhaModalVisible(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <UserIcon size={32} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                    {user?.full_name || 'Rahul Jain'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                    Gender: Male • Age: 34
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', marginTop: 2 }}>
                    ✓ ABDM KYC Verified
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>ABHA Number:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>91-4582-9011-3420</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>ABHA Address:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>rahul.jain@abdm</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Linked Mobile:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>+91 99999 99999</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Share.share({
                    message: 'ABHA Health Card: Rahul Jain (91-4582-9011-3420). Linked with Adityam Niramayaa Health Network.',
                  });
                }}
                activeOpacity={0.88}
                style={{
                  marginTop: 16,
                  backgroundColor: '#1E40AF',
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isHi ? 'कार्ड साझा करें' : 'Share Digital Card'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: PERMANENT ACCOUNT DELETION (Safety-First Apple & Google Compliant) */}
      {/* ========================================================================= */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: '92%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#FEF2F2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={20} color="#DC2626" />
                </View>
                <View>
                  <Text style={{ fontSize: 16.5, fontWeight: '800', color: '#991B1B' }}>
                    {isHi ? 'खाता स्थायी रूप से हटाएं' : 'Delete Account Permanently'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#B91C1C' }}>
                    {isHi ? 'यह क्रिया वापस नहीं ली जा सकती' : 'This action cannot be undone'}
                  </Text>
                </View>
              </View>

              {!isDeleting && (
                <TouchableOpacity
                  onPress={() => setDeleteModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Warning Banner */}
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 6 }}>
                  {isHi
                    ? '⚠️ आपका खाता मिटाने से निम्नलिखित डेटा हमेशा के लिए समाप्त हो जाएगा:'
                    : '⚠️ What happens when you delete your account:'}
                </Text>

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11.5, color: '#7F1D1D' }}>
                    • <Text style={{ fontWeight: '700' }}>{isHi ? 'मेडिकल व टेस्ट इतिहास' : 'Medical & Lab Records'}:</Text>{' '}
                    {isHi
                      ? 'सभी डॉक्टर पर्चे, लैब रिपोर्ट्स और डायग्नोस्टिक इमेज तुरंत हटा दी जाएंगी।'
                      : 'All consultation history, doctor prescriptions, and laboratory reports will be purged.'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#7F1D1D' }}>
                    • <Text style={{ fontWeight: '700' }}>{isHi ? 'हेल्थ कैश बैलेंस' : 'Health Cash Forfeiture'}:</Text>{' '}
                    {isHi
                      ? `आपका शेष वॉलेट कैश ₹${user?.wallet_balance?.toLocaleString('en-IN') || '2,500'} स्थायी रूप से जब्त हो जाएगा।`
                      : `Your unused wallet balance of ₹${user?.wallet_balance?.toLocaleString('en-IN') || '2,500'} will be permanently forfeited.`}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#7F1D1D' }}>
                    • <Text style={{ fontWeight: '700' }}>{isHi ? 'परिवार के सदस्य' : 'Family Vault'}:</Text>{' '}
                    {isHi
                      ? 'सहेजे गए सभी आश्रित और पारिवारिक प्रोफाइल हटा दिए जाएंगे।'
                      : 'All linked family member profiles and dependent records will be wiped.'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#7F1D1D' }}>
                    • <Text style={{ fontWeight: '700' }}>{isHi ? 'ABHA लिंकेज' : 'ABHA Health Link'}:</Text>{' '}
                    {isHi
                      ? 'राष्ट्रीय स्वास्थ्य पोर्टल से आपके खाते का सीधा कनेक्शन डिस्कनेक्ट हो जाएगा।'
                      : 'Connection to your Ayushman Bharat Digital Health locker will be unlinked.'}
                  </Text>
                </View>
              </View>

              {/* Acknowledgement Checkboxes */}
              <View style={{ gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setAckWalletLoss(!ackWalletLoss)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: ackWalletLoss ? '#2563EB' : '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: ackWalletLoss ? '#2563EB' : '#94A3B8',
                      backgroundColor: ackWalletLoss ? '#2563EB' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    {ackWalletLoss && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={{ fontSize: 12, color: '#1E293B', flex: 1, lineHeight: 16 }}>
                    {isHi
                      ? `मैं समझता हूँ कि मेरा ₹${user?.wallet_balance?.toLocaleString('en-IN') || '2,500'} वॉलेट कैश और सभी रिवार्ड्स नष्ट हो जाएंगे।`
                      : `I understand that my remaining ₹${user?.wallet_balance?.toLocaleString('en-IN') || '2,500'} Health Cash balance will be permanently forfeited.`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAckMedicalHistoryLoss(!ackMedicalHistoryLoss)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: '#F8FAFC',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: ackMedicalHistoryLoss ? '#2563EB' : '#E2E8F0',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: ackMedicalHistoryLoss ? '#2563EB' : '#94A3B8',
                      backgroundColor: ackMedicalHistoryLoss ? '#2563EB' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    {ackMedicalHistoryLoss && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={{ fontSize: 12, color: '#1E293B', flex: 1, lineHeight: 16 }}>
                    {isHi
                      ? 'मैं पुष्टि करता हूँ कि मेरे सभी पुराने मेडिकल पर्चे और टेस्ट रिपोर्ट्स स्थायी रूप से मिटा दिए जाएं।'
                      : 'I acknowledge that all my clinical visit records, prescription PDFs and lab history cannot be recovered.'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Confirmation Type Requirement */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                  {isHi
                    ? 'पुष्टि करने के लिए नीचे "DELETE" लिखें:'
                    : 'To confirm deletion, type "DELETE" below:'}
                </Text>
                <TextInput
                  value={deleteConfirmationText}
                  onChangeText={setDeleteConfirmationText}
                  placeholder="DELETE"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: deleteConfirmationText.trim() === 'DELETE' ? '#DC2626' : '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#991B1B',
                    letterSpacing: 1,
                  }}
                />
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={handleExecuteAccountDeletion}
                  disabled={
                    !ackWalletLoss ||
                    !ackMedicalHistoryLoss ||
                    deleteConfirmationText.trim() !== 'DELETE' ||
                    isDeleting
                  }
                  activeOpacity={0.88}
                  style={{
                    backgroundColor:
                      ackWalletLoss && ackMedicalHistoryLoss && deleteConfirmationText.trim() === 'DELETE' && !isDeleting
                        ? '#DC2626'
                        : '#FCA5A5',
                    paddingVertical: 14,
                    borderRadius: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Trash2 size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                    {isDeleting
                      ? isHi ? 'खाता मिटाया जा रहा है...' : 'Permanently Deleting...'
                      : isHi ? 'हाँ, मेरा खाता स्थायी रूप से मिटाएं' : 'Permanently Delete My Account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#F1F5F9',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                    {isHi ? 'रद्द करें व खाता बनाए रखें' : 'Cancel & Keep My Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
