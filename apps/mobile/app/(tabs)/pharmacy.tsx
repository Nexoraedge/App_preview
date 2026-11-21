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
import { playPatientBillChime } from '../../src/services/adminAlerts';
import { getSupabaseClient, uploadPrescriptionSlip } from '../../src/lib/supabase';
import {
  PHARMACIES,
  SAMPLE_BILL,
  distanceKm,
  getPharmacyName,
  getPharmacyArea,
  type BillLine,
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
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const { coords: ctxCoords, activeAddress, currentLocationName, openLocationPicker, openAddAddressModal, detectCurrentLocation } = useLocation();
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
  const [patientNameInput, setPatientNameInput] = useState(() => {
    const n = user?.full_name?.trim() || '';
    return n && n !== 'User' && n !== 'Patient' ? n : '';
  });
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [selectedOrder, setSelectedOrder] = useState<HistoryItem | null>(null);
  const [memberSheet, setMemberSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);
  const [liveTrackedBooking, setLiveTrackedBooking] = useState<any | null>(null);
  const [liveToast, setLiveToast] = useState<{ title: string; body: string; ref: string; kind: 'bill' | 'delivered' | 'cancelled' | 'dispatch' } | null>(null);
  const askedLoc = useRef(false);
  const billSoundPlayedRef = useRef<string | null>(null);
  const completedSoundPlayedRef = useRef<string | null>(null);
  const cancelledSoundPlayedRef = useRef<string | null>(null);
  const initializedOrdersRef = useRef(false);
  const knownStatusesRef = useRef<Record<string, string>>({});
  const knownSlotsRef = useRef<Record<string, string>>({});

  const syncTrackedBooking = (matched: any) => {
    if (!matched) return;
    setLiveTrackedBooking(matched);
    const hasBill =
      Number(matched.bill_amount || 0) > 0 &&
      matched.status !== 'NEW' &&
      matched.status !== 'CALLING';

    if (matched.status === 'CANCELLED' || matched.status === 'MISSED') {
      setStatus('sent');
      if (cancelledSoundPlayedRef.current !== matched.booking_ref) {
        cancelledSoundPlayedRef.current = matched.booking_ref;
        playPatientBillChime(
          isHi ? 'ऑर्डर रद्द / स्टॉक उपलब्ध नहीं' : 'Order Cancelled / Out of Stock',
          matched.partner_notes || `${matched.hospital_name || 'Pharmacy'} could not fulfill order #${matched.booking_ref}.`
        );
      }
    } else if (matched.status === 'COMPLETED') {
      setPaidInApp(true);
      setStatus('ready');
      if (completedSoundPlayedRef.current !== matched.booking_ref) {
        completedSoundPlayedRef.current = matched.booking_ref;
        playPatientBillChime(
          isHi ? 'ऑर्डर डिलीवर हो गया!' : 'Order Delivered! Thank You!',
          isHi
            ? `${matched.hospital_name || 'फार्मेसी'} से आपका ऑर्डर #${matched.booking_ref} सफलतापूर्वक पूरा हो गया है।`
            : `Your order #${matched.booking_ref} from ${matched.hospital_name || 'Pharmacy'} has been delivered. Thank you!`
        );
      }
    } else if (matched.status === 'PAID') {
      setPaidInApp(true);
      setStatus('ready');
    } else if (hasBill && matched.status === 'CONFIRMED') {
      setStatus('quoted');
      if (billSoundPlayedRef.current !== matched.booking_ref) {
        billSoundPlayedRef.current = matched.booking_ref;
        playPatientBillChime(
          isHi ? 'फार्मेसी से बिल प्राप्त हुआ!' : 'Medicine Bill Ready!',
          isHi
            ? `${matched.hospital_name || 'फार्मेसी'} ने ₹${matched.final_payable} का बिल भेजा है।`
            : `${matched.hospital_name || 'Pharmacy'} sent a bill of ₹${matched.final_payable}. Review & pay.`
        );
      }
    }
  };

  // Load real pharmacy orders for logged-in user (clean state for fresh accounts)
  useEffect(() => {
    const loadRealPharmacyOrders = async () => {
      try {
        const isDemo = user?.id === '00000000-0000-0000-0000-000000000001';
        let allBookings = await getLocalBookings();

        // Also pull latest from Supabase cloud so quote amounts & statuses are always fresh
        if (user?.id) {
          try {
            const supabase = getSupabaseClient();
            const { data: cloudRows } = await supabase
              .from('bookings')
              .select('*')
              .eq('service_type', 'PHARMACY_SCAN_PAY')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(50);
            if (cloudRows && cloudRows.length > 0) {
              const cloudRefs = new Set(cloudRows.map((r: any) => r.booking_ref));
              allBookings = [...(cloudRows as any[]), ...allBookings.filter((b) => !cloudRefs.has(b.booking_ref))];
            }
          } catch { }
        }

        const pharmacyBookings = allBookings.filter(
          (b) =>
            b.service_type === 'PHARMACY_SCAN_PAY' &&
            (isDemo
              ? b.user_id === '00000000-0000-0000-0000-000000000001' || !b.user_id
              : user?.id && b.user_id === user.id)
        );

        if (reqRef) {
          const tracked = pharmacyBookings.find((b) => b.booking_ref === reqRef);
          if (tracked) syncTrackedBooking(tracked);
        }

        // Notify patient with sound + banner if any order receives a bill or is delivered while on Home/Shops
        if (initializedOrdersRef.current) {
          for (const b of pharmacyBookings) {
            const prevStatus = knownStatusesRef.current[b.booking_ref];
            const prevSlot = knownSlotsRef.current[b.booking_ref];
            const hasBill = Number(b.bill_amount || 0) > 0;
            if ((b.status === 'CANCELLED' || b.status === 'MISSED') && prevStatus && prevStatus !== b.status) {
              const pNotes = (b as any).partner_notes as string | undefined;
              playPatientBillChime(
                isHi ? 'ऑर्डर रद्द / स्टॉक उपलब्ध नहीं' : 'Order Cancelled / Out of Stock',
                pNotes || `${b.hospital_name || 'Pharmacy'} could not fulfill #${b.booking_ref}.`
              );
              setLiveToast({
                title: isHi ? 'ऑर्डर रद्द / स्टॉक उपलब्ध नहीं' : 'Order Cancelled / Out of Stock',
                body: `${b.hospital_name || 'Pharmacy'} · #${b.booking_ref}${pNotes ? ` · ${pNotes}` : ''}`,
                ref: b.booking_ref,
                kind: 'cancelled',
              });
            } else if (b.status === 'CONFIRMED' && hasBill && prevStatus !== 'CONFIRMED') {
              playPatientBillChime(
                isHi ? 'फार्मेसी से बिल प्राप्त हुआ!' : 'Medicine Bill Ready!',
                `${b.hospital_name || 'Pharmacy'} sent a bill of ₹${b.final_payable || b.bill_amount} for #${b.booking_ref}.`
              );
              setLiveToast({
                title: isHi ? 'फार्मेसी से बिल प्राप्त हुआ!' : 'Medicine Bill Ready!',
                body: `${b.hospital_name || 'Pharmacy'} · #${b.booking_ref} · ₹${b.final_payable || b.bill_amount}`,
                ref: b.booking_ref,
                kind: 'bill',
              });
            } else if (b.status === 'COMPLETED' && prevStatus && prevStatus !== 'COMPLETED') {
              playPatientBillChime(
                isHi ? 'ऑर्डर डिलीवर हो गया!' : 'Order Delivered! Thank You!',
                `Your order #${b.booking_ref} from ${b.hospital_name || 'Pharmacy'} is completed.`
              );
              setLiveToast({
                title: isHi ? 'ऑर्डर डिलीवर हो गया!' : 'Order Delivered! Thank You!',
                body: `${b.hospital_name || 'Pharmacy'} · #${b.booking_ref}`,
                ref: b.booking_ref,
                kind: 'delivered',
              });
            } else if (
              b.status === 'PAID' &&
              b.slot_time &&
              prevSlot &&
              b.slot_time !== prevSlot
            ) {
              playPatientBillChime(
                isHi ? 'ऑर्डर अपडेट!' : `Order Update: ${b.slot_time}`,
                `${b.hospital_name || 'Pharmacy'} updated #${b.booking_ref} to "${b.slot_time}".`
              );
              setLiveToast({
                title: isHi ? `अपडेट: ${b.slot_time}` : `Order Update: ${b.slot_time}`,
                body: `${b.hospital_name || 'Pharmacy'} · #${b.booking_ref}`,
                ref: b.booking_ref,
                kind: 'dispatch',
              });
            }
          }
        }
        const nextKnown: Record<string, string> = {};
        const nextKnownSlots: Record<string, string> = {};
        for (const b of pharmacyBookings) {
          nextKnown[b.booking_ref] = b.status;
          nextKnownSlots[b.booking_ref] = b.slot_time || '';
        }
        knownStatusesRef.current = nextKnown;
        knownSlotsRef.current = nextKnownSlots;
        initializedOrdersRef.current = true;

        if (pharmacyBookings.length > 0) {
          const items: HistoryItem[] = pharmacyBookings.map((b) => {
            const hasRealBill = (b.final_payable && b.final_payable > 0) || (b.bill_amount && b.bill_amount > 0);
            const isPickup = (b.slot_time || '').toLowerCase().includes('pickup');
            const docText = String(b.doctor_name || '').trim();
            const parsedItems: BillLine[] = [];
            if (docText && docText !== 'Adityam Partner Pharmacy') {
              docText.split(',').map((s) => s.trim()).filter(Boolean).forEach((part, idx) => {
                const m = part.match(/^(.+?)\s*\(([^)]+)\)\s*₹\s*([0-9.]+)$/);
                if (m) {
                  parsedItems.push({
                    id: `rx-${idx}`,
                    name: m[1].trim(),
                    nameHi: m[1].trim(),
                    qty: Number(m[2]) || 1,
                    price: Number(m[3]) || 0,
                  });
                }
              });
            }
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
              mode: isPickup ? 'pickup' : 'delivery',
              paidInApp: b.status === 'PAID' || b.status === 'COMPLETED',
              date: new Date(b.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              status:
                b.status === 'CANCELLED' || b.status === 'MISSED'
                  ? 'cancelled'
                  : b.status === 'COMPLETED'
                    ? isPickup
                      ? 'picked_up'
                      : 'delivered'
                    : (b.slot_time || '').toLowerCase().includes('out for delivery')
                      ? 'out_for_delivery'
                      : 'ready',
              patientName: b.patient_name || user?.full_name || (isHi ? 'रोगी' : 'Patient'),
              verificationCode: (b as any).verification_code || '',
              cancelReason: (b as any).partner_notes || undefined,
              prescriptionUrl: (b as any).bill_image_url || undefined,
              items:
                parsedItems.length > 0
                  ? parsedItems
                  : [
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
    const pollTimer = setInterval(loadRealPharmacyOrders, 3000);
    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, [user?.id, reqRef]);

  const { data: dbPharmacies } = usePharmacies();

  // Auto-switch to Counter Pickup if selected pharmacy has disabled Home Delivery
  useEffect(() => {
    if (!dbPharmacies || !shopId) return;
    const found = dbPharmacies.find((p: any) => p.id === shopId);
    if (found && found.delivery === false && mode === 'delivery') {
      setMode('pickup');
    }
  }, [dbPharmacies, shopId, mode]);

  // Live Supabase pharmacies ONLY (never fall back to demo stores when all shops are closed)
  const livePharmacies: Pharmacy[] = useMemo(() => {
    if (!dbPharmacies || dbPharmacies.length === 0) return [];
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
  }, [dbPharmacies]);

  // Priority coordinate resolution: Active Saved Address > LocationContext Coords > Local GPS (NO fake fallback)
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
    return null;
  }, [activeAddress, ctxCoords, coords]);

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

  // Live poll + Supabase channel for active order tracking so bill appears immediately with chime
  useEffect(() => {
    if (stage !== 'track' || !reqRef) return;
    let cancelled = false;
    const supabase = getSupabaseClient();

    const fetchLatestOrder = async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_ref', reqRef)
          .maybeSingle();
        if (!cancelled && data) {
          syncTrackedBooking(data);
        }
      } catch { }
    };

    fetchLatestOrder();
    const timer = setInterval(fetchLatestOrder, 3000);
    const ch = supabase
      .channel(`patient-rx-${reqRef}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `booking_ref=eq.${reqRef}` },
        (payload: any) => {
          if (!cancelled && payload?.new) {
            syncTrackedBooking(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(ch);
    };
  }, [stage, reqRef]);

  // Calculate live real-time distance only when real coordinates are available
  const { shops, isSample } = useMemo(() => {
    const listWithDistance = livePharmacies.map((p) => {
      const d = userCoords ? distanceKm(userCoords, p) : -1;
      return {
        ...p,
        km: d >= 0 ? Math.round(d * 10) / 10 : -1,
      };
    });

    if (!userCoords) {
      return { shops: listWithDistance, isSample: false };
    }

    // Match local pharmacies (within 35 km of delivery doorstep)
    const nearby = listWithDistance.filter((p) => p.km <= 35);
    const usable = nearby.length > 0;
    const finalShops = usable
      ? nearby.sort((a, b) => a.km - b.km)
      : listWithDistance.sort((a, b) => a.km - b.km);

    return { shops: finalShops, isSample: livePharmacies.length > 0 && !usable };
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
  const maxPct = livePharmacies.length > 0 ? Math.max(...livePharmacies.map((p) => p.appDiscountPct)) : 20;
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

    const effectiveName = patientNameInput.trim() || (forName && forName !== 'User' && forName !== 'Patient' ? forName : '');
    if (!effectiveName) {
      const msg = isHi
        ? 'कृपया ऑर्डर भेजने से पहले रोगी का नाम दर्ज करें।'
        : 'Please enter the patient name before sending your prescription.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert(isHi ? 'नाम आवश्यक है' : 'Patient Name Required', msg);
      }
      return;
    }
    if (!user?.full_name || user.full_name === 'User' || user.full_name === 'Patient') {
      updateUser({ full_name: effectiveName });
    }

    let resolvedLat = activeAddress?.latitude ? Number(activeAddress.latitude) : ctxCoords?.latitude ? Number(ctxCoords.latitude) : coords?.lat;
    let resolvedLng = activeAddress?.longitude ? Number(activeAddress.longitude) : ctxCoords?.longitude ? Number(ctxCoords.longitude) : coords?.lng;

    if (mode === 'delivery') {
      if (!activeAddress) {
        const msg = isHi
          ? 'कृपया होम डिलीवरी के लिए अपना पूरा पता (मकान/फ्लैट नं., गली, पिनकोड) जोड़ें या चुनें।'
          : 'Please add or select a complete delivery address (House/Flat No., Street, Pincode) for Home Delivery.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert(isHi ? 'पूरा पता आवश्यक है' : 'Complete Delivery Address Required', msg);
        }
        openAddAddressModal();
        return;
      }
    }

    const orderRef = `AN-RX-${Math.floor(100000 + Math.random() * 900000)}`;
    const verifyCode = String(Math.floor(1000 + Math.random() * 9000));
    setReqRef(orderRef);
    setCode(verifyCode);
    setPaidInApp(null);
    setLiveTrackedBooking(null);
    billSoundPlayedRef.current = null;
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
      patient_name: effectiveName,
      patient_phone: (user?.phone && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910') && user.phone !== '+91 99999 99999') ? user.phone : '',
      hospital_id: shop.id,
      hospital_name: shop.name,
      branch_name: shop.area,
      doctor_name: 'Adityam Partner Pharmacy',
      doctor_fee: 0,
      slot_time: mode === 'delivery' ? 'Home Delivery' : 'Counter Pickup',
      specialty_requested: 'Pharmacy & Medicines',
      status: 'NEW',
      call_status: 'connected',
      verification_code: verifyCode,
      bill_amount: 0,
      discount_amount: 0,
      final_payable: 0,
      bill_image_url: uploadedImageUrl || images[0] || null,
      notes: `${patientNote.trim() ? `Customer Note: ${patientNote.trim()}. ` : ''}Prescription request sent to ${shop.name} (${shop.area}). ${images.length} slip(s) attached. Mode: ${mode}.${mode === 'delivery'
          ? ` Delivery Address: ${activeAddress
            ? [activeAddress.house_flat, activeAddress.landmark_street, activeAddress.city, activeAddress.pincode]
              .filter(Boolean)
              .join(', ')
            : currentLocationName && currentLocationName !== 'Select Location'
              ? currentLocationName
              : user?.city
                ? `${user.city} (GPS)`
                : 'GPS Location'
          }.${resolvedLat && resolvedLng ? ` GPS: ${resolvedLat.toFixed(5)},${resolvedLng.toFixed(5)}.` : userCoords?.lat && userCoords?.lng ? ` GPS: ${userCoords.lat.toFixed(5)},${userCoords.lng.toFixed(5)}.` : ''}`
          : ''
        }`,
      created_at: new Date().toISOString(),
    };

    await saveNewBooking(newBooking).catch(() => { });
    setPatientNote('');
    triggerBrowserNotification(
      'Prescription Sent to Pharmacy',
      `Order #${orderRef} dispatched to ${shop.name}. Mode: ${mode === 'delivery' ? 'Home Delivery' : 'Pickup'}`
    );
  };

  const payInApp = async () => {
    setPaidInApp(true);
    setStatus('ready');
    if (reqRef) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('bookings')
          .update({ status: 'PAID', updated_at: new Date().toISOString() })
          .eq('booking_ref', reqRef);
      } catch { }
    }
  };

  const payAtShop = async () => {
    setPaidInApp(false);
    setStatus('ready');
    if (reqRef) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('bookings')
          .update({ status: 'PAID', updated_at: new Date().toISOString() })
          .eq('booking_ref', reqRef);
      } catch { }
    }
  };

  const finish = () => {
    setImages([]);
    setShopId(null);
    setStatus('sent');
    setPaidInApp(null);
    setLiveTrackedBooking(null);
    billSoundPlayedRef.current = null;
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
    ).catch(() => { });
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

        {liveToast && (
          <Pressable
            onPress={() => {
              const found = history.find((h) => h.ref === liveToast.ref);
              if (found) setSelectedOrder(found);
              setLiveToast(null);
            }}
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              backgroundColor:
                liveToast.kind === 'cancelled'
                  ? '#FEF2F2'
                  : liveToast.kind === 'delivered'
                    ? '#DCFCE7'
                    : '#EFF6FF',
              borderWidth: 1,
              borderColor:
                liveToast.kind === 'cancelled'
                  ? '#FECACA'
                  : liveToast.kind === 'delivered'
                    ? '#86EFAC'
                    : '#93C5FD',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color:
                    liveToast.kind === 'cancelled'
                      ? '#B91C1C'
                      : liveToast.kind === 'delivered'
                        ? '#166534'
                        : '#1D4ED8',
                }}
              >
                {liveToast.title}
              </Text>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '600',
                  color:
                    liveToast.kind === 'cancelled'
                      ? '#991B1B'
                      : liveToast.kind === 'delivered'
                        ? '#15803D'
                        : '#1E40AF',
                  marginTop: 1,
                }}
              >
                {liveToast.body}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '800',
                color:
                  liveToast.kind === 'cancelled'
                    ? '#B91C1C'
                    : liveToast.kind === 'delivered'
                      ? '#166534'
                      : '#1D4ED8',
              }}
            >
              {liveToast.kind === 'bill' ? (isHi ? 'देखें व भुगतान करें →' : 'View & Pay →') : (isHi ? 'देखें →' : 'View →')}
            </Text>
          </Pressable>
        )}

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

                {/* No-Location Banner (never fake distance when GPS/Address not set) */}
                {!userCoords && livePharmacies.length > 0 && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: '#EFF6FF',
                      borderRadius: R.md,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF', lineHeight: 17 }}>
                      {isHi
                        ? '📍 सटीक दूरी और होम डिलीवरी के लिए अपनी लोकेशन या पता चुनें।'
                        : '📍 Set your delivery address or enable GPS to see exact distance from each pharmacy.'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => detectCurrentLocation()}
                        style={{
                          backgroundColor: '#2563EB',
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                          {isHi ? 'GPS से लोकेशन चुनें' : 'Use GPS Location'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openAddAddressModal()}
                        style={{
                          backgroundColor: '#FFFFFF',
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#93C5FD',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1D4ED8' }}>
                          {isHi ? 'पता जोड़ें / चुनें' : '+ Add / Select Address'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Out-of-radius / Location Notice */}
                {locState !== 'asking' && livePharmacies.length > 0 && isSample && (
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
                        onPress={() => Linking.openURL('tel:+918271310911').catch(() => { })}
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
                  {visibleShops.length === 0 ? (
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: R.xl,
                        borderWidth: 1,
                        borderColor: C.line,
                        padding: 22,
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Store size={32} color="#94A3B8" />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, textAlign: 'center' }}>
                        {isHi ? 'अभी कोई पार्टनर फार्मेसी खुली नहीं है' : 'All Partner Pharmacies Are Currently Closed'}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: C.sub, textAlign: 'center', lineHeight: 18 }}>
                        {isHi
                          ? 'सभी नज़दीकी पार्टनर स्टोर अभी बंद हैं। कृपया थोड़ी देर बाद पुनः प्रयास करें।'
                          : 'Our partner pharmacies are closed right now. Please check back shortly or contact our care desk.'}
                      </Text>
                    </View>
                  ) : (
                    visibleShops.map((s, i) => (
                      <PharmacyShopCard
                        key={s.id}
                        shop={s}
                        isSelected={s.id === shopId}
                        isHi={isHi}
                        index={i}
                        onSelect={(id) => setShopId(id)}
                      />
                    ))
                  )}
                </View>

                {visibleShops.length > 0 && (
                  <>
                    {/* Patient Name & Delivery Address (Prefilled if saved, prompted if missing) */}
                    <View
                      style={{
                        marginTop: 14,
                        backgroundColor: '#FFFFFF',
                        borderRadius: R.md,
                        padding: 13,
                        borderWidth: 1,
                        borderColor: C.line,
                        gap: 10,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>
                        {isHi ? 'रोगी का नाम व डिलीवरी विवरण' : 'Patient Name & Delivery Details'}
                      </Text>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.sub }}>
                          {isHi ? 'रोगी का नाम *' : 'Patient Name *'}
                        </Text>
                        <TextInput
                          value={patientNameInput}
                          onChangeText={setPatientNameInput}
                          placeholder={isHi ? 'रोगी का पूरा नाम लिखें' : 'Enter patient full name'}
                          placeholderTextColor="#94A3B8"
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 10,
                            paddingHorizontal: 11,
                            paddingVertical: 9,
                            fontSize: 13.5,
                            color: C.ink,
                          }}
                        />
                      </View>
                      {mode === 'delivery' && (
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.sub }}>
                            {isHi ? 'पूरा डिलीवरी पता *' : 'Complete Delivery Address *'}
                          </Text>
                          <Pressable
                            onPress={() => (activeAddress ? openLocationPicker() : openAddAddressModal())}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#F8FAFC',
                              borderWidth: 1,
                              borderColor: activeAddress ? '#CBD5E1' : '#93C5FD',
                              borderRadius: 10,
                              paddingHorizontal: 11,
                              paddingVertical: 10,
                              gap: 8,
                            }}
                          >
                            <Text style={{ flex: 1, fontSize: 13, color: activeAddress ? C.ink : '#2563EB', fontWeight: activeAddress ? '500' : '700' }} numberOfLines={2}>
                              {activeAddress
                                ? `${activeAddress.type === 'Other' && activeAddress.label ? activeAddress.label : activeAddress.type}: ${[
                                  activeAddress.house_flat,
                                  activeAddress.landmark_street,
                                  activeAddress.city,
                                  activeAddress.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}`
                                : (isHi ? '+ पूरा पता जोड़ें (मकान/फ्लैट, गली, पिनकोड)' : '+ Add Proper Delivery Address (House/Flat, Street, Pin)')}
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: C.brand }}>
                              {activeAddress ? (isHi ? 'बदलें' : 'Change') : (isHi ? '+ जोड़ें' : '+ Add')}
                            </Text>
                          </Pressable>
                        </View>
                      )}
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
                  </>
                )}
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
                    {isHi ? ' दवा सूची व मुख्य पृष्ठ' : ' Back to Pharmacy'}
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

                {/* Cancelled / Out of Stock Banner */}
                {(liveTrackedBooking?.status === 'CANCELLED' || liveTrackedBooking?.status === 'MISSED') ? (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: '#FEF2F2',
                      borderRadius: R.xl,
                      borderWidth: 1.5,
                      borderColor: '#FECACA',
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#B91C1C' }}>
                      {isHi ? 'ऑर्डर रद्द • स्टॉक उपलब्ध नहीं' : 'Order Cancelled / Out of Stock'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#991B1B', lineHeight: 19 }}>
                      {liveTrackedBooking?.partner_notes ||
                        (isHi
                          ? 'फार्मेसी में कुछ दवाइयां उपलब्ध नहीं थीं। कृपया दूसरी नज़दीकी फार्मेसी चुनें।'
                          : 'The pharmacy could not fulfill this prescription right now. Please try another nearby pharmacy.')}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShopId(null);
                        setStage('shops');
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: '#DC2626',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {isHi ? 'दूसरी फार्मेसी चुनें' : 'Select Another Pharmacy'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (status === 'sent' || status === 'reviewing') && (
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
                {status === 'quoted' && shop && (() => {
                  const realGross = Number(liveTrackedBooking?.bill_amount || 0);
                  const realDisc = Number(liveTrackedBooking?.discount_amount || 0);
                  const realTotal = Number(liveTrackedBooking?.final_payable || Math.max(0, realGross - realDisc));
                  const docText = String(liveTrackedBooking?.doctor_name || '').trim();
                  const parsedLines: BillLine[] = [];
                  if (docText && docText !== 'Adityam Partner Pharmacy') {
                    docText.split(',').map((s) => s.trim()).filter(Boolean).forEach((part, idx) => {
                      const m = part.match(/^(.+?)\s*\(([^)]+)\)\s*₹\s*([0-9.]+)$/);
                      if (m) {
                        parsedLines.push({
                          id: `rx-${idx}`,
                          name: m[1].trim(),
                          nameHi: m[1].trim(),
                          qty: Number(m[2]) || 1,
                          price: Number(m[3]) || 0,
                        });
                      }
                    });
                  }
                  const billItems: BillLine[] = parsedLines.length > 0
                    ? parsedLines
                    : [
                      {
                        id: 'rx-1',
                        name: 'Prescription Medicine Order',
                        nameHi: 'पर्चे अनुसार औषधियां',
                        qty: 1,
                        price: realGross > 0 ? realGross : subtotal,
                      },
                    ];
                  return (
                    <PharmacyBillCard
                      items={billItems}
                      shop={shop}
                      subtotal={realGross > 0 ? realGross : subtotal}
                      discount={realGross > 0 ? realDisc : discount}
                      total={realGross > 0 ? realTotal : total}
                      mode={mode}
                      isHi={isHi}
                      onPayInApp={payInApp}
                      onPayAtShop={payAtShop}
                    />
                  );
                })()}

                {/* Ready Code Verification Card OR Delivered Thank You Card */}
                {status === 'ready' && liveTrackedBooking?.status === 'COMPLETED' ? (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: '#ECFDF5',
                      borderRadius: R.xl,
                      borderWidth: 1.5,
                      borderColor: '#86EFAC',
                      padding: 20,
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#16A34A',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={26} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#166534', textAlign: 'center' }}>
                      {mode === 'pickup'
                        ? isHi
                          ? 'ऑर्डर पिकअप पूर्ण • धन्यवाद!'
                          : 'Order Picked Up! Thank You!'
                        : isHi
                          ? 'ऑर्डर डिलीवर हो गया • धन्यवाद!'
                          : 'Order Delivered! Thank You!'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#15803D', textAlign: 'center', lineHeight: 19 }}>
                      {isHi
                        ? 'आदित्यम निरामया फार्मेसी से दवाइयां लेने के लिए धन्यवाद। आपके अच्छे स्वास्थ्य की कामना करते हैं।'
                        : `Your medicines from ${shop ? getPharmacyName(shop, isHi) : 'the pharmacy'} have been safely handed over. Wishing you a speedy recovery!`}
                    </Text>
                    {history.find((h) => h.ref === reqRef) && (
                      <Pressable
                        onPress={() => {
                          const found = history.find((h) => h.ref === reqRef);
                          if (found) handleDownloadInvoice(found);
                        }}
                        style={{
                          marginTop: 4,
                          backgroundColor: '#16A34A',
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                          {isHi ? 'टैक्स इनवॉइस डाउनलोड करें' : 'Download Tax Invoice'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : status === 'ready' ? (
                  <View style={{ gap: 12, marginTop: 14 }}>
                    <View
                      style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: R.xl,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1D4ED8' }}>
                          {mode === 'delivery'
                            ? isHi
                              ? 'डिलीवरी समय (फार्मेसी द्वारा सेट)'
                              : 'Delivery Schedule (Set by Pharmacy)'
                            : isHi
                              ? 'पिकअप समय (फार्मेसी द्वारा सेट)'
                              : 'Pickup Schedule (Set by Pharmacy)'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#FFFFFF',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: R.pill,
                            borderWidth: 1,
                            borderColor: '#93C5FD',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1D4ED8' }}>
                            {liveTrackedBooking?.slot_time &&
                              liveTrackedBooking.slot_time !== 'Home Delivery' &&
                              liveTrackedBooking.slot_time !== 'Counter Pickup'
                              ? liveTrackedBooking.slot_time
                              : mode === 'delivery'
                                ? isHi
                                  ? '24 घंटे से पहले'
                                  : 'Before 24 Hours'
                                : isHi
                                  ? 'तैयार किया जा रहा है'
                                  : 'Being Packed'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12.5, color: '#1E3A8A', lineHeight: 18 }}>
                        {mode === 'delivery'
                          ? isHi
                            ? 'यह आपको 24 घंटे से पहले डिलीवर कर दिया जाएगा। डिलीवरी से पहले हमारी टीम आपको कॉल करेगी।'
                            : 'It will be delivered to you before 24 hours. Our pharmacy team will call you before delivery.'
                          : isHi
                            ? 'दवाइयां पैक होते ही फार्मेसी टीम आपको कॉल करेगी।'
                            : 'Our pharmacy team will call you as soon as your medicines are packed & ready for pickup.'}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: R.xl,
                        borderWidth: 1,
                        borderColor: C.line,
                        padding: 18,
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
                  </View>
                ) : null}
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
        onPayOrder={async (order) => {
          try {
            const supabase = getSupabaseClient();
            await supabase
              .from('bookings')
              .update({ status: 'PAID', updated_at: new Date().toISOString() })
              .eq('booking_ref', order.ref);
            const updated = { ...order, paidInApp: true };
            setSelectedOrder(updated);
            setHistory((prev) => prev.map((h) => (h.ref === order.ref ? updated : h)));
          } catch { }
        }}
        onReorder={(order) => {
          setSelectedOrder(null);
          setImages(order.prescriptionUrl ? [order.prescriptionUrl] : []);
          setShopId(null);
          setMode(order.mode || 'delivery');
          setPatientNote('');
          setStage('shops');
        }}
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
