// apps/mobile/components/home/TrustGridSection.tsx
// 2x2 Institutional Trust Grid (150+ Hospitals, 100% NABL, Verified Care, Genuine Meds)

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { TRUST_PILLARS } from '../../src/data/homeData';
import { homeCopy } from '../../src/i18n/homeCopy';

interface TrustGridSectionProps {
  isHi: boolean;
}

export function TrustGridSection({ isHi }: TrustGridSectionProps) {
  const { width } = Dimensions.get('window');
  const cardWidth = Math.floor((width - 32 - 10) / 2);
  const c = isHi ? homeCopy.hi : homeCopy.en;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <ShieldCheck size={15} color="#2563EB" strokeWidth={2.4} />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', letterSpacing: -0.2 }}>
          {c.trustSectionTitle}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 10,
        }}
      >
        {TRUST_PILLARS.map((pillar) => {
          const IconComp = pillar.Icon;
          return (
            <View
              key={pillar.id}
              style={{
                width: cardWidth,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: pillar.iconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: pillar.borderColor,
                }}
              >
                <IconComp size={18} color={pillar.iconColor} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: '#0F172A',
                    letterSpacing: -0.2,
                  }}
                >
                  {isHi ? pillar.titleHi : pillar.titleEn}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10.5,
                    fontWeight: '600',
                    color: '#64748B',
                    marginTop: 1,
                  }}
                >
                  {isHi ? pillar.subHi : pillar.subEn}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
