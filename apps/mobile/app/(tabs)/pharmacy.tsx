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
} from '../../src/data/pharmacySample';

type Stage = 'home' | 'shops' | 'track';
type Mode = 'delivery' | 'pickup';
type HistoryItem = { ref: string; shop: string; shopHi?: string; total: number; mode: Mode; paidInApp: boolean };

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
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
      setHistory((h) => [
        {
          ref: reqRef,
          shop: shop.name,
          shopHi: shop.nameHi,
          total: paidInApp ? total : subtotal,
          mode,
          paidInApp: !!paidInApp,
        },
        ...h,
      ].slice(0, 5));
    }
    setImages([]);
    setShopId(null);
    setStatus('sent');
    setPaidInApp(null);
    setStage('home');
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
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: C.ink,
                      marginBottom: 10,
                    }}
                  >
                    {isHi ? 'हाल के ऑर्डर व अनुरोध' : 'Recent requests'}
                  </Text>
                  <View style={{ gap: 9 }}>
                    {history.map((h) => (
                      <View
                        key={h.ref}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          backgroundColor: '#FFFFFF',
                          borderRadius: R.lg,
                          borderWidth: 1,
                          borderColor: C.line,
                          padding: 13,
                        }}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: C.brandSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pill size={18} color={C.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 14, fontWeight: '700', color: C.ink }}
                          >
                            {isHi && h.shopHi ? h.shopHi : h.shop}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>
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
                        <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>
                          {inr(h.total)}
                        </Text>
                      </View>
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

      {/* Profile & Language Switcher Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
