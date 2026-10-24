// apps/mobile/components/home/SpecialtySelector.tsx
// Horizontal specialty selector carousel with custom SVG medical icons

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AllCategoriesIcon,
  HeartPulseIcon,
  OpdStethoscopeIcon,
  BoneJointIcon,
  ChildCareIcon,
  DermatologyIcon,
  DentalToothIcon,
} from '../ServiceIcons';
import { homeCopy } from '../../src/i18n/homeCopy';
import { HOME_SPECIALTIES } from '../../src/data/homeData';

interface SpecialtySelectorProps {
  isHi: boolean;
}

export function SpecialtySelector({ isHi }: SpecialtySelectorProps) {
  const router = useRouter();
  const c = isHi ? homeCopy.hi : homeCopy.en;

  const renderIcon = (name: string, isSelected: boolean) => {
    const size = 18;
    const color = isSelected ? '#FFFFFF' : '#334155';
    switch (name) {
      case 'all':
        return <AllCategoriesIcon size={size} color="#FFFFFF" />;
      case 'heart':
        return <HeartPulseIcon size={size} color="#E87869" />;
      case 'stethoscope':
        return <OpdStethoscopeIcon size={size} color="#2563EB" />;
      case 'bone':
        return <BoneJointIcon size={size} color="#4F6BED" />;
      case 'child':
        return <ChildCareIcon size={size} color="#CF8A40" />;
      case 'derma':
        return <DermatologyIcon size={size} color="#2563EB" />;
      case 'tooth':
        return <DentalToothIcon size={size} color="#059669" />;
      default:
        return <OpdStethoscopeIcon size={size} color={color} />;
    }
  };

  return (
    <View style={{ marginTop: 18 }}>
      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
            {c.specialtiesTitle}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 }}>
            {c.specialtiesSub}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/opd')}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
            {c.viewAll}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {HOME_SPECIALTIES.map((spec) => {
          const isAll = spec.id === 'all';
          const label = isHi ? spec.labelHi : spec.labelEn;

          if (isAll) {
            return (
              <TouchableOpacity
                key={spec.id}
                onPress={() => router.push('/opd')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 54,
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {renderIcon('all', true)}
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                    {label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={spec.id}
              onPress={() =>
                router.push({
                  pathname: '/opd',
                  params: spec.specialtyQuery ? { specialty: spec.specialtyQuery } : undefined,
                })
              }
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              {renderIcon(spec.iconName, false)}
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
