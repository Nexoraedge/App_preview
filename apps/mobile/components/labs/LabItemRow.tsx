// apps/mobile/components/labs/LabItemRow.tsx
// Item row for individual lab tests and scans

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, Check, FlaskConical } from 'lucide-react-native';
import { Item, getItemName, fromPrice } from '../../src/data/labsSample';
import { LAB_ICONS, findCategory, fastText, reportText } from '../../src/data/labsData';
import { C, R, SHADOW, inr } from '../../src/theme';
import { PressableCard } from '../ui/PressableCard';

interface AddButtonProps {
  added: boolean;
  onPress: () => void;
}

function AddButton({ added, onPress }: AddButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={added ? 'Remove from selection' : 'Add to selection'}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: added ? C.good : C.brand,
      }}
    >
      {added ? (
        <Check size={20} color="#fff" strokeWidth={3} />
      ) : (
        <Plus size={22} color="#fff" strokeWidth={2.5} />
      )}
    </Pressable>
  );
}

interface LabItemRowProps {
  item: Item;
  added: boolean;
  onToggle: () => void;
  onOpen: () => void;
  index: number;
  isHi: boolean;
  showTypeBadge?: boolean;
}

export function LabItemRow({
  item,
  added,
  onToggle,
  onOpen,
  index,
  isHi,
  showTypeBadge,
}: LabItemRowProps) {
  const cat = findCategory(item);
  const Icon = cat ? LAB_ICONS[cat.icon] : FlaskConical;
  const itemName = getItemName(item, isHi);

  return (
    <PressableCard index={index} onPress={onOpen} label={itemName}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#fff',
          borderRadius: R.lg,
          padding: 14,
          borderWidth: added ? 1.5 : 1,
          borderColor: added ? C.good : C.line,
          ...SHADOW,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: cat?.tint ?? C.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {Icon && <Icon size={22} color={cat?.color ?? C.brand} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: C.ink,
                lineHeight: 20,
                flex: 1,
              }}
            >
              {itemName}
            </Text>
            {showTypeBadge && (
              <View
                style={{
                  backgroundColor:
                    item.segment === 'scan' ? '#F1EBFF' : '#EAF1FF',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: R.pill,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: item.segment === 'scan' ? '#7C3AED' : C.brand,
                  }}
                >
                  {item.segment === 'scan'
                    ? isHi
                      ? 'स्कैन'
                      : 'Scan'
                    : isHi
                    ? 'लैब'
                    : 'Lab'}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
            {reportText(item, isHi)} · {fastText(item, isHi)}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: C.brand,
              marginTop: 4,
            }}
          >
            {isHi ? 'न्यूनतम ' : 'From '}
            {inr(fromPrice(item))}
          </Text>
        </View>
        <AddButton added={added} onPress={onToggle} />
      </View>
    </PressableCard>
  );
}
