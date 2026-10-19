// app/(tabs)/labs.tsx
// Labs & Scans: pick tests first, then pick the centre that offers all of them.
// Each tab (Lab tests / Scans / Packages) has its own cart, because one centre rarely does all three.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, X, MapPin, Plus, Check, ChevronRight, FileText, Star, Home as HomeIcon,
  Droplets, Activity, HeartPulse, Sun, Waves, Flower2, Thermometer, FlaskConical,
  Bone, ScanLine, Brain,
} from 'lucide-react-native';

import { C, R, SHADOW, inr } from '../../src/theme';
import { PressableCard } from '../../components/ui/PressableCard';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { LabCardSkeleton } from '../../components/ui/SkeletonBox';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  CATEGORIES, ITEMS, ITEM_BY_ID, CENTRES, centresFor, fromPrice, homeAvailable,
  getItemName, getItemAbout, getItemPrep, getCategoryLabel,
  type Item, type Segment, type Category,
} from '../../src/data/labsSample';

const ICONS: Record<string, any> = {
  Droplets, Activity, HeartPulse, Sun, Waves, Flower2, Thermometer, FlaskConical, Bone, ScanLine, Brain,
};

const getSegments = (isHi: boolean): { id: Segment; label: string }[] => [
  { id: 'lab', label: isHi ? 'लैब टेस्ट' : 'Lab tests' },
  { id: 'scan', label: isHi ? 'स्कैन' : 'Scans' },
  { id: 'package', label: isHi ? 'पैकेज' : 'Packages' },
];

const reportText = (i: Item, isHi: boolean) => {
  if (isHi) {
    return i.reportHrs < 24 ? `${i.reportHrs} घंटे में रिपोर्ट` : `${Math.round(i.reportHrs / 24)} दिन में रिपोर्ट`;
  }
  return i.reportHrs < 24 ? `Report in ${i.reportHrs} hrs` : `Report in ${Math.round(i.reportHrs / 24)} day`;
};

const fastText = (i: Item, isHi: boolean) => {
  if (isHi) {
    return i.fastingHrs ? `${i.fastingHrs} घंटे खाली पेट` : 'खाली पेट जरूरी नहीं';
  }
  return i.fastingHrs ? `Fasting ${i.fastingHrs} hrs` : 'No fasting';
};

const findCategory = (i: Item): Category | undefined =>
  i.segment === 'package' ? undefined : CATEGORIES[i.segment].find((c) => c.id === i.category);

const wrap = { width: '100%' as const, maxWidth: 600, alignSelf: 'center' as const, paddingHorizontal: 16 };

// ---------- small pieces ----------

function Chip({ label, tone = 'plain', icon }: { label: string; tone?: 'plain' | 'good' | 'brand' | 'warn'; icon?: React.ReactNode }) {
  const map = {
    plain: { bg: '#F1F5F9', fg: C.sub },
    good: { bg: C.goodSoft, fg: C.good },
    brand: { bg: C.brandSoft, fg: C.brand },
    warn: { bg: C.warnSoft, fg: C.warn },
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: map.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill }}>
      {icon}
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: map.fg }}>{label}</Text>
    </View>
  );
}

function SegmentSwitch({
  value,
  onChange,
  counts,
  isHi,
}: {
  value: Segment;
  onChange: (s: Segment) => void;
  counts: Record<Segment, number>;
  isHi: boolean;
}) {
  const segments = getSegments(isHi);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#E9EEF6', borderRadius: R.pill, padding: 4 }}>
      {segments.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: R.pill,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              backgroundColor: active ? '#FFFFFF' : 'transparent',
              ...(active ? SHADOW : {}),
            }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active ? C.brand : C.sub }}>
              {s.label}
            </Text>
            {counts[s.id] > 0 && (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>{counts[s.id]}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? C.brand : C.sub }}>{label}</Text>
    </Pressable>
  );
}

function CategoryTile({
  cat,
  active,
  onPress,
  index,
  isHi,
}: {
  cat: Category;
  active: boolean;
  onPress: () => void;
  index: number;
  isHi: boolean;
}) {
  const Icon = ICONS[cat.icon];
  const label = getCategoryLabel(cat, isHi);
  return (
    <PressableCard index={index} onPress={onPress} style={{ width: '25%', paddingHorizontal: 4, marginBottom: 12 }} label={label}>
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
          <Icon size={26} color={cat.color} strokeWidth={2} />
        </View>
        <Text numberOfLines={2} style={{ marginTop: 6, fontSize: 12, fontWeight: active ? '700' : '500', color: active ? C.ink : C.sub, textAlign: 'center' }}>
          {label}
        </Text>
      </View>
    </PressableCard>
  );
}

function AddButton({ added, onPress }: { added: boolean; onPress: () => void }) {
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
      {added ? <Check size={20} color="#fff" strokeWidth={3} /> : <Plus size={22} color="#fff" strokeWidth={2.5} />}
    </Pressable>
  );
}

function ItemRow({
  item,
  added,
  onToggle,
  onOpen,
  index,
  isHi,
}: {
  item: Item;
  added: boolean;
  onToggle: () => void;
  onOpen: () => void;
  index: number;
  isHi: boolean;
}) {
  const cat = findCategory(item);
  const Icon = cat ? ICONS[cat.icon] : FlaskConical;
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
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: cat?.tint ?? C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={cat?.color ?? C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '600', color: C.ink, lineHeight: 20 }}>
            {itemName}
          </Text>
          <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
            {reportText(item, isHi)}  ·  {fastText(item, isHi)}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.brand, marginTop: 4 }}>
            {isHi ? 'न्यूनतम ' : 'From '}
            {inr(fromPrice(item))}
          </Text>
        </View>
        <AddButton added={added} onPress={onToggle} />
      </View>
    </PressableCard>
  );
}

function PackageCard({
  item,
  wide,
  added,
  onPress,
  onToggle,
  index,
  isHi,
}: {
  item: Item;
  wide?: boolean;
  added?: boolean;
  onPress: () => void;
  onToggle?: () => void;
  index: number;
  isHi: boolean;
}) {
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
        <View pointerEvents="none" style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.10)' }} />
        <View>
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill }}>
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '600' }}>
              {isHi ? `${item.testsCount} टेस्ट शामिल` : `${item.testsCount} tests included`}
            </Text>
          </View>
          <View style={{ minHeight: 48, justifyContent: 'flex-start', marginTop: 10 }}>
            <Text style={{ color: '#fff', fontSize: 18.5, fontWeight: '700', lineHeight: 24 }} numberOfLines={2}>
              {packageName}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 4 }} numberOfLines={1}>
            {fastText(item, isHi)}  ·  {reportText(item, isHi)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11.5 }}>
              {isHi ? 'न्यूनतम शुल्क' : 'Starting from'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{inr(fromPrice(item))}</Text>
          </View>
          {onToggle ? (
            <Pressable
              onPress={onToggle}
              hitSlop={6}
              style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            >
              {added ? <Check size={16} color={C.good} strokeWidth={3} /> : <Plus size={16} color={C.brand} strokeWidth={3} />}
              <Text style={{ fontSize: 14, fontWeight: '700', color: added ? C.good : C.brand }}>
                {added ? (isHi ? 'जुड़ गया' : 'Added') : (isHi ? 'जोड़ें' : 'Add')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={20} color="#fff" />
            </View>
          )}
        </View>
      </LinearGradient>
    </PressableCard>
  );
}

function SheetFrame({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,18,32,0.5)' }} />
        <View
          style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '86%', width: '100%', maxWidth: 560, alignSelf: 'center' }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.line }} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ---------- screen ----------

export default function LabsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [segment, setSegment] = useState<Segment>('lab');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [flt, setFlt] = useState({ home: false, sameDay: false, noFast: false });
  const [carts, setCarts] = useState<Record<Segment, string[]>>({ lab: [], scan: [], package: [] });
  const [centreSheet, setCentreSheet] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);
  const [sort, setSort] = useState<'near' | 'cheap' | 'rated'>('near');
  const [pick, setPick] = useState<string | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const cartIds = carts[segment];
  const counts = { lab: carts.lab.length, scan: carts.scan.length, package: carts.package.length };

  const toggle = (item: Item) =>
    setCarts((prev) => {
      const list = prev[item.segment];
      return { ...prev, [item.segment]: list.includes(item.id) ? list.filter((x) => x !== item.id) : [...list, item.id] };
    });

  const options = useMemo(() => centresFor(cartIds.map((id) => ITEM_BY_ID[id])), [cartIds]);
  const cheapestTotal = options.length ? Math.min(...options.map((o) => o.total)) : null;
  const nearest = options.length ? Math.min(...options.map((o) => o.centre.distanceKm)) : null;

  const sorted = useMemo(() => {
    const arr = [...options];
    if (sort === 'near') arr.sort((a, b) => a.centre.distanceKm - b.centre.distanceKm);
    if (sort === 'cheap') arr.sort((a, b) => a.total - b.total);
    if (sort === 'rated') arr.sort((a, b) => b.centre.rating - a.centre.rating);
    return arr;
  }, [options, sort]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((i) => i.segment === segment)
      .filter((i) => !category || i.category === category)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || (i.nameHi && i.nameHi.toLowerCase().includes(q)))
      .filter((i) => !flt.home || homeAvailable(i))
      .filter((i) => !flt.sameDay || i.reportHrs <= 12)
      .filter((i) => !flt.noFast || i.fastingHrs === null);
  }, [segment, category, query, flt]);

  const packages = ITEMS.filter((i) => i.segment === 'package');
  const cats = segment === 'package' ? [] : CATEGORIES[segment];
  const showBrowse = !query && !category;
  const noun = segment === 'package'
    ? (isHi ? 'पैकेज' : 'package')
    : segment === 'scan'
    ? (isHi ? 'स्कैन' : 'scan')
    : (isHi ? 'टेस्ट' : 'test');

  const pickedOption = sorted.find((o) => o.centre.id === pick) ?? null;

  const changeSegment = (s: Segment) => { setSegment(s); setCategory(null); setQuery(''); };
  const openCentres = () => { setPick(null); setCentreSheet(true); };

  const handleContinue = () => { setCentreSheet(false); };
  const handleUpload = () => {};

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: (cartIds.length ? 175 : 96) + insets.bottom }}
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
            placeholder={isHi ? 'टेस्ट, स्कैन या पैकेज खोजें...' : 'Search tests, scans or packages...'}
          />
        </AppHeader>

        {/* 1. Sticky bar: segments + filters */}
        <View style={{ backgroundColor: C.bg, paddingTop: 14, paddingBottom: 10 }}>
          <View style={wrap}>
            <SegmentSwitch value={segment} onChange={changeSegment} counts={counts} isHi={isHi} />
          </View>
          {segment !== 'package' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 10 }}>
              {segment === 'lab' && (
                <FilterChip
                  label={isHi ? 'घर पर सैंपल' : 'Home collection'}
                  active={flt.home}
                  onPress={() => setFlt((f) => ({ ...f, home: !f.home }))}
                />
              )}
              <FilterChip
                label={isHi ? '12 घंटे में रिपोर्ट' : 'Report within 12 hrs'}
                active={flt.sameDay}
                onPress={() => setFlt((f) => ({ ...f, sameDay: !f.sameDay }))}
              />
              <FilterChip
                label={isHi ? 'खाली पेट जरूरी नहीं' : 'No fasting'}
                active={flt.noFast}
                onPress={() => setFlt((f) => ({ ...f, noFast: !f.noFast }))}
              />
            </ScrollView>
          )}
        </View>

        {/* 2. Body */}
        <View style={[wrap, { paddingTop: 6 }]}>
          {/* Category tiles */}
          {segment !== 'package' && showBrowse && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 12 }}>
                {isHi ? 'श्रेणी अनुसार खोजें' : 'Browse by category'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                {cats.map((c, i) => (
                  <CategoryTile
                    key={c.id}
                    cat={c}
                    index={i}
                    isHi={isHi}
                    active={category === c.id}
                    onPress={() => setCategory(category === c.id ? null : c.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Active category header */}
          {segment !== 'package' && category && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
                {(() => {
                  const currentCat = cats.find((c) => c.id === category);
                  return currentCat ? getCategoryLabel(currentCat, isHi) : '';
                })()}
              </Text>
              <Pressable onPress={() => setCategory(null)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.brand }}>
                  {isHi ? 'सभी देखें' : 'Show all'}
                </Text>
                <X size={14} color={C.brand} />
              </Pressable>
            </View>
          )}

          {/* Slim prescription banner */}
          {segment !== 'package' && showBrowse && (
            <PressableCard index={2} onPress={handleUpload} label={isHi ? 'पर्चा अपलोड करें' : 'Upload prescription'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.brandSoft, borderRadius: R.lg, padding: 14, marginBottom: 20 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}>
                    {isHi ? 'डॉक्टर का पर्चा है?' : 'Have a prescription?'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 1 }}>
                    {isHi ? 'पर्चा अपलोड करें, हमारी मेडिकल टीम टेस्ट चुनकर तुरंत सबसे सही केंद्र बुक करेगी।' : 'Upload it and our team books the right tests'}
                  </Text>
                </View>
                <View style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700' }}>
                    {isHi ? 'अपलोड करें' : 'Upload'}
                  </Text>
                </View>
              </View>
            </PressableCard>
          )}

          {/* Popular packages carousel (Lab tab only) */}
          {segment === 'lab' && showBrowse && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
                  {isHi ? 'लोकप्रिय स्वास्थ्य पैकेज' : 'Popular packages'}
                </Text>
                <Pressable onPress={() => changeSegment('package')} hitSlop={10}>
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
                {packages.map((p, i) => (
                  <PackageCard key={p.id} item={p} index={i} isHi={isHi} onPress={() => changeSegment('package')} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* List */}
          {segment === 'package' ? (
            <View style={{ gap: 14, marginTop: 8 }}>
              {packages
                .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.nameHi && p.nameHi.toLowerCase().includes(query.toLowerCase())))
                .map((p, i) => (
                  <PackageCard
                    key={p.id}
                    item={p}
                    wide
                    index={i}
                    isHi={isHi}
                    added={cartIds.includes(p.id)}
                    onPress={() => setDetail(p)}
                    onToggle={() => toggle(p)}
                  />
                ))}
            </View>
          ) : (
            <View>
              {!category && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
                    {query
                      ? (isHi ? 'खोज परिणाम' : 'Results')
                      : segment === 'scan'
                      ? (isHi ? 'लोकप्रिय स्कैन' : 'Popular scans')
                      : (isHi ? 'लोकप्रिय टेस्ट' : 'Popular tests')}
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
                <View style={{ alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: R.xl, borderWidth: 1, borderColor: C.line }}>
                  <Search size={30} color={C.mute} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 10 }}>
                    {isHi ? 'कोई जांच नहीं मिली' : 'Nothing matches'}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.sub, textAlign: 'center', marginTop: 4 }}>
                    {isHi ? 'अलग नाम से खोजें या फ़िल्टर हटाएं।' : 'Try a shorter search, or clear the filters.'}
                  </Text>
                  <Pressable
                    onPress={() => { setQuery(''); setCategory(null); setFlt({ home: false, sameDay: false, noFast: false }); }}
                    style={{ marginTop: 14, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13.5 }}>
                      {isHi ? 'फ़िल्टर हटाएं' : 'Clear all'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {list.map((it, i) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      index={i}
                      isHi={isHi}
                      added={cartIds.includes(it.id)}
                      onToggle={() => toggle(it)}
                      onOpen={() => setDetail(it)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={{ fontSize: 11.5, color: C.mute, textAlign: 'center', marginTop: 24, lineHeight: 16 }}>
            {isHi
              ? 'शुल्क जांच केंद्र अनुसार भिन्न हो सकते हैं और बुकिंग से पहले सुनिश्चित किए जाते हैं। यह सेवा आपातकालीन चिकित्सा का विकल्प नहीं है।'
              : 'Prices vary by centre and are confirmed before you pay. This service supports bookings and is not a substitute for emergency care.'}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky cart bar */}
      {cartIds.length > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10) + 64 + 12,
            alignItems: 'center',
            paddingHorizontal: 16,
            zIndex: 40,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={openCentres}
            style={{
              width: '100%',
              maxWidth: 560,
              height: 64,
              borderRadius: R.xl,
              backgroundColor: C.brandDark,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#0B1B3F',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <View>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {isHi
                  ? `${cartIds.length} ${noun} चुने गए`
                  : `${cartIds.length} ${noun}${cartIds.length > 1 ? 's' : ''} selected`}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5, marginTop: 1 }}>
                {cheapestTotal !== null
                  ? `${isHi ? 'न्यूनतम ' : 'From '}${inr(cheapestTotal)}`
                  : (isHi ? 'एक से अधिक केंद्र की आवश्यकता' : 'Needs more than one centre')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 16, height: 42, borderRadius: 21 }}>
              <Text style={{ color: C.brandDark, fontWeight: '700', fontSize: 14 }}>
                {isHi ? 'केंद्र चुनें' : 'Choose centre'}
              </Text>
              <ChevronRight size={16} color={C.brandDark} strokeWidth={3} />
            </View>
          </Pressable>
        </View>
      )}

      {/* Item detail sheet */}
      <SheetFrame visible={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
            <Text style={{ fontSize: 21, fontWeight: '800', color: C.ink, lineHeight: 27 }}>
              {getItemName(detail, isHi)}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <Chip label={reportText(detail, isHi)} tone="brand" />
              <Chip label={fastText(detail, isHi)} tone={detail.fastingHrs ? 'warn' : 'good'} />
              {detail.testsCount ? (
                <Chip label={isHi ? `${detail.testsCount} टेस्ट शामिल` : `${detail.testsCount} tests`} />
              ) : null}
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 18 }}>
              {isHi ? 'यह जांच क्यों जरूरी है (विवरण)' : 'What it checks'}
            </Text>
            <Text style={{ fontSize: 14.5, color: C.sub, lineHeight: 21, marginTop: 4 }}>
              {getItemAbout(detail, isHi)}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 16 }}>
              {isHi ? 'जांच से पहले की तैयारी' : 'How to prepare'}
            </Text>
            <Text style={{ fontSize: 14.5, color: C.sub, lineHeight: 21, marginTop: 4 }}>
              {getItemPrep(detail, isHi)}
            </Text>
            <Text style={{ fontSize: 13, color: C.sub, marginTop: 16 }}>
              {isHi
                ? `${CENTRES.filter((c) => c.offers.includes(detail.segment) && !c.exclude?.includes(detail.id)).length} नजदीकी जांच केंद्रों पर उपलब्ध, न्यूनतम शुल्क ${inr(fromPrice(detail))} से शुरू।`
                : `Offered at ${CENTRES.filter((c) => c.offers.includes(detail.segment) && !c.exclude?.includes(detail.id)).length} nearby centres, starting from ${inr(fromPrice(detail))}.`}
            </Text>
            <Pressable
              onPress={() => { toggle(detail); setDetail(null); }}
              style={{
                height: 54,
                borderRadius: R.lg,
                backgroundColor: carts[detail.segment].includes(detail.id) ? '#F1F5F9' : C.brand,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: carts[detail.segment].includes(detail.id) ? C.ink : '#fff' }}>
                {carts[detail.segment].includes(detail.id)
                  ? (isHi ? 'चयन से हटाएं' : 'Remove from selection')
                  : (isHi ? 'जांच सूची में जोड़ें' : 'Add to selection')}
              </Text>
            </Pressable>
          </View>
        )}
      </SheetFrame>

      {/* Centre picker sheet */}
      <SheetFrame visible={centreSheet} onClose={() => setCentreSheet(false)}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Text style={{ fontSize: 21, fontWeight: '800', color: C.ink }}>
            {isHi ? 'जांच केंद्र चुनें' : 'Choose a centre'}
          </Text>
          <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 2 }}>
            {options.length > 0
              ? (isHi
                  ? `${options.length} केंद्र आपके चुने सभी ${cartIds.length} ${noun} करते हैं`
                  : `${options.length} centre${options.length > 1 ? 's' : ''} can do all ${cartIds.length} ${noun}${cartIds.length > 1 ? 's' : ''}`)
              : (isHi
                  ? 'कोई एक केंद्र आपकी चुनी सभी जांचें नहीं करता'
                  : 'No single centre offers everything you picked')}
          </Text>
          {options.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {([
                ['near', isHi ? 'नजदीकी' : 'Nearest'],
                ['cheap', isHi ? 'किफायती' : 'Cheapest'],
                ['rated', isHi ? 'सर्वश्रेष्ठ रेटिंग' : 'Top rated'],
              ] as const).map(([id, label]) => (
                <FilterChip key={id} label={label} active={sort === id} onPress={() => setSort(id as any)} />
              ))}
            </View>
          )}
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }} showsVerticalScrollIndicator={false}>
          {options.length === 0 ? (
            <View style={{ backgroundColor: C.warnSoft, borderRadius: R.lg, padding: 16 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.warn }}>
                {isHi ? 'इन्हें अलग-अलग बुक करने का प्रयास करें' : 'Try booking these separately'}
              </Text>
              <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 4, lineHeight: 20 }}>
                {isHi
                  ? 'आपके चुने हुए कुछ टेस्ट अलग-अलग जांच केंद्रों पर उपलब्ध हैं। किसी एक को हटाकर अलग से बुक करें।'
                  : 'Some of your selections are only done at different centres. Remove one and book it on its own.'}
              </Text>
            </View>
          ) : (
            sorted.map(({ centre, total }) => {
              const selected = pick === centre.id;
              const formattedNextSlot = isHi
                ? centre.nextSlot.replace('Today', 'आज').replace('Tomorrow', 'कल')
                : centre.nextSlot;
              return (
                <Pressable
                  key={centre.id}
                  onPress={() => setPick(centre.id)}
                  style={{
                    borderRadius: R.lg,
                    padding: 14,
                    backgroundColor: selected ? C.brandSoft : '#fff',
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? C.brand : C.line,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}>{centre.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <MapPin size={12} color={C.sub} />
                        <Text style={{ fontSize: 12.5, color: C.sub }}>{centre.area} · {centre.distanceKm} km</Text>
                        <Star size={12} color="#D97706" fill="#D97706" />
                        <Text style={{ fontSize: 12.5, color: C.sub }}>{centre.rating}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{inr(total)}</Text>
                      <Text style={{ fontSize: 12, color: C.sub }}>
                        {isHi ? 'कुल' : 'total'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    <Chip label={`${isHi ? 'स्लॉट: ' : 'Next: '}${formattedNextSlot}`} tone="brand" />
                    {total === cheapestTotal && <Chip label={isHi ? 'सबसे किफायती' : 'Cheapest'} tone="good" />}
                    {centre.distanceKm === nearest && <Chip label={isHi ? 'सबसे नजदीक' : 'Nearest'} tone="good" />}
                    {centre.home && segment !== 'scan' && (
                      <Chip label={isHi ? 'घर पर सैंपल' : 'Home collection'} icon={<HomeIcon size={11} color={C.sub} />} />
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={{ padding: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          {options.length === 0 ? (
            <Pressable onPress={() => setCentreSheet(false)} style={{ height: 54, borderRadius: R.lg, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {isHi ? 'वापस जांच सूची पर जाएं' : 'Go back to selection'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={!pickedOption}
              onPress={handleContinue}
              style={{
                height: 54,
                borderRadius: R.lg,
                backgroundColor: pickedOption ? C.brand : '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {pickedOption
                  ? `${isHi ? 'आगे बढ़ें' : 'Continue'} · ${inr(pickedOption.total)}`
                  : (isHi ? 'जांच केंद्र चुनें' : 'Select a centre')}
              </Text>
            </Pressable>
          )}
        </View>
      </SheetFrame>

      {/* Profile & Language Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
