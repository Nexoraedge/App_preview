import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  useWindowDimensions,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cardGap = 16;
  const tabletCardWidth = (width - 40 - cardGap) / 2;
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
  const [selectedSlotDoctor, setSelectedSlotDoctor] = useState<{ doctor: Doctor; slot: string } | null>(null);
  const [selectedModalSlot, setSelectedModalSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (doctorId: string) => {
    setFavorites((prev) => ({ ...prev, [doctorId]: !prev[doctorId] }));
  };

  // 3 Distinct slot chips per doctor with localized text (All realistic future evening or tomorrow slots)
  const getDoctorSlots = (doc: Doctor, isHi: boolean): string[] => {
    let raw = doc.next_available_slot || 'Today, 6:30 PM';
    // Sanitize: any daytime hours before 6 PM are automatically shifted to realistic later evening hours
    const isToday = raw.toLowerCase().includes('today');
    if (isToday) {
      if (
        raw.includes('1:') ||
        raw.includes('2:') ||
        raw.includes('3:') ||
        raw.includes('4:') ||
        raw.includes('5:') ||
        raw.includes('01:') ||
        raw.includes('02:') ||
        raw.includes('03:') ||
        raw.includes('04:') ||
        raw.includes('05:')
      ) {
        raw = 'Today, 6:30 PM';
      }
    }

    let s1 = raw;
    let s2 = 'Today, 7:45 PM';
    let s3 = 'Tomorrow, 10:30 AM';

    if (s1.toLowerCase().includes('today')) {
      if (s1.includes('6:00') || s1.includes('6:15') || s1.includes('6:30')) {
        s1 = 'Today, 6:30 PM';
        s2 = 'Today, 7:45 PM';
        s3 = 'Tomorrow, 10:30 AM';
      } else if (s1.includes('6:45') || s1.includes('7:00') || s1.includes('7:15')) {
        s1 = 'Today, 7:00 PM';
        s2 = 'Today, 8:15 PM';
        s3 = 'Tomorrow, 11:00 AM';
      } else {
        s1 = 'Today, 7:30 PM';
        s2 = 'Today, 8:30 PM';
        s3 = 'Tomorrow, 11:30 AM';
      }
    } else {
      // Tomorrow slots
      s1 = s1 || 'Tomorrow, 10:30 AM';
      s2 = 'Tomorrow, 02:30 PM';
      s3 = 'Tomorrow, 05:30 PM';
    }

    return [translateSlot(s1, isHi), translateSlot(s2, isHi), translateSlot(s3, isHi)];
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

  // Show Top Doctors spotlight ONLY when a department/branch has 4 or more doctors (avoids duplication)
  const showTopDoctors = filteredDoctors.length >= 4;

  const topDoctors = useMemo(() => {
    if (!showTopDoctors) return [];
    return [...filteredDoctors]
      .sort((a, b) => b.rating - a.rating || b.total_reviews - a.total_reviews || b.experience_years - a.experience_years)
      .slice(0, 2);
  }, [filteredDoctors, showTopDoctors]);

  // Regular doctors list excludes doctors already spotlighted in Top Doctors
  const regularDoctors = useMemo(() => {
    if (!showTopDoctors) return filteredDoctors;
    const topIds = new Set(topDoctors.map((d) => d.id));
    return filteredDoctors.filter((d) => !topIds.has(d.id));
  }, [filteredDoctors, showTopDoctors, topDoctors]);

  // Primary preferred doctor
  const preferredDoctor = topDoctors[0] || null;

  const handleInitiateDoctorBooking = (doctor: Doctor, chosenSlot?: string) => {
    setSelectedDoctor(doctor);
    const slots = getDoctorSlots(doctor, language === 'hi');
    const initialSlot = chosenSlot || slots[0];
    setSelectedModalSlot(initialSlot);
    if (chosenSlot) {
      setSelectedSlotDoctor({ doctor, slot: chosenSlot });
    }
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmExotelBooking = async () => {
    if (!selectedDoctor || !hospital) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveSlot = selectedModalSlot || selectedDoctor.next_available_slot;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id,
      patient_name: user?.full_name || 'Rahul Jain',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      branch_id: activeBranch?.id,
      branch_name: activeBranch?.name,
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      doctor_fee: selectedDoctor.discounted_fee,
      slot_time: effectiveSlot,
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
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#172554" translucent={false} />
      <View style={{ height: insets.top, backgroundColor: '#172554' }} />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }} numberOfLines={2}>
                {translateHospitalName(hospital?.name || '', language === 'hi')}
              </Text>
              <Text style={{ color: '#BFDBFE', fontSize: 12, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                {hospital?.featured
                  ? (language === 'hi' ? 'आदित्यम पार्टनर नेटवर्क' : 'Adityam Partner Network')
                  : (language === 'hi' ? 'अस्पताल नेटवर्क' : 'Hospital Network')}
              </Text>
            </View>

            {/* Rating Pill */}
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={11} color="#CF8A40" fill="#CF8A40" />
              <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '900' }}>
                {hospital?.rating}
              </Text>
            </View>
          </View>

          {/* Branch Selector Dropdown */}
          {branches.length > 0 && (
            <TouchableOpacity
              onPress={() => setBranchDropdownVisible(true)}
              activeOpacity={0.85}
              style={{
                marginTop: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: '700', color: '#BFDBFE', letterSpacing: 0.5 }}>
                      {language === 'hi' ? 'शाखा चुनें' : 'Select Branch'}
                    </Text>
                    {branches.length > 1 && (
                      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>
                          {branches.length} {language === 'hi' ? 'शाखाएं' : 'branches'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 2 }} numberOfLines={2}>
                    {translateBranchName(activeBranch?.name || '', language === 'hi')}
                  </Text>
                </View>
              </View>

              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={15} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}

          {/* Address Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 2 }}>
            <MapPin size={11} color="#BFDBFE" />
            <Text style={{ color: '#DBEAFE', fontSize: 11, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {translateAddress(activeBranch?.address || '', language === 'hi')}
            </Text>
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
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
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + (selectedSlotDoctor ? 135 : 45),
            backgroundColor: '#F8FAFC',
          }}
        >
          {/* CATEGORIES CAPSULE ROW (Image 3 Reference: Sleek Horizontal Pills) */}
          <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
                {language === 'hi' ? 'विशेषज्ञताएं' : 'Specialties'}
              </Text>
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.6)' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
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
                    style={{ marginRight: 8 }}
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
                        <View style={{ marginRight: 8 }}>{cat.icon('#FFFFFF')}</View>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: -0.2 }}>
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
                        <View style={{ marginRight: 8 }}>{cat.icon(cat.accentColor)}</View>
                        <Text style={{ color: '#334155', fontSize: 12, fontWeight: '700' }}>
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
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {filteredDoctors.length === 0 ? (
              <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                <Award size={36} color="#94A3B8" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B', marginTop: 8 }}>
                  No specialists in this department
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  Please switch to "All" or select another category squircle above.
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSpecialty('All')}
                  style={{ marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Show All Specialists</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* TOP DOCTORS: Spotlight (ONLY shown when department/branch has >= 4 doctors) */}
                {showTopDoctors && topDoctors.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
                        {language === 'hi' ? 'शीर्ष डॉक्टर' : (t.preferredDoctorTitle || 'Top Doctors')}
                      </Text>
                      {topDoctors.length > 1 && (
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                          {language === 'hi' ? 'खोजने के लिए स्वाइप करें' : 'Swipe to explore'}
                        </Text>
                      )}
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 8 }}
                    >
                      {topDoctors.map((doc, idx) => {
                        const isFav = !!favorites[doc.id];
                        const docSlots = getDoctorSlots(doc, language === 'hi');
                        return (
                          <View
                            key={doc.id}
                            style={{
                              width: topDoctorCardWidth,
                              marginRight: idx === topDoctors.length - 1 ? 0 : 12,
                            }}
                          >
                            <LinearGradient
                              colors={['#1E40AF', '#2563EB', '#3B82F6']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                borderRadius: 22,
                                padding: 14,
                                position: 'relative',
                                overflow: 'hidden',
                                shadowColor: '#1E40AF',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.18,
                                shadowRadius: 10,
                                elevation: 4,
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                                {/* Doctor Portrait */}
                                <View style={{ width: 92, position: 'relative' }}>
                                  <Image
                                    source={{ uri: getDoctorAvatar(doc) }}
                                    style={{
                                      width: 92,
                                      height: 140,
                                      borderRadius: 16,
                                      backgroundColor: '#DBEAFE',
                                    }}
                                    resizeMode="cover"
                                  />
                                </View>

                                {/* Doctor Info & Slots */}
                                <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                                  <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                      <View style={{ flex: 1, marginRight: 4 }}>
                                        <Text
                                          style={{
                                            color: '#FFFFFF',
                                            fontSize: 15,
                                            fontWeight: '900',
                                            letterSpacing: -0.3,
                                            lineHeight: 19,
                                          }}
                                          numberOfLines={1}
                                        >
                                          {translateDoctorName(doc.name, language === 'hi')}
                                        </Text>
                                        <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                                          {translateSpecialty(doc.specialty, language === 'hi')} • {doc.experience_years} {language === 'hi' ? 'वर्ष अनुभव' : 'yrs exp'}
                                        </Text>
                                      </View>

                                      <TouchableOpacity
                                        onPress={() => toggleFavorite(doc.id)}
                                        activeOpacity={0.7}
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: 14,
                                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginTop: -2,
                                        }}
                                      >
                                        <Heart
                                          size={13}
                                          color={isFav ? '#EF4444' : '#FFFFFF'}
                                          fill={isFav ? '#EF4444' : 'transparent'}
                                        />
                                      </TouchableOpacity>
                                    </View>

                                    {/* Star Rating & Qualification */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                      <Star size={11} color="#FBBF24" fill="#FBBF24" />
                                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                                        {doc.rating} ({doc.total_reviews})
                                      </Text>
                                    </View>

                                    <Text
                                      style={{ color: '#DBEAFE', fontSize: 10.5, fontWeight: '600', marginTop: 4 }}
                                      numberOfLines={1}
                                    >
                                      {translateQualification(doc.qualification, language === 'hi')}
                                    </Text>
                                  </View>

                                  {/* Slot Chips in Top Doctor Card */}
                                  <View style={{ marginTop: 8 }}>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                                      {docSlots.map((slot) => {
                                        const isSelected =
                                          selectedSlotDoctor?.doctor.id === doc.id &&
                                          selectedSlotDoctor?.slot === slot;
                                        return (
                                          <TouchableOpacity
                                            key={slot}
                                            onPress={() => setSelectedSlotDoctor({ doctor: doc, slot })}
                                            activeOpacity={0.8}
                                            style={{
                                              paddingHorizontal: 7,
                                              paddingVertical: 3.5,
                                              borderRadius: 7,
                                              backgroundColor: isSelected
                                                ? '#FFFFFF'
                                                : 'rgba(255, 255, 255, 0.2)',
                                              borderWidth: 1,
                                              borderColor: isSelected
                                                ? '#FFFFFF'
                                                : 'rgba(255, 255, 255, 0.35)',
                                            }}
                                          >
                                            <Text
                                              style={{
                                                fontSize: 10,
                                                fontWeight: '700',
                                                color: isSelected ? '#1D4ED8' : '#FFFFFF',
                                              }}
                                            >
                                              {slot}
                                            </Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  </View>
                                </View>
                              </View>

                              {/* Plain Text Fee + One Obvious Book CTA */}
                              <View
                                style={{
                                  marginTop: 11,
                                  paddingTop: 10,
                                  borderTopWidth: 1,
                                  borderTopColor: 'rgba(255, 255, 255, 0.18)',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <View>
                                  <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12 }}>
                                    <Text style={{ textDecorationLine: 'line-through' }}>
                                      ₹{doc.consultation_fee}
                                    </Text>
                                    {' · '}
                                    <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
                                      {language === 'hi'
                                        ? `ऐप में ₹${doc.discounted_fee}`
                                        : `Pay in app ₹${doc.discounted_fee}`}
                                    </Text>
                                  </Text>
                                  {hospital?.discount_percentage ? (
                                    <Text
                                      style={{
                                        color: '#BFDBFE',
                                        fontSize: 10,
                                        fontWeight: '700',
                                        marginTop: 1,
                                      }}
                                    >
                                      {language === 'hi'
                                        ? `${hospital.discount_percentage}% छूट (आदित्यम दर)`
                                        : `Save ${hospital.discount_percentage}% in-app`}
                                    </Text>
                                  ) : null}
                                </View>

                                <TouchableOpacity
                                  onPress={() => {
                                    const chosen =
                                      selectedSlotDoctor?.doctor.id === doc.id
                                        ? selectedSlotDoctor.slot
                                        : docSlots[0];
                                    handleInitiateDoctorBooking(doc, chosen);
                                  }}
                                  activeOpacity={0.88}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 11,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 3,
                                    elevation: 2,
                                  }}
                                >
                                  <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '800' }}>
                                    {language === 'hi' ? 'बुक करें' : 'Book'}
                                  </Text>
                                  <ChevronRight size={14} color="#1D4ED8" strokeWidth={2.5} />
                                </TouchableOpacity>
                              </View>
                            </LinearGradient>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Section Heading for All Department Specialists */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
                    {selectedSpecialty === 'All'
                      ? (language === 'hi' ? 'उपलब्ध विशेषज्ञ' : (t.topSpecialistsTitle || 'Available Specialists'))
                      : (language === 'hi' ? `${translateSpecialty(selectedSpecialty, true)} विशेषज्ञ` : `${selectedSpecialty} Specialists`)}
                  </Text>
                  <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.6)' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                      {regularDoctors.length} {language === 'hi' ? 'डॉक्टर' : (regularDoctors.length === 1 ? 'Doctor' : 'Doctors')}
                    </Text>
                  </View>
                </View>

                {/* Uncluttered Modern Clinical Doctor Cards */}
                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    flexWrap: isTablet ? 'wrap' : 'nowrap',
                    gap: isTablet ? cardGap : 0,
                    justifyContent: 'space-between',
                  }}
                >
                  {regularDoctors.map((doctor) => {
                    const isFav = !!favorites[doctor.id];
                    const avatar = getDoctorAvatar(doctor);
                    const docSlots = getDoctorSlots(doctor, language === 'hi');

                    return (
                      <View
                        key={doctor.id}
                        style={{
                          width: isTablet ? tabletCardWidth : '100%',
                          marginBottom: isTablet ? cardGap : 16,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 22,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          padding: 16,
                          overflow: 'hidden',
                          shadowColor: '#1E3A8A',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.05,
                          shadowRadius: 10,
                          elevation: 2,
                        }}
                      >
                        {/* Doctor Profile Info Row (Name, Experience, Rating, Qualification) */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                          <View style={{ position: 'relative' }}>
                            <Image
                              source={{ uri: avatar }}
                              style={{
                                width: 78,
                                height: 98,
                                borderRadius: 16,
                                backgroundColor: '#EFF6FF',
                                borderWidth: 1,
                                borderColor: '#F1F5F9',
                              }}
                              resizeMode="cover"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '900',
                                  color: '#0F172A',
                                  flex: 1,
                                  lineHeight: 20,
                                  marginRight: 4,
                                }}
                              >
                                {translateDoctorName(doctor.name, language === 'hi')}
                              </Text>

                              <TouchableOpacity
                                onPress={() => toggleFavorite(doctor.id)}
                                activeOpacity={0.7}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: '#F8FAFC',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: -2,
                                  marginRight: -2,
                                }}
                              >
                                <Heart
                                  size={14}
                                  color={isFav ? '#EF4444' : '#94A3B8'}
                                  fill={isFav ? '#EF4444' : 'transparent'}
                                />
                              </TouchableOpacity>
                            </View>

                            {/* Specialty & Experience Line */}
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: '#2563EB',
                                marginTop: 2,
                              }}
                            >
                              {translateSpecialty(doctor.specialty, language === 'hi')} • {doctor.experience_years} {language === 'hi' ? 'वर्ष अनुभव' : 'yrs exp'}
                            </Text>

                            {/* Single Qualification Line */}
                            <Text
                              style={{
                                fontSize: 11,
                                color: '#64748B',
                                fontWeight: '500',
                                marginTop: 2,
                              }}
                              numberOfLines={1}
                            >
                              {translateQualification(doctor.qualification, language === 'hi')}
                            </Text>

                            {/* Star Rating Line */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Star size={11} color="#D97706" fill="#D97706" />
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#1E293B' }}>
                                {doctor.rating}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>
                                ({doctor.total_reviews} {language === 'hi' ? 'समीक्षा' : 'reviews'})
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Plain Text Fee with In-App Price & One Obvious Book CTA */}
                        <View
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: '#F1F5F9',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View>
                            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                              <Text style={{ textDecorationLine: 'line-through' }}>
                                ₹{doctor.consultation_fee}
                              </Text>
                              {' · '}
                              <Text style={{ color: '#16A34A', fontWeight: '900', fontSize: 14 }}>
                                {language === 'hi'
                                  ? `ऐप में ₹${doctor.discounted_fee}`
                                  : `Pay in app ₹${doctor.discounted_fee}`}
                              </Text>
                            </Text>
                            {hospital?.discount_percentage ? (
                              <Text style={{ fontSize: 10.5, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                                {language === 'hi'
                                  ? `${hospital.discount_percentage}% छूट • इन-ऐप दर`
                                  : `Save ${hospital.discount_percentage}% with in-app pay`}
                              </Text>
                            ) : null}
                          </View>

                          <TouchableOpacity
                            onPress={() => handleInitiateDoctorBooking(doctor)}
                            activeOpacity={0.88}
                            style={{
                              backgroundColor: '#2563EB',
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              shadowColor: '#2563EB',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.2,
                              shadowRadius: 4,
                              elevation: 2,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                              {language === 'hi' ? 'बुक करें' : 'Book'}
                            </Text>
                            <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Solid Floating Bottom Bar when slot is chosen */}
        {selectedSlotDoctor && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1.5,
              borderTopColor: '#E2E8F0',
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 12,
              zIndex: 999,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Clock size={13} color="#2563EB" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  {selectedSlotDoctor.slot}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                <Text style={{ fontWeight: '800', color: '#16A34A' }}>
                  ₹{selectedSlotDoctor.doctor.discounted_fee}
                </Text>
                {' · '}
                {translateDoctorName(selectedSlotDoctor.doctor.name, language === 'hi')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setSelectedSlotDoctor(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleInitiateDoctorBooking(selectedSlotDoctor.doctor, selectedSlotDoctor.slot)
                }
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#2563EB',
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#2563EB',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 3,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {language === 'hi' ? 'बुक करें' : 'Book'}
                </Text>
                <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exotel Masked Call Booking Modal */}
        <Modal
          visible={bookingModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}>
                  {confirmedBooking
                    ? (language === 'hi' ? 'परामर्श की पुष्टि हुई!' : 'Consultation Confirmed!')
                    : (language === 'hi' ? 'प्राथमिकता ओपीडी डॉक्टर बुकिंग' : 'Priority OPD Doctor Booking')}
                </Text>
                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  style={{ padding: 4 }}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {confirmedBooking ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <CheckCircle2 size={32} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#182F3B' }}>
                    {language === 'hi' ? 'कंसीयर्ज कॉल शुरू हुई' : 'Concierge Dispatched'}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>
                    {language === 'hi' ? 'संदर्भ आईडी: ' : 'Reference: '}{confirmedBooking.booking_ref}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 18 }}>
                    {language === 'hi' ? (
                      <>
                        <Text style={{ fontWeight: '700', color: '#182F3B' }}>
                          {translateDoctorName(confirmedBooking.doctor_name || '', true)}
                        </Text>{' '}
                        के लिए आपका प्राथमिकता स्लॉट {translateHospitalName(confirmedBooking.hospital_name || '', true)} ({translateBranchName(confirmedBooking.branch_name || '', true)}) में दर्ज कर दिया गया है। हमारे समन्वयक आपसे संपर्क कर रहे हैं!
                      </>
                    ) : (
                      <>
                        Your priority slot for{' '}
                        <Text style={{ fontWeight: '700', color: '#182F3B' }}>
                          {confirmedBooking.doctor_name}
                        </Text>{' '}
                        at {confirmedBooking.hospital_name} ({confirmedBooking.branch_name}) has been submitted to the real-time CRM. Our desk coordinator is connecting you now!
                      </>
                    )}
                  </Text>

                  <View style={{ width: '100%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B', textTransform: 'uppercase' }}>
                      {language === 'hi' ? 'एक्सोटेल वर्चुअल टेलीफोनी' : 'Exotel Virtual Telephony Route'}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', color: '#1E293B', marginTop: 2 }}>
                      +91 11 4000 8800 ➔ {user?.phone || '+91 99999 99999'}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600', marginTop: 4 }}>
                      {language === 'hi'
                        ? '✓ आपका नंबर और व्यक्तिगत पहचान 100% गोपनीय रहती है।'
                        : '✓ Masked calling protects your identity and number.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setBookingModalVisible(false)}
                    style={{ width: '100%', backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{language === 'hi' ? 'पूर्ण' : 'Done'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ paddingVertical: 16 }}>
                  {/* Doctor Summary */}
                  {selectedDoctor && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}>
                        {translateDoctorName(selectedDoctor.name, language === 'hi')}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 2 }}>
                        {translateSpecialty(selectedDoctor.specialty, language === 'hi')} • {translateHospitalName(hospital?.name || '', language === 'hi')} ({translateBranchName(activeBranch?.name || '', language === 'hi')})
                      </Text>
                      {selectedDoctor.qualification && (
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                          {translateQualification(selectedDoctor.qualification, language === 'hi')}
                        </Text>
                      )}

                      {/* Doctor's OPD Consultation Timings / Schedule */}
                      {selectedDoctor.opd_timing && (
                        <View style={{ backgroundColor: 'rgba(239, 246, 255, 0.8)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.7)', marginTop: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Clock size={16} color="#2563EB" strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {language === 'hi' ? 'डॉक्टर का ओपीडी समय (शेड्यूल):' : 'Doctor OPD Schedule:'}
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                              {translateTiming(selectedDoctor.opd_timing, language === 'hi')}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Booking Timing: Selectable Time Slots */}
                      <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginVertical: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                            {language === 'hi' ? 'बुकिंग का समय (स्लॉट) चुनें:' : 'Select Booking Slot:'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(219, 234, 254, 0.7)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Clock size={11} color="#1D4ED8" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>
                              {selectedModalSlot || selectedDoctor.next_available_slot}
                            </Text>
                          </View>
                        </View>

                        {/* Interactive slot chips */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {getDoctorSlots(selectedDoctor, language === 'hi').map((slot) => {
                            const isSelected = (selectedModalSlot || selectedDoctor.next_available_slot) === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                onPress={() => setSelectedModalSlot(slot)}
                                activeOpacity={0.8}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                  backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                                  borderColor: isSelected ? '#1D4ED8' : '#E2E8F0',
                                  shadowColor: isSelected ? '#2563EB' : 'transparent',
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: isSelected ? 0.2 : 0,
                                  shadowRadius: 2,
                                  elevation: isSelected ? 2 : 0,
                                }}
                              >
                                <Clock size={12} color={isSelected ? '#FFFFFF' : '#64748B'} />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '700',
                                    color: isSelected ? '#FFFFFF' : '#334155',
                                  }}
                                >
                                  {slot}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Consultation Fee Breakdown */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(226, 232, 240, 0.8)' }}>
                          <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                            {language === 'hi' ? 'परामर्श शुल्क (ऐप में दर):' : 'Consultation Fee (In-App):'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' }}>
                              ₹{selectedDoctor.consultation_fee}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A' }}>
                              ₹{selectedDoctor.discounted_fee}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Patient Information */}
                  <View style={{ backgroundColor: '#FFF9F0', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(207, 138, 64, 0.3)', marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#182F3B' }}>
                      {language === 'hi' ? 'मरीज की जानकारी:' : 'Patient Information:'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {language === 'hi' ? 'नाम: ' : 'Name: '}<Text style={{ fontWeight: '700' }}>{user?.full_name || 'Rahul Jain'}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                      {language === 'hi' ? 'फ़ोन: ' : 'Phone: '}<Text style={{ fontWeight: '700' }}>{user?.phone || '+91 99999 99999'}</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleConfirmExotelBooking}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563EB',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      shadowColor: '#2563EB',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Calendar size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      {isSubmitting
                        ? (language === 'hi' ? 'स्लॉट बुक किया जा रहा है...' : 'Reserving OPD Slot...')
                        : (language === 'hi' ? 'पुष्टि करें और ओपीडी स्लॉट बुक करें' : 'Confirm & Reserve OPD Slot')}
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
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                maxHeight: '75%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B' }}>
                    {language === 'hi' ? 'अस्पताल शाखा चुनें' : 'Select Hospital Branch'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                    {translateHospitalName(hospital?.name || '', language === 'hi')} • {branches.length} {language === 'hi' ? 'शाखाएं' : 'Locations'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBranchDropdownVisible(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Branches List */}
              <ScrollView style={{ paddingVertical: 8, marginTop: 4 }} showsVerticalScrollIndicator={false}>
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
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        marginBottom: 10,
                        borderWidth: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                        borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Building2 size={14} color={isSelected ? '#2563EB' : '#64748B'} />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '900',
                              color: isSelected ? '#2563EB' : '#182F3B',
                            }}
                          >
                            {translateBranchName(b.name, language === 'hi')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }} numberOfLines={1}>
                          {translateAddress(b.address, language === 'hi')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          {b.distance_km && (
                            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }}>
                                {b.distance_km} {language === 'hi' ? 'किमी दूर' : 'km away'}
                              </Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>
                              {b.doctors.length} {language === 'hi' ? 'विशेषज्ञ' : 'Specialists'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          backgroundColor: isSelected ? '#2563EB' : 'transparent',
                          borderColor: isSelected ? '#2563EB' : '#CBD5E1',
                        }}
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
  );
}
