// apps/mobile/app/(tabs)/labs.tsx
// Labs & Scans: Pick tests first, then pick the diagnostic centre offering all selections.

import React, { useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Search } from 'lucide-react-native';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLocation } from '../../src/context/LocationContext';
import { saveNewBooking, subscribeCloudBookings } from '../../src/services/bookingStorage';
import { triggerBrowserNotification } from '../../src/services/notificationService';
import { uploadPrescriptionSlip } from '../../src/lib/supabase';

import { C, R, inr } from '../../src/theme';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { QuickAssistBar } from '../../components/ui/QuickAssistBar';
import { LabCardSkeleton } from '../../components/ui/SkeletonBox';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  CATEGORIES,
  ITEMS,
  ITEM_BY_ID,
  centresFor,
  partialCentresFor,
  fromPrice,
  homeAvailable,
  type Item,
  type Segment,
  type Centre,
} from '../../src/data/labsSample';
import { useLabItems, useLabCentres, useLabPrices } from '../../src/hooks/useSupabaseData';
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
  LabBookingModal,
  LabPrescriptionUploadModal,
} from '../../components/labs';

const wrap = {
  width: '100%' as const,
  maxWidth: 600,
  alignSelf: 'center' as const,
  paddingHorizontal: 16,
};

export default function LabsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
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
  const [labBookingModalVisible, setLabBookingModalVisible] = useState(false);
  const [prescriptionModalVisible, setPrescriptionModalVisible] = useState(false);
  const [confirmedLabBooking, setConfirmedLabBooking] = useState<Booking | null>(null);
  const [isSubmittingLab, setIsSubmittingLab] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<{
    totalAmount: number;
    centre: Centre;
    items?: Item[];
  } | null>(null);

  const { data: dbItems } = useLabItems();
  const { data: dbCentres } = useLabCentres();
  const [cartHydrated, setCartHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@adityam_lab_cart_v1')
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setCarts({
              lab: Array.isArray(parsed.lab) ? parsed.lab : [],
              scan: Array.isArray(parsed.scan) ? parsed.scan : [],
              package: Array.isArray(parsed.package) ? parsed.package : [],
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setCartHydrated(true));
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    AsyncStorage.setItem('@adityam_lab_cart_v1', JSON.stringify(carts)).catch(() => {});
  }, [carts, cartHydrated]);

  const liveItems: Item[] = useMemo(() => {
    if (dbItems && dbItems.length > 0) {
      return dbItems.map((d: any) => ({
        id: d.id,
        name: d.name,
        nameHi: d.name_hi ?? d.name,
        segment: d.segment as Segment,
        category: d.category,
        reportHrs: d.report_hrs,
        fastingHrs: d.fasting_hrs ?? null,
        about: d.about ?? '',
        aboutHi: d.about_hi ?? d.about ?? '',
        prep: d.prep ?? '',
        prepHi: d.prep_hi ?? d.prep ?? '',
        testsCount: d.tests_count ?? undefined,
      }));
    }
    return ITEMS;
  }, [dbItems]);

  const itemMap = useMemo(() => {
    const map: Record<string, Item> = { ...ITEM_BY_ID };
    for (const item of liveItems) {
      map[item.id] = item;
    }
    return map;
  }, [liveItems]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // Realtime subscription for Supabase cloud bookings
  useEffect(() => {
    const unsub = subscribeCloudBookings(user?.id);
    return () => unsub();
  }, [user?.id]);

  const allCartIds = useMemo(
    () => Array.from(new Set([...carts.lab, ...carts.scan, ...carts.package])),
    [carts]
  );
  const { data: dbPrices } = useLabPrices(allCartIds);

  const liveCentres: Centre[] = useMemo(() => {
    if (!dbCentres || dbCentres.length === 0) return [];
    const priceByCentre: Record<string, Record<string, number | null>> = {};
    for (const p of (dbPrices as any[]) || []) {
      const cid = String(p.centre_id || '');
      const iid = String(p.item_id || '');
      if (!cid || !iid) continue;
      if (!priceByCentre[cid]) priceByCentre[cid] = {};
      priceByCentre[cid][iid] = p.is_available === false ? null : Number(p.price || 0);
    }
    return (dbCentres as any[]).map((c: any) => ({
      id: c.id,
      name: c.name,
      area: c.area || c.city || 'Jaipur',
      areaHi: c.area_hi || c.area || c.city || 'जयपुर',
      city: c.city || 'Jaipur',
      lat: typeof c.latitude === 'number' ? c.latitude : undefined,
      lng: typeof c.longitude === 'number' ? c.longitude : undefined,
      distanceKm: Number(c.distance_km ?? 0),
      rating: Number(c.rating ?? 0),
      reviews: Number(c.reviews ?? 0),
      home: Boolean(c.home_collection),
      nextSlot: c.next_slot || 'Today, 5:00 PM',
      nextSlotHi: c.next_slot_hi || c.next_slot || 'आज, शाम 5:00 बजे',
      offers: (Array.isArray(c.offers) && c.offers.length > 0 ? c.offers : ['lab']) as Segment[],
      factor: Number(c.price_factor ?? 1),
      exclude: Array.isArray(c.exclude_items) ? c.exclude_items : undefined,
      prices: priceByCentre[c.id],
    }));
  }, [dbCentres, dbPrices]);
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

  const { coords: ctxCoords, activeAddress, currentLocationName } = useLocation();

  const userCoords = useMemo(() => {
    const locText = `${activeAddress?.city || ''} ${activeAddress?.landmark_street || ''} ${currentLocationName || ''} ${user?.city || ''}`.toLowerCase();
    const isJp = locText.includes('jaipur') || String(activeAddress?.pincode || '').startsWith('302');
    if (isJp) {
      const lat = Number(activeAddress?.latitude);
      const lng = Number(activeAddress?.longitude);
      if (lat >= 26.0 && lat <= 28.0 && lng >= 75.0 && lng <= 77.0) return { lat, lng };
      return { lat: 26.9205, lng: 75.8450 };
    }
    if (activeAddress?.latitude && activeAddress?.longitude) {
      return { lat: Number(activeAddress.latitude), lng: Number(activeAddress.longitude) };
    }
    if (ctxCoords?.latitude && ctxCoords?.longitude) {
      return { lat: ctxCoords.latitude, lng: ctxCoords.longitude };
    }
    return { lat: 26.9205, lng: 75.8450 };
  }, [activeAddress, ctxCoords, currentLocationName, user?.city]);

  const userCity = activeAddress?.city || currentLocationName || user?.city || 'Jaipur';

  const options = useMemo(
    () =>
      centresFor(
        cartIds.map((id) => itemMap[id] || ITEM_BY_ID[id]).filter(Boolean),
        userCoords,
        userCity,
        liveCentres,
        flt.home
      ),
    [cartIds, itemMap, userCoords, userCity, liveCentres, flt.home]
  );
  const partialOptions = useMemo(
    () =>
      partialCentresFor(
        cartIds.map((id) => itemMap[id] || ITEM_BY_ID[id]).filter(Boolean),
        userCoords,
        userCity,
        liveCentres,
        flt.home
      ),
    [cartIds, itemMap, userCoords, userCity, liveCentres, flt.home]
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
      const it = itemMap[id] || ITEM_BY_ID[id];
      return sum + (it ? fromPrice(it) : 0);
    }, 0);
  }, [cheapestTotal, cartIds, itemMap]);

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
    return liveItems
      .filter((i) => (segment === 'all' ? i.segment !== 'package' : i.segment === segment))
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
  }, [segment, category, query, flt, liveItems]);

  const packages = useMemo(() => liveItems.filter((i) => i.segment === 'package'), [liveItems]);
  const cats =
    segment === 'package'
      ? []
      : segment === 'all'
      ? flt.home
        ? CATEGORIES.lab.slice(0, 6)
        : [...CATEGORIES.lab.slice(0, 6), CATEGORIES.scan[3], CATEGORIES.scan[0]]
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

  const handleProceedToPayment = () => {
    const selectedOption = options.find((o) => o.centre.id === pick) || options[0];
    const selectedCentre = selectedOption?.centre;
    const totalAmount = selectedOption?.total || cheapestTotal || 0;
    if (!selectedCentre) return;

    setPendingBookingData({
      totalAmount,
      centre: selectedCentre,
      items: cartIds.map((id) => itemMap[id]).filter(Boolean),
    });
    setCentreSheet(false);
    setLabBookingModalVisible(true);
  };

  const handleConfirmLabBooking = async (
    patientName: string,
    patientPhone: string,
    collectionMode: 'HOME_COLLECTION' | 'CENTRE_VISIT',
    collectionAddress: string,
    slotString: string,
    paymentMethod: string,
    txnId: string
  ) => {
    if (!pendingBookingData) return;
    setIsSubmittingLab(true);
    const { totalAmount, centre } = pendingBookingData;
    const bookingRef = `AN-LAB-${Math.floor(1000 + Math.random() * 9000)}`;
    const testNames = cartIds.map((id) => itemMap[id]?.name || id).join(', ');

    const newBooking: Booking = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      booking_ref: bookingRef,
      service_type: 'INVESTIGATION',
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: centre.name || 'Diagnostic Partner Lab',
      branch_name: centre.area || currentLocationName || '',
      doctor_name: `${cartIds.length || 1} Tests Panel: ${testNames.slice(0, 45)}`,
      doctor_fee: totalAmount,
      slot_time: slotString,
      specialty_requested: segment === 'scan' ? 'Diagnostic Radiology' : 'Pathology Panel',
      status: 'PAID',
      call_status: 'connected',
      notes: `Mode: ${
        collectionMode === 'HOME_COLLECTION'
          ? `Home Sample Collection at ${collectionAddress}`
          : `Diagnostic Centre Walk-in at ${centre.name}`
      }. Tests: ${testNames}. Paid online via ${paymentMethod} (${txnId}).`,
      created_at: new Date().toISOString(),
    };

    try {
      await saveNewBooking(newBooking);
      triggerBrowserNotification(
        'Lab Appointment Confirmed',
        `Booking #${bookingRef} confirmed for ${centre.name}. Slot: ${slotString}`
      );
      setConfirmedLabBooking(newBooking);
      setCarts({ lab: [], scan: [], package: [] });
    } catch (e) {
      console.error('Failed to save lab booking:', e);
      Alert.alert(
        isHi ? 'त्रुटि' : 'Error',
        isHi ? 'बुकिंग दर्ज करने में समस्या आई।' : 'Failed to register booking. Please try again.'
      );
    } finally {
      setIsSubmittingLab(false);
    }
  };

  const handleUploadPrescription = () => {
    setPrescriptionModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: (cartIds.length ? 190 : 160) + insets.bottom,
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
            width: '100%',
            alignItems: 'center',
          }}
        >
          <View style={wrap}>
            <LabsSegmentSwitch
              value={segment}
              onChange={changeSegment}
              counts={counts}
              isHi={isHi}
            />
            <LabFilterPillsRow
              segment={segment}
              filters={flt}
              onToggleFilter={(key) =>
                setFlt((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              isHi={isHi}
            />
          </View>
        </View>

        {/* 2. Main Content Body */}
        <View style={[wrap, { paddingTop: 6 }]}>
          {/* Quick Assistance 3-Pill Bar (Call, Quick Order, WhatsApp) */}
          <QuickAssistBar
            context="labs"
            isHi={isHi}
            onPressQuickOrder={handleUploadPrescription}
            style={{ marginBottom: 12 }}
          />

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
              onPressUpload={handleUploadPrescription}
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
        partialOptions={partialOptions}
        onBookAvailableAtCentre={(opt) => {
          const keepIds = new Set(opt.availableItems.map((i) => i.id));
          setCarts((prev) => ({
            lab: prev.lab.filter((id) => keepIds.has(id)),
            scan: prev.scan.filter((id) => keepIds.has(id)),
            package: prev.package.filter((id) => keepIds.has(id)),
          }));
          setPick(opt.centre.id);
        }}
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
        onConfirm={handleProceedToPayment}
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

      {/* Lab Booking Modal (Home/Centre mode, patient selector, morning fasting slots, online payment & pass) */}
      <LabBookingModal
        visible={labBookingModalVisible}
        onClose={() => {
          setLabBookingModalVisible(false);
          setConfirmedLabBooking(null);
          setPendingBookingData(null);
        }}
        selectedCentre={pendingBookingData?.centre || null}
        selectedItems={pendingBookingData?.items || cartIds.map((id) => itemMap[id]).filter(Boolean)}
        totalAmount={pendingBookingData?.totalAmount || 0}
        onConfirmBooking={handleConfirmLabBooking}
        isSubmitting={isSubmittingLab}
        confirmedBooking={confirmedLabBooking}
        language={language}
        onViewAppointments={() => {
          setLabBookingModalVisible(false);
          setConfirmedLabBooking(null);
          setPendingBookingData(null);
          router.push('/appointments');
        }}
      />

      {/* Cross-Platform Lab Prescription Upload Modal */}
      <LabPrescriptionUploadModal
        visible={prescriptionModalVisible}
        onClose={() => setPrescriptionModalVisible(false)}
        isHi={isHi}
        onViewAppointments={() => router.push('/appointments')}
      />
    </View>
  );
}
