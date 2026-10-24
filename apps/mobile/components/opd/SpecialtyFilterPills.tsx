// apps/mobile/components/opd/SpecialtyFilterPills.tsx
// Horizontal specialty filter pills for OPD screen

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import {
  OpdStethoscopeIcon,
  HeartPulseIcon,
  BoneJointIcon,
  ChildCareIcon,
  DentalToothIcon,
  DermatologyIcon,
  AudiologistIcon,
  NeurologyBrainIcon,
  AllCategoriesIcon,
} from '../ServiceIcons';
import { OPD_SPECIALTIES } from '../../src/data/opdData';

interface SpecialtyFilterPillsProps {
  isHi: boolean;
  selectedSpecialty: string;
  onSelectSpecialty: (spec: string) => void;
}

export function SpecialtyFilterPills({
  isHi,
  selectedSpecialty,
  onSelectSpecialty,
}: SpecialtyFilterPillsProps) {
  const renderIcon = (name: string, isSelected: boolean, accentColor: string) => {
    const size = 22;
    const color = isSelected ? '#FFFFFF' : accentColor;
    switch (name) {
      case 'all':
        return <AllCategoriesIcon size={size} color={color} />;
      case 'heart':
        return <HeartPulseIcon size={size} color={color} />;
      case 'audio':
        return <AudiologistIcon size={size} color={color} />;
      case 'stethoscope':
        return <OpdStethoscopeIcon size={size} color={color} />;
      case 'tooth':
        return <DentalToothIcon size={size} color={color} />;
      case 'bone':
        return <BoneJointIcon size={size} color={color} />;
      case 'child':
        return <ChildCareIcon size={size} color={color} />;
      case 'brain':
        return <NeurologyBrainIcon size={size} color={color} />;
      case 'derma':
        return <DermatologyIcon size={size} color={color} />;
      default:
        return <OpdStethoscopeIcon size={size} color={color} />;
    }
  };

  return (
    <View style={{ marginTop: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, alignItems: 'center' }}
      >
        {OPD_SPECIALTIES.map((spec) => {
          const isSelected = selectedSpecialty === spec.id;
          const label = isHi ? spec.labelHi : spec.labelEn;

          return (
            <TouchableOpacity
              key={spec.id}
              onPress={() => onSelectSpecialty(spec.id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 16,
                backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                borderWidth: 1.2,
                borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                shadowColor: isSelected ? '#2563EB' : '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.25 : 0.04,
                shadowRadius: 5,
                elevation: isSelected ? 3 : 1,
              }}
            >
              {renderIcon(spec.iconName, isSelected, spec.accentColor)}
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: isSelected ? '800' : '700',
                  color: isSelected ? '#FFFFFF' : '#334155',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
