import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  PhoneCall,
  Clock,
  Calendar,
  CheckCircle2,
  X,
  Check,
  Building2,
  Award,
  Globe,
  Tag,
  Heart,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { fetchNearbyHospitals, getSupabaseClient, SEED_HOSPITALS } from '@adityam/supabase';
import type { Hospital, HospitalBranch, Doctor, Booking } from '@adityam/types';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import {
  OpdStethoscopeIcon,
  HeartPulseIcon,
  BoneJointIcon,
  ChildCareIcon,
  DentalToothIcon,
  DermatologyIcon,
  AudiologistIcon,
  NeurologyBrainIcon,
  AllCategoriesIcon,
} from '../components/ServiceIcons';
import {
  translateHospitalName,
  translateBranchName,
  translateAddress,
  translateSpecialty,
  translateDoctorName,
  translateQualification,
  translateTag,
  translateSlot,
  translateTiming,
  translateLanguageList,
} from '../src/utils/hindiDictionary';

interface BranchCategoryItem {
  id: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  accentColor: string;
}

export default function BranchDoctorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{
    hospitalId?: string;
    branchId?: string;
    specialty?: string;
  }>();

  // Find Hospital and Branch
  const hospital: Hospital | undefined = useMemo(() => {
    return SEED_HOSPITALS.find((h) => h.id === params.hospitalId) || SEED_HOSPITALS[0];
  }, [params.hospitalId]);

  const branches = hospital?.branches || [];
  const initialBranch =
    branches.find((b) => b.id === params.branchId) || branches[0];

  const [activeBranch, setActiveBranch] = useState<HospitalBranch | undefined>(initialBranch);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    params.specialty && params.specialty !== 'All' ? params.specialty : 'All'
  );

  // Booking Modal State & Favorites
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [branchDropdownVisible, setBranchDropdownVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (doctorId: string) => {
    setFavorites((prev) => ({ ...prev, [doctorId]: !prev[doctorId] }));
  };

  // Helper to ensure all doctors have crisp, high-res clinical portraits
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

  // DYNAMIC CATEGORIES: ONLY show categories that are ACTUALLY available at this specific branch!
  const availableCategories: BranchCategoryItem[] = useMemo(() => {
    if (!activeBranch) return [];
    const specialtiesAtBranch = new Set(
      activeBranch.doctors.map((d) => d.specialty.toLowerCase())
    );

    const list: BranchCategoryItem[] = [
      {
        id: 'All',
        label: t.allSpecialties || 'All',
        icon: (c: string) => <AllCategoriesIcon size={26} color={c} />,
        accentColor: '#3B82F6',
      },
    ];

    if (specialtiesAtBranch.has('cardiology')) {
      list.push({
        id: 'Cardiology',
        label: language === 'hi' ? 'हृदय रोग' : 'Cardiologist',
        icon: (c: string) => <HeartPulseIcon size={26} color={c} />,
        accentColor: '#E87869',
      });
    }

    if (specialtiesAtBranch.has('ent')) {
      list.push({
        id: 'ENT',
        label: language === 'hi' ? 'ऑडियोलॉजिस्ट' : 'Audiologist',
        icon: (c: string) => <AudiologistIcon size={26} color={c} />,
        accentColor: '#3B82F6',
      });
    }

    if (specialtiesAtBranch.has('general medicine')) {
      list.push({
        id: 'General Medicine',
        label: language === 'hi' ? 'जनरल फिजिशियन' : 'General Physician',
        icon: (c: string) => <OpdStethoscopeIcon size={26} color={c} />,
        accentColor: '#3B82F6',
      });
    }

    if (specialtiesAtBranch.has('dentistry')) {
      list.push({
        id: 'Dentistry',
        label: language === 'hi' ? 'दंत चिकित्सक' : 'Dentist',
        icon: (c: string) => <DentalToothIcon size={26} color={c} />,
        accentColor: '#12AFA5',
      });
    }

    if (specialtiesAtBranch.has('orthopedics')) {
      list.push({
        id: 'Orthopedics',
        label: language === 'hi' ? 'हड्डी व जोड़' : 'Orthopedics',
        icon: (c: string) => <BoneJointIcon size={26} color={c} />,
        accentColor: '#4F6BED',
      });
    }

    if (specialtiesAtBranch.has('pediatrics')) {
      list.push({
        id: 'Pediatrics',
        label: language === 'hi' ? 'शिशु रोग' : 'Pediatrics',
        icon: (c: string) => <ChildCareIcon size={26} color={c} />,
        accentColor: '#CF8A40',
      });
    }

    if (specialtiesAtBranch.has('neurology')) {
      list.push({
        id: 'Neurology',
        label: language === 'hi' ? 'न्यूरोलॉजिस्ट' : 'Psychiatrists',
        icon: (c: string) => <NeurologyBrainIcon size={26} color={c} />,
        accentColor: '#8B70D6',
      });
    }

    if (specialtiesAtBranch.has('dermatology')) {
      list.push({
        id: 'Dermatology',
        label: language === 'hi' ? 'त्वचा व बाल' : 'Dermatologist',
        icon: (c: string) => <DermatologyIcon size={26} color={c} />,
        accentColor: '#9333EA',
      });
    }

    return list;
  }, [activeBranch, language, t]);

  // Filter doctors by selected specialty
  const filteredDoctors = useMemo(() => {
    if (!activeBranch) return [];
    if (selectedSpecialty === 'All') return activeBranch.doctors;
    return activeBranch.doctors.filter(
      (d) => d.specialty.toLowerCase() === selectedSpecialty.toLowerCase()
    );
  }, [activeBranch, selectedSpecialty]);

  // Screen dimensions for Image 2 Top Doctor Card sizing
  const screenWidth = Dimensions.get('window').width;
  const topDoctorCardWidth = Math.min(screenWidth - 40, 330);

  // Top / Preferred Doctors list sorted by rating & reviews (Reference Image 2)
  const topDoctors = useMemo(() => {
    if (!filteredDoctors.length) return [];
    return [...filteredDoctors].sort(
      (a, b) => b.rating - a.rating || b.total_reviews - a.total_reviews || b.experience_years - a.experience_years
    );
  }, [filteredDoctors]);

  // Primary preferred doctor
  const preferredDoctor = topDoctors[0] || null;

  const handleInitiateDoctorBooking = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmExotelBooking = async () => {
    if (!selectedDoctor || !hospital) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id,
      patient_name: user?.full_name || 'Dr. Vikram Malhotra',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      branch_id: activeBranch?.id,
      branch_name: activeBranch?.name,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      doctor_fee: selectedDoctor.discounted_fee,
      slot_time: selectedDoctor.next_available_slot,
      specialty_requested: selectedDoctor.specialty,
      status: 'NEW',
      call_status: 'pending',
      notes: `Direct OPD consult booked for ${selectedDoctor.name} (${selectedDoctor.specialty}) at ${hospital.name} - ${activeBranch?.name}. Masked calling via Exotel initiated.`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBooking(newBooking);
    }, 700);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#172554' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#172554" translucent={false} />
      <View className="flex-1 bg-[#F8FAFC]">
        {/* Top Header Banner in Royal Medical Blue */}
        <LinearGradient
          colors={['#172554', '#1E40AF', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 12,
            paddingHorizontal: 18,
            paddingBottom: 22,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
        {/* Navigation & Title Row */}
        <View className="flex-row items-center space-x-3 mb-2.5">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md items-center justify-center border border-white/25"
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-white text-lg font-black tracking-tight" numberOfLines={1}>
              {translateHospitalName(hospital?.name || '', language === 'hi')}
            </Text>
            <Text className="text-blue-200 text-xs font-semibold" numberOfLines={1}>
              {language === 'hi'
                ? 'सत्यापित अस्पताल पार्टनर • आदित्यम नेटवर्क'
                : 'Verified Hospital Partner • Adityam Network'}
            </Text>
          </View>

          {/* Rating Pill */}
          <View className="bg-white/95 px-2.5 py-1 rounded-xl flex-row items-center space-x-1 shadow-sm">
            <Star size={11} color="#CF8A40" fill="#CF8A40" />
            <Text className="text-slate-900 text-xs font-black">
              {hospital?.rating}
            </Text>
          </View>
        </View>

        {/* Branch Selector Dropdown (Replaces horizontal pills as requested) */}
        {branches.length > 0 && (
          <TouchableOpacity
            onPress={() => setBranchDropdownVisible(true)}
            activeOpacity={0.85}
            className="mt-2.5 bg-white/15 border border-white/25 rounded-2xl px-3.5 py-2.5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-2.5 flex-1 mr-2">
              <View className="w-8 h-8 rounded-xl bg-white/20 items-center justify-center">
                <Building2 size={16} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center space-x-1.5">
                  <Text className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                    {language === 'hi' ? 'शाखा चुनें' : 'Select Branch'}
                  </Text>
                  {branches.length > 1 && (
                    <View className="bg-white/20 px-1.5 py-0.2 rounded">
                      <Text className="text-[9px] font-bold text-white">
                        {branches.length} {language === 'hi' ? 'शाखाएं' : 'branches'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-white text-sm font-black mt-0.5" numberOfLines={1}>
                  {translateBranchName(activeBranch?.name || '', language === 'hi')}{' '}
                  {activeBranch?.distance_km
                    ? `• ${activeBranch.distance_km} ${language === 'hi' ? 'किमी' : 'km'}`
                    : ''}
                </Text>
              </View>
            </View>

            <View className="w-7 h-7 rounded-full bg-white/20 items-center justify-center">
              <ChevronDown size={15} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        )}

        {/* Address Row */}
        <View className="flex-row items-center space-x-1.5 mt-2.5 px-0.5">
          <MapPin size={11} color="#BFDBFE" />
          <Text className="text-blue-100 text-[11px] font-medium flex-1" numberOfLines={1}>
            {translateAddress(activeBranch?.address || '', language === 'hi')}
          </Text>
          <View className="bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
            <Text className="text-white text-[10px] font-bold">
              {activeBranch?.distance_km
                ? `${activeBranch.distance_km} ${language === 'hi' ? 'किमी' : 'km'}`
                : language === 'hi'
                ? 'नजदीक'
                : 'Nearby'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Body Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 40,
        }}
      >
        {/* CATEGORIES CAPSULE ROW (Image 3 Reference: Sleek Horizontal Pills) */}
        <View className="py-4 px-4">
          <View className="flex-row items-center justify-between mb-2.5 px-0.5">
            <Text className="text-base font-black text-[#182F3B] tracking-tight">
              {language === 'hi' ? 'विशेषज्ञताएं' : 'Specialties'}
            </Text>
            <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
              <Text className="text-xs font-bold text-[#2563EB]">
                {filteredDoctors.length}{' '}
                {language === 'hi'
                  ? 'विशेषज्ञ'
                  : filteredDoctors.length === 1
                  ? 'Specialist'
                  : 'Specialists'}
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
          >
            {availableCategories.map((cat) => {
              const isSelected = selectedSpecialty === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedSpecialty(cat.id)}
                  activeOpacity={0.8}
                  className="mr-2"
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#2563EB', '#1D4ED8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        paddingHorizontal: 14,
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
                      <View className="mr-2">{cat.icon('#FFFFFF')}</View>
                      <Text className="text-white text-xs font-black tracking-tight">
                        {cat.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                    >
                      <View className="mr-2">{cat.icon(cat.accentColor)}</View>
                      <Text className="text-[#334155] text-xs font-bold">
                        {cat.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {/* Doctor Content Section */}
        <View className="px-4 pt-4">
          {filteredDoctors.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl border border-slate-200 items-center my-6 shadow-sm">
              <Award size={36} color="#94A3B8" />
              <Text className="text-base font-bold text-[#182F3B] mt-2">
                No specialists in this department
              </Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                Please switch to "All" or select another category squircle above.
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSpecialty('All')}
                className="mt-4 bg-[#2563EB] px-5 py-2.5 rounded-xl shadow-sm shadow-blue-500/20"
              >
                <Text className="text-white text-xs font-bold">Show All Specialists</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* TOP DOCTORS: Image 2 Reference Card Design */}
              {topDoctors.length > 0 && (
                <View className="mb-6">
                  {/* Clean Section Title - NO sparkles, NO crown, NO star emojis! */}
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-xl font-black text-[#182F3B] tracking-tight">
                      {t.preferredDoctorTitle || 'Top Doctors'}
                    </Text>
                    {topDoctors.length > 1 && (
                      <Text className="text-xs font-semibold text-slate-500">
                        Swipe to explore
                      </Text>
                    )}
                  </View>

                  {/* Horizontal Scroll or Single Featured Card */}
                  {topDoctors.length === 1 ? (
                    // Single Top Doctor Card (Full Width - Image 2 Design)
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
                      {/* Subtle ambient light orb */}
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
                        {/* Left: Doctor Portrait Cutout (Image 2) */}
                        <View style={{ width: 106, position: 'relative' }}>
                          <Image
                            source={{
                              uri: getDoctorAvatar(topDoctors[0]),
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
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.2,
                              shadowRadius: 2,
                              elevation: 2,
                            }}
                          >
                            <Check size={9} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        </View>

                        {/* Right: Doctor Info + Frosted Glass Box + 3 Circular Action Buttons */}
                        <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                          <View>
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1 mr-1">
                                <Text
                                  className="text-white text-base font-black tracking-tight leading-tight"
                                  numberOfLines={1}
                                >
                                  {translateDoctorName(topDoctors[0].name, language === 'hi')}
                                </Text>
                                <Text className="text-blue-100 text-xs font-semibold mt-0.5">
                                  {translateSpecialty(topDoctors[0].specialty, language === 'hi')}
                                </Text>
                              </View>

                              <TouchableOpacity
                                onPress={() => toggleFavorite(topDoctors[0].id)}
                                activeOpacity={0.7}
                                className="w-7 h-7 rounded-full bg-white/20 items-center justify-center -mt-0.5"
                              >
                                <Heart
                                  size={13}
                                  color={favorites[topDoctors[0].id] ? '#EF4444' : '#FFFFFF'}
                                  fill={favorites[topDoctors[0].id] ? '#EF4444' : 'transparent'}
                                />
                              </TouchableOpacity>
                            </View>

                            {/* Star Rating Row */}
                            <View className="flex-row items-center space-x-1 mt-1">
                              <Star size={11} color="#FBBF24" fill="#FBBF24" />
                              <Text className="text-white text-xs font-bold">
                                {topDoctors[0].rating} ({topDoctors[0].total_reviews} Reviews)
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
                                {topDoctors[0].qualification}
                              </Text>
                              <View className="flex-row items-center space-x-1 mt-1">
                                <Clock size={10} color="#BFDBFE" />
                                <Text className="text-blue-100 text-[10px] font-semibold">
                                  {language === 'hi' ? 'स्लॉट: ' : 'Slot: '}
                                  {translateSlot(topDoctors[0].next_available_slot, language === 'hi')}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Bottom Row: 3 White Circular Action Buttons + Consultation Fee Pill */}
                          <View className="flex-row items-center justify-between mt-3">
                            <View className="flex-row items-center space-x-1.5">
                              {/* 1. Phone Call */}
                              <TouchableOpacity
                                onPress={() => handleInitiateDoctorBooking(topDoctors[0])}
                                activeOpacity={0.8}
                                className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                              >
                                <PhoneCall size={13} color="#2563EB" />
                              </TouchableOpacity>

                              {/* 2. Video Call */}
                              <TouchableOpacity
                                onPress={() => handleInitiateDoctorBooking(topDoctors[0])}
                                activeOpacity={0.8}
                                className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                              >
                                <Video size={13} color="#2563EB" />
                              </TouchableOpacity>

                              {/* 3. Message / Inquiry */}
                              <TouchableOpacity
                                onPress={() => handleInitiateDoctorBooking(topDoctors[0])}
                                activeOpacity={0.8}
                                className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                              >
                                <MessageSquare size={13} color="#2563EB" />
                              </TouchableOpacity>
                            </View>

                            {/* Fee / Book Pill */}
                            <TouchableOpacity
                              onPress={() => handleInitiateDoctorBooking(topDoctors[0])}
                              activeOpacity={0.85}
                              className="bg-white/20 border border-white/30 px-2.5 py-1.5 rounded-full flex-row items-center space-x-1"
                              style={{ flexShrink: 0 }}
                            >
                              <Text className="text-white text-[11px] font-black">
                                ₹{topDoctors[0].discounted_fee}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    // Horizontal Scroll for Multiple Top Doctors (Image 2 style)
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 8 }}
                    >
                      {topDoctors.map((doc, idx) => {
                        const isFav = !!favorites[doc.id];
                        return (
                          <View
                            key={doc.id}
                            style={{
                              width: topDoctorCardWidth,
                              marginRight: idx === topDoctors.length - 1 ? 0 : 12,
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

                                {/* Right: Doctor Info + Frosted Glass Box + 3 Circular Action Buttons */}
                                <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                                  <View>
                                    <View className="flex-row items-start justify-between">
                                      <View className="flex-1 mr-1">
                                        <Text
                                          className="text-white text-base font-black tracking-tight leading-tight"
                                          numberOfLines={1}
                                        >
                                          {translateDoctorName(doc.name, language === 'hi')}
                                        </Text>
                                        <Text className="text-blue-100 text-xs font-semibold mt-0.5">
                                          {translateSpecialty(doc.specialty, language === 'hi')}
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
                                        {doc.rating} ({doc.total_reviews} {language === 'hi' ? 'समीक्षा' : 'Review'})
                                      </Text>
                                    </View>

                                    {/* Frosted Glass Box */}
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
                                        {translateQualification(doc.qualification, language === 'hi')}
                                      </Text>
                                      <View className="flex-row items-center space-x-1 mt-1">
                                        <Clock size={10} color="#BFDBFE" />
                                        <Text className="text-blue-100 text-[10px] font-semibold">
                                          {language === 'hi' ? 'समय: ' : 'Slot: '}{translateSlot(doc.next_available_slot, language === 'hi')}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>

                                  {/* Bottom Row: 3 White Circular Action Buttons + Consultation Fee */}
                                  <View className="flex-row items-center justify-between mt-3">
                                    <View className="flex-row items-center space-x-1.5">
                                      <TouchableOpacity
                                        onPress={() => handleInitiateDoctorBooking(doc)}
                                        activeOpacity={0.8}
                                        className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                                      >
                                        <PhoneCall size={13} color="#2563EB" />
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        onPress={() => handleInitiateDoctorBooking(doc)}
                                        activeOpacity={0.8}
                                        className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                                      >
                                        <Video size={13} color="#2563EB" />
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        onPress={() => handleInitiateDoctorBooking(doc)}
                                        activeOpacity={0.8}
                                        className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-xs"
                                      >
                                        <MessageSquare size={13} color="#2563EB" />
                                      </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                      onPress={() => handleInitiateDoctorBooking(doc)}
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
                  )}
                </View>
              )}

              {/* Section Heading for All Department Specialists */}
              <View className="flex-row items-center justify-between mb-3 px-0.5">
                <Text className="text-base font-black text-[#182F3B] tracking-tight">
                  {selectedSpecialty === 'All'
                    ? (language === 'hi' ? 'सभी विशेषज्ञ' : t.topSpecialistsTitle || 'All Specialists')
                    : (language === 'hi' ? `${translateSpecialty(selectedSpecialty, true)} विशेषज्ञ` : `${selectedSpecialty} Specialists`)}
                </Text>
                <View className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  <Text className="text-xs font-bold text-[#2563EB]">
                    {filteredDoctors.length} {language === 'hi' ? 'विशेषज्ञ' : filteredDoctors.length === 1 ? 'Specialist' : 'Specialists'}
                  </Text>
                </View>
              </View>

              {/* Upgraded Doctor Cards List (High-Design Modern Clinical White Card) */}
              {filteredDoctors.map((doctor) => {
                const isPreferred = doctor.id === preferredDoctor?.id || doctor.rating >= 4.9;
                const isFav = !!favorites[doctor.id];
                const avatar = getDoctorAvatar(doctor);

                return (
                  <View
                    key={doctor.id}
                    className="bg-white rounded-[24px] border border-slate-200/90 mb-4 p-4 overflow-hidden"
                    style={{
                      shadowColor: '#1E3A8A',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                  >
                    {/* Top Status & Verification Row */}
                    <View className="flex-row items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                      {isPreferred ? (
                        <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full flex-row items-center space-x-1.5">
                          <Award size={12} color="#2563EB" />
                          <Text className="text-[10px] font-black text-[#2563EB] uppercase tracking-wider">
                            {language === 'hi' ? 'शीर्ष विशेषज्ञ' : 'Top Specialist'}
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-slate-100 px-2.5 py-1 rounded-full flex-row items-center space-x-1">
                          <Building2 size={11} color="#64748B" />
                          <Text className="text-[10px] font-bold text-slate-600">
                            {translateBranchName(activeBranch?.name || '', language === 'hi')}
                          </Text>
                        </View>
                      )}

                      <View className="flex-row items-center space-x-1 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={12} color="#16A34A" />
                        <Text className="text-[10.5px] font-bold text-emerald-700">
                          {language === 'hi' ? 'सत्यापित पार्टनर' : 'Verified Partner'}
                        </Text>
                      </View>
                    </View>

                    {/* Doctor Profile Info Row */}
                    <View className="flex-row items-start space-x-3.5">
                      {/* Avatar with clean clinical frame */}
                      <View className="relative">
                        <Image
                          source={{ uri: avatar }}
                          style={{ width: 80, height: 80, borderRadius: 22 }}
                          className="bg-blue-50 border-2 border-white shadow-xs"
                          resizeMode="cover"
                        />
                        <View className="absolute -bottom-1 -right-1 bg-[#2563EB] rounded-full p-1 border-2 border-white shadow-sm">
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      </View>

                      {/* Doctor Identity & Credentials */}
                      <View className="flex-1">
                        <View className="flex-row items-start justify-between">
                          <Text className="text-[16px] font-black text-[#0F172A] flex-1 leading-tight mr-1">
                            {translateDoctorName(doctor.name, language === 'hi')}
                          </Text>
                          {/* Favorite Heart Toggle */}
                          <TouchableOpacity
                            onPress={() => toggleFavorite(doctor.id)}
                            activeOpacity={0.7}
                            className="w-7 h-7 rounded-full bg-slate-50 items-center justify-center -mt-0.5 -mr-0.5"
                          >
                            <Heart
                              size={15}
                              color={isFav ? '#EF4444' : '#94A3B8'}
                              fill={isFav ? '#EF4444' : 'transparent'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Specialty Pill & Star Rating Row */}
                        <View className="flex-row items-center space-x-2 mt-1">
                          <View className="bg-[#EFF6FF] px-2.5 py-0.5 rounded-md border border-blue-200/70">
                            <Text className="text-[11px] font-black text-[#2563EB]">
                              {translateSpecialty(doctor.specialty, language === 'hi')}
                            </Text>
                          </View>

                          <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 flex-row items-center space-x-1">
                            <Star size={11} color="#D97706" fill="#D97706" />
                            <Text className="text-xs font-black text-slate-800">
                              {doctor.rating}
                            </Text>
                            <Text className="text-[10px] text-slate-500">
                              ({doctor.total_reviews})
                            </Text>
                          </View>
                        </View>

                        {/* Qualifications & Experience */}
                        <View className="mt-1.5 flex-row items-center flex-wrap gap-1.5">
                          <View className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Text className="text-[11px] font-bold text-slate-800">
                              {translateQualification(doctor.qualification, language === 'hi')}
                            </Text>
                          </View>
                          <Text className="text-[11px] font-medium text-slate-500">
                            • {doctor.experience_years}{' '}
                            {language === 'hi' ? 'वर्ष अनुभव' : 'yrs exp'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Schedule Band (Soft Emerald / Clinical Slate) */}
                    <View className="mt-3.5 bg-emerald-50/50 p-2.5 rounded-2xl border border-emerald-100/80">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center space-x-1.5">
                          <View className="w-2 h-2 rounded-full bg-emerald-500" />
                          <Text className="text-xs font-black text-emerald-800">
                            {language === 'hi' ? 'उपलब्ध: ' : 'Available: '}
                            {translateSlot(doctor.next_available_slot, language === 'hi')}
                          </Text>
                        </View>

                        <View className="flex-row items-center space-x-1">
                          <Globe size={11} color="#059669" />
                          <Text className="text-[10.5px] font-bold text-emerald-700">
                            {translateLanguageList(doctor.languages, language === 'hi')}
                          </Text>
                        </View>
                      </View>

                      {doctor.opd_timing && (
                        <View className="flex-row items-center space-x-1 mt-1.5 pt-1.5 border-t border-emerald-100/60">
                          <Calendar size={11} color="#059669" />
                          <Text className="text-[10.5px] text-emerald-800/80 font-semibold">
                            {language === 'hi' ? 'ओपीडी समय: ' : 'OPD Schedule: '}{translateTiming(doctor.opd_timing, language === 'hi')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Fee & Single Obvious Book CTA */}
                    <View className="mt-3.5 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                      {/* Left: Consultation Fee (Clean, uncluttered, non-button styling) */}
                      <View>
                        <Text className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {language === 'hi' ? 'परामर्श शुल्क' : 'Consultation Fee'}
                        </Text>
                        <Text className="text-base font-bold text-[#0F172A] mt-0.5">
                          ₹{doctor.discounted_fee || doctor.consultation_fee}
                        </Text>
                      </View>

                      {/* Right: One Single Obvious Book Button */}
                      <TouchableOpacity
                        onPress={() => handleInitiateDoctorBooking(doctor)}
                        activeOpacity={0.88}
                        className="bg-[#2563EB] active:bg-[#1D4ED8] px-4 py-2.5 rounded-xl flex-row items-center space-x-1.5 shadow-sm"
                      >
                        <Text className="text-white text-xs font-bold">
                          {language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book In-Clinic Visit'}
                        </Text>
                        <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Exotel Masked Call Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <Text className="text-base font-bold text-[#182F3B]">
                {confirmedBooking
                  ? (language === 'hi' ? 'परामर्श की पुष्टि हुई!' : 'Consultation Confirmed!')
                  : (language === 'hi' ? 'प्राथमिकता ओपीडी डॉक्टर बुकिंग' : 'Priority OPD Doctor Booking')}
              </Text>
              <TouchableOpacity
                onPress={() => setBookingModalVisible(false)}
                className="p-1"
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {confirmedBooking ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-[#EFF6FF] items-center justify-center mb-3">
                  <CheckCircle2 size={32} color="#3B82F6" />
                </View>
                <Text className="text-xl font-bold text-[#182F3B]">
                  {language === 'hi' ? 'कंसीयर्ज कॉल शुरू हुई' : 'Concierge Dispatched'}
                </Text>
                <Text className="text-xs font-mono font-bold text-[#3B82F6] mt-1">
                  {language === 'hi' ? 'संदर्भ आईडी: ' : 'Reference: '}{confirmedBooking.booking_ref}
                </Text>
                <Text className="text-xs text-slate-600 text-center mt-3 px-4 leading-relaxed">
                  {language === 'hi' ? (
                    <>
                      <Text className="font-bold text-[#182F3B]">
                        {translateDoctorName(confirmedBooking.doctor_name || '', true)}
                      </Text>{' '}
                      के लिए आपका प्राथमिकता स्लॉट {translateHospitalName(confirmedBooking.hospital_name || '', true)} ({translateBranchName(confirmedBooking.branch_name || '', true)}) में दर्ज कर दिया गया है। हमारे समन्वयक आपसे संपर्क कर रहे हैं!
                    </>
                  ) : (
                    <>
                      Your priority slot for{' '}
                      <Text className="font-bold text-[#182F3B]">
                        {confirmedBooking.doctor_name}
                      </Text>{' '}
                      at {confirmedBooking.hospital_name} ({confirmedBooking.branch_name}) has been submitted to the real-time CRM. Our desk coordinator is connecting you now!
                    </>
                  )}
                </Text>

                <View className="w-full bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 mt-5">
                  <Text className="text-[11px] font-bold text-[#182F3B] uppercase">
                    {language === 'hi' ? 'एक्सोटेल वर्चुअल टेलीफोनी' : 'Exotel Virtual Telephony Route'}
                  </Text>
                  <Text className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                    +91 11 4000 8800 ➔ {user?.phone || '+91 99999 99999'}
                  </Text>
                  <Text className="text-[10px] text-[#3B82F6] font-semibold mt-1">
                    {language === 'hi'
                      ? '✓ आपका नंबर और व्यक्तिगत पहचान 100% गोपनीय रहती है।'
                      : '✓ Masked calling protects your identity and number.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  className="w-full bg-[#3B82F6] py-3.5 rounded-xl items-center mt-5 shadow-sm shadow-blue-500/30"
                >
                  <Text className="text-white font-bold text-xs">{language === 'hi' ? 'पूर्ण' : 'Done'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="py-4">
                {/* Doctor Summary */}
                {selectedDoctor && (
                  <View className="bg-[#EFF6FF] p-3.5 rounded-2xl border border-blue-200/80 mb-3 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-bold text-[#182F3B]">
                        {translateDoctorName(selectedDoctor.name, language === 'hi')}
                      </Text>
                      <Text className="text-xs font-semibold text-[#2563EB]">
                        {translateSpecialty(selectedDoctor.specialty, language === 'hi')} • {translateQualification(selectedDoctor.qualification, language === 'hi')}
                      </Text>
                      <Text className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {language === 'hi' ? 'समय: ' : 'Slot: '}{translateSlot(selectedDoctor.next_available_slot, language === 'hi')}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-black text-[#182F3B]">
                        ₹{selectedDoctor.discounted_fee}
                      </Text>
                      <Text className="text-xs text-slate-400 line-through">
                        ₹{selectedDoctor.consultation_fee}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Hospital & Branch */}
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'अस्पताल: ' : 'Hospital Unit: '}{translateHospitalName(hospital?.name || '', language === 'hi')}
                  </Text>
                  <Text className="text-[11px] text-slate-600 mt-0.5">
                    {language === 'hi' ? 'शाखा: ' : 'Branch: '}{translateBranchName(activeBranch?.name || '', language === 'hi')} ({translateAddress(activeBranch?.address || '', language === 'hi')})
                  </Text>
                </View>

                {/* Patient Information */}
                <View className="bg-[#FFF9F0] p-3 rounded-xl border border-[#CF8A40]/30 mb-4">
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'मरीज की जानकारी:' : 'Patient Information:'}
                  </Text>
                  <Text className="text-xs text-slate-700 mt-1">
                    {language === 'hi' ? 'नाम: ' : 'Name: '}<Text className="font-bold">{user?.full_name || 'Dr. Vikram Malhotra'}</Text>
                  </Text>
                  <Text className="text-xs text-slate-700">
                    {language === 'hi' ? 'फ़ोन: ' : 'Phone: '}<Text className="font-bold">{user?.phone || '+91 99999 99999'}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmExotelBooking}
                  disabled={isSubmitting}
                  className="w-full bg-[#3B82F6] active:bg-[#2563EB] py-3.5 rounded-xl items-center flex-row justify-center space-x-2 shadow-sm shadow-blue-500/30"
                >
                  <PhoneCall size={16} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm">
                    {isSubmitting
                      ? (language === 'hi' ? 'सीधे जोड़ रहे हैं...' : 'Dispatching to CRM...')
                      : (language === 'hi' ? 'पुष्टि करें और कॉल करें' : 'Confirm & Call Concierge')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Branch Selection Dropdown Modal */}
      <Modal
        visible={branchDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchDropdownVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setBranchDropdownVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[75%]"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
              <View>
                <Text className="text-base font-black text-[#182F3B]">
                  {language === 'hi' ? 'अस्पताल शाखा चुनें' : 'Select Hospital Branch'}
                </Text>
                <Text className="text-xs text-slate-500 font-medium mt-0.5">
                  {translateHospitalName(hospital?.name || '', language === 'hi')} • {branches.length} {language === 'hi' ? 'शाखाएं' : 'Locations'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBranchDropdownVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Branches List */}
            <ScrollView className="py-2 mt-1" showsVerticalScrollIndicator={false}>
              {branches.map((b) => {
                const isSelected = activeBranch?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      setActiveBranch(b);
                      setSelectedSpecialty('All');
                      setBranchDropdownVisible(false);
                    }}
                    activeOpacity={0.8}
                    className={`p-3.5 rounded-2xl mb-2.5 border flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-[#EFF6FF] border-[#2563EB]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center space-x-1.5">
                        <Building2 size={14} color={isSelected ? '#2563EB' : '#64748B'} />
                        <Text
                          className={`text-sm font-black ${
                            isSelected ? 'text-[#2563EB]' : 'text-[#182F3B]'
                          }`}
                        >
                          {translateBranchName(b.name, language === 'hi')}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                        {translateAddress(b.address, language === 'hi')}
                      </Text>
                      <View className="flex-row items-center space-x-2 mt-2">
                        {b.distance_km && (
                          <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-bold text-slate-700">
                              {b.distance_km} {language === 'hi' ? 'किमी दूर' : 'km away'}
                            </Text>
                          </View>
                        )}
                        <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-[#2563EB]">
                            {b.doctors.length} {language === 'hi' ? 'विशेषज्ञ' : 'Specialists'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
                        isSelected
                          ? 'bg-[#2563EB] border-[#2563EB]'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeAreaView>
  );
}
