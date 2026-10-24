// apps/mobile/components/opd/SortChipsRow.tsx
// Horizontal sort chips row for OPD screen

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SORT_OPTIONS, SortOption } from '../../src/data/opdData';
import { opdCopy } from '../../src/i18n/opdCopy';

interface SortChipsRowProps {
  isHi: boolean;
  sortBy: SortOption;
  onSelectSort: (opt: SortOption) => void;
}

export function SortChipsRow({ isHi, sortBy, onSelectSort }: SortChipsRowProps) {
  const c = isHi ? opdCopy.hi : opdCopy.en;

  return (
    <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B', marginRight: 2 }}>
          {c.sortByLabel}
        </Text>
        {SORT_OPTIONS.map((opt) => {
          const isSelected = sortBy === opt.id;
          const label = isHi ? opt.labelHi : opt.labelEn;

          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onSelectSort(opt.id)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5.5,
                borderRadius: 999,
                backgroundColor: isSelected ? '#1E40AF' : '#F1F5F9',
                borderWidth: 1,
                borderColor: isSelected ? '#1E40AF' : '#E2E8F0',
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: isSelected ? '800' : '600',
                  color: isSelected ? '#FFFFFF' : '#475569',
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
