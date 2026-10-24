// apps/mobile/components/labs/LabCartStickyBar.tsx
// Floating bottom bar showing current lab cart state and centre picker trigger

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { C, R } from '../../src/theme';

interface LabCartStickyBarProps {
  cartCount: number;
  subtitle: string;
  onPressChooseCentre: () => void;
  isHi: boolean;
  bottomInset: number;
}

export function LabCartStickyBar({
  cartCount,
  subtitle,
  onPressChooseCentre,
  isHi,
  bottomInset,
}: LabCartStickyBarProps) {
  if (cartCount === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(bottomInset, Platform.OS === 'ios' ? 12 : 10) + 64 + 12,
        alignItems: 'center',
        paddingHorizontal: 16,
        zIndex: 40,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPressChooseCentre}
        style={{
          width: '100%',
          maxWidth: 560,
          height: 64,
          borderRadius: R.xl,
          backgroundColor: C.brandDark,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#0B1B3F',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <View>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {isHi
              ? `${cartCount} ${cartCount > 1 ? 'जांचें' : 'जांच'} चुनी गईं`
              : `${cartCount} ${cartCount > 1 ? 'tests & scans' : 'test'} selected`}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 12.5,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            height: 42,
            borderRadius: 21,
          }}
        >
          <Text
            style={{
              color: C.brandDark,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            {isHi ? 'केंद्र चुनें' : 'Choose centre'}
          </Text>
          <ChevronRight size={16} color={C.brandDark} strokeWidth={3} />
        </View>
      </Pressable>
    </View>
  );
}
