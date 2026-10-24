// apps/mobile/components/labs/PackageCard.tsx
// Health check package card with gradient styling and add/inspect triggers

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Check, ChevronRight } from 'lucide-react-native';
import { Item, getItemName, fromPrice } from '../../src/data/labsSample';
import { fastText, reportText } from '../../src/data/labsData';
import { C, R, inr } from '../../src/theme';
import { PressableCard } from '../ui/PressableCard';

interface PackageCardProps {
  item: Item;
  wide?: boolean;
  added?: boolean;
  onPress: () => void;
  onToggle?: () => void;
  index: number;
  isHi: boolean;
}

export function PackageCard({
  item,
  wide,
  added,
  onPress,
  onToggle,
  index,
  isHi,
}: PackageCardProps) {
  const packageName = getItemName(item, isHi);

  return (
    <PressableCard
      index={index}
      onPress={onPress}
      style={wide ? undefined : { width: 270, height: 215 }}
      pressableStyle={wide ? undefined : { height: '100%' }}
      label={packageName}
    >
      <LinearGradient
        colors={item.gradient ?? ['#172554', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: R.xl,
          padding: 18,
          height: wide ? undefined : '100%',
          minHeight: wide ? 175 : 215,
          justifyContent: 'space-between',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />
        <View>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: R.pill,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 11.5,
                fontWeight: '600',
              }}
            >
              {isHi
                ? `${item.testsCount} टेस्ट शामिल`
                : `${item.testsCount} tests included`}
            </Text>
          </View>
          <View
            style={{
              minHeight: 48,
              justifyContent: 'flex-start',
              marginTop: 10,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 18.5,
                fontWeight: '700',
                lineHeight: 24,
              }}
              numberOfLines={2}
            >
              {packageName}
            </Text>
          </View>
          <Text
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 12.5,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {fastText(item, isHi)} · {reportText(item, isHi)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 11.5,
              }}
            >
              {isHi ? 'न्यूनतम शुल्क' : 'Starting from'}
            </Text>
            <Text
              style={{
                color: '#fff',
                fontSize: 22,
                fontWeight: '800',
              }}
            >
              {inr(fromPrice(item))}
            </Text>
          </View>

          {onToggle ? (
            <Pressable
              onPress={onToggle}
              hitSlop={6}
              style={{
                height: 44,
                paddingHorizontal: 18,
                borderRadius: 22,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
            >
              {added ? (
                <Check size={16} color={C.good} strokeWidth={3} />
              ) : (
                <Plus size={16} color={C.brand} strokeWidth={3} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: added ? C.good : C.brand,
                }}
              >
                {added
                  ? isHi
                    ? 'जुड़ गया'
                    : 'Added'
                  : isHi
                  ? 'जोड़ें'
                  : 'Add'}
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={20} color="#fff" />
            </View>
          )}
        </View>
      </LinearGradient>
    </PressableCard>
  );
}
