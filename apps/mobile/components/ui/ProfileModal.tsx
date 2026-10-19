import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Crown,
  Languages,
  Calendar,
  ShieldCheck,
  Wallet,
  Settings,
  LogOut,
  ChevronRight,
  Users,
} from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();

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
          {/* User Profile Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              gap: 12,
            }}
          >
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
                {user?.full_name ? user.full_name.charAt(0) : 'H'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                  {user?.full_name || 'Hardik Sharma'}
                </Text>
                <View
                  style={{
                    backgroundColor: '#FFF9F0',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#FFE7C2',
                  }}
                >
                  <Crown size={10} color="#CF8A40" strokeWidth={2.5} />
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                {user?.phone || '+91 98765 43210'}
              </Text>
            </View>
          </View>

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
                onPress={() => {
                  if (language !== 'en') toggleLanguage();
                }}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 7,
                  backgroundColor: language === 'en' ? '#2563EB' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: language === 'en' ? '#FFFFFF' : '#64748B',
                  }}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (language !== 'hi') toggleLanguage();
                }}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 7,
                  backgroundColor: language === 'hi' ? '#2563EB' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: language === 'hi' ? '#FFFFFF' : '#64748B',
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
                router.push('/opd');
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
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563EB' }}>1 Active</Text>
              </View>
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

            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/profile');
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
                <Wallet size={15} color="#2563EB" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'हेल्थ वॉलेट' : 'Health Wallet'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>₹2,500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push('/profile');
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
                <Settings size={15} color="#64748B" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B' }}>
                  {language === 'hi' ? 'सेटिंग्स व प्रोफाइल' : 'Settings & Profile'}
                </Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                logout();
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
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
