import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  return (
    <ScrollView
      className="flex-1 bg-[#F7FBFA]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 110 }}
    >
      {/* 1. Top Brand Header & Action Row */}
      <View
        style={{ paddingTop: Math.max(insets.top, 14) + 6 }}
        className="px-4 pb-1 flex-row items-center justify-between"
      >
        {/* Left: Official Brand Logo & Name */}
        <View className="flex-row items-center flex-1 pr-2">
          <Image
            source={require('../../assets/logo_AN.png')}
            style={{ width: 42, height: 42 }}
            resizeMode="contain"
          />
          <View className="ml-2.5">
            <View className="flex-row items-center">
              <Text className="text-[17px] font-black text-[#182F3B] tracking-tight">
                Adityam{' '}
              </Text>
              <Text className="text-[17px] font-black text-[#087F8C] tracking-tight">
                Niramayaa
              </Text>
            </View>
            <TouchableOpacity
              onPress={cycleCity}
              className="flex-row items-center space-x-1 mt-0.5"
              activeOpacity={0.7}
            >
              <MapPin size={11} color="#087F8C" strokeWidth={2.4} />
              <Text className="text-[11px] font-bold text-[#617581]">
                {language === 'hi'
                  ? selectedCity
                    .replace('Koramangala, Bengaluru', 'कोरमंगला, बेंगलुरु')
                    .replace('Malviya Nagar, Jaipur', 'मालवीय नगर, जयपुर')
                    .replace('Saket, New Delhi', 'साकेत, नई दिल्ली')
                  : selectedCity}
              </Text>
              <ChevronDown size={11} color="#617581" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Action Icons (Search & Profile Dropdown) */}
        <View className="flex-row items-center space-x-2">
          {/* Search Button -> Navigates to Search Page */}
          <TouchableOpacity
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-white border border-[#E1EBE8] items-center justify-center shadow-xs"
          >
            <Search size={18} color="#087F8C" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Profile Icon -> Opens Profile Dropdown Menu */}
          <TouchableOpacity
            onPress={() => setProfileMenuVisible(true)}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-white border border-[#E1EBE8] items-center justify-center shadow-xs relative"
          >
            <User size={18} color="#182F3B" strokeWidth={2.2} />
            <View className="w-2.5 h-2.5 rounded-full bg-[#36CDBB] absolute top-1.5 right-1.5 border-2 border-white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Top Hero Carousel Banner (16:7 Aspect Ratio) */}
      <View className="px-4 mt-3.5">
        <View
          style={{
            width: bannerWidth,
            height: bannerWidth * (7 / 16),
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: '#EAF7F4',
            borderWidth: 1,
            borderColor: '#D5EBE6',
            shadowColor: '#182F3B',
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
                backgroundColor: activeBannerIndex === idx ? '#087F8C' : '#D1ECE8',
              }}
            />
          ))}
        </View>
      </View>

      {/* 3. The 4 Core Services in an Aesthetic 2x2 Grid */}
      <View className="px-4 mt-4">
        <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
          {/* Card 1: OPD (Doctor Consult) */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-[#F0FAF8] border border-[#CFECE5] rounded-3xl p-3.5 shadow-xs justify-between"
            style={{ minHeight: 126 }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#E0F5F1] items-center justify-center">
                <OpdStethoscopeIcon size={26} color="#087F8C" />
              </View>
              <View className="bg-[#087F8C] px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-white uppercase tracking-wider">
                  VERIFIED
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#182F3B' }}>
                {t.opdGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#617581', marginTop: 2 }}>
                {t.opdGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-1.5 border-t border-[#E1EBE8]/60">
              <Text className="text-[10px] font-bold text-[#087F8C]">Book Now</Text>
              <View className="w-5 h-5 rounded-full bg-[#E0F5F1] items-center justify-center">
                <ArrowRight size={10} color="#087F8C" strokeWidth={2.6} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Investigations (Lab Tests) */}
          <TouchableOpacity
            onPress={() => router.push('/labs')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-[#F3F6FE] border border-[#D6E0FA] rounded-3xl p-3.5 shadow-xs justify-between"
            style={{ minHeight: 126 }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#E6ECFD] items-center justify-center">
                <InvestigationsFlaskIcon size={26} color="#4F6BED" />
              </View>
              <View className="bg-[#CF8A40] px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-white uppercase tracking-wider">
                  25% OFF
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#182F3B' }}>
                {t.investigationsGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#617581', marginTop: 2 }}>
                {t.investigationsGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-1.5 border-t border-[#D6E0FA]/60">
              <Text className="text-[10px] font-bold text-[#4F6BED]">Book Test</Text>
              <View className="w-5 h-5 rounded-full bg-[#E6ECFD] items-center justify-center">
                <ArrowRight size={10} color="#4F6BED" strokeWidth={2.6} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: Pharmacy (Medicines) */}
          <TouchableOpacity
            onPress={() => router.push('/pharmacy')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-[#F7F4FD] border border-[#E5DBFB] rounded-3xl p-3.5 shadow-xs justify-between"
            style={{ minHeight: 126 }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#EEE8FC] items-center justify-center">
                <PharmacyCapsuleIcon size={26} color="#8B70D6" />
              </View>
              <View className="bg-[#8B70D6] px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-white uppercase tracking-wider">
                  2 HR
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#182F3B' }}>
                {t.pharmacyGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#617581', marginTop: 2 }}>
                {t.pharmacyGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-1.5 border-t border-[#E5DBFB]/60">
              <Text className="text-[10px] font-bold text-[#8B70D6]">Order Now</Text>
              <View className="w-5 h-5 rounded-full bg-[#EEE8FC] items-center justify-center">
                <ArrowRight size={10} color="#8B70D6" strokeWidth={2.6} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 4: IPD (Hospital Care) */}
          <TouchableOpacity
            onPress={() => router.push('/ipd')}
            activeOpacity={0.88}
            className="w-[48.5%] bg-[#FEF4F3] border border-[#F9DCDB] rounded-3xl p-3.5 shadow-xs justify-between"
            style={{ minHeight: 126 }}
          >
            {/* Top row: Icon + Badge */}
            <View className="flex-row items-center justify-between">
              <View className="w-11 h-11 rounded-2xl bg-[#FCEAE8] items-center justify-center">
                <IpdHospitalBedIcon size={26} color="#E87869" />
              </View>
              <View className="bg-[#E87869] px-2 py-0.5 rounded-full">
                <Text className="text-[8.5px] font-black text-white uppercase tracking-wider">
                  CASHLESS
                </Text>
              </View>
            </View>

            {/* Middle: Titles */}
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#182F3B' }}>
                {t.ipdGridTitle}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#617581', marginTop: 2 }}>
                {t.ipdGridSub}
              </Text>
            </View>

            {/* Bottom: Arrow CTA */}
            <View className="flex-row items-center justify-between pt-1.5 border-t border-[#F9DCDB]/60">
              <Text className="text-[10px] font-bold text-[#E87869]">Admissions</Text>
              <View className="w-5 h-5 rounded-full bg-[#FCEAE8] items-center justify-center">
                <ArrowRight size={10} color="#E87869" strokeWidth={2.6} />
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
            <Text className="text-xs font-bold text-[#087F8C]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access Card: Upcoming Appointment */}
        <TouchableOpacity
          onPress={() => router.push('/opd')}
          className="bg-white rounded-2xl p-4 border border-[#E1EBE8] flex-row items-center justify-between shadow-xs active:scale-99"
        >
          <View className="flex-row items-center space-x-3 flex-1 mr-2">
            <View className="w-11 h-11 rounded-2xl bg-[#E8F7F4] items-center justify-center">
              <Calendar size={20} color="#087F8C" strokeWidth={2} />
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
            <Text className="text-xs font-bold text-[#087F8C]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {/* Item 1: General Physician */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#E8F7F4] items-center justify-center mb-1.5">
              <OpdStethoscopeIcon size={24} color="#087F8C" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.generalPhysician}
            </Text>
          </TouchableOpacity>

          {/* Item 2: Cardiologist */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#FEECEC] items-center justify-center mb-1.5">
              <HeartPulseIcon size={24} color="#E87869" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.cardiologist}
            </Text>
          </TouchableOpacity>

          {/* Item 3: Bone & Joints (Orthopedic) */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-1.5">
              <BoneJointIcon size={24} color="#4F6BED" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.orthopedic}
            </Text>
          </TouchableOpacity>

          {/* Item 4: Pediatrician (Child) */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#FFF5EB] items-center justify-center mb-1.5">
              <ChildCareIcon size={24} color="#CF8A40" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.pediatrician}
            </Text>
          </TouchableOpacity>

          {/* Item 5: Dermatologist (Skin & Hair) */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#F6F1FD] items-center justify-center mb-1.5">
              <DermatologyIcon size={24} color="#8B70D6" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.dermatologist}
            </Text>
          </TouchableOpacity>

          {/* Item 6: Dental Care */}
          <TouchableOpacity
            onPress={() => router.push('/opd')}
            activeOpacity={0.85}
            className="w-[88px] bg-white border border-[#E1EBE8] rounded-2xl p-2.5 items-center shadow-xs"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#E8F8F5] items-center justify-center mb-1.5">
              <DentalToothIcon size={24} color="#12AFA5" />
            </View>
            <Text
              numberOfLines={2}
              className="text-[11px] font-black text-[#182F3B] text-center"
            >
              {t.dentist}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 5. Health Checkup Packages Card (Redesigned with 3D Commercial Art) */}
      <View className="px-4 mt-5">
        <TouchableOpacity
          onPress={() => router.push('/labs')}
          activeOpacity={0.92}
          className="bg-white rounded-3xl p-4 border border-[#D5EBE6] shadow-sm relative overflow-hidden"
        >
          {/* Subtle gradient mint background glow */}
          <View
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#EAF7F4',
              opacity: 0.8,
            }}
          />

          {/* Top Badges Row: Clean & Premium (No stars/sparkles) */}
          <View className="flex-row items-center justify-between mb-3">
            {/* Clean, Premium Discount Badge */}
            <View style={{ backgroundColor: '#E8F7F4', borderWidth: 1, borderColor: '#CFECE5', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 8 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#087F8C', letterSpacing: 0.5 }}>
                {t.discount50}
              </Text>
            </View>

            {/* Subtle Laboratory Certification */}
            <View className="flex-row items-center space-x-1">
              <CheckCircle2 size={12} color="#087F8C" strokeWidth={2.2} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#087F8C' }}>
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
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#087F8C', marginTop: 4 }}>
                {t.checkupPkgTestsCount}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#617581', marginTop: 2, lineHeight: 16 }}>
                {t.checkupPkgOrgans}
              </Text>

              {/* Clean bullet perks */}
              <View style={{ marginTop: 9, gap: 4 }}>
                <View className="flex-row items-center space-x-1.5">
                  <CheckCircle2 size={12} color="#087F8C" strokeWidth={2.2} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>
                    {t.homeSample}
                  </Text>
                </View>
                <View className="flex-row items-center space-x-1.5">
                  <Clock size={12} color="#087F8C" strokeWidth={2.2} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B' }}>
                    {t.fastReports}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Top: 3D Medical Kit Graphic */}
            <View className="w-24 h-24 rounded-2xl bg-[#F0FAF8] p-1.5 items-center justify-center border border-[#CFECE5] shadow-xs">
              <Image
                source={require('../../assets/checkup_3d.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Bottom Row: Price Left + Book Now Button Bottom Right */}
          <View className="flex-row items-center justify-between pt-3 mt-3.5 border-t border-[#F0F5F4]">
            {/* Price Info */}
            <View>
              <View className="flex-row items-baseline space-x-2">
                <Text style={{ fontSize: 21, fontWeight: '900', color: '#182F3B' }}>₹1,499</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'line-through' }}>₹3,000</Text>
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#087F8C', marginTop: 1 }}>
                Save ₹1,501 (50%)
              </Text>
            </View>

            {/* Book Now Button near Bottom Right */}
            <View className="bg-[#087F8C] py-2.5 px-4 rounded-xl shadow-xs flex-row items-center space-x-1">
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>
                {t.bookNowCta}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* 7. Adityam Family Health Vault Card (Super-Premium Executive Pass) */}
      <View className="px-4 mt-4">
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={() => router.push('/family')}
          accessibilityRole="button"
          accessibilityLabel="Access Adityam Health Vault"
          style={{
            borderRadius: 26,
            overflow: 'hidden',
            shadowColor: '#031A1F',
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={['#041F25', '#093841', '#062228']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 18,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: '#164850',
            }}
          >
            {/* Subtle decorative light */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -65,
                right: -45,
                width: 180,
                height: 180,
                borderRadius: 100,
                backgroundColor: 'rgba(115, 226, 204, 0.07)',
                borderWidth: 1,
                borderColor: 'rgba(170, 245, 225, 0.12)',
              }}
            />

            {/* Header */}
            <View className="flex-row items-center">
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{
                  backgroundColor: 'rgba(130, 230, 212, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(180, 250, 230, 0.25)',
                }}
              >
                <ShieldCheck size={24} color="#C4FFF0" strokeWidth={2} />
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
                  style={{ color: '#B9DFD9' }}
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
                backgroundColor: 'rgba(0, 34, 40, 0.23)',
                borderWidth: 1,
                borderColor: 'rgba(171, 239, 223, 0.13)',
              }}
            >
              <Text
                className="text-[9px] font-bold tracking-widest"
                style={{ color: '#93E6D6' }}
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
                style={{ color: '#C5E5E0' }}
              >
                {t.vaultCardDesc}
              </Text>
            </View>

            {/* Three aligned benefits */}
            <View className="flex-row mt-5">
              <View className="flex-1 pr-2">
                <IdCard size={21} color="#8FE5D5" strokeWidth={1.9} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                  numberOfLines={2}
                >
                  {t.vaultTagAbha}
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#B9DCD6' }}
                >
                  Linked records
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: 'rgba(190, 239, 226, 0.22)',
                  marginRight: 12,
                }}
              />

              <View className="flex-1 px-1">
                <UsersRound size={21} color="#8FE5D5" strokeWidth={1.9} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                  numberOfLines={2}
                >
                  {t.vaultTagMembers}
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#B9DCD6' }}
                >
                  Family access
                </Text>
              </View>

              <View
                style={{
                  width: 1,
                  backgroundColor: 'rgba(190, 239, 226, 0.22)',
                  marginHorizontal: 12,
                }}
              />

              <View className="flex-1 pl-1">
                <BadgePercent size={21} color="#F6D78C" strokeWidth={1.9} />
                <Text
                  className="text-[11px] font-bold mt-2"
                  style={{ color: '#FFFFFF' }}
                >
                  15% Off
                </Text>
                <Text
                  className="text-[10px] mt-1"
                  style={{ color: '#B9DCD6' }}
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
                borderTopColor: 'rgba(190, 239, 226, 0.22)',
              }}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <LockKeyhole size={14} color="#8FE5D5" />
                <Text
                  className="text-[10px] font-semibold ml-1.5"
                  style={{ color: '#D0EAE5' }}
                >
                  Private & secure
                </Text>
              </View>

              <View
                className="flex-row items-center rounded-full pl-3.5 pr-3 py-2.5"
                style={{
                  backgroundColor: '#F7FFFC',
                }}
              >
                <Text
                  className="text-[11px] font-extrabold"
                  style={{ color: '#041F25' }}
                >
                  {t.vaultCardCta}
                </Text>
                <ArrowRight
                  size={15}
                  color="#041F25"
                  strokeWidth={2.3}
                  style={{ marginLeft: 7 }}
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 7. Institutional Trust & Credibility Strip */}
      <View className="px-4 mt-4">
        <View className="bg-[#F1F7F6] border border-[#D5EBE6] rounded-2xl p-3 flex-row items-center justify-between">
          <View className="flex-1 items-center px-1">
            <Building2 size={16} color="#087F8C" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustHospitals}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#CFECE5]" />

          <View className="flex-1 items-center px-1">
            <CheckCircle2 size={16} color="#087F8C" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustLabs}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#CFECE5]" />

          <View className="flex-1 items-center px-1">
            <ShieldCheck size={16} color="#087F8C" strokeWidth={2.2} />
            <Text numberOfLines={2} className="text-[9.5px] font-bold text-[#182F3B] text-center mt-1">
              {t.trustCashless}
            </Text>
          </View>

          <View className="w-[1px] h-7 bg-[#CFECE5]" />

          <View className="flex-1 items-center px-1">
            <Pill size={16} color="#087F8C" strokeWidth={2.2} />
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
            <Text className="text-xs font-bold text-[#087F8C]">
              {t.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Scroll of Offers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {/* Offer 1: Pharmacy 20% Off */}
          <TouchableOpacity
            onPress={() => router.push('/pharmacy')}
            className="w-72 bg-[#EAF7F5] rounded-3xl p-4 mr-3 border border-[#D1ECE8] flex-row items-center justify-between shadow-xs"
          >
            <View className="flex-1 pr-2">
              <Text className="text-base font-black text-[#182F3B]">
                {t.offerFlat20}
              </Text>
              <Text className="text-xs text-[#617581] mt-0.5">
                {t.offerMedicinesSub}
              </Text>
              <View className="mt-3 bg-[#087F8C] py-1.5 px-3 rounded-xl self-start">
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
            className="w-72 bg-white rounded-3xl p-4 shadow-2xl border border-[#E1EBE8]"
          >
            {/* User Profile Header */}
            <View className="flex-row items-center space-x-3 pb-3 border-b border-[#F1F5F4]">
              <View className="w-12 h-12 rounded-2xl bg-[#E8F7F4] items-center justify-center border border-[#CFECE5]">
                <Text className="text-lg font-black text-[#087F8C]">H</Text>
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
            <View className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]">
              <View className="flex-row items-center space-x-2">
                <Languages size={15} color="#087F8C" />
                <Text className="text-xs font-bold text-[#182F3B]">
                  {language === 'hi' ? 'भाषा (Language)' : 'App Language'}
                </Text>
              </View>
              <View className="flex-row bg-[#F7FBFA] p-0.5 rounded-xl border border-[#E1EBE8]">
                <TouchableOpacity
                  onPress={() => {
                    if (language !== 'en') toggleLanguage();
                  }}
                  className={`px-2 py-1 rounded-lg ${language === 'en' ? 'bg-[#087F8C]' : ''
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
                  className={`px-2 py-1 rounded-lg ${language === 'hi' ? 'bg-[#087F8C]' : ''
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
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <Calendar size={15} color="#087F8C" />
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'मेरी अपॉइंटमेंट्स' : 'My Appointments'}
                  </Text>
                </View>
                <View className="bg-[#E8F7F4] px-1.5 py-0.5 rounded-full">
                  <Text className="text-[9px] font-black text-[#087F8C]">1 Active</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  router.push('/family');
                }}
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <ShieldCheck size={15} color="#087F8C" />
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
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <FileText size={15} color="#087F8C" />
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
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <Pill size={15} color="#087F8C" />
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
                className="flex-row items-center justify-between py-2.5 border-b border-[#F1F5F4]"
              >
                <View className="flex-row items-center space-x-2.5">
                  <HelpCircle size={15} color="#087F8C" />
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
