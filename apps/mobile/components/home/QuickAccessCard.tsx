// apps/mobile/components/home/QuickAccessCard.tsx
// Quick Access Card for Upcoming Appointments

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { homeCopy } from '../../src/i18n/homeCopy';

interface QuickAccessCardProps {
  isHi: boolean;
}

export function QuickAccessCard({ isHi }: QuickAccessCardProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
          {c.quickAccessTitle}
        </Text>
        <TouchableOpacity onPress={() => router.push('/appointments')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
            {c.viewAll}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Access Card */}
      <TouchableOpacity
        onPress={() => router.push('/appointments')}
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
              backgroundColor: '#EFF6FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={20} color="#2563EB" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#182F3B' }}>
              {c.upcomingAppointment}
            </Text>
            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
              {c.appointmentDoctor}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#182F3B' }}>
              {c.appointmentDate}
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
              {c.appointmentTime}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
