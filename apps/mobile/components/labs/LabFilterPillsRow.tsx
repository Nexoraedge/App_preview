// apps/mobile/components/labs/LabFilterPillsRow.tsx
// Horizontal filter chips row for Labs & Scans

import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { TabSegment } from '../../src/data/labsData';
import { C, R } from '../../src/theme';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: R.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: active ? C.brandSoft : '#FFFFFF',
        borderWidth: 1,
        borderColor: active ? C.brand : C.line,
      }}
    >
      {active && <Check size={13} color={C.brand} strokeWidth={3} />}
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? '700' : '500',
          color: active ? C.brand : C.sub,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface LabFilterPillsRowProps {
  segment: TabSegment;
  filters: { home: boolean; sameDay: boolean; noFast: boolean };
  onToggleFilter: (key: 'home' | 'sameDay' | 'noFast') => void;
  isHi: boolean;
}

export function LabFilterPillsRow({
  segment,
  filters,
  onToggleFilter,
  isHi,
}: LabFilterPillsRowProps) {
  if (segment === 'package') return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 8,
        paddingTop: 10,
      }}
    >
      {segment === 'lab' && (
        <FilterChip
          label={isHi ? 'घर पर सैंपल' : 'Home collection'}
          active={filters.home}
          onPress={() => onToggleFilter('home')}
        />
      )}
      <FilterChip
        label={isHi ? '12 घंटे में रिपोर्ट' : 'Report within 12 hrs'}
        active={filters.sameDay}
        onPress={() => onToggleFilter('sameDay')}
      />
      <FilterChip
        label={isHi ? 'खाली पेट जरूरी नहीं' : 'No fasting'}
        active={filters.noFast}
        onPress={() => onToggleFilter('noFast')}
      />
    </ScrollView>
  );
}
