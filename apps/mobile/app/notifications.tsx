// apps/mobile/app/notifications.tsx
// Comprehensive Notifications & Reminders Screen for Adityam Niramayaa.
// Supports day-of appointment alerts, 1-hour advance reminders, refund tracking,
// and Hindi/English localization.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Clock,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CheckCheck,
  Building2,
  User,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { fetchAllBookings } from '../src/services/bookingStorage';
import {
  getLiveNotifications,
  markNotificationsAsRead,
  type AppNotification,
} from '../src/services/notificationService';

type FilterType = 'ALL' | 'APPOINTMENTS' | 'REFUNDS';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const bookings = await fetchAllBookings(user?.phone, user?.id);
      const list = await getLiveNotifications(bookings || []);
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markNotificationsAsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) {
      await markNotificationsAsRead([item.id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    if (item.actionRoute) {
      router.push(item.actionRoute as any);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'APPOINTMENTS') {
      return notifications.filter(
        (n) =>
          n.type === 'ONE_HOUR_REMINDER' ||
          n.type === 'TODAY_APPOINTMENT' ||
          n.type === 'CONFIRMATION'
      );
    }
    if (filter === 'REFUNDS') {
      return notifications.filter((n) => n.type === 'REFUND');
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Top Header */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingTop: Math.max(insets.top, 14) + 6,
          paddingHorizontal: 16,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 680,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Back & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                  {isHi ? 'सूचनाएं व अलर्ट' : 'Notifications & Alerts'}
                </Text>
                {unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 7,
                      paddingVertical: 1,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                {isHi ? 'अपॉइंटमेंट रिमाइंडर व रिफंड स्थिति' : 'Appointment Reminders & Refund Updates'}
              </Text>
            </View>
          </View>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#BFDBFE',
              }}
            >
              <CheckCheck size={14} color="#2563EB" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                {isHi ? 'सभी पढ़े' : 'Read All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View
          style={{
            width: '100%',
            maxWidth: 680,
            alignSelf: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            { key: 'ALL' as const, label: isHi ? 'सभी' : 'All', count: notifications.length },
            {
              key: 'APPOINTMENTS' as const,
              label: isHi ? 'परामर्श व पास' : 'Appointments',
              count: notifications.filter(
                (n) =>
                  n.type === 'ONE_HOUR_REMINDER' ||
                  n.type === 'TODAY_APPOINTMENT' ||
                  n.type === 'CONFIRMATION'
              ).length,
            },
            {
              key: 'REFUNDS' as const,
              label: isHi ? 'रिफंड' : 'Refunds',
              count: notifications.filter((n) => n.type === 'REFUND').length,
            },
          ].map((tab) => {
            const isSel = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: isSel ? '#1E40AF' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isSel ? '#1E40AF' : '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isSel ? '#FFFFFF' : '#475569',
                  }}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={{
                      backgroundColor: isSel ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: isSel ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2563EB']} />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 40,
        }}
      >
        <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center', gap: 12 }}>
          {filteredNotifications.length === 0 ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 36,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Bell size={26} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                {isHi ? 'कोई नई सूचना नहीं' : 'No Notifications'}
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  color: '#64748B',
                  textAlign: 'center',
                  marginTop: 6,
                  maxWidth: 280,
                  lineHeight: 18,
                }}
              >
                {isHi
                  ? 'आपके डॉक्टर परामर्श रिमाइंडर और रिफंड अपडेट्स यहां दिखाई देंगे।'
                  : 'Your doctor appointment reminders and refund updates will appear here.'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notif) => {
              const isUrgent = notif.type === 'ONE_HOUR_REMINDER';
              const isToday = notif.type === 'TODAY_APPOINTMENT';
              const isRefund = notif.type === 'REFUND';

              return (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => handleNotificationPress(notif)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: isUrgent
                      ? '#FFFBEB'
                      : isToday
                        ? '#EFF6FF'
                        : isRefund
                          ? '#F0FDF4'
                          : '#FFFFFF',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1.5,
                    borderColor: isUrgent
                      ? '#FDE68A'
                      : isToday
                        ? '#BFDBFE'
                        : isRefund
                          ? '#BBF7D0'
                          : '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    {/* Icon Badge */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: isUrgent
                          ? '#FEF3C7'
                          : isToday
                            ? '#DBEAFE'
                            : isRefund
                              ? '#DCFCE7'
                              : '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isUrgent ? (
                        <Clock size={20} color="#D97706" />
                      ) : isToday ? (
                        <Calendar size={20} color="#1D4ED8" />
                      ) : isRefund ? (
                        <CreditCard size={20} color="#15803D" />
                      ) : (
                        <CheckCircle2 size={20} color="#2563EB" />
                      )}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: '800',
                            color: isUrgent
                              ? '#B45309'
                              : isToday
                                ? '#1E40AF'
                                : isRefund
                                  ? '#15803D'
                                  : '#0F172A',
                            flex: 1,
                          }}
                        >
                          {isHi ? notif.titleHi : notif.title}
                        </Text>
                        {!notif.isRead && (
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: '#EF4444',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          fontSize: 12,
                          color: isUrgent
                            ? '#78350F'
                            : isToday
                              ? '#1E3A8A'
                              : isRefund
                                ? '#166534'
                                : '#475569',
                          marginTop: 4,
                          lineHeight: 17,
                        }}
                      >
                        {isHi ? notif.bodyHi : notif.body}
                      </Text>

                      {/* Action Strip */}
                      {notif.actionRoute && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 10,
                            alignSelf: 'flex-start',
                            backgroundColor: isUrgent
                              ? '#B45309'
                              : isToday
                                ? '#1E40AF'
                                : isRefund
                                  ? '#15803D'
                                  : '#2563EB',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                            {isRefund
                              ? isHi
                                ? 'रिफंड विवरण देखें'
                                : 'View Refund Status'
                              : isHi
                                ? 'डिजिटल पास देखें'
                                : 'View Digital Pass'}
                          </Text>
                          <ChevronRight size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

