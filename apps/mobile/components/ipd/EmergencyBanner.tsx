// apps/mobile/components/ipd/EmergencyBanner.tsx
// Emergency critical care banner (112 dialer)

import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { PhoneCall } from 'lucide-react-native';

interface EmergencyBannerProps {
  isHi: boolean;
}

export function EmergencyBanner({ isHi }: EmergencyBannerProps) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 18,
        marginBottom: 10,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          marginRight: 10,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PhoneCall size={18} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 13.5, fontWeight: '700', color: '#991B1B' }}
          >
            {isHi ? 'क्या यह आपातकालीन स्थिति है?' : 'In an emergency?'}
          </Text>
          <Text
            style={{
              fontSize: 11.5,
              color: '#B91C1C',
              marginTop: 2,
              lineHeight: 16,
            }}
          >
            {isHi
              ? 'तत्काल एम्बुलेंस व क्रिटिकल केयर हेतु 112 पर कॉल करें'
              : 'Call 112 for immediate ambulance & critical care'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL('tel:112')}
        activeOpacity={0.85}
        style={{
          backgroundColor: '#DC2626',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
          {isHi ? 'कॉल 112' : 'Call 112'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
