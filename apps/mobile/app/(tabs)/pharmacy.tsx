// app/(tabs)/pharmacy.tsx
// Pharmacy flow: Upload prescription -> Pick partner pharmacy (delivery / pickup)
//                -> Pharmacist reviews and generates bill -> Pay in app with exclusive discount -> Collect / Home delivery
// Fully localized (English & Hindi) with zero haptics, responsive layout, AppHeader, and ProfileModal integration.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Linking,
  StatusBar as RNStatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  Camera,
  Upload,
  X,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  Truck,
  Store,
  FileText,
  ShieldCheck,
  Users,
  Clock,
  Pill,
  Navigation,
  Download,
  Phone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';

import { C, R, SHADOW, inr } from '../../src/theme';
import { PressableCard } from '../../components/ui/PressableCard';
import { Chip, Segmented, PrimaryButton, SheetFrame, tap } from '../../components/ui/kit';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { useLanguage } from '../../src/context/LanguageContext';
import { useFamilyOptional } from '../../src/context/FamilyContext';
import {
  PHARMACIES,
  SAMPLE_BILL,
  STATUS_ORDER,
  distanceKm,
  getPharmacyName,
  getPharmacyArea,
  getBillItemName,
  type RequestStatus,
  type Pharmacy,
  type BillLine,
} from '../../src/data/pharmacySample';

type Stage = 'home' | 'shops' | 'track';
type Mode = 'delivery' | 'pickup';

export type HistoryStatus = 'delivered' | 'picked_up' | 'ready' | 'out_for_delivery';

export type HistoryItem = {
  ref: string;
  shop: string;
  shopHi?: string;
  shopAddress?: string;
  shopPhone?: string;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  mode: Mode;
  paidInApp: boolean;
  date: string;
  status: HistoryStatus;
  patientName: string;
  items: BillLine[];
};

const INITIAL_HISTORY: HistoryItem[] = [
  {
    ref: 'RX-5730',
    shop: 'Saket Care Pharmacy',
    shopHi: 'साकेत केयर फार्मेसी',
    shopAddress: 'Shop 4, Main Market, Saket, South Delhi',
    shopPhone: '+91 98112 34567',
    total: 306,
    subtotal: 360,
    discount: 54,
    deliveryFee: 0,
    mode: 'delivery',
    paidInApp: true,
    date: '19 Oct 2026, 04:30 PM',
    status: 'delivered',
    patientName: 'Myself (Rahul Sharma)',
    items: [
      { id: 'm1', name: 'Paracetamol 500 mg (10 tablets)', nameHi: 'पैरासिटामोल 500 मि.ग्रा. (10 गोलियां)', qty: 2, price: 30 },
      { id: 'm2', name: 'Azithromycin 500 mg (3 tablets)', nameHi: 'एज़िथ्रोमाइसिन 500 मि.ग्रा. (3 गोलियां)', qty: 1, price: 120 },
      { id: 'm3', name: 'Cetirizine 10 mg (10 tablets)', nameHi: 'सिट्रीज़िन 10 मि.ग्रा. (10 गोलियां)', qty: 1, price: 40 },
      { id: 'm4', name: 'Vitamin D3 60000 IU (4 capsules)', nameHi: 'विटामिन D3 60000 IU (4 कैप्सूल)', qty: 1, price: 140 },
    ],
  },
];

const MAX_PAGES = 5;
const wrap = { width: '100%' as const, maxWidth: 560, alignSelf: 'center' as const, paddingHorizontal: 16 };

// ---------- Sort Chip Component ----------
function SortChip({
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
      onPress={() => {
        tap();
        onPress();
      }}
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

// ---------- Bottom Action Bar ----------
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
        paddingBottom: Math.max(insets.bottom, 12) + 70, // Accounts for floating bottom capsule bar
      }}
    >
      <View style={wrap}>{children}</View>
    </View>
  );
}

// ---------- Request Timeline Component ----------
function Timeline({
  status,
  mode,
  isHi,
}: {
  status: RequestStatus;
  mode: Mode;
  isHi: boolean;
}) {
  const idx = STATUS_ORDER.indexOf(status);

  const steps = [
    {
      title: isHi ? 'पर्चा भेज दिया गया' : 'Prescription sent',
      sub: isHi ? 'फार्मेसी को पर्चा प्राप्त हो गया है' : 'The pharmacy has received it',
    },
    {
      title: isHi ? 'फार्मासिस्ट जांच कर रहे हैं' : 'Pharmacist is checking',
      sub: isHi ? 'दवाओं और स्टॉक का मिलान किया जा रहा है' : 'They match your medicines and stock',
    },
    {
      title: isHi ? 'बिल तैयार है' : 'Bill ready',
      sub: isHi ? 'बिल की समीक्षा करें और भुगतान करें' : 'Review the bill and pay',
    },
    {
      title: isHi ? 'भुगतान संपन्न' : 'Payment done',
      sub: isHi ? 'आपकी इन-ऐप छूट लागू हो गई है' : 'Your in-app discount is applied',
    },
    {
      title:
        mode === 'delivery'
          ? (isHi ? 'दवाएं रास्ते में हैं' : 'On its way')
          : (isHi ? 'पिकअप के लिए तैयार' : 'Ready for pickup'),
      sub:
        mode === 'delivery'
          ? (isHi ? 'फार्मेसी द्वारा होम डिलीवरी' : 'Delivered by the pharmacy')
          : (isHi ? 'काउंटर पर अपना कोड दिखाएं' : 'Show your code at the counter'),
    },
  ];

  return (
    <View>
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const last = i === steps.length - 1;
        return (
          <View key={s.title} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 28 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? C.good : current ? C.brand : '#FFFFFF',
                  borderWidth: done || current ? 0 : 2,
                  borderColor: C.line,
                }}
              >
                {done ? (
                  <Check size={15} color="#FFFFFF" strokeWidth={3} />
                ) : current ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
                ) : null}
              </View>
              {!last && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 22,
                    backgroundColor: done ? C.good : C.line,
                    marginVertical: 2,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: current ? '700' : '600',
                  color: i > idx ? C.mute : C.ink,
                }}
              >
                {s.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: i > idx ? C.mute : C.sub,
                  marginTop: 1,
                }}
              >
                {s.sub}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ==================== MAIN PHARMACY SCREEN ====================
export default function PharmacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fam = useFamilyOptional();
  const { language } = useLanguage();
  const isHi = language === 'hi';

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
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [selectedOrder, setSelectedOrder] = useState<HistoryItem | null>(null);
  const [invoiceToast, setInvoiceToast] = useState(false);
  const [memberSheet, setMemberSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const askedLoc = useRef(false);

  // Ask for location permission when user reaches shop list
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
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState('ok');
      } catch {
        setLocState('denied');
      }
    })();
  }, [stage]);

  // Demo simulation of pharmacist response times
  useEffect(() => {
    if (stage !== 'track') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (status === 'sent') t = setTimeout(() => setStatus('reviewing'), 1800);
    else if (status === 'reviewing') t = setTimeout(() => setStatus('quoted'), 3500);
    else if (status === 'paid') t = setTimeout(() => setStatus('ready'), 2200);
    return () => {
      if (t) clearTimeout(t);
    };
  }, [stage, status]);

  const { shops, isSample } = useMemo(() => {
    const real = coords ? PHARMACIES.map((p) => distanceKm(coords, p)) : [];
    const usable = real.length > 0 && Math.min(...real) < 60;
    const list = PHARMACIES.map((p, i) => ({
      ...p,
      km: Math.round((usable ? real[i] : p.sampleKm) * 10) / 10,
    }));
    return { shops: list, isSample: !usable };
  }, [coords]);

  const visible = useMemo(() => {
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
  const maxPct = Math.max(...PHARMACIES.map((p) => p.appDiscountPct));
  const forName = fam?.active
    ? fam.active.relation === 'Self'
      ? (isHi ? 'स्वयं (Myself)' : 'Myself')
      : (isHi ? fam.active.nameHi || fam.active.name : fam.active.name)
    : null;

  // Actions
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
        isHi ? 'कृपया पुनः प्रयास करें या गैलरी से अपलोड करें।' : 'Please try again, or upload from your gallery.'
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

  const sendRequest = () => {
    if (!shop) return;
    setReqRef('RX-' + Math.floor(1000 + Math.random() * 9000));
    setCode(String(Math.floor(1000 + Math.random() * 9000)));
    setPaidInApp(null);
    setStatus('sent');
    setStage('track');
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
    if (shop) {
      const orderStatus: HistoryStatus = mode === 'delivery' ? 'out_for_delivery' : 'ready';
      const newOrder: HistoryItem = {
        ref: reqRef || `RX-${Math.floor(1000 + Math.random() * 9000)}`,
        shop: shop.name,
        shopHi: shop.nameHi,
        shopAddress: `${shop.area}, New Delhi`,
        shopPhone: '+91 98112 34567',
        total: paidInApp ? total : subtotal,
        subtotal,
        discount: paidInApp ? discount : 0,
        deliveryFee: 0,
        mode,
        paidInApp: !!paidInApp,
        date: 'Just now',
        status: orderStatus,
        patientName: forName || 'Myself',
        items: [...SAMPLE_BILL],
      };
      setHistory((h) => [newOrder, ...h].slice(0, 5));
    }
    setImages([]);
    setShopId(null);
    setStatus('sent');
    setPaidInApp(null);
    setStage('home');
  };

  const handleDownloadInvoice = (order: HistoryItem) => {
    tap();
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${order.ref}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #0F172A; max-width: 740px; margin: 0 auto; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #2563EB; padding-bottom: 20px; margin-bottom: 24px; }
          .logo-title { font-size: 22px; font-weight: 800; color: #172554; }
          .logo-sub { font-size: 13px; color: #2563EB; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
          .inv-title { font-size: 22px; font-weight: 900; text-align: right; color: #0F172A; letter-spacing: 0.5px; }
          .inv-meta { font-size: 13px; color: #64748B; text-align: right; margin-top: 4px; }
          .details-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13.5px; line-height: 1.6; background: #F8FAFC; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; }
          .table th { background: #F1F5F9; text-align: left; padding: 11px 12px; border-bottom: 2px solid #CBD5E1; color: #334155; font-weight: 700; }
          .table td { padding: 12px; border-bottom: 1px solid #E2E8F0; }
          .summary { margin-left: auto; width: 300px; font-size: 13.5px; line-height: 1.8; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .total-row { font-size: 17px; font-weight: 900; color: #172554; border-top: 2px solid #CBD5E1; padding-top: 8px; margin-top: 4px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #DCFCE7; color: #166534; font-weight: 700; font-size: 12px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11.5px; color: #94A3B8; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-title">ADITYAM NIRAMAYAA</div>
            <div class="logo-sub">Pharmacy Network & Healthcare Aggregator</div>
            <div style="font-size: 12px; color: #64748B; margin-top: 6px;">Saket, New Delhi NCR · GSTIN: 07AAACN1234F1Z1</div>
          </div>
          <div>
            <div class="inv-title">TAX INVOICE</div>
            <div class="inv-meta">Invoice No: <strong>INV-${order.ref}</strong></div>
            <div class="inv-meta">Date: ${order.date}</div>
            <div class="inv-meta" style="margin-top: 4px;"><span class="badge">PAID · ${order.paidInApp ? 'IN-APP (UPI)' : 'AT PHARMACY'}</span></div>
          </div>
        </div>
        <div class="details-grid">
          <div>
            <div style="font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase;">Dispensed By:</div>
            <div style="font-weight: 700; font-size: 15px; color: #0F172A;">${order.shop}</div>
            <div style="color: #64748B;">${order.shopAddress || 'Saket Main Market, New Delhi'}</div>
            <div style="color: #64748B;">DL No: DL-WZ-2024-98765</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase;">Billed & Delivered To:</div>
            <div style="font-weight: 700; font-size: 15px; color: #0F172A;">${order.patientName}</div>
            <div style="color: #64748B;">Saket, South Delhi NCR</div>
            <div style="color: #64748B;">Mode: ${order.mode === 'delivery' ? 'Home Delivery' : 'Store Pickup'}</div>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Medicine / Item Description</th>
              <th style="text-align: center; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Rate (₹)</th>
              <th style="text-align: right; width: 100px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.name}</strong><br/><span style="font-size: 11.5px; color: #64748B;">${it.nameHi || ''}</span></td>
                <td style="text-align: center;">${it.qty}</td>
                <td style="text-align: right;">₹${it.price.toLocaleString('en-IN')}</td>
                <td style="text-align: right;">₹${(it.qty * it.price).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal (MRP):</span>
            <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div class="summary-row" style="color: #16A34A; font-weight: 600;">
            <span>Partner App Discount:</span>
            <span>- ₹${order.discount.toLocaleString('en-IN')}</span>
          </div>
          <div class="summary-row">
            <span>Delivery Fee:</span>
            <span>${order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
          </div>
          <div class="summary-row total-row">
            <span>Total Amount Paid:</span>
            <span>₹${order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div class="footer">
          This is a computer-generated tax invoice for prescription order #${order.ref}. Dispensed under registered pharmacist supervision.<br/>
          Thank you for choosing Adityam Niramayaa Healthcare Network.
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([invoiceHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${order.ref}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      Alert.alert(
        isHi ? 'इनवॉइस डाउनलोड हुआ' : 'Invoice Downloaded',
        isHi
          ? `ऑर्डर #${order.ref} का टैक्स इनवॉइस सफलतापूर्वक सहेजा गया। कुल देय राशि: ${inr(order.total)}`
          : `Tax Invoice for Order #${order.ref} (Total: ${inr(order.total)}) is ready.`
      );
    }
    setInvoiceToast(true);
    setTimeout(() => setInvoiceToast(false), 3200);
  };

  const openDirections = () => {
    if (!shop) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    ).catch(() => { });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      {/* Main Content Container with max width constraint for tablets/web */}
      <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* Consistent Standard Header & Search Bar across All Tabs */}
        <AppHeader
          title={isHi ? 'दवाइयां' : 'Pharmacy'}
          onPressProfile={() => setProfileVisible(true)}
        >
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={
              isHi ? 'दवा या पार्टनर फार्मेसी खोजें...' : 'Search medicine, pharmacy...'
            }
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
                    shadowColor: '#0B1B3F',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Users size={15} color={C.brand} />
                  <Text style={{ fontSize: 13, color: C.sub }}>
                    {isHi ? 'दवाएं किसके लिए' : 'Ordering for'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
                    {forName}
                  </Text>
                  <ChevronDown size={15} color={C.sub} />
                </Pressable>
              )}

              {/* Prescription Upload Hero / Attachments Card */}
              {images.length === 0 ? (
                <LinearGradient
                  colors={['#172554', '#1E40AF', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: R.xl,
                    padding: 20,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      right: -30,
                      top: -30,
                      width: 140,
                      height: 140,
                      borderRadius: 70,
                      backgroundColor: 'rgba(255, 255, 255, 0.10)',
                    }}
                  />
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={22} color="#FFFFFF" />
                  </View>

                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 20,
                      fontWeight: '800',
                      marginTop: 12,
                      letterSpacing: -0.3,
                    }}
                  >
                    {isHi ? 'डॉक्टर का पर्चा अपलोड करें' : 'Upload your prescription'}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontSize: 13,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {isHi
                      ? 'पार्टनर फार्मेसी दवाओं की जांच कर आपको बिल भेजेगी। ऐप में भुगतान पर अतिरिक्त छूट पाएं।'
                      : 'Pay in the app and get an exclusive discount at verified partner pharmacies.'}
                  </Text>

                  {/* Photo & Gallery Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <Pressable
                      onPress={() => {
                        tap();
                        pickCamera();
                      }}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: R.md,
                        backgroundColor: '#FFFFFF',
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={18} color={C.brand} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: C.brand }}>
                        {isHi ? 'फोटो खींचें' : 'Take photo'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        tap();
                        pickGallery();
                      }}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: R.md,
                        backgroundColor: 'rgba(255, 255, 255, 0.18)',
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                      }}
                    >
                      <Upload size={18} color="#FFFFFF" />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                        {isHi ? 'गैलरी से चुनें' : 'From gallery'}
                      </Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              ) : (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: R.xl,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: C.line,
                    ...SHADOW,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
                      {images.length}{' '}
                      {isHi
                        ? 'पेज संलग्न'
                        : `page${images.length > 1 ? 's' : ''} attached`}
                    </Text>
                    <Chip
                      label={isHi ? 'भेजने हेतु तैयार' : 'Ready to send'}
                      tone="good"
                      icon={<Check size={11} color={C.good} strokeWidth={3} />}
                    />
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingTop: 14, paddingRight: 8 }}
                  >
                    {images.map((uri, i) => (
                      <View key={uri + i} style={{ width: 84, height: 108 }}>
                        <Image
                          source={{ uri }}
                          style={{
                            width: 84,
                            height: 108,
                            borderRadius: 14,
                            backgroundColor: '#F1F5F9',
                          }}
                        />
                        <Pressable
                          onPress={() => {
                            tap();
                            setImages((p) => p.filter((_, k) => k !== i));
                          }}
                          hitSlop={8}
                          accessibilityLabel="Remove this page"
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: C.ink,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={14} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                    {images.length < MAX_PAGES && (
                      <Pressable
                        onPress={() => {
                          tap();
                          pickCamera();
                        }}
                        style={{
                          width: 84,
                          height: 108,
                          borderRadius: 14,
                          borderWidth: 2,
                          borderStyle: 'dashed',
                          borderColor: C.line,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <Plus size={22} color={C.brand} />
                        <Text style={{ fontSize: 12, color: C.brand, fontWeight: '600' }}>
                          {isHi ? 'पेज जोड़ें' : 'Add page'}
                        </Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </Animated.View>
              )}

              {/* 4-Step "How It Works" Strip */}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: C.ink,
                  marginTop: 22,
                  marginBottom: 10,
                }}
              >
                {isHi ? 'दवा ऑर्डर करने की प्रक्रिया' : 'How it works'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#FFFFFF',
                  borderRadius: R.xl,
                  borderWidth: 1,
                  borderColor: C.line,
                  paddingVertical: 14,
                  paddingHorizontal: 6,
                }}
              >
                {[
                  {
                    num: '1',
                    en: 'Upload Slip',
                    hi: 'पर्चा भेजें',
                  },
                  {
                    num: '2',
                    en: 'Pick Pharmacy',
                    hi: 'फार्मेसी चुनें',
                  },
                  {
                    num: '3',
                    en: 'Pay in App',
                    hi: 'ऐप में पेमेंट',
                  },
                  {
                    num: '4',
                    en: 'Get Medicines',
                    hi: 'दवा प्राप्त करें',
                  },
                ].map((step) => (
                  <View
                    key={step.num}
                    style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: C.brandSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: C.brand }}>
                        {step.num}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.sub,
                        textAlign: 'center',
                        marginTop: 5,
                        fontWeight: '600',
                        lineHeight: 15,
                      }}
                    >
                      {isHi ? step.hi : step.en}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Exclusive Savings Offer Pill */}
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
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>
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

              {/* Recent Orders History */}
              {history.length > 0 && (
                <View style={{ marginTop: 22 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: C.ink,
                      }}
                    >
                      {isHi ? 'हाल के ऑर्डर व अनुरोध' : 'Recent requests'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.brand }}>
                      {isHi ? 'विवरण देखने के लिए टैप करें' : 'Tap for details & invoice'}
                    </Text>
                  </View>
                  <View style={{ gap: 9 }}>
                    {history.map((h) => (
                      <Pressable
                        key={h.ref}
                        onPress={() => {
                          tap();
                          setSelectedOrder(h);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`View details and invoice for order ${h.ref}`}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          backgroundColor: '#FFFFFF',
                          borderRadius: R.lg,
                          borderWidth: 1,
                          borderColor: pressed ? C.brand : C.line,
                          padding: 13,
                          opacity: pressed ? 0.92 : 1,
                          ...SHADOW,
                        })}
                      >
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 14,
                            backgroundColor: '#EAF1FF',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pill size={20} color={C.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 14.5, fontWeight: '700', color: C.ink, flex: 1 }}
                            >
                              {isHi && h.shopHi ? h.shopHi : h.shop}
                            </Text>
                            <View
                              style={{
                                backgroundColor: '#DCFCE7',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: R.pill,
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>
                                {isHi ? 'डिलीवर हुआ' : 'Delivered'}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
                            {h.ref} ·{' '}
                            {h.mode === 'delivery'
                              ? (isHi ? 'होम डिलीवरी' : 'Delivery')
                              : (isHi ? 'पिकअप' : 'Pickup')}{' '}
                            ·{' '}
                            {h.paidInApp
                              ? (isHi ? 'ऐप में भुगतान' : 'Paid in app')
                              : (isHi ? 'दुकान पर देय' : 'Pay at shop')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
                            {inr(h.total)}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand }}>
                              {isHi ? 'विवरण' : 'Track'}
                            </Text>
                            <ChevronRight size={13} color={C.brand} strokeWidth={2.5} />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Regulatory Disclaimer */}
              <Text
                style={{
                  fontSize: 11,
                  color: C.mute,
                  textAlign: 'center',
                  marginTop: 22,
                  lineHeight: 16,
                }}
              >
                {isHi
                  ? 'पर्चे वाली दवाएं फार्मासिस्ट द्वारा पर्चे के सत्यापन के बाद ही दी जाती हैं। यह सेवा आपातकालीन चिकित्सा का विकल्प नहीं है।'
                  : 'Prescription medicines are dispensed only after pharmacist verification. This service is not a substitute for emergency medical care.'}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Sticky Continue CTA on Home Stage */}
        {stage === 'home' && images.length > 0 && (
          <BottomBar>
            <PrimaryButton
              label={isHi ? 'पार्टनर फार्मेसी चुनें →' : 'Choose a pharmacy →'}
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
                {/* Back to Home Button */}
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.brand }}>
                    {isHi ? 'वापस' : 'Back'}
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
                  {isHi ? 'पार्टनर फार्मेसी चुनें' : 'Choose a pharmacy'}
                </Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {images.length}{' '}
                  {isHi
                    ? 'पेज संलग्न'
                    : `page${images.length > 1 ? 's' : ''} attached`}
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
                        icon: <Truck size={16} color={mode === 'delivery' ? C.brand : C.sub} />,
                      },
                      {
                        id: 'pickup',
                        label: isHi ? 'दुकान से पिकअप' : 'Pick up at shop',
                        icon: <Store size={16} color={mode === 'pickup' ? C.brand : C.sub} />,
                      },
                    ]}
                  />
                </View>

                {/* Sort Option Chips */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <SortChip
                    label={isHi ? 'नजदीकी' : 'Nearest'}
                    active={sort === 'near'}
                    onPress={() => setSort('near')}
                  />
                  <SortChip
                    label={isHi ? 'अधिकतम बचत' : 'Biggest saving'}
                    active={sort === 'save'}
                    onPress={() => setSort('save')}
                  />
                </View>

                {/* Location Status Notice */}
                {locState === 'asking' && (
                  <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 10 }}>
                    {isHi
                      ? 'आपके नजदीकी फार्मेसियां खोजी जा रही हैं…'
                      : 'Finding pharmacies near you…'}
                  </Text>
                )}
                {locState !== 'asking' && isSample && (
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: C.warnSoft,
                      borderRadius: R.md,
                      padding: 11,
                      borderWidth: 1,
                      borderColor: '#FED7AA',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.warn, lineHeight: 17 }}>
                      {locState === 'denied'
                        ? (isHi
                          ? 'लोकेशन बंद है, इसलिए हम सैंपल फार्मेसियां दिखा रहे हैं। नजदीकी दुकानें देखने के लिए लोकेशन चालू करें।'
                          : 'Location is off, so we are showing sample pharmacies. Turn on location to see the ones near you.')
                        : (isHi
                          ? 'इस डेमो में आपकी लोकेशन के पास कोई फार्मेसी नहीं मिली, इसलिए सैंपल फार्मेसियां दिखाई जा रही हैं।'
                          : 'No partner pharmacies are near your location in this demo, so we are showing sample ones.')}
                    </Text>
                  </View>
                )}

                {/* Pharmacy Cards List */}
                <View style={{ gap: 11, marginTop: 14 }}>
                  {visible.map((s, i) => {
                    const sel = s.id === shopId;
                    const name = getPharmacyName(s, isHi);
                    const area = getPharmacyArea(s, isHi);

                    return (
                      <PressableCard
                        key={s.id}
                        index={i}
                        onPress={() => setShopId(s.id)}
                        label={name}
                      >
                        <View
                          style={{
                            backgroundColor: sel ? C.brandSoft : '#FFFFFF',
                            borderRadius: R.xl,
                            padding: 15,
                            borderWidth: sel ? 2 : 1,
                            borderColor: sel ? C.brand : C.line,
                            ...SHADOW,
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
                                style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}
                              >
                                {name}
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
                                <Text style={{ fontSize: 12, color: C.sub }}>
                                  {area} · {s.km} {isHi ? 'किमी' : 'km'}
                                </Text>
                                <Star size={11} color="#D97706" fill="#D97706" />
                                <Text style={{ fontSize: 12, color: C.sub }}>
                                  {s.rating}
                                </Text>
                              </View>
                            </View>
                            {sel && (
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: C.brand,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            )}
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
                              label={
                                isHi
                                  ? `ऐप में ${s.appDiscountPct}% बचत`
                                  : `Save ${s.appDiscountPct}% in app`
                              }
                              tone="good"
                            />
                            {s.delivery && (
                              <Chip
                                label={isHi ? 'होम डिलीवरी' : 'Delivers'}
                                icon={<Truck size={11} color={C.sub} />}
                              />
                            )}
                            {s.pickup && (
                              <Chip
                                label={isHi ? 'पिकअप' : 'Pickup'}
                                icon={<Store size={11} color={C.sub} />}
                              />
                            )}
                          </View>
                        </View>
                      </PressableCard>
                    );
                  })}

                  {visible.length === 0 && (
                    <Text style={{ textAlign: 'center', color: C.sub, marginTop: 24 }}>
                      {isHi
                        ? 'इस श्रेणी में फिलहाल कोई फार्मेसी उपलब्ध नहीं है।'
                        : 'No pharmacies offer this option nearby yet.'}
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <BottomBar>
              <PrimaryButton
                label={
                  shop
                    ? (isHi
                      ? `${getPharmacyName(shop, isHi)} को भेजें →`
                      : `Send to ${shop.name} →`)
                    : (isHi ? 'फार्मेसी चुनें' : 'Select a pharmacy')
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
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: C.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {isHi ? 'ऑर्डर की स्थिति' : 'Your request'}
                </Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {reqRef} ·{' '}
                  {mode === 'delivery'
                    ? (isHi ? 'होम डिलीवरी' : 'Home delivery')
                    : (isHi ? 'दुकान से पिकअप' : 'Pickup')}
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
                        style={{ fontSize: 14.5, fontWeight: '700', color: C.ink }}
                      >
                        {getPharmacyName(shop, isHi)}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>
                        {getPharmacyArea(shop, isHi)} · {shop.km} {isHi ? 'किमी' : 'km'}
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
                          style={{ fontSize: 12.5, fontWeight: '700', color: C.brand }}
                        >
                          {isHi ? 'मैप' : 'Directions'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Dynamic 5-Step Order Timeline */}
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
                  <Timeline status={status} mode={mode} isHi={isHi} />
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
                        : 'The pharmacy replies within 24 hours. In a hurry? Choose pickup and visit the shop in person.'}
                    </Text>
                  </View>
                )}

                {/* Itemized Bill Card (when status === 'quoted') */}
                {status === 'quoted' && shop && (
                  <Animated.View
                    entering={FadeIn.duration(250)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: R.xl,
                      borderWidth: 1,
                      borderColor: C.line,
                      padding: 16,
                      marginTop: 14,
                      ...SHADOW,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
                      {isHi ? 'दवाओं का बिल' : 'Your bill'}
                    </Text>

                    <View style={{ marginTop: 10, gap: 8 }}>
                      {SAMPLE_BILL.map((l) => (
                        <View
                          key={l.id}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>
                            {getBillItemName(l, isHi)}
                            {l.qty > 1 ? `  ×${l.qty}` : ''}
                          </Text>
                          <Text
                            style={{ fontSize: 13, color: C.ink, fontWeight: '600' }}
                          >
                            {inr(l.price * l.qty)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: C.line,
                        marginVertical: 12,
                      }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13.5, color: C.sub }}>
                        {isHi ? 'उप-कुल (Subtotal)' : 'Subtotal'}
                      </Text>
                      <Text style={{ fontSize: 13.5, color: C.ink }}>{inr(subtotal)}</Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 5,
                      }}
                    >
                      <Text
                        style={{ fontSize: 13.5, color: C.good, fontWeight: '600' }}
                      >
                        {isHi
                          ? `ऐप छूट (${shop.appDiscountPct}%)`
                          : `In-app discount (${shop.appDiscountPct}%)`}
                      </Text>
                      <Text
                        style={{ fontSize: 13.5, color: C.good, fontWeight: '600' }}
                      >
                        − {inr(discount)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 10,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
                        {isHi ? 'कुल देय राशि' : 'Pay in app'}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
                        {inr(total)}
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: 11,
                        color: C.mute,
                        marginTop: 8,
                        lineHeight: 16,
                      }}
                    >
                      {isHi
                        ? 'डिलीवरी शुल्क (यदि कोई हो) फार्मेसी द्वारा निर्धारित होता है और अंतिम बिल में दर्शाया जाता है।'
                        : 'Delivery charges, if any, are set by the pharmacy and shown on the final bill.'}
                    </Text>

                    <View style={{ gap: 8, marginTop: 14 }}>
                      <PrimaryButton
                        label={
                          isHi
                            ? `${inr(total)} भुगतान करें और ${inr(discount)} बचाएं`
                            : `Pay ${inr(total)} and save ${inr(discount)}`
                        }
                        onPress={payInApp}
                      />
                      <Pressable
                        onPress={payAtShop}
                        style={{
                          height: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: C.sub,
                            textAlign: 'center',
                          }}
                        >
                          {mode === 'pickup'
                            ? (isHi
                              ? `दुकान पर भुगतान करें (${inr(subtotal)}, ऐप छूट नहीं)`
                              : `Pay at the shop instead (${inr(subtotal)}, no in-app discount)`)
                            : (isHi
                              ? `डिलीवरी पर नकद भुगतान करें (${inr(subtotal)}, ऐप छूट नहीं)`
                              : `Pay on delivery instead (${inr(subtotal)}, no in-app discount)`)}
                        </Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                )}

                {/* Final Pickup / Delivery Code Verification Card (when status === 'ready') */}
                {status === 'ready' && (
                  <Animated.View
                    entering={FadeIn.duration(250)}
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
                    {paidInApp ? (
                      <Chip
                        label={
                          isHi
                            ? `ऐप में ${inr(total)} भुगतान किया · ${inr(discount)} बचाए`
                            : `Paid ${inr(total)} in app · saved ${inr(discount)}`
                        }
                        tone="good"
                        icon={<Check size={11} color={C.good} strokeWidth={3} />}
                      />
                    ) : (
                      <Chip
                        label={
                          isHi
                            ? `${inr(subtotal)} ${mode === 'pickup' ? 'दुकान पर देय' : 'डिलीवरी पर देय'}`
                            : `Pay ${inr(subtotal)} ${mode === 'pickup' ? 'at the shop' : 'on delivery'}`
                        }
                        tone="warn"
                      />
                    )}

                    {mode === 'pickup' ? (
                      <>
                        <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 14 }}>
                          {isHi
                            ? 'दुकान के काउंटर पर यह 4-अंकीय कोड दिखाएं:'
                            : 'Show this code at the counter'}
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
                      </>
                    ) : (
                      <>
                        <Text
                          style={{
                            fontSize: 13.5,
                            color: C.sub,
                            marginTop: 14,
                            lineHeight: 19,
                          }}
                        >
                          {isHi
                            ? 'अपना फोन चालू रखें। फार्मेसी डिलीवरी के समय संपर्क करेगी। डिलीवरी कर्मी को यह कोड बताएं:'
                            : 'Keep your phone nearby. The pharmacy will call you on delivery. Share this code with the delivery person:'}
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
                      </>
                    )}
                  </Animated.View>
                )}

                <Text
                  style={{
                    fontSize: 11,
                    color: C.mute,
                    textAlign: 'center',
                    marginTop: 18,
                    lineHeight: 16,
                  }}
                >
                  {isHi
                    ? 'प्रोटोटाइप: फार्मेसी की प्रतिक्रिया और बिल का प्रदर्शन सिमुलेटेड है।'
                    : "Prototype: the pharmacy's replies and the bill are simulated."}
                </Text>
              </View>
            </ScrollView>

            {status === 'ready' && (
              <BottomBar>
                <PrimaryButton
                  label={isHi ? 'पूर्ण' : 'Done'}
                  onPress={finish}
                />
              </BottomBar>
            )}
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
                    ? (isHi ? 'अकाउंट धारक (स्वयं)' : 'Account holder')
                    : (isHi ? `${m.relationHi || m.relation} · ${m.age} वर्ष` : `${m.relation} · ${m.age} yrs`);

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
                          ? (isHi ? 'स्वयं (Myself)' : 'Myself')
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

      {/* Recent Request / Order Details & Invoice Sheet */}
      {selectedOrder && (
        <SheetFrame
          visible={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={isHi ? 'ऑर्डर ट्रैकिंग व इनवॉइस' : 'Order Tracking & Invoice'}
        >
          <ScrollView
            style={{ maxHeight: 620 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
              gap: 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Hero Card */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#BBF7D0',
                borderRadius: R.xl,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#16A34A',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}>
                    {isHi ? 'ऑर्डर डिलीवर हो गया' : 'Order Delivered'}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: R.pill,
                    borderWidth: 1,
                    borderColor: '#BBF7D0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                    #{selectedOrder.ref}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: '#334155', marginTop: 8, lineHeight: 18 }}>
                {isHi
                  ? `आपकी दवाइयां ${selectedOrder.shopHi || selectedOrder.shop} द्वारा सफलतापूर्वक आपके पते पर पहुंचा दी गई हैं।`
                  : `Your medicines from ${selectedOrder.shop} were safely delivered to your address.`}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 12,
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: '#DCFCE7',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color="#15803D" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>
                    {selectedOrder.date}
                  </Text>
                </View>
                <Text style={{ color: '#86EFAC' }}>•</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {selectedOrder.mode === 'delivery' ? (
                    <Truck size={13} color="#15803D" />
                  ) : (
                    <Store size={13} color="#15803D" />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>
                    {selectedOrder.mode === 'delivery'
                      ? (isHi ? 'होम डिलीवरी' : 'Doorstep Delivery')
                      : (isHi ? 'स्टोर पिकअप' : 'Store Pickup')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Previous Track Stepper */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.line,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 12 }}>
                {isHi ? 'ऑर्डर ट्रैकिंग टाइमलाइन' : 'Order Status & Tracking'}
              </Text>

              {[
                {
                  title: isHi ? 'पर्चा अपलोड व सत्यापन' : 'Prescription Verified',
                  sub: isHi ? 'डॉक्टर का पर्चा फार्मासिस्ट द्वारा जांचा गया' : 'Reviewed & verified by licensed pharmacist',
                  time: '4:30 PM',
                  done: true,
                },
                {
                  title: isHi ? 'बिल तैयार व छूट लागू' : 'Bill Generated & Discount',
                  sub: isHi ? '15% विशेष ऐप छूट लागू की गई' : '15% partner pharmacy app discount applied',
                  time: '4:33 PM',
                  done: true,
                },
                {
                  title: isHi ? 'भुगतान सफल' : 'Payment Confirmed',
                  sub: isHi ? `${inr(selectedOrder.total)} का ऑनलाइन भुगतान (UPI/कार्ड)` : `Paid ${inr(selectedOrder.total)} securely in app`,
                  time: '4:35 PM',
                  done: true,
                },
                {
                  title: isHi ? 'दवाइयां पैक व डिस्पैच' : 'Packed & Dispatched',
                  sub: isHi ? 'सुरक्षित सीलबंद पैकेजिंग में रवाना किया गया' : 'Sealed in tamper-evident safety packaging',
                  time: '4:45 PM',
                  done: true,
                },
                {
                  title: isHi ? 'सफलतापूर्वक डिलीवर' : 'Delivered to Doorstep',
                  sub: isHi ? 'साकेत, दक्षिण दिल्ली पते पर प्राप्त हुआ' : 'Handed over at Saket, South Delhi address',
                  time: '5:15 PM',
                  done: true,
                  isLast: true,
                },
              ].map((step, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 22 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#16A34A',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    {!step.isLast && (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          backgroundColor: '#BBF7D0',
                          minHeight: 28,
                          marginVertical: 2,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: step.isLast ? 0 : 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>
                        {step.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.sub }}>{step.time}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>
                      {step.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pharmacy Info & Contact */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.line,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
                    {isHi && selectedOrder.shopHi ? selectedOrder.shopHi : selectedOrder.shop}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                    {selectedOrder.shopAddress || 'Saket, South Delhi'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL('tel:+919811234567').catch(() => {})}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: C.brandSoft,
                    paddingHorizontal: 12,
                    height: 36,
                    borderRadius: R.pill,
                  }}
                >
                  <Phone size={14} color={C.brand} />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.brand }}>
                    {isHi ? 'कॉल करें' : 'Call'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Purchased Items List */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.line,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: C.ink }}>
                  {isHi ? 'खरीदी गई दवाइयां' : 'Purchased Medicines'} ({selectedOrder.items.length})
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub }}>
                  {isHi ? 'फार्मासिस्ट द्वारा सत्यापित' : 'Pharmacist Verified'}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {selectedOrder.items.map((it, idx) => (
                  <View
                    key={it.id || idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderBottomWidth: idx < selectedOrder.items.length - 1 ? 1 : 0,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>
                        {isHi && it.nameHi ? it.nameHi : it.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>
                        {isHi ? `मात्रा: ${it.qty} · दर: ${inr(it.price)}` : `Qty: ${it.qty} · Rate: ${inr(it.price)}`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>
                      {inr(it.qty * it.price)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bill & Amount Summary */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.line,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {isHi ? 'भुगतान विवरण' : 'Payment Summary'}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13.5, color: C.sub }}>
                  {isHi ? 'दवाइयों का कुल मूल्य (MRP)' : 'Medicines Total (MRP)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.ink }}>
                  {inr(selectedOrder.subtotal)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13.5, color: '#16A34A', fontWeight: '600' }}>
                  {isHi ? 'पार्टनर ऐप छूट (15%)' : 'Partner App Discount (15%)'}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#16A34A' }}>
                  - {inr(selectedOrder.discount)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13.5, color: C.sub }}>
                  {isHi ? 'डिलीवरी शुल्क' : 'Delivery Charges'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: C.sub, textDecorationLine: 'line-through' }}>
                    ₹30
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>
                    {isHi ? 'मुफ्त' : 'FREE'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: C.line,
                  marginVertical: 4,
                }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>
                    {isHi ? 'कुल भुगतान की गई राशि' : 'Total Amount Paid'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700', marginTop: 1 }}>
                    {isHi ? `आपने ${inr(selectedOrder.discount + 30)} की बचत की!` : `You saved ${inr(selectedOrder.discount + 30)}!`}
                  </Text>
                </View>
                <Text style={{ fontSize: 19, fontWeight: '900', color: C.brandDark }}>
                  {inr(selectedOrder.total)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 10, marginTop: 4 }}>
              {/* Download Invoice Button */}
              <Pressable
                onPress={() => handleDownloadInvoice(selectedOrder)}
                style={({ pressed }) => ({
                  backgroundColor: C.brand,
                  borderRadius: R.lg,
                  height: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                  ...SHADOW,
                })}
              >
                <Download size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                  {isHi ? 'टैक्स इनवॉइस डाउनलोड करें (PDF)' : 'Download Tax Invoice (PDF / Print)'}
                </Text>
              </Pressable>

              {/* Reorder Button */}
              <Pressable
                onPress={() => {
                  tap();
                  setSelectedOrder(null);
                  pickCamera();
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#FFFFFF',
                  borderRadius: R.lg,
                  borderWidth: 1.5,
                  borderColor: C.brand,
                  height: 46,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <RefreshCw size={16} color={C.brand} strokeWidth={2.2} />
                <Text style={{ color: C.brand, fontSize: 14.5, fontWeight: '700' }}>
                  {isHi ? 'यह दवाइयां दोबारा ऑर्डर करें' : 'Reorder These Medicines'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SheetFrame>
      )}

      {/* Invoice Download Toast Notification */}
      {invoiceToast && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 80,
            left: 20,
            right: 20,
            maxWidth: 420,
            alignSelf: 'center',
            backgroundColor: '#0F172A',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            zIndex: 999,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <CheckCircle2 size={20} color="#4ADE80" strokeWidth={2.5} />
          <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '600', flex: 1 }}>
            {isHi ? 'इनवॉइस डाउनलोड हो गया! प्रिंट योग्य इनवॉइस तैयार है।' : 'Invoice downloaded! Printable copy ready.'}
          </Text>
        </View>
      )}

      {/* Profile & Language Switcher Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
