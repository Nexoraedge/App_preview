// apps/mobile/components/labs/PopularPackagesCarousel.tsx
// Horizontal carousel for popular health check packages

import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Item } from '../../src/data/labsSample';
import { C } from '../../src/theme';
import { PackageCard } from './PackageCard';

interface PopularPackagesCarouselProps {
  packages: Item[];
  onSeeAll: () => void;
  isHi: boolean;
}

export function PopularPackagesCarousel({
  packages,
  onSeeAll,
  isHi,
}: PopularPackagesCarouselProps) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
          {isHi ? 'लोकप्रिय स्वास्थ्य पैकेज' : 'Popular packages'}
        </Text>
        <Pressable onPress={onSeeAll} hitSlop={10}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.brand }}>
            {isHi ? 'सभी देखें' : 'See all'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={282}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}
        style={{ marginHorizontal: -16, paddingLeft: 16 }}
      >
        {packages.map((pkg, index) => (
          <PackageCard
            key={pkg.id}
            item={pkg}
            index={index}
            isHi={isHi}
            onPress={onSeeAll}
          />
        ))}
      </ScrollView>
    </View>
  );
}
