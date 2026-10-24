// apps/mobile/components/opd/FloatingBookingBar.tsx
// Solid floating action bar when slot is selected above bottom tab bar

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import type { Doctor } from '@adityam/types';
import {
  translateDoctorName,
  translateHospitalName,
} from '../../src/utils/hindiDictionary';

export interface SelectedSlotDoctorInfo {
  doctor: Doctor;
  slot: string;
  hospitalId: string;
  hospitalName: string;
  branchId?: string;
  branchName?: string;
}

interface FloatingBookingBarProps {
  selectedSlotDoctor: SelectedSlotDoctorInfo | null;
  language: 'en' | 'hi';
  bottomInset: number;
  onClear: () => void;
  onBook: (doctor: Doctor, slot: string, hospitalName: string) => void;
}

export function FloatingBookingBar({
  selectedSlotDoctor,
  language,
  bottomInset,
  onClear,
  onBook,
}: FloatingBookingBarProps) {
  if (!selectedSlotDoctor) return null;

  const isHi = language === 'hi';

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(bottomInset, 12) + 62,
        left: 14,
        right: 14,
        backgroundColor: '#FFFFFF', // 100% Solid background, no see-through text
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 12,
        zIndex: 40,
      }}
    >
      <View style={{ flex: 1, marginRight: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
            {selectedSlotDoctor.slot}
          </Text>
          <Text style={{ fontSize: 12, color: '#94A3B8' }}>•</Text>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#16A34A' }}>
            ₹{selectedSlotDoctor.doctor.discounted_fee}
          </Text>
        </View>
        <Text
          style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}
          numberOfLines={1}
        >
          {translateDoctorName(selectedSlotDoctor.doctor.name, isHi)} ·{' '}
          {translateHospitalName(selectedSlotDoctor.hospitalName, isHi)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            onBook(
              selectedSlotDoctor.doctor,
              selectedSlotDoctor.slot,
              selectedSlotDoctor.hospitalName
            )
          }
          activeOpacity={0.88}
          style={{
            backgroundColor: '#2563EB',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
            {isHi ? 'बुक करें' : 'Book'}
          </Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
