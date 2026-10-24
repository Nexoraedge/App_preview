// apps/mobile/components/ipd/SurgeryPackageCard.tsx
// Surgery package card with list and grid presentation modes

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Scissors,
  Bone,
  Baby,
  Eye,
  Activity,
  PhoneCall,
  ChevronRight,
} from 'lucide-react-native';
import {
  PlannedSurgery,
  CATEGORY_ICON_BG,
  CATEGORY_ACCENT,
  inr,
} from '../../src/data/ipdData';
import { PressableCard } from '../PressableCard';
import { HeartPulseIcon } from '../ServiceIcons';

interface SurgeryPackageCardProps {
  surgery: PlannedSurgery;
  isHi: boolean;
  viewMode: 'list' | 'grid';
  index: number;
  onPress: (surgery: PlannedSurgery) => void;
}

export function SurgeryPackageCard({
  surgery: s,
  isHi,
  viewMode,
  index,
  onPress,
}: SurgeryPackageCardProps) {
  const displayName = isHi && s.nameHi ? s.nameHi : s.name;
  const displayShort = isHi && s.shortNameHi ? s.shortNameHi : s.shortName;
  const displayStay = isHi && s.stayDaysHi ? s.stayDaysHi : s.stayDays;
  const displayTag = isHi && s.tagHi ? s.tagHi : s.tag;
  const displayRecovery =
    isHi && s.recoveryTimelineHi ? s.recoveryTimelineHi : s.recoveryTimeline;

  const renderIcon = () => {
    const color = CATEGORY_ACCENT[s.category] || '#2563EB';
    const size = viewMode === 'list' ? 20 : 17;

    switch (s.category) {
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

  if (viewMode === 'grid') {
    return (
      <PressableCard
        index={index}
        style={{ width: '48.5%' }}
        onPress={() => onPress(s)}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 13,
            minHeight: 195,
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          {/* Top: Icon + Stay Tag */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: CATEGORY_ICON_BG[s.category] || '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {renderIcon()}
            </View>

            <View
              style={{
                backgroundColor: '#F1F5F9',
                paddingHorizontal: 7,
                paddingVertical: 2.5,
                borderRadius: 6,
              }}
            >
              <Text
                style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}
              >
                {displayStay}
              </Text>
            </View>
          </View>

          {/* Middle: Titles */}
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: '700',
                color: '#0F172A',
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {displayShort}
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                color: '#64748B',
                marginTop: 2,
                lineHeight: 13.5,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>

          {/* Tag & Price */}
          <View style={{ marginTop: 8 }}>
            <View
              style={{
                backgroundColor: CATEGORY_ICON_BG[s.category] || '#F1F5F9',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                alignSelf: 'flex-start',
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 9.5,
                  fontWeight: '700',
                  color: CATEGORY_ACCENT[s.category] || '#2563EB',
                }}
                numberOfLines={1}
              >
                {displayTag}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: '#F8FAFC',
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}
              >
                {inr(s.price)}*
              </Text>
              <TouchableOpacity
                onPress={() => onPress(s)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={14} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </PressableCard>
    );
  }

  // List View Mode
  return (
    <PressableCard
      index={index}
      style={{ width: '100%' }}
      onPress={() => onPress(s)}
    >
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Top: Icon + Title + Stay Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: CATEGORY_ICON_BG[s.category] || '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderIcon()}
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 15.5,
                  fontWeight: '700',
                  color: '#0F172A',
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                {displayShort}
              </Text>

              <View
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 7,
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '600',
                    color: '#475569',
                  }}
                >
                  {displayStay}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#64748B',
                marginTop: 2,
                lineHeight: 17,
              }}
            >
              {displayName}
            </Text>
          </View>
        </View>

        {/* Middle: Feature Badge + Clinical Recovery Highlight */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          <View
            style={{
              backgroundColor: CATEGORY_ICON_BG[s.category] || '#F1F5F9',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: CATEGORY_ACCENT[s.category] || '#2563EB',
                textTransform: 'uppercase',
                letterSpacing: 0.2,
              }}
            >
              {displayTag}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
            • {displayRecovery}
          </Text>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: '#F1F5F9',
            marginVertical: 12,
          }}
        />

        {/* Bottom: Price on Left & Call Back Button on Right */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '700',
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {isHi ? 'शुरुआती पैकेज' : 'Starting from'}
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: '#0F172A',
                marginTop: 1,
              }}
            >
              {inr(s.price)}*
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onPress(s)}
            activeOpacity={0.88}
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PhoneCall size={13} color="#2563EB" />
            <Text
              style={{ fontSize: 12.5, fontWeight: '700', color: '#2563EB' }}
            >
              {isHi ? 'कॉल बैक पाएं' : 'Get a call back'}
            </Text>
            <ChevronRight size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>
    </PressableCard>
  );
}
