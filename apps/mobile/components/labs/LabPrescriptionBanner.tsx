// apps/mobile/components/labs/LabPrescriptionBanner.tsx
// Doctor prescription upload callout banner for labs

import React from 'react';
import { View, Text } from 'react-native';
import { FileText } from 'lucide-react-native';
import { C, R } from '../../src/theme';
import { PressableCard } from '../ui/PressableCard';

interface LabPrescriptionBannerProps {
  onPressUpload: () => void;
  isHi: boolean;
}

export function LabPrescriptionBanner({
  onPressUpload,
  isHi,
}: LabPrescriptionBannerProps) {
  return (
    <PressableCard
      index={2}
      onPress={onPressUpload}
      label={isHi ? 'पर्चा अपलोड करें' : 'Upload prescription'}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: C.brandSoft,
          borderRadius: R.lg,
          padding: 14,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileText size={22} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}>
            {isHi ? 'डॉक्टर का पर्चा है?' : 'Have a prescription?'}
          </Text>
          <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 1 }}>
            {isHi
              ? 'पर्चा अपलोड करें, हमारी मेडिकल टीम टेस्ट चुनकर तुरंत सबसे सही केंद्र बुक करेगी।'
              : 'Upload it and our team books the right tests'}
          </Text>
        </View>
        <View
          style={{
            height: 38,
            paddingHorizontal: 16,
            borderRadius: 19,
            backgroundColor: C.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700' }}>
            {isHi ? 'अपलोड करें' : 'Upload'}
          </Text>
        </View>
      </View>
    </PressableCard>
  );
}
