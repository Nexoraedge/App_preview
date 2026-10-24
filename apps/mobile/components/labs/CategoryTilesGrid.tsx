// apps/mobile/components/labs/CategoryTilesGrid.tsx
// Interactive category grid for Lab & Diagnostic specialties

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { Category, getCategoryLabel } from '../../src/data/labsSample';
import { LAB_ICONS } from '../../src/data/labsData';
import { C } from '../../src/theme';
import { PressableCard } from '../ui/PressableCard';

interface CategoryTilesGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isHi: boolean;
}

export function CategoryTilesGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  isHi,
}: CategoryTilesGridProps) {
  if (selectedCategory) {
    const currentCat = categories.find((c) => c.id === selectedCategory);
    const currentLabel = currentCat ? getCategoryLabel(currentCat, isHi) : '';

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
          {currentLabel}
        </Text>
        <Pressable
          onPress={() => onSelectCategory(null)}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.brand }}>
            {isHi ? 'सभी देखें' : 'Show all'}
          </Text>
          <X size={14} color={C.brand} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8 }}>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '700',
          color: C.ink,
          marginBottom: 12,
        }}
      >
        {isHi ? 'श्रेणी अनुसार खोजें' : 'Browse by category'}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -4,
        }}
      >
        {categories.map((cat, index) => {
          const Icon = LAB_ICONS[cat.icon];
          const label = getCategoryLabel(cat, isHi);
          const active = selectedCategory === cat.id;

          return (
            <PressableCard
              key={cat.id}
              index={index}
              onPress={() => onSelectCategory(active ? null : cat.id)}
              style={{ width: '25%', paddingHorizontal: 4, marginBottom: 12 }}
              label={label}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: cat.tint,
                    borderWidth: active ? 2 : 0,
                    borderColor: cat.color,
                  }}
                >
                  {Icon && <Icon size={26} color={cat.color} strokeWidth={2} />}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: active ? '700' : '500',
                    color: active ? C.ink : C.sub,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </Text>
              </View>
            </PressableCard>
          );
        })}
      </View>
    </View>
  );
}
