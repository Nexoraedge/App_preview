// apps/mobile/components/labs/CentreSelectionSheet.tsx
// Modal sheet for comparing and selecting diagnostic centres for all selected tests

import React from 'react';
import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { MapPin, Star, Home as HomeIcon, X, Check } from 'lucide-react-native';
import {
  Item,
  Centre,
  ITEM_BY_ID,
  getItemName,
  fromPrice,
} from '../../src/data/labsSample';
import { TabSegment } from '../../src/data/labsData';
import { C, R, inr } from '../../src/theme';

interface CentreOption {
  centre: Centre;
  total: number;
}

interface CentreSelectionSheetProps {
  visible: boolean;
  cartIds: string[];
  options: CentreOption[];
  sortedOptions: CentreOption[];
  cheapestTotal: number | null;
  nearestDistance: number | null;
  sort: 'near' | 'cheap' | 'rated';
  onSortChange: (sort: 'near' | 'cheap' | 'rated') => void;
  selectedCentreId: string | null;
  onSelectCentre: (id: string) => void;
  onToggleItem: (item: Item) => void;
  onClearAll: () => void;
  onConfirm: () => void;
  onClose: () => void;
  isHi: boolean;
  segment: TabSegment;
  bottomInset: number;
}

function Chip({
  label,
  tone = 'plain',
  icon,
}: {
  label: string;
  tone?: 'plain' | 'good' | 'brand' | 'warn';
  icon?: React.ReactNode;
}) {
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
      {icon}
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: map.fg }}>
        {label}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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

export function CentreSelectionSheet({
  visible,
  cartIds,
  options,
  sortedOptions,
  cheapestTotal,
  nearestDistance,
  sort,
  onSortChange,
  selectedCentreId,
  onSelectCentre,
  onToggleItem,
  onClearAll,
  onConfirm,
  onClose,
  isHi,
  segment,
  bottomInset,
}: CentreSelectionSheetProps) {
  if (!visible) return null;

  const pickedOption =
    sortedOptions.find((o) => o.centre.id === selectedCentreId) ?? null;

  return (
    <Modal
      visible={visible}
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

          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <Text style={{ fontSize: 21, fontWeight: '800', color: C.ink }}>
              {isHi ? 'जांच केंद्र चुनें' : 'Choose a centre'}
            </Text>
            <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 2 }}>
              {options.length > 0
                ? isHi
                  ? `${options.length} केंद्र आपके चुने सभी ${cartIds.length} जांचें करते हैं`
                  : `${options.length} centre${
                      options.length > 1 ? 's' : ''
                    } can do all ${cartIds.length} selected tests & scans`
                : isHi
                ? 'कोई एक केंद्र आपकी चुनी सभी जांचें नहीं करता'
                : 'No single centre offers everything you picked'}
            </Text>

            {/* Selected Items Breakdown List */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: R.md,
                padding: 12,
                marginTop: 10,
                borderWidth: 1,
                borderColor: C.line,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '800',
                    color: C.sub,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  {isHi ? 'चुनी गई जांचें' : 'Selected Tests & Scans'} (
                  {cartIds.length})
                </Text>
                <Pressable onPress={onClearAll}>
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: C.brand }}
                  >
                    {isHi ? 'सभी हटाएं' : 'Clear all'}
                  </Text>
                </Pressable>
              </View>

              <View style={{ gap: 6 }}>
                {cartIds.map((id) => {
                  const it = ITEM_BY_ID[id];
                  if (!it) return null;
                  return (
                    <View
                      key={id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 3,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1,
                          paddingRight: 8,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor:
                              it.segment === 'scan'
                                ? '#F1EBFF'
                                : it.segment === 'package'
                                ? '#FFF4E0'
                                : '#EAF1FF',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9.5,
                              fontWeight: '800',
                              color:
                                it.segment === 'scan'
                                  ? '#7C3AED'
                                  : it.segment === 'package'
                                  ? '#B45309'
                                  : C.brand,
                            }}
                          >
                            {it.segment === 'scan'
                              ? isHi
                                ? 'स्कैन'
                                : 'SCAN'
                              : it.segment === 'package'
                              ? isHi
                                ? 'पैकेज'
                                : 'PKG'
                              : isHi
                              ? 'लैब'
                              : 'LAB'}
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: C.ink,
                            flex: 1,
                          }}
                        >
                          {getItemName(it, isHi)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: '700',
                            color: C.brand,
                          }}
                        >
                          {inr(fromPrice(it))}
                        </Text>
                        <Pressable onPress={() => onToggleItem(it)} hitSlop={6}>
                          <X size={15} color="#94A3B8" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {options.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {(
                  [
                    ['near', isHi ? 'नजदीकी' : 'Nearest'],
                    ['cheap', isHi ? 'किफायती' : 'Cheapest'],
                    ['rated', isHi ? 'सर्वश्रेष्ठ रेटिंग' : 'Top rated'],
                  ] as const
                ).map(([id, label]) => (
                  <FilterChip
                    key={id}
                    label={label}
                    active={sort === id}
                    onPress={() => onSortChange(id as any)}
                  />
                ))}
              </View>
            )}
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {options.length === 0 ? (
              <View
                style={{
                  backgroundColor: C.warnSoft,
                  borderRadius: R.lg,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 14.5,
                    fontWeight: '700',
                    color: C.warn,
                  }}
                >
                  {isHi
                    ? 'इन्हें अलग-अलग बुक करने का प्रयास करें'
                    : 'Try booking these separately'}
                </Text>
                <Text
                  style={{
                    fontSize: 13.5,
                    color: C.sub,
                    marginTop: 4,
                    lineHeight: 20,
                  }}
                >
                  {isHi
                    ? 'आपके चुने हुए कुछ टेस्ट अलग-अलग जांच केंद्रों पर उपलब्ध हैं। किसी एक को हटाकर अलग से बुक करें।'
                    : 'Some of your selections are only done at different centres. Remove one and book it on its own.'}
                </Text>
              </View>
            ) : (
              sortedOptions.map(({ centre, total }) => {
                const selected = selectedCentreId === centre.id;
                const formattedNextSlot = isHi
                  ? centre.nextSlot.replace('Today', 'आज').replace('Tomorrow', 'कल')
                  : centre.nextSlot;

                return (
                  <Pressable
                    key={centre.id}
                    onPress={() => onSelectCentre(centre.id)}
                    style={{
                      borderRadius: R.lg,
                      padding: 14,
                      backgroundColor: selected ? C.brandSoft : '#fff',
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? C.brand : C.line,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15.5,
                            fontWeight: '700',
                            color: C.ink,
                          }}
                        >
                          {centre.name}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 3,
                          }}
                        >
                          <MapPin size={12} color={C.sub} />
                          <Text style={{ fontSize: 12.5, color: C.sub }}>
                            {centre.area} · {centre.distanceKm} km
                          </Text>
                          <Star size={12} color="#D97706" fill="#D97706" />
                          <Text style={{ fontSize: 12.5, color: C.sub }}>
                            {centre.rating}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '800',
                            color: C.ink,
                          }}
                        >
                          {inr(total)}
                        </Text>
                        <Text style={{ fontSize: 12, color: C.sub }}>
                          {isHi ? 'कुल' : 'total'}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      <Chip
                        label={`${isHi ? 'स्लॉट: ' : 'Next: '}${formattedNextSlot}`}
                        tone="brand"
                      />
                      {total === cheapestTotal && (
                        <Chip
                          label={isHi ? 'सबसे किफायती' : 'Cheapest'}
                          tone="good"
                        />
                      )}
                      {centre.distanceKm === nearestDistance && (
                        <Chip
                          label={isHi ? 'सबसे नजदीक' : 'Nearest'}
                          tone="good"
                        />
                      )}
                      {centre.home && segment !== 'scan' && (
                        <Chip
                          label={isHi ? 'घर पर सैंपल' : 'Home collection'}
                          icon={<HomeIcon size={11} color={C.sub} />}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View
            style={{
              padding: 20,
              paddingTop: 8,
              paddingBottom: Math.max(bottomInset, 16) + 8,
            }}
          >
            {options.length === 0 ? (
              <Pressable
                onPress={onClose}
                style={{
                  height: 54,
                  borderRadius: R.lg,
                  backgroundColor: C.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
                >
                  {isHi ? 'वापस जांच सूची पर जाएं' : 'Go back to selection'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={!pickedOption}
                onPress={onConfirm}
                style={{
                  height: 54,
                  borderRadius: R.lg,
                  backgroundColor: pickedOption ? C.brand : '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
                >
                  {pickedOption
                    ? `${isHi ? 'आगे बढ़ें' : 'Continue'} · ${inr(
                        pickedOption.total
                      )}`
                    : isHi
                    ? 'जांच केंद्र चुनें'
                    : 'Select a centre'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
