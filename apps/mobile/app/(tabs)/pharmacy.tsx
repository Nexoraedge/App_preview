// apps/mobile/app/(tabs)/pharmacy.tsx
// Pharmacy flow - Modularized Orchestrator

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronDown,
  Users,
  Clock,
  Navigation,
  Check,
  Truck,
  Store,
  ShieldCheck,
} from 'lucide-react-native';

import { C, R, SHADOW, inr } from '../../src/theme';
import { PrimaryButton, SheetFrame, tap, Segmented } from '../../components/ui/kit';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { VerifyPhoneModal } from '../../components/auth/VerifyPhoneModal';
import { useLanguage } from '../../src/context/LanguageContext';
import { useFamilyOptional } from '../../src/context/FamilyContext';
import { useAuth } from '../../src/context/AuthContext';
import { useLocation } from '../../src/context/LocationContext';
import { saveNewBooking, getLocalBookings, subscribeBookings, subscribeCloudBookings } from '../../src/services/bookingStorage';
import { triggerBrowserNotification } from '../../src/services/notificationService';
import { uploadPrescriptionSlip } from '../../src/lib/supabase';
import {
  PHARMACIES,
  SAMPLE_BILL,
  distanceKm,
  getPharmacyName,
  getPharmacyArea,
  type RequestStatus,
  type Pharmacy,
} from '../../src/data/pharmacySample';
import { usePharmacies } from '../../src/hooks/useSupabaseData';
import {
  Stage,
  Mode,
  HistoryItem,
  INITIAL_HISTORY,
  generateInvoiceHtml,
} from '../../src/data/pharmacyData';
import { pharmacyCopy } from '../../src/i18n/pharmacyCopy';
import { PrescriptionUploadCard } from '../../components/pharmacy/PrescriptionUploadCard';
import { FulfillmentModeSwitch } from '../../components/pharmacy/FulfillmentModeSwitch';
import { PharmacyShopCard } from '../../components/pharmacy/PharmacyShopCard';
import { OrderTrackingTimeline } from '../../components/pharmacy/OrderTrackingTimeline';
import { PharmacyBillCard } from '../../components/pharmacy/PharmacyBillCard';
import { OrderHistorySection } from '../../components/pharmacy/OrderHistorySection';
import { InvoiceDetailsModal } from '../../components/pharmacy/InvoiceDetailsModal';

const MAX_PAGES = 5;
const wrap = {
  width: '100%' as const,
  maxWidth: 560,
  alignSelf: 'center' as const,
  paddingHorizontal: 16,
};

function BottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(246, 248, 252, 0.98)',
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12) + 70,
      }}
    >
      <View style={wrap}>{children}</View>
    </View>
  );
}

export default function PharmacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fam = useFamilyOptional();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { coords: ctxCoords, activeAddress, currentLocationName } = useLocation();
  const isHi = language === 'hi';
  const c = isHi ? pharmacyCopy.hi : pharmacyCopy.en;

  const [stage, setStage] = useState<Stage>('home');
  const [images, setImages] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('delivery');
  const [sort, setSort] = useState<'near' | 'save'>('near');
  const [shopId, setShopId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<'idle' | 'asking' | 'ok' | 'denied'>('idle');
  const [status, setStatus] = useState<RequestStatus>('sent');
  const [paidInApp, setPaidInApp] = useState<boolean | null>(null);
  const [reqRef, setReqRef] = useState('');
  const [code, setCode] = useState('');
  const [patientNote, setPatientNote] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [selectedOrder, setSelectedOrder] = useState<HistoryItem | null>(null);
  const [memberSheet, setMemberSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);
  const askedLoc = useRef(false);

  // Load real pharmacy orders for logged-in user (clean state for fresh accounts)
  useEffect(() => {
    const loadRealPharmacyOrders = async () => {
      try {
        const allBookings = await getLocalBookings();
        const isDemo = user?.id === '00000000-0000-0000-0000-000000000001';
        const pharmacyBookings = allBookings.filter(
          (b) =>
            b.service_type === 'PHARMACY_SCAN_PAY' &&
            (isDemo
              ? b.user_id === '00000000-0000-0000-0000-000000000001' || !b.user_id
              : user?.id && b.user_id === user.id)
        );

        if (pharmacyBookings.length > 0) {
          const items: HistoryItem[] = pharmacyBookings.map((b) => {
            const hasRealBill = (b.final_payable && b.final_payable > 0) || (b.bill_amount && b.bill_amount > 0);
            return {
              ref: b.booking_ref,
              shop: b.hospital_name || 'Adityam Partner Pharmacy',
              shopHi: b.hospital_name || 'आदित्यम पार्टनर फार्मेसी',
              shopAddress: b.branch_name || 'Surajpole Gate, Jaipur',
              shopPhone: b.patient_phone || '+91 82713 10911',
              total: hasRealBill ? (b.final_payable || 0) : 0,
              subtotal: hasRealBill ? (b.bill_amount || 0) : 0,
              discount: hasRealBill ? (b.discount_amount || 0) : 0,
              deliveryFee: 0,
              mode: (b.slot_time || '').toLowerCase().includes('delivery') ? 'delivery' : 'pickup',
              paidInApp: Boolean(hasRealBill),
              date: new Date(b.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              status: hasRealBill ? (b.status === 'PAID' ? 'delivered' : 'ready') : 'ready',
              patientName: b.patient_name || user?.full_name || (isHi ? 'रोगी' : 'Patient'),
              items: [
                {
                  id: 'rx-1',
                  name: 'Prescription Medicine Order',
                  nameHi: 'पर्चे अनुसार औषधियां',
                  qty: 1,
                  price: hasRealBill ? (b.final_payable || b.bill_amount || 0) : 0,
                },
              ],
            };
          });
          setHistory(items);
        } else {
          setHistory([]);
        }
      } catch {
        setHistory([]);
      }
    };

    loadRealPharmacyOrders();
    const unsub = subscribeBookings(loadRealPharmacyOrders);
    return () => unsub();
  }, [user?.id]);

  const { data: dbPharmacies } = usePharmacies();

  // Auto-switch to Counter Pickup if selected pharmacy has disabled Home Delivery
  useEffect(() => {
    if (!dbPharmacies || !shopId) return;
    const found = dbPharmacies.find((p: any) => p.id === shopId);
    if (found && found.delivery === false && mode === 'delivery') {
      setMode('pickup');
    }
  }, [dbPharmacies, shopId, mode]);

  // Prefer live Supabase pharmacies (only active stores); fall back to static list only if offline/empty
  const livePharmacies: Pharmacy[] = useMemo(() => {
    if (dbPharmacies && dbPharmacies.length > 0) {
      return dbPharmacies
        .filter((p: any) => p.is_active !== false)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          nameHi: p.name_hi ?? p.name,
          area: p.area,
          areaHi: p.area_hi ?? p.area,
          lat: Number(p.latitude ?? p.lat ?? 26.9205),
          lng: Number(p.longitude ?? p.lng ?? 75.845),
          sampleKm: Number(p.distance_km ?? 1.2),
          rating: Number(p.rating ?? 4.5),
          reviews: Number(p.reviews ?? 100),
          delivery: Boolean(p.delivery),
          pickup: Boolean(p.pickup),
          appDiscountPct: Number(p.app_discount_pct ?? 15),
        }));
    }
    return [...PHARMACIES];
  }, [dbPharmacies]);

  // Priority coordinate resolution: Active Saved Address > LocationContext Coords > GPS > Regional Fallback
  const userCoords = useMemo(() => {
    if (activeAddress?.latitude && activeAddress?.longitude) {
      return { lat: Number(activeAddress.latitude), lng: Number(activeAddress.longitude) };
    }
    if (ctxCoords?.latitude && ctxCoords?.longitude) {
      return { lat: Number(ctxCoords.latitude), lng: Number(ctxCoords.longitude) };
    }
    if (coords?.lat && coords?.lng) {
      return coords;
    }
    const locText = `${activeAddress?.city || ''} ${activeAddress?.landmark_street || ''} ${currentLocationName || ''} ${user?.city || ''}`.toLowerCase();
    if (locText.includes('jaipur')) {
      return { lat: 26.9205, lng: 75.8450 }; // Mohanbari / Surajpole Gate, Jaipur
    }
    return { lat: 26.9205, lng: 75.8450 }; // Mohanbari / Surajpole Gate, Jaipur
  }, [activeAddress, ctxCoords, coords, currentLocationName, user?.city]);

  // Ask for location permission when user enters shops stage if not already determined
  useEffect(() => {
    if (stage !== 'shops' || askedLoc.current) return;
    askedLoc.current = true;
    setLocState('asking');
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          setLocState('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState('ok');
      } catch {
        setLocState('denied');
      }
    })();
  }, [stage]);

  // Realtime subscription for Supabase cloud bookings
  useEffect(() => {
    const unsub = subscribeCloudBookings(user?.id);
    return () => unsub();
  }, [user?.id]);

  // Calculate live real-time distance and filter pharmacies within active city radius
  const { shops, isSample } = useMemo(() => {
    const listWithDistance = livePharmacies.map((p) => {
      const d = distanceKm(userCoords, p);
      return {
        ...p,
        km: Math.round(d * 10) / 10,
      };
    });

    // Match local pharmacies (within 35 km of delivery doorstep)
    const nearby = listWithDistance.filter((p) => p.km <= 35);
    const usable = nearby.length > 0;
    const finalShops = usable
      ? nearby.sort((a, b) => a.km - b.km)
      : listWithDistance.sort((a, b) => a.km - b.km);

    return { shops: finalShops, isSample: !usable };
  }, [userCoords, livePharmacies]);

  const visibleShops = useMemo(() => {
    let l = shops.filter((s) => (mode === 'delivery' ? s.delivery : s.pickup));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      l = l.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nameHi.toLowerCase().includes(q) ||
          s.area.toLowerCase().includes(q) ||
          s.areaHi.toLowerCase().includes(q)
      );
    }
    return [...l].sort((a, b) =>
      sort === 'near' ? a.km - b.km : b.appDiscountPct - a.appDiscountPct
    );
  }, [shops, mode, sort, searchQuery]);

  const shop = shops.find((s) => s.id === shopId) ?? null;
  const subtotal = SAMPLE_BILL.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = shop ? Math.round((subtotal * shop.appDiscountPct) / 100) : 0;
  const total = subtotal - discount;
  const maxPct = Math.max(...livePharmacies.map((p) => p.appDiscountPct));
  const forName = fam?.active
    ? fam.active.relation === 'Self'
      ? user?.full_name || fam.active.name || (isHi ? 'रोगी' : 'Patient')
      : isHi
      ? fam.active.nameHi || fam.active.name
      : fam.active.name
    : user?.full_name || null;

  const addImages = (uris: string[]) =>
    setImages((prev) => [...prev, ...uris].slice(0, MAX_PAGES));

  const pickCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          isHi ? 'कैमरा अनुमति आवश्यक है' : 'Camera permission needed',
          isHi
            ? 'सेटिंग्स में कैमरा एक्सेस की अनुमति दें, या गैलरी से पर्चा अपलोड करें।'
            : 'Allow camera access in Settings, or upload from your gallery instead.'
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!res.canceled) addImages(res.assets.map((a) => a.uri));
    } catch {
      Alert.alert(
        isHi ? 'कैमरा नहीं खोला जा सका' : 'Could not open the camera',
        isHi
          ? 'कृपया पुनः प्रयास करें या गैलरी से अपलोड करें।'
          : 'Please try again, or upload from your gallery.'
      );
    }
  };

  const pickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_PAGES - images.length),
      });
      if (!res.canceled) addImages(res.assets.map((a) => a.uri));
    } catch {
      Alert.alert(
        isHi ? 'गैलरी नहीं खोली जा सकी' : 'Could not open your gallery',
        isHi ? 'कृपया पुनः प्रयास करें।' : 'Please try again.'
      );
    }
  };

  const sendRequest = async () => {
    if (!shop) return;
    if (!user?.phone || user.phone === '+91 99999 99999' || user.phone.startsWith('+9100') || user.phone.startsWith('+910')) {
      setIsVerifyPhoneOpen(true);
      return;
    }
    const orderRef = `AN-RX-${Math.floor(100000 + Math.random() * 900000)}`;
    const verifyCode = String(Math.floor(1000 + Math.random() * 9000));
    setReqRef(orderRef);
    setCode(verifyCode);
    setPaidInApp(true);
    setStatus('reviewing');
    setStage('track');

    // Upload first slip to Supabase storage
    let uploadedImageUrl = null;
    if (images.length > 0) {
      try {
        uploadedImageUrl = await uploadPrescriptionSlip(images[0], `${orderRef}_slip.jpg`);
      } catch (err) {
        console.warn('Storage upload error:', err);
      }
    }

    // Instantly save real booking to Supabase cloud
    const newBooking: any = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      booking_ref: orderRef,
      service_type: 'PHARMACY_SCAN_PAY',
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      patient_name: forName || user?.full_name || (isHi ? 'रोगी' : 'Patient'),
      patient_phone: (user?.phone && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910') && user.phone !== '+91 99999 99999') ? user.phone : '',
      hospital_id: shop.id,
      hospital_name: shop.name,
      branch_name: shop.area,
      doctor_name: 'Adityam Partner Pharmacy',
      doctor_fee: 0,
      slot_time: mode === 'delivery' ? 'Home Delivery (45 mins)' : 'Counter Pickup',
      specialty_requested: 'Pharmacy & Medicines',
      status: 'PAID',
      call_status: 'connected',
      verification_code: verifyCode,
      bill_amount: 0,
      discount_amount: 0,
      final_payable: 0,
      bill_image_url: uploadedImageUrl || images[0] || null,
      notes: `${patientNote.trim() ? `Customer Note: ${patientNote.trim()}. ` : ''}Prescription request sent to ${shop.name} (${shop.area}). ${images.length} slip(s) attached. Verification PIN: ${verifyCode}. Mode: ${mode}.${
        mode === 'delivery'
          ? ` Delivery Address: ${
              activeAddress
                ? [activeAddress.house_flat, activeAddress.landmark_street, activeAddress.city, activeAddress.pincode]
                    .filter(Boolean)
                    .join(', ')
                : currentLocationName || 'Current Location'
            }.`
          : ''
      }`,
      created_at: new Date().toISOString(),
    };

    await saveNewBooking(newBooking).catch(() => {});
    setPatientNote('');
    triggerBrowserNotification(
      'Prescription Sent to Pharmacy',
      `Order #${orderRef} dispatched to ${shop.name}. Mode: ${mode === 'delivery' ? 'Home Delivery' : 'Pickup'}`
    );
  };

  const payInApp = () => {
    setPaidInApp(true);
    setStatus('paid');
  };

  const payAtShop = () => {
    setPaidInApp(false);
    setStatus('ready');
  };

  const finish = () => {
    setImages([]);
    setShopId(null);
    setStatus('sent');
    setPaidInApp(null);
    setStage('home');
  };

  const handleDownloadInvoice = (order: HistoryItem) => {
    tap();
    const invoiceHtml = generateInvoiceHtml(order);
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    } else {
      Alert.alert(
        isHi ? 'इनवॉइस डाउनलोड हुआ' : 'Invoice Downloaded',
        isHi
          ? `ऑर्डर #${order.ref} का टैक्स इनवॉइस सफलतापूर्वक सहेजा गया। कुल देय राशि: ${inr(
              order.total
            )}`
          : `Tax Invoice for Order #${order.ref} (Total: ${inr(
              order.total
            )}) is ready.`
      );
    }
  };

  const openDirections = () => {
    if (!shop) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    ).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={{
          flex: 1,
          maxWidth: 600,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        <AppHeader
          title={c.headerTitle}
          onPressProfile={() => setProfileVisible(true)}
        >
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={c.searchPlaceholder}
          />
        </AppHeader>

        {/* ==================== 1. HOME STAGE ==================== */}
        {stage === 'home' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: (images.length ? 120 : 36) + insets.bottom + 65,
            }}
          >
            <View style={[wrap, { paddingTop: 10 }]}>
              {/* Family Member Chip */}
              {fam && forName && (
                <Pressable
                  onPress={() => {
                    tap();
                    setMemberSheet(true);
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: C.line,
                    borderRadius: R.pill,
                    paddingHorizontal: 14,
                    height: 38,
                    ...SHADOW,
                  }}
                >
                  <Users size={15} color={C.brand} />
                  <Text style={{ fontSize: 13, color: C.sub }}>
                    {c.patientTitle}
                  </Text>
                  <Text
                    style={{ fontSize: 13, fontWeight: '700', color: C.ink }}
                  >
                    {forName}
                  </Text>
                  <ChevronDown size={15} color={C.sub} />
                </Pressable>
              )}

              {/* Modular Prescription Upload Card */}
              <PrescriptionUploadCard
                isHi={isHi}
                images={images}
                maxPages={MAX_PAGES}
                onPickCamera={pickCamera}
                onPickGallery={pickGallery}
                onRemoveImage={(idx) =>
                  setImages((prev) => prev.filter((_, i) => i !== idx))
                }
              />

              {/* Modular Fulfillment Mode Switch */}
              <FulfillmentModeSwitch
                isHi={isHi}
                mode={mode}
                onSelectMode={setMode}
              />

              {/* Exclusive Savings Guarantee Pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: C.goodSoft,
                  borderRadius: R.lg,
                  padding: 13,
                  marginTop: 14,
                  borderWidth: 1,
                  borderColor: '#D1FAE5',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={20} color={C.good} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: C.ink,
                    }}
                  >
                    {isHi
                      ? `ऐप में भुगतान पर ${maxPct}% तक की बचत`
                      : `Save up to ${maxPct}% when you pay in the app`}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>
                    {isHi
                      ? 'छूट आपके द्वारा चुनी गई पार्टनर फार्मेसी पर निर्भर करती है।'
                      : 'The discount depends on the pharmacy you choose.'}
                  </Text>
                </View>
              </View>

              {/* Modular Order History Section */}
              <OrderHistorySection
                history={history}
                isHi={isHi}
                onSelectOrder={setSelectedOrder}
              />
            </View>
          </ScrollView>
        )}

        {/* Sticky Continue CTA on Home Stage */}
        {stage === 'home' && images.length > 0 && (
          <BottomBar>
            <PrimaryButton
              label={c.selectShopCta}
              onPress={() => setStage('shops')}
            />
          </BottomBar>
        )}

        {/* ==================== 2. SHOPS STAGE ==================== */}
        {stage === 'shops' && (
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 120 + insets.bottom + 65,
              }}
            >
              <View style={[wrap, { paddingTop: 10 }]}>
                {/* Back Button */}
                <Pressable
                  onPress={() => setStage('home')}
                  hitSlop={12}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                    alignSelf: 'flex-start',
                  }}
                >
                  <ChevronLeft size={20} color={C.brand} />
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: C.brand }}
                  >
                    {c.backToPrescription}
                  </Text>
                </Pressable>

                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: C.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {c.shopsHeaderTitle}
                </Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {images.length} {c.pagesAttached}
                </Text>

                {/* Delivery vs Pickup Mode Switch */}
                <View style={{ marginTop: 14 }}>
                  <Segmented<Mode>
                    value={mode}
                    onChange={(m) => {
                      setMode(m);
                      setShopId(null);
                    }}
                    options={[
                      {
                        id: 'delivery',
                        label: isHi ? 'होम डिलीवरी' : 'Home delivery',
                        icon: (
                          <Truck
                            size={16}
                            color={mode === 'delivery' ? C.brand : C.sub}
                          />
                        ),
                      },
                      {
                        id: 'pickup',
                        label: isHi ? 'दुकान से पिकअप' : 'Pick up at shop',
                        icon: (
                          <Store
                            size={16}
                            color={mode === 'pickup' ? C.brand : C.sub}
                          />
                        ),
                      },
                    ]}
                  />
                </View>

                {/* Sort Option Chips */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => setSort('near')}
                    style={{
                      height: 36,
                      paddingHorizontal: 14,
                      borderRadius: R.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor:
                        sort === 'near' ? C.brandSoft : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: sort === 'near' ? C.brand : C.line,
                    }}
                  >
                    {sort === 'near' && (
                      <Check size={13} color={C.brand} strokeWidth={3} />
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: sort === 'near' ? '700' : '500',
                        color: sort === 'near' ? C.brand : C.sub,
                      }}
                    >
                      {c.sortNearest}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSort('save')}
                    style={{
                      height: 36,
                      paddingHorizontal: 14,
                      borderRadius: R.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      backgroundColor:
                        sort === 'save' ? C.brandSoft : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: sort === 'save' ? C.brand : C.line,
                    }}
                  >
                    {sort === 'save' && (
                      <Check size={13} color={C.brand} strokeWidth={3} />
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: sort === 'save' ? '700' : '500',
                        color: sort === 'save' ? C.brand : C.sub,
                      }}
                    >
                      {c.sortDiscount}
                    </Text>
                  </Pressable>
                </View>

                {/* Out-of-radius / Location Notice */}
                {locState !== 'asking' && isSample && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: C.warnSoft,
                      borderRadius: R.md,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#FED7AA',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, fontWeight: '700', color: C.warn, lineHeight: 17 }}
                    >
                      {isHi
                        ? '📍 आपकी वर्तमान लोकेशन जयपुर डिलीवरी क्षेत्र (35 km) से बाहर है। नीचे हमारे अधिकृत जयपुर पार्टनर मेडिकल स्टोर दिखाए जा रहे हैं।'
                        : '📍 Your current location is outside our 35 km Jaipur doorstep delivery radius. Showing our verified Jaipur partner pharmacies below.'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {mode === 'delivery' && (
                        <Pressable
                          onPress={() => setMode('pickup')}
                          style={{
                            backgroundColor: '#FFFFFF',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#F59E0B',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B45309' }}>
                            {isHi ? 'दुकान से पिकअप चुनें' : 'Switch to Store Pickup'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => Linking.openURL('tel:+918271310911').catch(() => {})}
                        style={{
                          backgroundColor: '#B45309',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                          {isHi ? 'सहायता केंद्र कॉल करें' : 'Call Care Desk'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Modular Pharmacy Cards List */}
                <View style={{ gap: 11, marginTop: 14 }}>
                  {visibleShops.map((s, i) => (
                    <PharmacyShopCard
                      key={s.id}
                      shop={s}
                      isSelected={s.id === shopId}
                      isHi={isHi}
                      index={i}
                      onSelect={(id) => setShopId(id)}
                    />
                  ))}
                </View>

                {/* Instructions / Notes for Pharmacist */}
                <View
                  style={{
                    marginTop: 14,
                    backgroundColor: '#FFFFFF',
                    borderRadius: R.md,
                    padding: 13,
                    borderWidth: 1,
                    borderColor: C.line,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>
                    {isHi ? 'फार्मेसी के लिए निर्देश (वैकल्पिक)' : 'Instructions for Pharmacist (Optional)'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {(isHi
                      ? ['1 सप्ताह की दवा दें', '1 महीने की दवा दें', 'जेनेरिक विकल्प चलेगा', 'पैक करने से पहले कॉल करें']
                      : ['Need medicine for 1 week', 'Need medicine for 1 month', 'Generic substitute OK', 'Call before packing']
                    ).map((chip) => (
                      <Pressable
                        key={chip}
                        onPress={() =>
                          setPatientNote((prev) =>
                            prev.trim() ? (prev.includes(chip) ? prev : `${prev.trim()}, ${chip}`) : chip
                          )
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 99,
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '600', color: C.ink }}>{chip}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <TextInput
                    value={patientNote}
                    onChangeText={setPatientNote}
                    multiline
                    placeholder={
                      isHi
                        ? 'जैसे: केवल टैबलेट नं. 1 और 2 दें, 10 दिन के लिए...'
                        : 'e.g. Give only medicine #1 & #2 for 1 week, call if out of stock...'
                    }
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 10,
                      paddingHorizontal: 11,
                      paddingVertical: 9,
                      fontSize: 13,
                      color: C.ink,
                      minHeight: 54,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
              </View>
            </ScrollView>

            <BottomBar>
              <PrimaryButton
                label={
                  shop
                    ? isHi
                      ? `${getPharmacyName(shop, isHi)} को भेजें →`
                      : `Send to ${shop.name} →`
                    : isHi
                    ? 'फार्मेसी चुनें'
                    : 'Select a pharmacy'
                }
                disabled={!shop}
                onPress={sendRequest}
              />
            </BottomBar>
          </View>
        )}

        {/* ==================== 3. TRACK STAGE ==================== */}
        {stage === 'track' && (
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 120 + insets.bottom + 65,
              }}
            >
              <View style={[wrap, { paddingTop: 10 }]}>
                {/* Back to Pharmacy Header */}
                <TouchableOpacity
                  onPress={() => {
                    setStage('home');
                    setImages([]);
                    setShopId(null);
                  }}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    backgroundColor: '#EFF6FF',
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <ArrowLeft size={16} color="#2563EB" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                    {isHi ? '← दवा सूची व मुख्य पृष्ठ' : '← Back to Pharmacy'}
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: C.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {c.trackTitle}
                </Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {reqRef} ·{' '}
                  {mode === 'delivery' ? c.deliveryLabel : c.pickupLabel}
                </Text>

                {/* Selected Pharmacy Mini Summary Card */}
                {shop && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: '#FFFFFF',
                      borderRadius: R.lg,
                      borderWidth: 1,
                      borderColor: C.line,
                      padding: 13,
                      marginTop: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: C.brandSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {mode === 'delivery' ? (
                        <Truck size={20} color={C.brand} />
                      ) : (
                        <Store size={20} color={C.brand} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14.5,
                          fontWeight: '700',
                          color: C.ink,
                        }}
                      >
                        {getPharmacyName(shop, isHi)}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: C.sub, marginTop: 1 }}
                      >
                        {getPharmacyArea(shop, isHi)} · {shop.km}{' '}
                        {isHi ? 'किमी' : 'km'}
                      </Text>
                    </View>
                    {mode === 'pickup' && (
                      <Pressable
                        onPress={openDirections}
                        hitSlop={8}
                        style={{
                          height: 36,
                          paddingHorizontal: 12,
                          borderRadius: 18,
                          backgroundColor: C.brandSoft,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Navigation size={14} color={C.brand} />
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: '700',
                            color: C.brand,
                          }}
                        >
                          {isHi ? 'मैप' : 'Directions'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Modular 5-Step Order Timeline */}
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: R.xl,
                    borderWidth: 1,
                    borderColor: C.line,
                    padding: 16,
                    marginTop: 14,
                  }}
                >
                  <OrderTrackingTimeline
                    status={status}
                    mode={mode}
                    isHi={isHi}
                  />
                </View>

                {/* Informational Wait Notice */}
                {(status === 'sent' || status === 'reviewing') && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      backgroundColor: C.brandSoft,
                      borderRadius: R.lg,
                      padding: 13,
                      marginTop: 13,
                      alignItems: 'center',
                    }}
                  >
                    <Clock size={19} color={C.brand} />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12.5,
                        color: C.sub,
                        lineHeight: 18,
                      }}
                    >
                      {isHi
                        ? 'फार्मेसी आमतौर पर शीघ्र प्रतिक्रिया देती है। यदि जल्दी है तो पिकअप चुनें और सीधे दुकान पर जाएं।'
                        : 'The pharmacy is checking stocks & preparing your bill.'}
                    </Text>
                  </View>
                )}

                {/* Modular Itemized Bill Card */}
                {status === 'quoted' && shop && (
                  <PharmacyBillCard
                    items={SAMPLE_BILL}
                    shop={shop}
                    subtotal={subtotal}
                    discount={discount}
                    total={total}
                    mode={mode}
                    isHi={isHi}
                    onPayInApp={payInApp}
                    onPayAtShop={payAtShop}
                  />
                )}

                {/* Ready Code Verification Card */}
                {status === 'ready' && (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: R.xl,
                      borderWidth: 1,
                      borderColor: C.line,
                      padding: 18,
                      marginTop: 14,
                      ...SHADOW,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: C.sub,
                        marginTop: 4,
                        lineHeight: 19,
                      }}
                    >
                      {mode === 'pickup'
                        ? isHi
                          ? 'दुकान के काउंटर पर यह 4-अंकीय कोड दिखाएं:'
                          : 'Show this verification code at the pharmacy counter:'
                        : isHi
                        ? 'डिलीवरी कर्मी को यह 4-अंकीय कोड बताएं:'
                        : 'Share this verification code with the delivery person:'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 38,
                        fontWeight: '800',
                        color: C.ink,
                        letterSpacing: 8,
                        marginTop: 4,
                      }}
                    >
                      {code}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <BottomBar>
              <PrimaryButton
                label={c.doneBtn || (isHi ? 'संपन्न व मुख्य पृष्ठ' : 'Done / Return to Pharmacy')}
                onPress={finish}
              />
            </BottomBar>
          </View>
        )}
      </View>

      {/* Family Member Selection Sheet */}
      {fam && (
        <SheetFrame
          visible={memberSheet}
          onClose={() => setMemberSheet(false)}
          title={isHi ? 'यह ऑर्डर किसके लिए है?' : 'Who is this for?'}
        >
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            }}
          >
            <View style={{ gap: 10, marginTop: 4 }}>
              {fam.members.map((m) => {
                const sel = m.id === fam.activeId;
                const memberName = isHi && m.nameHi ? m.nameHi : m.name;
                const memberRelation =
                  m.relation === 'Self'
                    ? isHi
                      ? 'अकाउंट धारक (स्वयं)'
                      : 'Account holder'
                    : isHi
                    ? `${m.relationHi || m.relation} · ${m.age} वर्ष`
                    : `${m.relation} · ${m.age} yrs`;

                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      tap();
                      fam.setActive(m.id);
                      setMemberSheet(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: R.lg,
                      backgroundColor: sel ? C.brandSoft : '#FFFFFF',
                      borderWidth: sel ? 2 : 1,
                      borderColor: sel ? C.brand : C.line,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: C.ink,
                        }}
                      >
                        {m.relation === 'Self'
                          ? user?.full_name || m.name || (isHi ? 'स्वयं' : 'Self')
                          : memberName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.sub,
                          marginTop: 1,
                        }}
                      >
                        {memberRelation}
                      </Text>
                    </View>
                    {sel && <Check size={20} color={C.brand} strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                label={isHi ? 'परिवार के सदस्य प्रबंधित करें' : 'Manage family'}
                tone="ghost"
                onPress={() => {
                  setMemberSheet(false);
                  router.push('/family' as any);
                }}
              />
            </View>
          </View>
        </SheetFrame>
      )}

      {/* Modular Invoice Details Modal */}
      <InvoiceDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        isHi={isHi}
        onDownloadInvoice={handleDownloadInvoice}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />

      {/* Progressive Phone Verification for Google Login Users */}
      <VerifyPhoneModal
        visible={isVerifyPhoneOpen}
        onClose={() => setIsVerifyPhoneOpen(false)}
        onSuccess={() => {
          setIsVerifyPhoneOpen(false);
          sendRequest();
        }}
        isHi={isHi}
        title={isHi ? 'दवा ऑर्डर हेतु मोबाइल सत्यापन' : 'Verify Phone for Medicine Order'}
        subtitle={
          isHi
            ? 'दवा डिलीवरी और पार्टनर फार्मेसी डिस्पैच समन्वय के लिए 10-अंकों का मोबाइल नंबर सत्यापित करें।'
            : 'Delivery partners and licensed pharmacies require your verified mobile number to coordinate medicine dispatch and delivery.'
        }
      />
    </View>
  );
}
