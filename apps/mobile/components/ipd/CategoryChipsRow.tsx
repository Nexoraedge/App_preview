// apps/mobile/components/ipd/CategoryChipsRow.tsx
// Horizontal surgery category chips row

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import {
  Scissors,
  Bone,
  Baby,
  Eye,
  Activity,
  LayoutGrid,
} from 'lucide-react-native';
import {
  CATEGORY_CHIPS,
  CategoryFilter,
  CATEGORY_ACCENT,
} from '../../src/data/ipdData';
import { HeartPulseIcon } from '../ServiceIcons';

interface CategoryChipsRowProps {
  isHi: boolean;
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
}

export function CategoryChipsRow({
  isHi,
  selectedCategory,
  onSelectCategory,
}: CategoryChipsRowProps) {
  const renderCategoryIcon = (id: CategoryFilter, isSelected: boolean) => {
    const color = isSelected ? '#FFFFFF' : CATEGORY_ACCENT[id] || '#2563EB';
    const size = 14;

    switch (id) {
      case 'ALL':
        return <LayoutGrid size={size} color={color} strokeWidth={2.2} />;
      case 'GeneralSurgery':
        return <Scissors size={size} color={color} strokeWidth={2.2} />;
      case 'Orthopedics':
        return <Bone size={size} color={color} strokeWidth={2.2} />;
      case 'Cardiology':
        return <HeartPulseIcon size={size} color={color} />;
      case 'Maternity':
        return <Baby size={size} color={color} strokeWidth={2.2} />;
      case 'Urology':
        return <Activity size={size} color={color} strokeWidth={2.2} />;
      case 'Ophthalmology':
        return <Eye size={size} color={color} strokeWidth={2.2} />;
      default:
        return <Scissors size={size} color={color} strokeWidth={2.2} />;
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORY_CHIPS.map((chip) => {
          const isSelected = selectedCategory === chip.id;
          const label = isHi ? chip.labelHi : chip.label;

          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => onSelectCategory(chip.id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                borderWidth: 1,
                borderColor: isSelected ? '#1D4ED8' : '#E2E8F0',
                shadowColor: isSelected ? '#2563EB' : '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isSelected ? 0.25 : 0.04,
                shadowRadius: 3,
                elevation: isSelected ? 3 : 1,
              }}
            >
              {renderCategoryIcon(chip.id, isSelected)}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? '800' : '600',
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
