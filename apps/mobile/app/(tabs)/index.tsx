import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  Animated,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar as RNStatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  ChevronDown,
  Calendar,
  ChevronRight,
  ArrowRight,
  Crown,
  Heart,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Building2,
  Clock,
  Sparkles,
  User,
  FileText,
  Pill,
  HelpCircle,
  LogOut,
  UsersRound,
  IdCard,
  BadgePercent,
  Star,
  Check,
  Stethoscope,
  FlaskConical,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  translateDoctorName,
  translateSpecialty,
  translateQualification,
  translateSlot,
} from '../../src/utils/hindiDictionary';
import { getDoctorAvatar } from '../../src/utils/doctorAvatars';
import { SEED_HOSPITALS } from '@adityam/supabase';
import type { Doctor } from '@adityam/types';
import {
  OpdStethoscopeIcon,
  InvestigationsFlaskIcon,
  PharmacyCapsuleIcon,
  IpdHospitalBedIcon,
  HeartPulseIcon,
  ChildCareIcon,
  BoneJointIcon,
  DentalToothIcon,
  DermatologyIcon,
  AllCategoriesIcon,
} from '../../components/ServiceIcons';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { JaiJinendraBlessingModal } from '../../components/ui/JaiJinendraBlessingModal';
import { SkeletonBox } from '../../components/ui/SkeletonBox';

const docHeroImg = require('../../assets/doc.png');
const labHeroImg = require('../../assets/lab.png');
const hospHeroImg = require('../../assets/hosp.png');

// Fast eager pre-load in memory for web browsers
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  [docHeroImg, labHeroImg, hospHeroImg].forEach((asset) => {
    try {
      const uri = typeof asset === 'string' ? asset : (asset as any)?.uri || (asset as any)?.default;
      if (uri) {
        const img = new (window as any).Image();
        img.src = uri;
      }
    } catch {}
  });
}

const { width } = Dimensions.get('window');

// 4 Distinct Core Services with their own gentle tints, icon palettes, and softened badges
const CORE_SERVICES = [
  {
    id: 'opd',
    route: '/opd' as const,
    titleEn: 'Doctor Consult',
    titleHi: 'डॉक्टर परामर्श',
    subEn: 'In-Clinic Visits',
    subHi: 'क्लिनिक अपॉइंटमेंट',
    badgeEn: 'Top Clinics',
    badgeHi: 'क्लिनिक',
    bg: '#F0F7FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    badgeBg: '#DBEAFE',
    badgeFg: '#1E40AF',
    Icon: OpdStethoscopeIcon,
  },
  {
    id: 'ipd',
    route: '/ipd' as const,
    titleEn: 'Hospital Care',
    titleHi: 'अस्पताल भर्ती',
    subEn: 'Planned Treatment',
    subHi: 'नियोजित भर्ती',
    badgeEn: 'Top Hospitals',
    badgeHi: 'अस्पताल',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    iconBg: '#EDE9FE',
    iconColor: '#6D28D9',
    badgeBg: '#EDE9FE',
    badgeFg: '#6D28D9',
    Icon: IpdHospitalBedIcon,
  },
  {
    id: 'labs',
    route: '/labs' as const,
    titleEn: 'Lab Tests',
    titleHi: 'लैब टेस्ट्स',
    subEn: 'Home Sample Pickup',
    subHi: 'घर से सैंपल कलेक्शन',
    badgeEn: 'NABL Labs',
    badgeHi: 'प्रमाणित लैब्स',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    iconBg: '#D1FAE5',
    iconColor: '#047857',
    badgeBg: '#D1FAE5',
    badgeFg: '#047857',
    Icon: InvestigationsFlaskIcon,
  },
  {
    id: 'pharmacy',
    route: '/pharmacy' as const,
    titleEn: 'Medicines',
    titleHi: 'दवाइयां',
    subEn: 'Partner Pharmacies',
    subHi: 'पार्टनर फार्मेसी',
    badgeEn: 'Save in App',
    badgeHi: 'ऐप में बचत',
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    badgeBg: '#FEF3C7',
    badgeFg: '#B45309',
    Icon: PharmacyCapsuleIcon,
  },
];

// 4 Institutional Trust Pillars for 2x2 Balanced Grid
const TRUST_PILLARS = [
  {
    id: 'hospitals',
    titleHi: '150+ अस्पताल',
    titleEn: '150+ Hospitals',
    subHi: 'पार्टनर नेटवर्क',
    subEn: 'Partner Network',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    borderColor: '#BFDBFE',
    Icon: Building2,
  },
  {
    id: 'labs',
    titleHi: '100% NABL',
    titleEn: '100% NABL',
    subHi: 'प्रमाणित लैब्स',
    subEn: 'Certified Labs',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    borderColor: '#A7F3D0',
    Icon: CheckCircle2,
  },
  {
    id: 'care',
    titleHi: 'विश्वसनीय केयर',
    titleEn: 'Verified Care',
    subHi: 'स्वास्थ्य पार्टनर',
    subEn: 'Healthcare Partners',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    borderColor: '#DDD6FE',
    Icon: ShieldCheck,
  },
  {
    id: 'meds',
    titleHi: 'असली दवाइयां',
    titleEn: 'Genuine Meds',
    subHi: 'पार्टनर फार्मेसी',
    subEn: 'Partner Pharmacy',
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    borderColor: '#FDE68A',
    Icon: Pill,
  },
];

// Interactive Core Service Card with Smooth Press Scale Micro-Motion
function ServiceCard({
  service,
  isHi,
  index,
  onPress,
}: {
  service: (typeof CORE_SERVICES)[number];
  isHi: boolean;
  index: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, translateY]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const IconComp = service.Icon;

  return (
    <Animated.View
      style={{
        width: '48.5%',
        opacity: fadeAnim,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{
          backgroundColor: service.bg,
          borderRadius: 20,
          padding: 12,
          borderWidth: 1.2,
          borderColor: service.border,
          minHeight: 120,
          justifyContent: 'space-between',
          overflow: 'hidden',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Top row: Icon container + Distinct Soft Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: service.iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComp size={20} color={service.iconColor} />
          </View>
          <View
            style={{
              backgroundColor: service.badgeBg,
              paddingHorizontal: 7,
              paddingVertical: 2.5,
              borderRadius: 999,
              maxWidth: '58%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: service.badgeFg,
                letterSpacing: 0.2,
              }}
            >
              {isHi ? service.badgeHi : service.badgeEn}
            </Text>
          </View>
        </View>

        {/* Bottom row: Titles (No repeated Book Consult / Book Test lines) */}
        <View style={{ marginTop: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15.5,
              fontWeight: '800',
              color: '#0F172A',
              letterSpacing: -0.2,
            }}
          >
            {isHi ? service.titleHi : service.titleEn}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 11.5,
              fontWeight: '600',
              color: '#475569',
              marginTop: 2,
              lineHeight: 15,
            }}
          >
            {isHi ? service.subHi : service.subEn}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Shimmering Skeleton Component for Clean Prototype Loading State


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const isHi = language === 'hi';

  const [selectedCity, setSelectedCity] = useState('Saket, South Delhi NCR');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [blessingModalVisible, setBlessingModalVisible] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerWidth = width - 32;

  // Gentle initial loading skeleton timer for realistic prototype fidelity
  useEffect(() => {
    const tId = setTimeout(() => {
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(tId);
  }, []);

  // Dynamic Bilingual Banner Slides with 1:1 PNG 3D Illustrations
  const heroBanners = useMemo(
    () => [
      {
        id: 'b-opd',
        route: '/opd' as const,
        badge: isHi ? 'पार्टनर अस्पताल' : 'Partner Hospitals',
        title: isHi ? 'विशेषज्ञ डॉक्टर परामर्श' : 'Consult Top Specialists',
        sub: isHi ? 'समय पर इन-क्लिनिक अपॉइंटमेंट' : 'Priority in-clinic consultations',
        cta: isHi ? 'अपॉइंटमेंट लें ›' : 'Book Consult ›',
        colors: ['#1E3A8A', '#2563EB'] as const,
        image: docHeroImg,
      },
      {
        id: 'b-labs',
        route: '/labs' as const,
        badge: isHi ? 'NABL प्रमाणित लैब्स' : '100% NABL Labs',
        title: isHi ? 'सटीक व डिजिटल टेस्ट्स' : 'Accurate Diagnostic Tests',
        sub: isHi ? 'घर से मुफ़्त सैंपल व त्वरित रिपोर्ट' : 'Home sample pickup & fast reports',
        cta: isHi ? 'टेस्ट्स देखें ›' : 'Explore Tests ›',
        colors: ['#065F46', '#059669'] as const,
        image: labHeroImg,
      },
      {
        id: 'b-ipd',
        route: '/ipd' as const,
        badge: isHi ? 'अस्पताल देखभाल' : 'Hospital Care',
        title: isHi ? 'नियोजित अस्पताल भर्ती' : 'Planned Hospital Admissions',
        sub: isHi ? 'अनुभवी डॉक्टरों व केंद्रों का नेटवर्क' : 'Dedicated support across partner network',
        cta: isHi ? 'अस्पताल खोजें ›' : 'Find Hospitals ›',
        colors: ['#312E81', '#4F46E5'] as const,
        image: hospHeroImg,
      },
    ],
    [isHi]
  );

  // Auto-scroll every 5.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroBanners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * bannerWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [bannerWidth, heroBanners.length]);

  const handleBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(contentOffsetX / bannerWidth);
    if (slideIndex >= 0 && slideIndex < heroBanners.length && slideIndex !== activeBannerIndex) {
      setActiveBannerIndex(slideIndex);
    }
  };

  const cycleCity = () => {
    const nextCity = selectedCity.includes('Bengaluru')
      ? 'Malviya Nagar, Jaipur'
      : selectedCity.includes('Jaipur')
        ? 'Saket, South Delhi NCR'
        : 'Koramangala, Bengaluru';
    setSelectedCity(nextCity);
  };

  const getCityLabel = (raw: string) => {
    if (!isHi) return raw;
    if (raw.includes('Bengaluru')) return 'कोरमंगला, बेंगलुरु';
    if (raw.includes('Jaipur')) return 'मालवीय नगर, जयपुर';
    return 'साकेत, साउथ दिल्ली NCR';
  };

  // Top Featured Doctors for the Home Screen Carousel (Dr. Satish Jain on top with 5 stars)
  const homeTopDoctors: Doctor[] = useMemo(() => {
    const list: Doctor[] = [];
    SEED_HOSPITALS.forEach((h) => {
      h.branches?.forEach((b) => {
        b.doctors?.forEach((d) => {
          if (!list.some((existing) => existing.id === d.id)) {
            list.push(d);
          }
        });
      });
    });
    list.sort((a, b) => {
      if (a.name.includes('Satish Jain')) return -1;
      if (b.name.includes('Satish Jain')) return 1;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list.slice(0, 4);
  }, []);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);


  const topDoctorCardWidth = Math.min(width - 48, 330);
  const trustCardWidth = Math.floor((width - 32 - 10) / 2);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#172554" translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1E40AF', '#2563EB']}
            tintColor="#1E40AF"
          />
        }
        contentContainerStyle={{
          // Generous bottom padding so the floating glass tab bar never cuts off the appointment or offers cards
          paddingBottom: Math.max(insets.bottom, 24) + 140,
        }}
      >
        {/* 1. Top Brand Curved Header in Royal Medical Blue */}
        <LinearGradient
          colors={['#172554', '#1E40AF', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: Math.max(insets.top, 14) + 6,
            paddingHorizontal: 18,
            paddingBottom: 22,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle decorative ambient light orb */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -40,
              right: -30,
              width: 170,
              height: 170,
              borderRadius: 85,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />

          {/* Top Row: Brand & Location Left + Profile Avatar Right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left: Brand Name & Location Pill */}
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  {isHi ? 'आदित्यम् ' : 'Adityam '}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#BFDBFE', letterSpacing: -0.3 }}>
                  {isHi ? 'निरामया' : 'Niramayaa'}
                </Text>
              </View>

              {/* Location Selector Capsule Pill */}
              <TouchableOpacity
                onPress={cycleCity}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.28)',
                  alignSelf: 'flex-start',
                }}
              >
                <MapPin size={10} color="#BFDBFE" strokeWidth={2.4} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                  {getCityLabel(selectedCity)}
                </Text>
                <ChevronDown size={10} color="#BFDBFE" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Right Action: Blessings Pill + Profile Avatar with Active Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setBlessingModalVisible(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#FEF3C7',
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  marginRight: 8,
                }}
              >
                <Sparkles size={11} color="#B45309" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>
                  {isHi ? 'मंगलाशीर्वाद' : 'Blessings'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setProfileModalVisible(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <User size={19} color="#FFFFFF" strokeWidth={2.4} />
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#34D399',
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    borderWidth: 2,
                    borderColor: '#1E40AF',
                  }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Tagline / Greeting: Simple, clear, and welcoming */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
              {isHi ? 'आपका स्वास्थ्य साथी' : 'Your Health Partner'}
            </Text>
            <Text style={{ color: '#DBEAFE', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
              {isHi
                ? 'सत्यापित डॉक्टर, डायग्नोस्टिक टेस्ट्स व अस्पताल सेवाएं'
                : 'Book verified doctors, diagnostic scans & hospital care'}
            </Text>
          </View>

          {/* Unified App Search Bar */}
          <AppSearchBar
            onPress={() => router.push('/search')}
            placeholder={
              isHi
                ? 'डॉक्टर, अस्पताल, टेस्ट, दवाइयां खोजें...'
                : 'Search doctors, tests, medicines, hospitals...'
            }
            style={{ marginTop: 14 }}
          />
        </LinearGradient>

        {/* 2. Top Hero Carousel Banner (158px with 1:1 Transparent PNG Illustrations) */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {isLoading ? (
            <SkeletonBox width={bannerWidth} height={158} borderRadius={24} />
          ) : (
            <View
              style={{
                width: bannerWidth,
                height: 158,
                borderRadius: 24,
                overflow: 'hidden',
                shadowColor: '#1E293B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                style={{ width: bannerWidth, height: 158 }}
              >
                {heroBanners.map((banner) => {
                  return (
                    <TouchableOpacity
                      key={banner.id}
                      activeOpacity={0.92}
                      onPress={() => router.push(banner.route)}
                      style={{ width: bannerWidth, height: 158 }}
                    >
                      <LinearGradient
                        colors={banner.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: '100%',
                          height: '100%',
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Soft Ambient Radial Shine behind illustration */}
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            right: -10,
                            bottom: -15,
                            width: 150,
                            height: 150,
                            borderRadius: 75,
                            backgroundColor: 'rgba(255, 255, 255, 0.16)',
                          }}
                        />

                        {/* 1:1 Transparent 3D Illustration on Right Side */}
                        <Image
                          source={banner.image}
                          style={{
                            position: 'absolute',
                            right: -6,
                            bottom: 0,
                            width: 132,
                            height: 132,
                            zIndex: 1,
                          }}
                          resizeMode="contain"
                          // @ts-ignore
                          priority="high"
                          loading="eager"
                        />

                        {/* Left Content Column */}
                        <View
                          style={{
                            flex: 1,
                            paddingRight: 104,
                            justifyContent: 'space-between',
                            zIndex: 2,
                          }}
                        >
                          {/* Badge Pill */}
                          <View style={{ alignSelf: 'flex-start' }}>
                            <View
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.24)',
                                paddingHorizontal: 9,
                                paddingVertical: 3,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.36)',
                              }}
                            >
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>
                                {banner.badge}
                              </Text>
                            </View>
                          </View>

                          {/* Title & Subtitle - Wraps cleanly onto 2 lines with ZERO ellipsis truncation */}
                          <View style={{ marginVertical: 2 }}>
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 15,
                                lineHeight: 19,
                                fontWeight: '900',
                                color: '#FFFFFF',
                                letterSpacing: -0.2,
                              }}
                            >
                              {banner.title}
                            </Text>
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 10.5,
                                lineHeight: 14,
                                fontWeight: '500',
                                color: 'rgba(255, 255, 255, 0.9)',
                                marginTop: 2,
                              }}
                            >
                              {banner.sub}
                            </Text>
                          </View>

                          {/* CTA Button */}
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                backgroundColor: '#FFFFFF',
                                paddingHorizontal: 11,
                                paddingVertical: 4.5,
                                borderRadius: 999,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.12,
                                shadowRadius: 3,
                                elevation: 2,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: banner.colors[0] }}>
                                {banner.cta}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Carousel Pagination Dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 5 }}>
            {heroBanners.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setActiveBannerIndex(idx);
                  bannerScrollRef.current?.scrollTo({
                    x: idx * bannerWidth,
                    animated: true,
                  });
                }}
                activeOpacity={0.7}
                style={{
                  width: activeBannerIndex === idx ? 18 : 6,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: activeBannerIndex === idx ? '#2563EB' : '#DBEAFE',
                }}
              />
            ))}
          </View>
        </View>

        {/* 3. The 4 Core Services: Differentiated Soft Tints, Staggered Motion, No Busy Repeated Text */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {isLoading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              <SkeletonBox width="48.5%" height={126} borderRadius={22} />
              <SkeletonBox width="48.5%" height={126} borderRadius={22} />
              <SkeletonBox width="48.5%" height={126} borderRadius={22} />
              <SkeletonBox width="48.5%" height={126} borderRadius={22} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {CORE_SERVICES.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isHi={isHi}
                  index={index}
                  onPress={() => router.push(service.route)}
                />
              ))}
            </View>
          )}
        </View>

        {/* 4. "Your Quick Access" / "त्वरित पहुँच" (Upcoming Appointment) */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
              {t.quickAccessTitle}
            </Text>
            <TouchableOpacity onPress={() => router.push('/appointments')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                {t.viewAll}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Access Card */}
          <TouchableOpacity
            onPress={() => router.push('/appointments')}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#1E293B',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={20} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#182F3B' }}>
                  {t.upcomingAppointment}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  {t.appointmentDoctor}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#182F3B' }}>
                  {t.appointmentDate}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                  {t.appointmentTime}
                </Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Find Doctors by Specialty Carousel */}
        <View style={{ marginTop: 18 }}>
          <View
            style={{
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
                {t.specialtiesTitle}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 }}>
                {t.specialtiesSub}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/opd')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                {t.viewAll}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
          >
            {/* All */}
            <TouchableOpacity onPress={() => router.push('/opd')} activeOpacity={0.8}>
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 54,
                  justifyContent: 'center',
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <AllCategoriesIcon size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                  {isHi ? 'सभी' : 'All'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Cardiology */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Cardiology' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <HeartPulseIcon size={18} color="#E87869" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.cardiologist}</Text>
            </TouchableOpacity>

            {/* General Physician */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'General Medicine' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <OpdStethoscopeIcon size={18} color="#2563EB" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.generalPhysician}</Text>
            </TouchableOpacity>

            {/* Orthopedics */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Orthopedics' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <BoneJointIcon size={18} color="#4F6BED" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.orthopedic}</Text>
            </TouchableOpacity>

            {/* Pediatrics */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Pediatrics' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <ChildCareIcon size={18} color="#CF8A40" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.pediatrician}</Text>
            </TouchableOpacity>

            {/* Dermatology */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Dermatology' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <DermatologyIcon size={18} color="#8B70D6" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.dermatologist}</Text>
            </TouchableOpacity>

            {/* Dental */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Dentistry' } })}
              activeOpacity={0.8}
              style={{
                height: 54,
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 13,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <DentalToothIcon size={18} color="#12AFA5" />
              <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700', lineHeight: 16 }}>{t.dentist}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 6. Top Doctors Spotlight Carousel (Video Consultation Claim Removed) */}
        {homeTopDoctors.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <View
              style={{
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
                  {t.preferredDoctorTitle}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 }}>
                  {isHi ? 'सत्यापित अस्पताल पार्टनर • प्राथमिकता अपॉइंटमेंट' : 'Verified hospital partners • Priority appointments'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/opd')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                  {t.viewAll}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {homeTopDoctors.map((doc) => {
                const isFav = !!favorites[doc.id];
                return (
                  <View key={doc.id} style={{ width: topDoctorCardWidth }}>
                    <LinearGradient
                      colors={['#1E40AF', '#2563EB', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 26,
                        padding: 14,
                        position: 'relative',
                        overflow: 'hidden',
                        shadowColor: '#1E40AF',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                        elevation: 4,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                        {/* Doctor Image (Balanced 3:4 aspect ratio) */}
                        <View style={{ width: 90, position: 'relative' }}>
                          <View
                            style={{
                              width: 90,
                              height: 118,
                              borderRadius: 16,
                              overflow: 'hidden',
                              backgroundColor: '#DBEAFE',
                            }}
                          >
                            <Image
                              source={getDoctorAvatar(doc)}
                              style={{
                                width: '100%',
                                height: '100%',
                              }}
                              resizeMode="cover"
                            />
                          </View>
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 5,
                              right: 5,
                              backgroundColor: '#2563EB',
                              borderRadius: 10,
                              padding: 2.5,
                              borderWidth: 2,
                              borderColor: '#FFFFFF',
                            }}
                          >
                            <Check size={8} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        </View>

                        {/* Doctor Info */}
                        <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                          <View>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1, marginRight: 4 }}>
                                <Text
                                  numberOfLines={2}
                                  style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', lineHeight: 20 }}
                                >
                                  {translateDoctorName(doc.name, isHi)}
                                </Text>
                                <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: '700', marginTop: 1 }}>
                                  {translateSpecialty(doc.specialty, isHi)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => toggleFavorite(doc.id)}
                                activeOpacity={0.7}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Heart
                                  size={13}
                                  color={isFav ? '#EF4444' : '#FFFFFF'}
                                  fill={isFav ? '#EF4444' : 'transparent'}
                                />
                              </TouchableOpacity>
                            </View>

                            {/* Rating */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <Star size={11} color="#FBBF24" fill="#FBBF24" />
                              <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                                {doc.rating} ({doc.total_reviews} {isHi ? 'समीक्षाएं' : 'reviews'})
                              </Text>
                            </View>

                            {/* Frosted Details Box (Credentials & Experience) */}
                            <View
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                                borderRadius: 12,
                                paddingHorizontal: 9,
                                paddingVertical: 5.5,
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.22)',
                                marginTop: 6,
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}
                              >
                                {translateQualification(doc.qualification, isHi)}
                              </Text>
                              <Text
                                numberOfLines={1}
                                style={{ color: '#DBEAFE', fontSize: 10, fontWeight: '700', marginTop: 1.5 }}
                              >
                                {doc.experience_years} {isHi ? 'वर्ष अनुभव' : 'yrs experience'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Action Row: Round Call Button + Book Appointment Pill */}
                      <View
                        style={{
                          marginTop: 10,
                          paddingTop: 9,
                          borderTopWidth: 1,
                          borderTopColor: 'rgba(255, 255, 255, 0.18)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => Linking.openURL('tel:+9118008902424').catch(() => {})}
                          activeOpacity={0.85}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.12,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                        >
                          <PhoneCall size={16} color="#2563EB" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => router.push('/opd')}
                          activeOpacity={0.88}
                          style={{
                            flex: 1,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.15,
                            shadowRadius: 3,
                            elevation: 2,
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#1E40AF' }}>
                            {isHi ? 'अपॉइंटमेंट लें' : 'Book Appointment'} · ₹{doc.discounted_fee}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 7. Health Checkup Packages Card (Softened Claims) */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <TouchableOpacity
            onPress={() => router.push('/labs')}
            activeOpacity={0.92}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 16,
              borderWidth: 1,
              borderColor: '#DBEAFE',
              shadowColor: '#1E293B',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Top Badges Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  paddingHorizontal: 9,
                  paddingVertical: 3.5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB' }}>
                  {t.discount50}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#2563EB' }}>
                  {t.nablAccredited}
                </Text>
              </View>
            </View>

            {/* Middle Row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', lineHeight: 21 }}>
                  {t.fullBodyPkg}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#2563EB', marginTop: 4 }}>
                  {t.checkupPkgTestsCount}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                  {t.checkupPkgOrgans}
                </Text>

                <View style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>{t.homeSample}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} color="#2563EB" strokeWidth={2.2} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>{t.fastReports}</Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 18,
                  backgroundColor: '#EFF6FF',
                  padding: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#DBEAFE',
                }}
              >
                <Image
                  source={require('../../assets/ic.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Bottom Row: Price & CTA */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                marginTop: 12,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
              }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#182F3B' }}>₹1,499</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>
                    ₹3,000
                  </Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB', marginTop: 1 }}>
                  {isHi ? 'ऐप में भुगतान पर बचत' : 'Save when you pay in app'}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>{t.bookNowCta}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 8. Adityam Family Health Vault Card */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <TouchableOpacity
            activeOpacity={0.94}
            onPress={() => router.push('/family')}
            accessibilityRole="button"
            accessibilityLabel="Access Adityam Health Vault"
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#030E21',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={['#051329', '#0A254A', '#0D366B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 18,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.35)',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(147, 197, 253, 0.35)',
                  }}
                >
                  <ShieldCheck size={22} color="#93C5FD" strokeWidth={2.2} />
                </View>

                <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                    {isHi ? 'आदित्यम् हेल्थ वॉल्ट' : 'Adityam Health Vault'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#93C5FD', marginTop: 2 }}>
                    {isHi ? 'परिवार के डिजिटल रिकॉर्ड' : 'Your family, your health records'}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 999,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    backgroundColor: '#F6D78C',
                  }}
                >
                  <Crown size={11} color="#78500D" strokeWidth={2.4} />
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#78500D', marginLeft: 3 }}>
                    GOLD
                  </Text>
                </View>
              </View>

              {/* Benefits Banner */}
              <View
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  padding: 12,
                  backgroundColor: 'rgba(3, 15, 38, 0.45)',
                  borderWidth: 1,
                  borderColor: 'rgba(147, 197, 253, 0.2)',
                }}
              >
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.8 }}>
                  {isHi ? 'फैमिली हेल्थ बेनिफिट्स' : 'FAMILY HEALTH BENEFITS'}
                </Text>
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF', marginTop: 4 }}>
                  {isHi ? 'एक सुरक्षित वॉल्ट, पूरे परिवार के लिए' : 'One vault. Your whole family.'}
                </Text>
                <Text style={{ fontSize: 11, color: '#BFDBFE', marginTop: 2, lineHeight: 16 }}>
                  {t.vaultCardDesc}
                </Text>
              </View>

              {/* Aligned Benefits */}
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <IdCard size={19} color="#60A5FA" strokeWidth={2} />
                  <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                    {t.vaultTagAbha}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                    {isHi ? 'लिंक्ड रिकॉर्ड्स' : 'Linked records'}
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: 'rgba(147, 197, 253, 0.22)', marginRight: 10 }} />

                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                  <UsersRound size={19} color="#60A5FA" strokeWidth={2} />
                  <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                    {t.vaultTagMembers}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                    {isHi ? 'फैमिली एक्सेस' : 'Family access'}
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: 'rgba(147, 197, 253, 0.22)', marginHorizontal: 10 }} />

                <View style={{ flex: 1, paddingLeft: 4 }}>
                  <BadgePercent size={19} color="#F6D78C" strokeWidth={2} />
                  <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                    {t.vaultTagDiscount}
                  </Text>
                  <Text style={{ fontSize: 9.5, color: '#93C5FD', marginTop: 1 }}>
                    {isHi ? 'ऐप में बचत' : 'Family savings'}
                  </Text>
                </View>
              </View>

              {/* Action Footer */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(147, 197, 253, 0.22)',
                }}
              >
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#BFDBFE' }}>
                  {isHi ? 'सुरक्षित व गोपनीय डेटा' : 'Private & secure'}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0A254A' }}>
                    {t.vaultCardCta}
                  </Text>
                  <ArrowRight size={13} color="#0A254A" strokeWidth={2.4} style={{ marginLeft: 5 }} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 9. Institutional Trust Grid (Clean 2x2 Layout) */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <ShieldCheck size={15} color="#2563EB" strokeWidth={2.4} />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1E293B', letterSpacing: -0.2 }}>
              {isHi ? 'आदित्यम् ट्रस्ट व गुणवत्ता' : 'Adityam Trust & Quality'}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 10,
            }}
          >
            {TRUST_PILLARS.map((pillar) => {
              const IconComp = pillar.Icon;
              return (
                <View
                  key={pillar.id}
                  style={{
                    width: trustCardWidth,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 5,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: pillar.iconBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: pillar.borderColor,
                    }}
                  >
                    <IconComp size={18} color={pillar.iconColor} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#0F172A',
                        letterSpacing: -0.2,
                      }}
                    >
                      {isHi ? pillar.titleHi : pillar.titleEn}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 10.5,
                        fontWeight: '600',
                        color: '#64748B',
                        marginTop: 1,
                      }}
                    >
                      {isHi ? pillar.subHi : pillar.subEn}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 10. Partner Offers Section (Softened Claims) */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
              {t.exclusiveOffers}
            </Text>
            <TouchableOpacity onPress={() => router.push('/pharmacy')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                {t.viewAll}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {/* Offer 1: Pharmacy */}
            <TouchableOpacity
              onPress={() => router.push('/pharmacy')}
              activeOpacity={0.9}
              style={{
                width: 275,
                backgroundColor: '#EFF6FF',
                borderRadius: 22,
                padding: 14,
                borderWidth: 1,
                borderColor: '#DBEAFE',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#182F3B' }}>
                  {t.offerFlat20}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  {t.offerMedicinesSub}
                </Text>
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#2563EB',
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{t.shopNow}</Text>
                </View>
              </View>

              <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </TouchableOpacity>

            {/* Offer 2: Health Checkups */}
            <TouchableOpacity
              onPress={() => router.push('/labs')}
              activeOpacity={0.9}
              style={{
                width: 275,
                backgroundColor: '#F5F3FF',
                borderRadius: 22,
                padding: 14,
                borderWidth: 1,
                borderColor: '#E9E5FF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#5B21B6' }}>
                  {t.offer50Checkup}
                </Text>
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#8B70D6',
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{t.viewOffersBtn}</Text>
                </View>
              </View>

              <View style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=80',
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Global Profile & Language Switcher Modal */}
      <ProfileModal visible={profileModalVisible} onClose={() => setProfileModalVisible(false)} />

      {/* Opening Mangal Ashirwad / Sacred Blessing Modal */}
      <JaiJinendraBlessingModal visible={blessingModalVisible} onClose={() => setBlessingModalVisible(false)} />
    </View>
  );
}
