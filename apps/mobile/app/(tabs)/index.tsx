import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Modal,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Languages,
  Calendar,
  ChevronRight,
  ArrowRight,
  Crown,
  Heart,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  X,
  Building2,
  Clock,
  Sparkles,
  User,
  FileText,
  Pill,
  HelpCircle,
  LogOut,
  Lock,
  Users,
  Percent,
  Cpu,
  IdCard,
  UsersRound,
  Tag,
  LockKeyhole,
  BadgePercent,
  Star,
  Video,
  Check,
} from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
} from '../../components/ServiceIcons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const [selectedCity, setSelectedCity] = useState('Koramangala, Bengaluru');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerWidth = width - 32;

  const heroBanners = [
    {
      id: 'doctor-consult',
      image: require('../../assets/ban-1.png'),
      route: '/opd' as const,
      title: 'Consult with Doctors',
    },
    {
      id: 'lab-tests',
      image: require('../../assets/ban-2.png'),
      route: '/labs' as const,
      title: 'Accurate Lab Tests',
    },
    {
      id: 'hospital-care',
      image: require('../../assets/ban-3.png'),
      route: '/ipd' as const,
      title: 'Hospital Care & Admission',
    },
  ];

  // Auto-scroll every 5.5s so users have comfortable time to read
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
        ? 'Saket, New Delhi'
        : 'Koramangala, Bengaluru';
    setSelectedCity(nextCity);
  };

  // Top Featured Doctors for the Home Screen Carousel (Image 2 style)
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
    return list.slice(0, 4);
  }, []);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getDoctorAvatar = (doctor: Doctor) => {
    if (doctor.avatar_url && doctor.avatar_url.startsWith('http') && !doctor.avatar_url.includes('undefined')) {
      return doctor.avatar_url;
    }
    const nameLower = doctor.name.toLowerCase();
    if (nameLower.includes('meenakshi') || nameLower.includes('anita') || nameLower.includes('sunita')) {
      return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';
    }
    if (nameLower.includes('vikramaditya') || nameLower.includes('ashok')) {
      return 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80';
  };

  const topDoctorCardWidth = Math.min(width - 48, 330);

  return (
    <ScrollView
      className="flex-1 bg-[#F8FAFC]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 110 }}
    >
      {/* 1. Top Brand Curved Header in Royal Medical Blue (Image 3 Inspiration) */}
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

        {/* Top Row: Brand & Location Left + Language Switcher & Profile Right */}
        <View className="flex-row items-center justify-between">
          {/* Left: Official Brand Logo & Name */}
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-11 h-11 rounded-2xl bg-white/20 p-1 items-center justify-center border border-white/30">
              <Image
                source={require('../../assets/logo_AN.png')}
                style={{ width: 34, height: 34 }}
                resizeMode="contain"
              />
            </View>
            <View className="ml-2.5">
              <View className="flex-row items-center">
                <Text className="text-[17px] font-black text-white tracking-tight">
                  Adityam{' '}
                </Text>
                <Text className="text-[17px] font-black text-blue-200 tracking-tight">
                  Niramayaa
                </Text>
              </View>
              {/* Location Selector Capsule Pill */}
              <TouchableOpacity
                onPress={cycleCity}
                className="flex-row items-center space-x-1 mt-0.5 bg-white/15 px-2 py-0.5 rounded-full border border-white/25 self-start"
                activeOpacity={0.7}
              >
                <MapPin size={10} color="#BFDBFE" strokeWidth={2.4} />
                <Text className="text-[10.5px] font-bold text-white">
                  {language === 'hi'
                    ? selectedCity
                      .replace('Koramangala, Bengaluru', 'कोरमंगला, बेंगलुरु')
                      .replace('Malviya Nagar, Jaipur', 'मालवीय नगर, जयपुर')
                      .replace('Saket, New Delhi', 'साकेत, नई दिल्ली')
                    : selectedCity}
                </Text>
                <ChevronDown size={10} color="#BFDBFE" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Action Icons (Language Switcher & Profile Dropdown) */}
          <View className="flex-row items-center space-x-2">
            {/* Language Toggle Pill */}
            <TouchableOpacity
              onPress={toggleLanguage}
              activeOpacity={0.8}
              className="px-2.5 py-1.5 rounded-full bg-white/15 border border-white/25 flex-row items-center space-x-1"
            >
              <Languages size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-[11px] font-extrabold text-white">
                {language === 'en' ? 'हिं' : 'EN'}
              </Text>
            </TouchableOpacity>

            {/* Profile Icon */}
            <TouchableOpacity
              onPress={() => setProfileMenuVisible(true)}
              activeOpacity={0.8}
              className="w-10 h-10 rounded-full bg-white/20 border border-white/30 items-center justify-center relative"
            >
              <User size={18} color="#FFFFFF" strokeWidth={2.4} />
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5 border-2 border-[#1E40AF]" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Tagline / Greeting */}
        <View className="mt-3.5 px-0.5">
          <Text className="text-white text-[19px] font-black tracking-tight leading-6">
            Healthcare Concierge
          </Text>
          <Text className="text-blue-100 text-xs font-medium mt-0.5">
            Book verified doctors, diagnostic scans & hospital care
          </Text>
        </View>

        {/* Exact Match to OPD Floating Search Bar */}
        <TouchableOpacity
          onPress={() => router.push('/search')}
          activeOpacity={0.92}
          className="mt-3.5 bg-white rounded-full flex-row items-center pl-4 pr-1.5 py-1.5 shadow-lg shadow-blue-950/20 mb-1"
        >
          <Text className="flex-1 text-sm text-[#94A3B8] font-medium py-1 px-1" numberOfLines={1}>
            {t.searchDoctorPlaceholder || 'Search Doctor, specialty, hospital...'}
          </Text>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#2563EB',
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={17} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* 2. Top Hero Carousel Banner (16:7 Aspect Ratio) */}
      <View className="px-4 mt-3.5">
        <View
          style={{
            width: bannerWidth,
            height: bannerWidth * (7 / 16),
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: '#EFF6FF',
            borderWidth: 1,
            borderColor: '#DBEAFE',
            shadowColor: '#1E293B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
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
            style={{ width: bannerWidth, height: '100%' }}
          >
            {heroBanners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                activeOpacity={0.93}
                onPress={() => router.push(banner.route)}
                style={{ width: bannerWidth, height: '100%' }}
              >
                <Image
                  source={banner.image}
                  style={{ width: bannerWidth, height: '100%' }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Carousel Pagination Dots */}
        <View className="flex-row items-center justify-center mt-2 space-x-1.5">
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
                width: activeBannerIndex === idx ? 20 : 6,
                height: 5,
                borderRadius: 3,
                backgroundColor: activeBannerIndex === idx ? '#2563EB' : '#DBEAFE',
              }}
            />
          ))}
        </View>
      </View>

      {/* 3. The 4 Core Services in Unified Clinical White Cards */}
      <View className="px-4 mt-4">
        <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
          {/* Card 1: OPD (Doctor Consult) */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm justify-between"
            style={{
              minHeight: 130,
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-blue-100 items-center justify-center">
                <OpdStethoscopeIcon size={24} color="#2563EB" />
              </View>
              <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-[#2563EB] uppercase tracking-wider">
                  VERIFIED
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                {t.opdGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>
                {t.opdGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
              <Text className="text-[10.5px] font-black text-[#2563EB]">Book Consult</Text>
              <View className="w-5 h-5 rounded-full bg-[#2563EB] items-center justify-center shadow-2xs">
                <ArrowRight size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Investigations (Lab Tests) */}
          <TouchableOpacity
            onPress={() => router.push('/labs')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm justify-between"
            style={{
              minHeight: 130,
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-blue-100 items-center justify-center">
                <InvestigationsFlaskIcon size={24} color="#2563EB" />
              </View>
              <View className="bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-amber-700 uppercase tracking-wider">
                  25% OFF
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                {t.investigationsGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>
                {t.investigationsGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
              <Text className="text-[10.5px] font-black text-[#2563EB]">Book Test</Text>
              <View className="w-5 h-5 rounded-full bg-[#2563EB] items-center justify-center shadow-2xs">
                <ArrowRight size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: Pharmacy (Medicines) */}
          <TouchableOpacity
            onPress={() => router.push('/pharmacy')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm justify-between"
            style={{
              minHeight: 130,
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-blue-100 items-center justify-center">
                <PharmacyCapsuleIcon size={24} color="#2563EB" />
              </View>
              <View className="bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-emerald-700 uppercase tracking-wider">
                  2 HR
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                {t.pharmacyGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>
                {t.pharmacyGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
              <Text className="text-[10.5px] font-black text-[#2563EB]">Order Meds</Text>
              <View className="w-5 h-5 rounded-full bg-[#2563EB] items-center justify-center shadow-2xs">
                <ArrowRight size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 4: IPD (Hospital Care) */}
          <TouchableOpacity
            onPress={() => router.push('/ipd')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm justify-between"
            style={{
              minHeight: 130,
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-blue-100 items-center justify-center">
                <IpdHospitalBedIcon size={24} color="#2563EB" />
              </View>
              <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-[#2563EB] uppercase tracking-wider">
                  CASHLESS
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>
                {t.ipdGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 }}>
                {t.ipdGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
              <Text className="text-[10.5px] font-black text-[#2563EB]">Admissions</Text>
              <View className="w-5 h-5 rounded-full bg-[#2563EB] items-center justify-center shadow-2xs">
                <ArrowRight size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. "Your Quick Access" Section (Upcoming Patient Care) */}
      <View className="px-4 mt-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-black text-[#182F3B]">
            {t.quickAccessTitle}
          </Text>
          <TouchableOpacity onPress={() => router.push('/opd')}>
            <Text className="text-xs font-bold text-[#2563EB]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access Card: Upcoming Appointment */}
        <TouchableOpacity
          onPress={() => router.push('/opd')}
          className="bg-white rounded-2xl p-4 border border-[#E2E8F0] flex-row items-center justify-between shadow-xs active:scale-99"
        >
          <View className="flex-row items-center space-x-3 flex-1 mr-2">
            <View className="w-11 h-11 rounded-2xl bg-[#EFF6FF] items-center justify-center">
              <Calendar size={20} color="#2563EB" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-[#182F3B]">
                {t.upcomingAppointment}
              </Text>
              <Text className="text-xs text-[#617581] mt-0.5">
                {t.appointmentDoctor}
              </Text>
            </View>
          </View>

          <View className="items-end flex-row items-center space-x-2">
            <View className="items-end">
              <Text className="text-xs font-bold text-[#182F3B]">
                {t.appointmentDate}
              </Text>
              <Text className="text-[11px] text-[#617581] mt-0.5">
                {t.appointmentTime}
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      </View>

      {/* 5. Find Doctors by Specialty Carousel */}
      <View className="mt-5">
        <View className="px-4 flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-base font-black text-[#182F3B]">
              {t.specialtiesTitle}
            </Text>
            <Text className="text-[11px] text-[#617581] font-medium mt-0.5">
              {t.specialtiesSub}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/opd')}>
            <Text className="text-xs font-bold text-[#2563EB]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 8 }}
        >
          {/* Capsule 1: All */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.8}
            className="mr-2"
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.28,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <View className="mr-2">
                <OpdStethoscopeIcon size={20} color="#FFFFFF" />
              </View>
              <Text className="text-white text-xs font-black tracking-tight">
                All Specialties
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Capsule 2: Cardiologist */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Cardiology' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <HeartPulseIcon size={20} color="#E87869" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.cardiologist}
            </Text>
          </TouchableOpacity>

          {/* Capsule 3: General Physician */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'General Medicine' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <OpdStethoscopeIcon size={20} color="#2563EB" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.generalPhysician}
            </Text>
          </TouchableOpacity>

          {/* Capsule 4: Orthopedics */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Orthopedics' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <BoneJointIcon size={20} color="#4F6BED" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.orthopedic}
            </Text>
          </TouchableOpacity>

          {/* Capsule 5: Pediatrics */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Pediatrics' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <ChildCareIcon size={20} color="#CF8A40" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.pediatrician}
            </Text>
          </TouchableOpacity>

          {/* Capsule 6: Dermatologist */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Dermatology' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <DermatologyIcon size={20} color="#8B70D6" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.dermatologist}
            </Text>
          </TouchableOpacity>

          {/* Capsule 7: Dental Care */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/opd', params: { specialty: 'Dentistry' } })}
            activeOpacity={0.8}
            className="mr-2 bg-white px-3.5 py-2.5 rounded-2xl flex-row items-center border border-slate-200/90 shadow-2xs"
          >
            <View className="mr-2">
              <DentalToothIcon size={20} color="#12AFA5" />
            </View>
            <Text className="text-[#334155] text-xs font-bold">
              {t.dentist}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 5b. Top Doctors Spotlight Carousel (Image 2 Reference Card Style) */}
      {homeTopDoctors.length > 0 && (
        <View className="mt-5">
          <View className="px-4 flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-base font-black text-[#182F3B]">
                {t.preferredDoctorTitle || 'Top Specialists'}
              </Text>
              <Text className="text-[11px] text-[#617581] font-medium mt-0.5">
                Verified hospital partners • Priority appointments
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/opd')}>
              <Text className="text-xs font-bold text-[#2563EB]">
                {t.viewAll}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 8 }}
          >
            {homeTopDoctors.map((doc, idx) => {
              const isFav = !!favorites[doc.id];
              return (
                <View
                  key={doc.id}
                  style={{
                    width: topDoctorCardWidth,
                    marginRight: idx === homeTopDoctors.length - 1 ? 0 : 12,
                  }}
                >
                  <LinearGradient
                    colors={['#5A8EF7', '#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 24,
                      padding: 14,
                      position: 'relative',
                      overflow: 'hidden',
                      shadowColor: '#2563EB',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.18,
                      shadowRadius: 10,
                      elevation: 4,
                    }}
                  >
                    {/* Ambient light glow */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: -30,
                        right: -30,
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    />

                    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      {/* Left: Doctor Portrait */}
                      <View style={{ width: 106, position: 'relative' }}>
                        <Image
                          source={{
                            uri: getDoctorAvatar(doc),
                          }}
                          style={{
                            width: 106,
                            height: 168,
                            borderRadius: 18,
                            backgroundColor: '#DBEAFE',
                          }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            backgroundColor: '#2563EB',
                            borderRadius: 12,
                            padding: 3,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                          }}
                        >
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      </View>

                      {/* Right: Info + Frosted Glass Box + Action Buttons */}
                      <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                        <View>
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 mr-1">
                              <Text
                                className="text-white text-base font-black tracking-tight leading-tight"
                                numberOfLines={1}
                              >
                                {doc.name}
                              </Text>
                              <Text className="text-blue-100 text-xs font-semibold mt-0.5">
                                {doc.specialty}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => toggleFavorite(doc.id)}
                              activeOpacity={0.7}
                              className="w-7 h-7 rounded-full bg-white/20 items-center justify-center -mt-0.5"
                            >
                              <Heart
                                size={13}
                                color={isFav ? '#EF4444' : '#FFFFFF'}
                                fill={isFav ? '#EF4444' : 'transparent'}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Star Rating Row */}
                          <View className="flex-row items-center space-x-1 mt-1">
                            <Star size={11} color="#FBBF24" fill="#FBBF24" />
                            <Text className="text-white text-xs font-bold">
                              {doc.rating} ({doc.total_reviews} Reviews)
                            </Text>
                          </View>

                          {/* Frosted Glass Box (Image 2 Signature Element) */}
                          <View
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.16)',
                              borderRadius: 12,
                              paddingHorizontal: 9,
                              paddingVertical: 7,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 255, 255, 0.22)',
                              marginTop: 8,
                            }}
                          >
                            <Text
                              className="text-white text-[10.5px] font-semibold leading-tight"
                              numberOfLines={2}
                            >
                              {doc.qualification}
                            </Text>
                            <View className="flex-row items-center space-x-1 mt-1">
                              <Clock size={10} color="#BFDBFE" />
                              <Text className="text-blue-100 text-[10px] font-semibold">
                                Slot: {doc.next_available_slot}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Bottom Row: Circular Buttons + Fee Pill */}
                        <View className="flex-row items-center justify-between mt-3">
                          <View className="flex-row items-center space-x-1.5">
                            <TouchableOpacity
                              onPress={() => router.push('/opd')}
                              activeOpacity={0.8}
                              className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                            >
                              <PhoneCall size={13} color="#2563EB" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => router.push('/opd')}
                              activeOpacity={0.8}
                              className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                            >
                              <Video size={13} color="#2563EB" />
                            </TouchableOpacity>
                          </View>

                          {/* Consultation Fee Pill */}
                          <TouchableOpacity
                            onPress={() => router.push('/opd')}
                            activeOpacity={0.85}
                            className="bg-white/20 border border-white/30 px-2.5 py-1.5 rounded-full flex-row items-center space-x-1"
                            style={{ flexShrink: 0 }}
                          >
                            <Text className="text-white text-[11px] font-black">
                              ₹{doc.discounted_fee}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 5. Health Checkup Packages Card (Redesigned with 3D Commercial Art) */}
      <View className="px-4 mt-5">
        <TouchableOpacity
          onPress={() => router.push('/labs')}
          activeOpacity={0.92}
          className="bg-white rounded-3xl p-4 border border-[#DBEAFE] shadow-sm relative overflow-hidden"
        >
          {/* Subtle gradient blue background glow */}
          <View
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#EFF6FF',
              opacity: 0.9,
            }}
          />

          {/* Top Badges Row: Clean & Premium (No stars/sparkles) */}
          <View className="flex-row items-center justify-between mb-3">
            {/* Clean, Premium Discount Badge */}
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 8 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB', letterSpacing: 0.5 }}>
                {t.discount50}
              </Text>
            </View>

            {/* Subtle Laboratory Certification */}
            <View className="flex-row items-center space-x-1">
              <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>
                {t.nablAccredited}
              </Text>
            </View>
          </View>

          {/* Middle Row: Content Left + 3D Image Right Top */}
          <View className="flex-row items-start justify-between">
            {/* Left Content Column */}
            <View className="flex-1 pr-3">
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', lineHeight: 21 }}>
                {t.fullBodyPkg}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#2563EB', marginTop: 4 }}>
                {t.checkupPkgTestsCount}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#617581', marginTop: 2, lineHeight: 16 }}>
                {t.checkupPkgOrgans}
              </Text>

              {/* Clean bullet perks */}
              <View style={{ marginTop: 9, gap: 4 }}>
                <View className="flex-row items-center space-x-1.5">
                  <CheckCircle2 size={12} color="#2563EB" strokeWidth={2.2} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>
                    {t.homeSample}
                  </Text>
                </View>
                <View className="flex-row items-center space-x-1.5">
                  <Clock size={12} color="#2563EB" strokeWidth={2.2} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>
                    {t.fastReports}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Top: 3D Medical Kit Graphic */}
            <View className="w-24 h-24 rounded-2xl bg-[#EFF6FF] p-1.5 items-center justify-center border border-[#DBEAFE] shadow-xs">
              <Image
                source={require('../../assets/checkup_3d.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Bottom Row: Price Left + Book Now Button Bottom Right */}
          <View className="flex-row items-center justify-between pt-3 mt-3.5 border-t border-[#F1F5F9]">
            {/* Price Info */}
            <View>
              <View className="flex-row items-baseline space-x-2">
                <Text style={{ fontSize: 21, fontWeight: '900', color: '#182F3B' }}>₹1,499</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>₹3,000</Text>
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#2563EB', marginTop: 1 }}>
                Save ₹1,501 (50%)
              </Text>
            </View>

            {/* Book Now Button near Bottom Right */}
            <View className="bg-[#2563EB] py-2.5 px-4 rounded-xl shadow-xs flex-row items-center space-x-1">
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>
                {t.bookNowCta}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* 7. Adityam Family Health Vault Card (Ultra-Premium Deep Blue Executive Pass) */}
      <View className="px-4 mt-4">
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={() => router.push('/family')}
          accessibilityRole="button"
          accessibilityLabel="Access Adityam Health Vault"
          style={{
            borderRadius: 26,
            overflow: 'hidden',
            shadowColor: '#030E21',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={['#051329', '#0A254A', '#0D366B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 18,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: 'rgba(59, 130, 246, 0.35)',
            }}
          >
            {/* Subtle decorative ambient light orb */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -65,
                right: -45,
                width: 190,
                height: 190,
                borderRadius: 100,
                backgroundColor: 'rgba(59, 130, 246, 0.14)',
                borderWidth: 1,
                borderColor: 'rgba(147, 197, 253, 0.2)',
              }}
            />

            {/* Header */}
            <View className="flex-row items-center">
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(147, 197, 253, 0.35)',
                }}
              >
                <ShieldCheck size={24} color="#93C5FD" strokeWidth={2.2} />
              </View>

              <View className="flex-1 ml-3 mr-2">
                <Text
                  className="text-[15px] font-extrabold"
                  style={{ color: '#FFFFFF' }}
                  numberOfLines={1}
                >
                  Adityam Health Vault
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#93C5FD' }}
                >
                  Your family, your health records
                </Text>
              </View>

              <View
                className="flex-row items-center rounded-full px-2.5 py-1.5"
                style={{
                  backgroundColor: '#F6D78C',
                  borderWidth: 1,
                  borderColor: '#FFE8B1',
                }}
              >
                <Crown size={12} color="#78500D" strokeWidth={2.3} />
                <Text
                  className="text-[9px] font-extrabold ml-1"
                  style={{ color: '#78500D', letterSpacing: 0.5 }}
                >
                  GOLD
                </Text>
              </View>
            </View>

            {/* Premium feature panel */}
            <View
              className="mt-5 rounded-2xl p-3.5"
              style={{
                backgroundColor: 'rgba(3, 15, 38, 0.45)',
                borderWidth: 1,
                borderColor: 'rgba(147, 197, 253, 0.2)',
              }}
            >
              <Text
                className="text-[9px] font-bold tracking-widest"
                style={{ color: '#60A5FA' }}
              >
                FAMILY HEALTH BENEFITS
              </Text>

              <Text
                className="text-[17px] font-extrabold mt-2"
                style={{ color: '#FFFFFF' }}
              >
                One vault. Your whole family.
              </Text>

              <Text
                className="text-[11px] leading-4 mt-1"
                style={{ color: '#BFDBFE' }}
              >
                {t.vaultCardDesc}
              </Text>
            </View>

            {/* Three aligned benefits */}
            <View className="flex-row mt-5">
              <View className="flex-1 pr-2">
                <IdCard size={21} color="#60A5FA" strokeWidth={2} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                  numberOfLines={2}
                >
                  {t.vaultTagAbha}
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#93C5FD' }}
                >
                  Linked records
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: 'rgba(147, 197, 253, 0.22)',
                  marginRight: 12,
                }}
              />

              <View className="flex-1 px-1">
                <UsersRound size={21} color="#60A5FA" strokeWidth={2} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                  numberOfLines={2}
                >
                  {t.vaultTagMembers}
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#93C5FD' }}
                >
                  Family access
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: 'rgba(147, 197, 253, 0.22)',
                  marginHorizontal: 12,
                }}
              />

              <View className="flex-1 pl-1">
                <BadgePercent size={21} color="#F6D78C" strokeWidth={2} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                >
                  15% Off
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#93C5FD' }}
                >
                  Family savings
                </Text>
              </View>
            </View>

            {/* Action footer */}
            <View
              className="flex-row items-center justify-between mt-5 pt-4"
              style={{
                borderTopWidth: 1,
                borderTopColor: 'rgba(147, 197, 253, 0.22)',
              }}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <LockKeyhole size={14} color="#60A5FA" />
                <Text
                  className="text-[10px] font-semibold ml-1.5"
                  style={{ color: '#BFDBFE' }}
                >
                  Private & secure
                </Text>
              </View>

              <View
                className="flex-row items-center rounded-full pl-3.5 pr-3 py-2.5"
                style={{
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text
                  className="text-[11px] font-extrabold"
                  style={{ color: '#0A254A' }}
                >
                  {t.vaultCardCta}
                </Text>
                <ArrowRight
                  size={15}
                  color="#0A254A"
                  strokeWidth={2.4}
                  style={{ marginLeft: 7 }}
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 7. Institutional Trust & Credibility Strip */}
      <View className="px-4 mt-4">
        <View className="bg-[#EFF6FF]/60 border border-[#DBEAFE] rounded-2xl p-3 flex-row items-center justify-between">
          <View className="flex-1 items-center px-1">
            <Building2 size={16} color="#2563EB" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustHospitals}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#DBEAFE]" />

          <View className="flex-1 items-center px-1">
            <CheckCircle2 size={16} color="#2563EB" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustLabs}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#DBEAFE]" />

          <View className="flex-1 items-center px-1">
            <ShieldCheck size={16} color="#2563EB" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustCashless}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#DBEAFE]" />

          <View className="flex-1 items-center px-1">
            <Pill size={16} color="#2563EB" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustMeds}
            </Text>
          </View>
        </View>
      </View>

      {/* 9. "Exclusive Offers" Section */}
      <View className="px-4 mt-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-black text-[#182F3B]">
            {t.exclusiveOffers}
          </Text>
          <TouchableOpacity onPress={() => router.push('/pharmacy')}>
            <Text className="text-xs font-bold text-[#2563EB]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Scroll of Offers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {/* Offer 1: Pharmacy 20% Off */}
          <TouchableOpacity
            onPress={() => router.push('/pharmacy')}
            className="w-72 bg-[#EFF6FF] rounded-3xl p-4 mr-3 border border-[#DBEAFE] flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-1 pr-2">
              <Text className="text-base font-black text-[#182F3B]">
                {t.offerFlat20}
              </Text>
              <Text className="text-xs text-[#617581] mt-0.5">
                {t.offerMedicinesSub}
              </Text>
              <View className="mt-3 bg-[#2563EB] py-1.5 px-3 rounded-xl self-start">
                <Text className="text-[11px] font-bold text-white">
                  {t.shopNow}
                </Text>
              </View>
            </View>
            <View className="w-20 h-20 rounded-2xl overflow-hidden bg-white p-1">
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
                }}
                className="w-full h-full rounded-xl"
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>

          {/* Offer 2: Health Checkups 50% Off */}
          <TouchableOpacity
            onPress={() => router.push('/labs')}
            className="w-72 bg-[#F5F3FF] rounded-3xl p-4 mr-3 border border-[#E9E5FF] flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-1 pr-2">
              <Text className="text-base font-black text-[#5B21B6]">
                {t.offer50Checkup}
              </Text>
              <View className="mt-3 bg-[#8B70D6] py-1.5 px-3 rounded-xl self-start">
                <Text className="text-[11px] font-bold text-white">
                  {t.viewOffersBtn}
                </Text>
              </View>
            </View>
            <View className="w-20 h-20 rounded-2xl overflow-hidden bg-white p-1">
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=80',
                }}
                className="w-full h-full rounded-xl"
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 9. Profile Dropdown Menu Modal (Anchored from Top-Right Avatar) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileMenuVisible}
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
          className="flex-1 bg-black/45 justify-start items-end pt-14 pr-4"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-72 bg-white rounded-3xl p-4 shadow-2xl border border-[#E2E8F0]"
          >
            {/* User Profile Header */}
            <View className="flex-row items-center space-x-3 pb-3 border-b border-[#F1F5F9]">
              <View className="w-12 h-12 rounded-2xl bg-[#EFF6FF] items-center justify-center border border-[#DBEAFE]">
                <Text className="text-lg font-black text-[#2563EB]">H</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center space-x-1.5">
                  <Text className="text-sm font-black text-[#182F3B]">
                    Hardik Sharma
                  </Text>
                  <View className="bg-[#FFF9F0] px-1.5 py-0.5 rounded-md border border-[#FFE7C2]">
                    <Crown size={9} color="#CF8A40" strokeWidth={2.5} />
                  </View>
                </View>
                <Text className="text-[11px] text-[#617581] mt-0.5">
                  +91 98765 43210
                </Text>
              </View>
            </View>

            {/* Language Switcher in Dropdown */}
            <View className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]">
              <View className="flex-row items-center space-x-2">
                <Languages size={15} color="#2563EB" />
                <Text className="text-xs font-bold text-[#182F3B]">
                  {language === 'hi' ? 'भाषा (Language)' : 'App Language'}
                </Text>
              </View>
              <View className="flex-row bg-[#F8FAFC] p-0.5 rounded-xl border border-[#E2E8F0]">
                <TouchableOpacity
                  onPress={() => {
                    if (language !== 'en') toggleLanguage();
                  }}
                  className={`px-2 py-1 rounded-lg ${language === 'en' ? 'bg-[#2563EB]' : ''
                    }`}
                >
                  <Text
                    className={`text-[10px] font-black ${language === 'en' ? 'text-white' : 'text-[#617581]'
                      }`}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (language !== 'hi') toggleLanguage();
                  }}
                  className={`px-2 py-1 rounded-lg ${language === 'hi' ? 'bg-[#2563EB]' : ''
                    }`}
                >
                  <Text
                    className={`text-[10px] font-black ${language === 'hi' ? 'text-white' : 'text-[#617581]'
                      }`}
                  >
                    हिंदी
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Links */}
            <View className="py-1">
              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  router.push('/opd');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <Calendar size={15} color="#2563EB" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'मेरी अपॉइंटमेंट्स' : 'My Appointments'}
                  </Text>
                </View>
                <View className="bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                  <Text className="text-[9px] font-black text-[#2563EB]">1 Active</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  router.push('/family');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <ShieldCheck size={15} color="#2563EB" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'फैमिली हेल्थ वॉल्ट' : 'Family Health Vault'}
                  </Text>
                </View>
                <ChevronRight size={14} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  router.push('/labs');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <FileText size={15} color="#2563EB" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'लैब रिपोर्ट्स व नुस्खे' : 'Lab Reports & Records'}
                  </Text>
                </View>
                <ChevronRight size={14} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  router.push('/pharmacy');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <Pill size={15} color="#2563EB" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'दवाइयों के ऑर्डर्स' : 'Medicine Orders'}
                  </Text>
                </View>
                <ChevronRight size={14} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  Linking.openURL('tel:1800123456');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F9]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <HelpCircle size={15} color="#2563EB" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? '24x7 सहायता' : 'Help & Support'}
                  </Text>
                </View>
                <ChevronRight size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              onPress={() => {
                setProfileMenuVisible(false);
                router.replace('/login');
              }}
              className="mt-2 pt-2 flex-row items-center justify-center space-x-1.5 py-1.5 rounded-xl bg-[#FFF1F0]"
            >
              <LogOut size={14} color="#E87869" />
              <Text className="text-xs font-bold text-[#E87869]">
                {language === 'hi' ? 'लॉग आउट' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView >
  );
}
