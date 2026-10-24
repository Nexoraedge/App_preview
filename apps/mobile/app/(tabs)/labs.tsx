// apps/mobile/app/(tabs)/labs.tsx
// Labs & Scans: Pick tests first, then pick the diagnostic centre offering all selections.

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

import { C, R, inr } from '../../src/theme';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { LabCardSkeleton } from '../../components/ui/SkeletonBox';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  CATEGORIES,
  ITEMS,
  ITEM_BY_ID,
  centresFor,
  fromPrice,
  homeAvailable,
  type Item,
  type Segment,
} from '../../src/data/labsSample';
import { TabSegment } from '../../src/data/labsData';
import { labsCopy } from '../../src/i18n/labsCopy';

import {
  LabsSegmentSwitch,
  CategoryTilesGrid,
  LabFilterPillsRow,
  LabPrescriptionBanner,
  PackageCard,
  PopularPackagesCarousel,
  LabItemRow,
  LabCartStickyBar,
  TestDetailModal,
  CentreSelectionSheet,
} from '../../components/labs';

const wrap = {
  width: '100%' as const,
  maxWidth: 600,
  alignSelf: 'center' as const,
  paddingHorizontal: 16,
};

export default function LabsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const t = isHi ? labsCopy.hi : labsCopy.en;

  const [segment, setSegment] = useState<TabSegment>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [flt, setFlt] = useState({ home: false, sameDay: false, noFast: false });
  const [carts, setCarts] = useState<Record<Segment, string[]>>({
    lab: [],
    scan: [],
    package: [],
  });
  const [centreSheet, setCentreSheet] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);
  const [sort, setSort] = useState<'near' | 'cheap' | 'rated'>('near');
  const [pick, setPick] = useState<string | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const allCartIds = useMemo(
    () => Array.from(new Set([...carts.lab, ...carts.scan, ...carts.package])),
    [carts]
  );
  const cartIds = allCartIds;
  const counts: Record<TabSegment, number> = {
    all: allCartIds.length,
    lab: carts.lab.length,
    scan: carts.scan.length,
    package: carts.package.length,
  };

  const toggle = (item: Item) =>
    setCarts((prev) => {
      const list = prev[item.segment];
      return {
        ...prev,
        [item.segment]: list.includes(item.id)
          ? list.filter((x) => x !== item.id)
          : [...list, item.id],
      };
    });

  const options = useMemo(
    () => centresFor(cartIds.map((id) => ITEM_BY_ID[id])),
    [cartIds]
  );
  const cheapestTotal = options.length
    ? Math.min(...options.map((o) => o.total))
    : null;
  const nearest = options.length
    ? Math.min(...options.map((o) => o.centre.distanceKm))
    : null;

  const totalEstimatedPrice = useMemo(() => {
    if (cheapestTotal !== null) return cheapestTotal;
    return cartIds.reduce((sum, id) => {
      const it = ITEM_BY_ID[id];
      return sum + (it ? fromPrice(it) : 0);
    }, 0);
  }, [cheapestTotal, cartIds]);

  const cartSummarySubtitle = useMemo(() => {
    const parts: string[] = [];
    if (carts.lab.length > 0)
      parts.push(`${carts.lab.length} ${isHi ? 'लैब' : 'Lab'}`);
    if (carts.scan.length > 0)
      parts.push(`${carts.scan.length} ${isHi ? 'स्कैन' : 'Scan'}`);
    if (carts.package.length > 0)
      parts.push(`${carts.package.length} ${isHi ? 'पैकेज' : 'Pkg'}`);
    const breakdown = parts.join(' · ');
    const priceText =
      totalEstimatedPrice > 0
        ? `${isHi ? 'न्यूनतम ' : 'From '}${inr(totalEstimatedPrice)}`
        : '';
    if (priceText && breakdown) return `${priceText} (${breakdown})`;
    return priceText || breakdown;
  }, [carts, totalEstimatedPrice, isHi]);

  const sorted = useMemo(() => {
    const arr = [...options];
    if (sort === 'near')
      arr.sort((a, b) => a.centre.distanceKm - b.centre.distanceKm);
    if (sort === 'cheap') arr.sort((a, b) => a.total - b.total);
    if (sort === 'rated') arr.sort((a, b) => b.centre.rating - a.centre.rating);
    return arr;
  }, [options, sort]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((i) => (segment === 'all' ? true : i.segment === segment))
      .filter((i) => !category || i.category === category)
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          (i.nameHi && i.nameHi.toLowerCase().includes(q))
      )
      .filter((i) => !flt.home || homeAvailable(i))
      .filter((i) => !flt.sameDay || i.reportHrs <= 12)
      .filter((i) => !flt.noFast || i.fastingHrs === null);
  }, [segment, category, query, flt]);

  const packages = ITEMS.filter((i) => i.segment === 'package');
  const cats =
    segment === 'package'
      ? []
      : segment === 'all'
      ? [...CATEGORIES.lab.slice(0, 6), CATEGORIES.scan[3], CATEGORIES.scan[0]]
      : CATEGORIES[segment];
  const showBrowse = !query && !category;

  const changeSegment = (s: TabSegment) => {
    setSegment(s);
    setCategory(null);
    setQuery('');
    setFlt({ home: false, sameDay: false, noFast: false });
  };

  const openCentres = () => {
    setPick(null);
    setCentreSheet(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: (cartIds.length ? 175 : 96) + insets.bottom,
        }}
      >
        {/* 0. Header */}
        <AppHeader
          title={isHi ? 'लैब व स्कैन' : 'Labs & Scans'}
          onPressProfile={() => setProfileVisible(true)}
          style={{ backgroundColor: C.bg }}
        >
          <AppSearchBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder={
              isHi
                ? 'टेस्ट, स्कैन या पैकेज खोजें...'
                : 'Search tests, scans or packages...'
            }
          />
        </AppHeader>

        {/* 1. Sticky Segment Switch & Filter Row */}
        <View
          style={{
            backgroundColor: C.bg,
            paddingTop: 14,
            paddingBottom: 10,
          }}
        >
          <View style={wrap}>
            <LabsSegmentSwitch
              value={segment}
              onChange={changeSegment}
              counts={counts}
              isHi={isHi}
            />
          </View>
          <LabFilterPillsRow
            segment={segment}
            filters={flt}
            onToggleFilter={(key) =>
              setFlt((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            isHi={isHi}
          />
        </View>

        {/* 2. Main Content Body */}
        <View style={[wrap, { paddingTop: 6 }]}>
          {/* Category tiles */}
          {segment !== 'package' && (showBrowse || category) && (
            <CategoryTilesGrid
              categories={cats}
              selectedCategory={category}
              onSelectCategory={setCategory}
              isHi={isHi}
            />
          )}

          {/* Prescription Upload Banner */}
          {segment !== 'package' && showBrowse && (
            <LabPrescriptionBanner
              onPressUpload={() => {}}
              isHi={isHi}
            />
          )}

          {/* Popular Packages Carousel (All tab only) */}
          {segment === 'all' && showBrowse && (
            <PopularPackagesCarousel
              packages={packages}
              onSeeAll={() => changeSegment('package')}
              isHi={isHi}
            />
          )}

          {/* Items & Packages Listing */}
          {segment === 'package' ? (
            <View style={{ gap: 14, marginTop: 8 }}>
              {packages
                .filter(
                  (p) =>
                    !query ||
                    p.name.toLowerCase().includes(query.toLowerCase()) ||
                    (p.nameHi &&
                      p.nameHi.toLowerCase().includes(query.toLowerCase()))
                )
                .map((p, i) => (
                  <PackageCard
                    key={p.id}
                    item={p}
                    wide
                    index={i}
                    isHi={isHi}
                    added={carts.package.includes(p.id)}
                    onPress={() => setDetail(p)}
                    onToggle={() => toggle(p)}
                  />
                ))}
            </View>
          ) : (
            <View>
              {!category && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
                    {query
                      ? isHi
                        ? 'खोज परिणाम'
                        : 'Results'
                      : segment === 'all'
                      ? isHi
                        ? 'लोकप्रिय टेस्ट व स्कैन'
                        : 'Popular Tests & Scans'
                      : segment === 'scan'
                      ? isHi
                        ? 'लोकप्रिय स्कैन'
                        : 'Popular scans'
                      : isHi
                      ? 'लोकप्रिय टेस्ट'
                      : 'Popular tests'}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.sub }}>
                    {isHi ? `${list.length} उपलब्ध` : `${list.length} available`}
                  </Text>
                </View>
              )}

              {isLoading ? (
                <View style={{ gap: 10 }}>
                  <LabCardSkeleton />
                  <LabCardSkeleton />
                  <LabCardSkeleton />
                </View>
              ) : list.length === 0 ? (
                <View
                  style={{
                    alignItems: 'center',
                    padding: 32,
                    backgroundColor: '#fff',
                    borderRadius: R.xl,
                    borderWidth: 1,
                    borderColor: C.line,
                  }}
                >
                  <Search size={30} color={C.mute} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: C.ink,
                      marginTop: 10,
                    }}
                  >
                    {isHi ? 'कोई जांच नहीं मिली' : 'Nothing matches'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.sub,
                      textAlign: 'center',
                      marginTop: 4,
                    }}
                  >
                    {isHi
                      ? 'अलग नाम से खोजें या फ़िल्टर हटाएं।'
                      : 'Try a shorter search, or clear the filters.'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setQuery('');
                      setCategory(null);
                      setFlt({ home: false, sameDay: false, noFast: false });
                    }}
                    style={{
                      marginTop: 14,
                      height: 40,
                      paddingHorizontal: 18,
                      borderRadius: 20,
                      backgroundColor: C.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: C.brand,
                        fontWeight: '700',
                        fontSize: 13.5,
                      }}
                    >
                      {isHi ? 'फ़िल्टर हटाएं' : 'Clear all'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {list.map((it, i) =>
                    it.segment === 'package' ? (
                      <PackageCard
                        key={it.id}
                        item={it}
                        wide
                        index={i}
                        isHi={isHi}
                        added={carts.package.includes(it.id)}
                        onPress={() => setDetail(it)}
                        onToggle={() => toggle(it)}
                      />
                    ) : (
                      <LabItemRow
                        key={it.id}
                        item={it}
                        index={i}
                        isHi={isHi}
                        added={carts[it.segment].includes(it.id)}
                        onToggle={() => toggle(it)}
                        onOpen={() => setDetail(it)}
                        showTypeBadge={segment === 'all'}
                      />
                    )
                  )}
                </View>
              )}
            </View>
          )}

          <Text
            style={{
              fontSize: 11.5,
              color: C.mute,
              textAlign: 'center',
              marginTop: 24,
              lineHeight: 16,
            }}
          >
            {isHi
              ? 'शुल्क जांच केंद्र अनुसार भिन्न हो सकते हैं और बुकिंग से पहले सुनिश्चित किए जाते हैं। यह सेवा आपातकालीन चिकित्सा का विकल्प नहीं है।'
              : 'Prices vary by centre and are confirmed before you pay. This service supports bookings and is not a substitute for emergency care.'}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Cart Summary Bar */}
      <LabCartStickyBar
        cartCount={cartIds.length}
        subtitle={cartSummarySubtitle}
        onPressChooseCentre={openCentres}
        isHi={isHi}
        bottomInset={insets.bottom}
      />

      {/* Item Detail Sheet */}
      <TestDetailModal
        item={detail}
        isAdded={detail ? carts[detail.segment].includes(detail.id) : false}
        onToggle={toggle}
        onClose={() => setDetail(null)}
        isHi={isHi}
        bottomInset={insets.bottom}
      />

      {/* Centre Picker Sheet */}
      <CentreSelectionSheet
        visible={centreSheet}
        cartIds={cartIds}
        options={options}
        sortedOptions={sorted}
        cheapestTotal={cheapestTotal}
        nearestDistance={nearest}
        sort={sort}
        onSortChange={setSort}
        selectedCentreId={pick}
        onSelectCentre={setPick}
        onToggleItem={toggle}
        onClearAll={() => {
          setCarts({ lab: [], scan: [], package: [] });
          setCentreSheet(false);
        }}
        onConfirm={() => setCentreSheet(false)}
        onClose={() => setCentreSheet(false)}
        isHi={isHi}
        segment={segment}
        bottomInset={insets.bottom}
      />

      {/* Profile & Language Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
}
