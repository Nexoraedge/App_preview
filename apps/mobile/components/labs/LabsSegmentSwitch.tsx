// apps/mobile/components/labs/LabsSegmentSwitch.tsx
// Top horizontal segmented switch for Labs (All | Lab tests | Scans | Packages)

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TabSegment, getSegments } from '../../src/data/labsData';
import { C, R, SHADOW } from '../../src/theme';

interface LabsSegmentSwitchProps {
  value: TabSegment;
  onChange: (segment: TabSegment) => void;
  counts: Record<TabSegment, number>;
  isHi: boolean;
}

export function LabsSegmentSwitch({
  value,
  onChange,
  counts,
  isHi,
}: LabsSegmentSwitchProps) {
  const segments = getSegments(isHi);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#E9EEF6',
        borderRadius: R.pill,
        padding: 3,
      }}
    >
      {segments.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: R.pill,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
              backgroundColor: active ? '#FFFFFF' : 'transparent',
              ...(active ? SHADOW : {}),
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12.5,
                fontWeight: active ? '700' : '600',
                color: active ? C.brand : C.sub,
              }}
            >
              {s.label}
            </Text>
            {counts[s.id] > 0 && (
              <View
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: C.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}
                >
                  {counts[s.id]}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
