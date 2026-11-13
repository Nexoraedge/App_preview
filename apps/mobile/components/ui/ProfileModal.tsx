import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Languages,
  Calendar,
  ShieldCheck,
  Wallet,
  Settings,
  LogOut,
  ChevronRight,
  Users,
  User,
  Bell,
} from 'lucide-react-native';
import { useLanguage, type Language } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { getLocalBookings, subscribeBookings, isBookingUpcoming } from '../../src/services/bookingStorage';

function formatDisplayPhone(phone?: string | null, email?: string | null, isHi: boolean = false): string {
  if (phone && phone !== '+91 99999 99999' && !phone.startsWith('+9100') && !phone.startsWith('+910')) {
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

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [activeLang, setActiveLang] = useState<Language>(language);
  const [activeBookingsCount, setActiveBookingsCount] = useState<number>(0);

  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const bookings = await getLocalBookings();
        const active = bookings.filter((b) => isBookingUpcoming(b)).length;
        setActiveBookingsCount(active);
      } catch {
        setActiveBookingsCount(0);
      }
    };
    loadCount();
    const unsub = subscribeBookings((bookings) => {
      const active = bookings.filter((b) => isBookingUpcoming(b)).length;
      setActiveBookingsCount(active);
    });
    return () => unsub();
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    if (activeLang === newLang) return;
    setActiveLang(newLang);
    setLanguage(newLang);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(11, 18, 32, 0.45)',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          paddingTop: 56,
          paddingRight: 16,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: 290,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 16,
            shadowColor: '#0B1B3F',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          {/* User Profile Header or Guest Sign In */}
          {user ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/profile');
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
                gap: 12,
              }}
            >
              {user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#DBEAFE',
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563EB' }}>
                    {user.full_name ? user.full_name.charAt(0) : 'A'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  {formatDisplayPhone(user.phone, user.email)}
                </Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View style={{ paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {language === 'hi' ? 'नमस्ते, अतिथि!' : 'Welcome, Guest!'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, marginBottom: 10 }}>
                {language === 'hi' ? 'अपॉइंटमेंट व रिकॉर्ड्स देखने के लिए लॉगिन करें' : 'Sign in to access appointments & records'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push('/login');
                }}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 9,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {language === 'hi' ? 'लॉगिन / साइन इन करें' : 'Sign In / Register'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* App Language Switcher inside Profile Menu */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Languages size={15} color="#2563EB" strokeWidth={2.2} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                {language === 'hi' ? 'भाषा (Language)' : 'App Language'}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F8FAFC',
                padding: 2,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <TouchableOpacity
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 7,
                  backgroundColor: activeLang === 'en' ? '#2563EB' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: activeLang === 'en' ? '#FFFFFF' : '#64748B',
                  }}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleLanguageChange('hi')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 7,
                  backgroundColor: activeLang === 'hi' ? '#2563EB' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: activeLang === 'hi' ? '#FFFFFF' : '#64748B',
                  }}
                >
                  हिंदी
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigation Links */}
          <View style={{ paddingTop: 4 }}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/appointments');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Calendar size={15} color="#2563EB" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'मेरी अपॉइंटमेंट्स' : 'My Appointments'}
                </Text>
              </View>
              {activeBookingsCount > 0 ? (
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563EB' }}>
                    {language === 'hi' ? `${activeBookingsCount} सक्रिय` : `${activeBookingsCount} Active`}
                  </Text>
                </View>
              ) : (
                <ChevronRight size={14} color="#94A3B8" />
              )}
            </TouchableOpacity>

            {/* Notifications & Reminders */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/notifications');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Bell size={15} color="#2563EB" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'सूचनाएं व अलर्ट' : 'Notifications & Alerts'}
                </Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/family');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Users size={15} color="#2563EB" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'परिवार के सदस्य (Family)' : 'Family Members'}
                </Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </TouchableOpacity>


            {/* Settings & Privacy */}
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/settings');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F8FAFC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Settings size={15} color="#2563EB" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'सेटिंग्स और गोपनीयता' : 'Settings & Privacy'}
                </Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </TouchableOpacity>

            {user && (
              <TouchableOpacity
                onPress={async () => {
                  onClose();
                  await logout();
                  router.replace('/login');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  marginTop: 2,
                }}
              >
                <LogOut size={15} color="#DC2626" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#DC2626' }}>
                  {language === 'hi' ? 'लॉगआउट' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
