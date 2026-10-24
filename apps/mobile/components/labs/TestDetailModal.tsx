// apps/mobile/components/labs/TestDetailModal.tsx
// Modal sheet with comprehensive details about a lab test, scan, or package

import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import {
  Item,
  getItemName,
  getItemAbout,
  getItemPrep,
  fromPrice,
  CENTRES,
} from '../../src/data/labsSample';
import { fastText, reportText } from '../../src/data/labsData';
import { C, R, inr } from '../../src/theme';

interface ChipProps {
  label: string;
  tone?: 'plain' | 'good' | 'brand' | 'warn';
}

function Chip({ label, tone = 'plain' }: ChipProps) {
  const map = {
    plain: { bg: '#F1F5F9', fg: C.sub },
    good: { bg: C.goodSoft, fg: C.good },
    brand: { bg: C.brandSoft, fg: C.brand },
    warn: { bg: C.warnSoft, fg: C.warn },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: map.bg,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: R.pill,
      }}
    >
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: map.fg }}>
        {label}
      </Text>
    </View>
  );
}

interface TestDetailModalProps {
  item: Item | null;
  isAdded: boolean;
  onToggle: (item: Item) => void;
  onClose: () => void;
  isHi: boolean;
  bottomInset: number;
}

export function TestDetailModal({
  item,
  isAdded,
  onToggle,
  onClose,
  isHi,
  bottomInset,
}: TestDetailModalProps) {
  if (!item) return null;

  const nearbyCount = CENTRES.filter(
    (c) => c.offers.includes(item.segment) && !c.exclude?.includes(item.id)
  ).length;

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,18,32,0.5)',
          }}
        />
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '86%',
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: C.line,
              }}
            />
          </View>

          <View
            style={{
              padding: 20,
              paddingBottom: Math.max(bottomInset, 16) + 8,
            }}
          >
            <Text
              style={{
                fontSize: 21,
                fontWeight: '800',
                color: C.ink,
                lineHeight: 27,
              }}
            >
              {getItemName(item, isHi)}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 10,
              }}
            >
              <Chip label={reportText(item, isHi)} tone="brand" />
              <Chip
                label={fastText(item, isHi)}
                tone={item.fastingHrs ? 'warn' : 'good'}
              />
              {item.testsCount ? (
                <Chip
                  label={
                    isHi
                      ? `${item.testsCount} टेस्ट शामिल`
                      : `${item.testsCount} tests`
                  }
                />
              ) : null}
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: C.ink,
                marginTop: 18,
              }}
            >
              {isHi ? 'यह जांच क्यों जरूरी है (विवरण)' : 'What it checks'}
            </Text>
            <Text
              style={{
                fontSize: 14.5,
                color: C.sub,
                lineHeight: 21,
                marginTop: 4,
              }}
            >
              {getItemAbout(item, isHi)}
            </Text>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: C.ink,
                marginTop: 16,
              }}
            >
              {isHi ? 'जांच से पहले की तैयारी' : 'How to prepare'}
            </Text>
            <Text
              style={{
                fontSize: 14.5,
                color: C.sub,
                lineHeight: 21,
                marginTop: 4,
              }}
            >
              {getItemPrep(item, isHi)}
            </Text>

            <Text style={{ fontSize: 13, color: C.sub, marginTop: 16 }}>
              {isHi
                ? `${nearbyCount} नजदीकी जांच केंद्रों पर उपलब्ध, न्यूनतम शुल्क ${inr(
                    fromPrice(item)
                  )} से शुरू।`
                : `Offered at ${nearbyCount} nearby centres, starting from ${inr(
                    fromPrice(item)
                  )}.`}
            </Text>

            <Pressable
              onPress={() => {
                onToggle(item);
                onClose();
              }}
              style={{
                height: 54,
                borderRadius: R.lg,
                backgroundColor: isAdded ? '#F1F5F9' : C.brand,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isAdded ? C.ink : '#fff',
                }}
              >
                {isAdded
                  ? isHi
                    ? 'चयन से हटाएं'
                    : 'Remove from selection'
                  : isHi
                  ? 'जांच सूची में जोड़ें'
                  : 'Add to selection'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
