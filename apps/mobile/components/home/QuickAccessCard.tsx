// apps/mobile/components/home/QuickAccessCard.tsx
// Reactive Quick Access Card for Real Upcoming Appointments

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Stethoscope } from 'lucide-react-native';
import { homeCopy } from '../../src/i18n/homeCopy';
import { getLocalBookings, subscribeBookings, isBookingUpcoming, parseSlotDetails } from '../../src/services/bookingStorage';
import type { Booking } from '@adityam/types';

interface QuickAccessCardProps {
  isHi: boolean;
}

export function QuickAccessCard({ isHi }: QuickAccessCardProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const updateActive = (bookings: Booking[]) => {
      const active = bookings.find((b) => isBookingUpcoming(b));
      setActiveBooking(active || null);
    };

    getLocalBookings().then(updateActive);
    const unsub = subscribeBookings(updateActive);
    return () => unsub();
  }, []);

  const hasActive = Boolean(activeBooking);

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
          {c.quickAccessTitle}
        </Text>
        <TouchableOpacity onPress={() => router.push(hasActive ? '/appointments' : '/opd')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
            {hasActive ? c.viewAll : (isHi ? 'डॉक्टर खोजें ›' : 'Find Doctor ›')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Access Card */}
      <TouchableOpacity
        onPress={() => router.push(hasActive ? '/appointments' : '/opd')}
        activeOpacity={0.9}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 14,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#1E293B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: hasActive ? '#EFF6FF' : '#F0FDF4',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasActive ? (
              <Calendar size={20} color="#2563EB" strokeWidth={2.2} />
            ) : (
              <Stethoscope size={20} color="#16A34A" strokeWidth={2.2} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#182F3B' }} numberOfLines={1}>
              {hasActive
                ? (isHi ? 'आगामी अपॉइंटमेंट' : 'Upcoming Appointment')
                : (isHi ? 'परामर्श बुक करें' : 'Book Consultation')}
            </Text>
            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
              {hasActive
                ? `${activeBooking?.doctor_name || 'Specialist'} • ${activeBooking?.hospital_name || 'Hospital'}`
                : (isHi ? 'सत्यापित सुपर-स्पेशलिस्ट और शीर्ष अस्पताल' : 'Verified super-specialists & top hospitals')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {hasActive ? (() => {
            const slot = parseSlotDetails(activeBooking?.slot_time, activeBooking?.service_type, isHi);
            const isToday =
              slot.slotDate.toLowerCase().includes('today') ||
              slot.slotDateHi.includes('आज');

            // Check if slot is within 60 minutes
            let isUrgentOneHour = false;
            const match = slot.slotTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (isToday && match) {
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              if (match[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
              if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const slotMinutes = hours * 60 + minutes;
              if (slotMinutes >= currentMinutes && slotMinutes - currentMinutes <= 60) {
                isUrgentOneHour = true;
              }
            }

            return (
              <View style={{ alignItems: 'flex-end' }}>
                {isUrgentOneHour ? (
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B45309' }}>
                      {isHi ? '⏰ 1 घंटे में' : '⏰ in 1 Hour'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isToday ? '#1E40AF' : '#182F3B' }}>
                    {isHi ? slot.slotDateHi : slot.slotDate}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: isUrgentOneHour ? '#B45309' : '#2563EB', fontWeight: '700', marginTop: 1 }}>
                  {slot.slotTime}
                </Text>
              </View>
            );
          })() : (
            <View
              style={{
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>
                {isHi ? 'स्लॉट बुक करें' : 'Book Now'}
              </Text>
            </View>
          )}
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
