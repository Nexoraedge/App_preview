import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Star,
  CheckCircle2,
  X,
  Check,
  Building2,
  ChevronRight,
  UserCheck,
  Tag,
  Clock,
  Heart,
  Calendar,
  Phone,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNearbyHospitals, getSupabaseClient } from '@adityam/supabase';
import type { Hospital, HospitalBranch, Doctor, Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
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
} from '../../components/ServiceIcons';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { HospitalCardSkeleton, DoctorCardSkeleton } from '../../components/ui/SkeletonBox';
import {
  translateHospitalName,
  translateBranchName,
  translateAddress,
  translateSpecialty,
  translateDoctorName,
  translateQualification,
  translateSlot,
  translateTiming,
} from '../../src/utils/hindiDictionary';
import { getDoctorAvatar } from '../../src/utils/doctorAvatars';

interface SpecialtyCategory {
  id: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  accentColor: string;
}

type SortOption = 'nearest' | 'topRated' | 'today' | 'savings';

interface FlattenedDoctor extends Doctor {
  hospitalId: string;
  hospitalName: string;
  hospitalDiscount: number;
  hospitalFeatured: boolean;
  branchId?: string;
  branchName?: string;
  distanceKm: number;
}

export default function OpdConciergeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cardGap = 16;
  const tabletCardWidth = (width - 40 - cardGap) / 2;
  const topDoctorCardWidth = Math.min(width - 48, 330);

  // Tab switch: Hospitals vs Doctors (Instant zero-lag tab flipping via display toggling)
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors'>('hospitals');
  const [hasVisitedDoctors, setHasVisitedDoctors] = useState(false);

  useEffect(() => {
    // Warm up the doctors list in idle background time so tab switching is instantaneous (0ms)
    const timer = setTimeout(() => {
      setHasVisitedDoctors(true);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const handleTabSwitch = useCallback((tab: 'hospitals' | 'doctors') => {
    if (tab === 'doctors') {
      setHasVisitedDoctors(true);
    }
    setActiveTab(tab);
    if (tab === 'hospitals') {
      setSelectedSlotDoctor(null);
    }
  }, []);

  const [screenLoading, setScreenLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setScreenLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (doctorId: string) => {
    setFavorites((prev) => ({ ...prev, [doctorId]: !prev[doctorId] }));
  };

  // Selected slot state for doctor booking & bottom bar
  const [selectedSlotDoctor, setSelectedSlotDoctor] = useState<{
    doctor: Doctor;
    slot: string;
    hospitalId: string;
    hospitalName: string;
    branchId?: string;
    branchName?: string;
  } | null>(null);

  // Booking Modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingTargetDoctor, setBookingTargetDoctor] = useState<{
    doctor: Doctor;
    slot: string;
    hospitalName: string;
  } | null>(null);
  const [selectedModalSlot, setSelectedModalSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Categories list
  const categories: SpecialtyCategory[] = useMemo(
    () => [
      {
        id: 'All',
        label: t.allSpecialties,
        icon: (color: string) => <AllCategoriesIcon size={26} color={color} />,
        accentColor: '#3B82F6',
      },
      {
        id: 'Cardiology',
        label: language === 'hi' ? 'हृदय रोग' : 'Cardiologist',
        icon: (color: string) => <HeartPulseIcon size={26} color={color} />,
        accentColor: '#E87869',
      },
      {
        id: 'ENT',
        label: language === 'hi' ? 'ऑडियोलॉजिस्ट' : 'Audiologist',
        icon: (color: string) => <AudiologistIcon size={26} color={color} />,
        accentColor: '#3B82F6',
      },
      {
        id: 'General Medicine',
        label: language === 'hi' ? 'जनरल फिजिशियन' : 'General Physician',
        icon: (color: string) => <OpdStethoscopeIcon size={26} color={color} />,
        accentColor: '#3B82F6',
      },
      {
        id: 'Dentistry',
        label: language === 'hi' ? 'दंत चिकित्सक' : 'Dentist',
        icon: (color: string) => <DentalToothIcon size={26} color={color} />,
        accentColor: '#12AFA5',
      },
      {
        id: 'Orthopedics',
        label: language === 'hi' ? 'हड्डी व जोड़' : 'Orthopedics',
        icon: (color: string) => <BoneJointIcon size={26} color={color} />,
        accentColor: '#4F6BED',
      },
      {
        id: 'Pediatrics',
        label: language === 'hi' ? 'शिशु रोग' : 'Pediatrics',
        icon: (color: string) => <ChildCareIcon size={26} color={color} />,
        accentColor: '#CF8A40',
      },
      {
        id: 'Neurology',
        label: language === 'hi' ? 'न्यूरोलॉजिस्ट' : 'Psychiatrists',
        icon: (color: string) => <NeurologyBrainIcon size={26} color={color} />,
        accentColor: '#8B70D6',
      },
      {
        id: 'Dermatology',
        label: language === 'hi' ? 'त्वचा व बाल' : 'Dermatologist',
        icon: (color: string) => <DermatologyIcon size={26} color={color} />,
        accentColor: '#9333EA',
      },
    ],
    [t, language]
  );

  // TanStack Query for PostGIS Nearby Hospitals
  const { data: hospitals = [], isLoading, refetch } = useQuery({
    queryKey: ['nearby-hospitals', selectedSpecialty],
    queryFn: () =>
      fetchNearbyHospitals(
        28.5355,
        77.2000,
        selectedSpecialty === 'All' ? undefined : selectedSpecialty
      ),
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refetch]);

  // Flattened doctors across all hospitals and branches
  const allDoctors = useMemo<FlattenedDoctor[]>(() => {
    const list: FlattenedDoctor[] = [];
    hospitals.forEach((h) => {
      (h.branches || []).forEach((b) => {
        (b.doctors || []).forEach((d) => {
          list.push({
            ...d,
            hospitalId: h.id,
            hospitalName: h.name,
            hospitalDiscount: h.discount_percentage,
            hospitalFeatured: !!h.featured,
            branchId: b.id,
            branchName: b.name,
            distanceKm: b.distance_km ?? h.distance_km ?? 5.0,
          });
        });
      });
    });
    return list;
  }, [hospitals]);

  // Filtered & Sorted Hospitals
  const filteredHospitals = useMemo(() => {
    let list = [...hospitals];

    // Filter by Specialty
    if (selectedSpecialty !== 'All') {
      const target = selectedSpecialty.toLowerCase();
      list = list.filter((h) =>
        (h.specialties || []).some((s) => s.toLowerCase().includes(target))
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((h) => {
        const nameMatch = h.name.toLowerCase().includes(q);
        const addressMatch = h.address.toLowerCase().includes(q);
        const cityMatch = h.city.toLowerCase().includes(q);
        const specialtyMatch = h.specialties.some((s) => s.toLowerCase().includes(q));
        const branchMatch = h.branches?.some(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.area.toLowerCase().includes(q) ||
            b.doctors.some((d) => d.name.toLowerCase().includes(q))
        );
        return nameMatch || addressMatch || cityMatch || specialtyMatch || branchMatch;
      });
    }

    // Sort
    if (sortBy === 'nearest') {
      list.sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
    } else if (sortBy === 'topRated') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'today') {
      list.sort((a, b) => {
        const aHasToday = a.branches?.some((br) =>
          br.doctors.some((d) => d.next_available_slot?.toLowerCase().includes('today'))
        );
        const bHasToday = b.branches?.some((br) =>
          br.doctors.some((d) => d.next_available_slot?.toLowerCase().includes('today'))
        );
        return (bHasToday ? 1 : 0) - (aHasToday ? 1 : 0);
      });
    } else if (sortBy === 'savings') {
      list.sort((a, b) => (b.discount_percentage ?? 0) - (a.discount_percentage ?? 0));
    }

    return list;
  }, [hospitals, selectedSpecialty, searchQuery, sortBy]);

  // Filtered & Sorted Doctors
  const filteredDoctors = useMemo(() => {
    let list = [...allDoctors];

    // Filter by Specialty
    if (selectedSpecialty !== 'All') {
      const target = selectedSpecialty.toLowerCase();
      list = list.filter((d) => d.specialty.toLowerCase().includes(target));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        const nameMatch = d.name.toLowerCase().includes(q);
        const specMatch = d.specialty.toLowerCase().includes(q);
        const qualMatch = d.qualification.toLowerCase().includes(q);
        const hospMatch = d.hospitalName.toLowerCase().includes(q);
        const branchMatch = (d.branchName || '').toLowerCase().includes(q);
        return nameMatch || specMatch || qualMatch || hospMatch || branchMatch;
      });
    }

    // Sort
    if (sortBy === 'nearest') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'topRated') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.total_reviews ?? 0) - (a.total_reviews ?? 0));
    } else if (sortBy === 'today') {
      list.sort((a, b) => {
        const aToday = (a.next_available_slot || '').toLowerCase().includes('today');
        const bToday = (b.next_available_slot || '').toLowerCase().includes('today');
        return (bToday ? 1 : 0) - (aToday ? 1 : 0);
      });
    } else if (sortBy === 'savings') {
      list.sort((a, b) => {
        const aSave = (a.consultation_fee - a.discounted_fee);
        const bSave = (b.consultation_fee - b.discounted_fee);
        return bSave - aSave;
      });
    }

    return list;
  }, [allDoctors, selectedSpecialty, searchQuery, sortBy]);

  // Top Doctors Spotlight: Selected top specialists (Dr. Satish Jain strictly on top with 5 stars)
  const showTopDoctors = filteredDoctors.length >= 2;
  const topDoctors = useMemo(() => {
    if (!showTopDoctors) return [];
    return [...filteredDoctors]
      .sort((a, b) => {
        const aSatish = a.name.includes('Satish Jain');
        const bSatish = b.name.includes('Satish Jain');
        if (aSatish && !bSatish) return -1;
        if (!aSatish && bSatish) return 1;
        return (b.rating ?? 0) - (a.rating ?? 0) || (b.total_reviews ?? 0) - (a.total_reviews ?? 0);
      })
      .slice(0, 3);
  }, [filteredDoctors, showTopDoctors]);

  // Regular doctors list excludes doctors already spotlighted in Top Doctors
  const regularDoctors = useMemo(() => {
    if (!showTopDoctors) return filteredDoctors;
    const topIds = new Set(topDoctors.map((d) => d.id));
    return filteredDoctors.filter((d) => !topIds.has(d.id));
  }, [filteredDoctors, showTopDoctors, topDoctors]);

  // Slots Cache & Memoized Helper (Pre-calculated so renders never block)
  const slotsCache = useMemo(() => new Map<string, string[]>(), [language]);
  const getDoctorSlots = useCallback(
    (doc: Doctor, isHi: boolean): string[] => {
      const key = `${doc.id}-${isHi ? 'hi' : 'en'}`;
      if (slotsCache.has(key)) return slotsCache.get(key)!;

      let raw = doc.next_available_slot || 'Today, 6:30 PM';
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
        s1 = s1 || 'Tomorrow, 10:30 AM';
        s2 = 'Tomorrow, 02:30 PM';
        s3 = 'Tomorrow, 05:30 PM';
      }

      const res = [translateSlot(s1, isHi), translateSlot(s2, isHi), translateSlot(s3, isHi)];
      slotsCache.set(key, res);
      return res;
    },
    [slotsCache]
  );

  // Navigate to dedicated Branch Doctors Screen
  const handleSelectHospital = (hospital: Hospital) => {
    router.push({
      pathname: '/branch-doctors',
      params: {
        hospitalId: hospital.id,
        branchId: hospital.branches?.[0]?.id,
        specialty: selectedSpecialty !== 'All' ? selectedSpecialty : undefined,
      },
    });
  };

  const handleInitiateDoctorBooking = (
    doctor: Doctor,
    slot?: string,
    hospitalName?: string
  ) => {
    const slots = getDoctorSlots(doctor, language === 'hi');
    const initialSlot = slot || slots[0];
    setBookingTargetDoctor({
      doctor,
      slot: initialSlot,
      hospitalName: hospitalName || (doctor as FlattenedDoctor).hospitalName || 'Hospital Network',
    });
    setSelectedModalSlot(initialSlot);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingTargetDoctor) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveSlot = selectedModalSlot || bookingTargetDoctor.slot;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id,
      patient_name: user?.full_name || 'Rahul Jain',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_name: bookingTargetDoctor.hospitalName,
      doctor_name: bookingTargetDoctor.doctor.name,
      doctor_fee: bookingTargetDoctor.doctor.discounted_fee,
      slot_time: effectiveSlot,
      specialty_requested: bookingTargetDoctor.doctor.specialty,
      status: 'NEW',
      call_status: 'pending',
      notes: `OPD slot reserved for ${bookingTargetDoctor.doctor.name} at ${bookingTargetDoctor.hospitalName}. Masked Exotel dispatch initiated.`,
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

  const sortChips: { id: SortOption; label: string; icon: React.ReactNode }[] = [
    {
      id: 'nearest',
      label: language === 'hi' ? 'निकटतम' : 'Nearest',
      icon: <MapPin size={12} color={sortBy === 'nearest' ? '#2563EB' : '#64748B'} />,
    },
    {
      id: 'topRated',
      label: language === 'hi' ? 'शीर्ष रेटेड' : 'Top Rated',
      icon: <Star size={12} color={sortBy === 'topRated' ? '#D97706' : '#64748B'} fill={sortBy === 'topRated' ? '#D97706' : 'none'} />,
    },
    {
      id: 'today',
      label: language === 'hi' ? 'आज उपलब्ध' : 'Available Today',
      icon: <Clock size={12} color={sortBy === 'today' ? '#2563EB' : '#64748B'} />,
    },
    {
      id: 'savings',
      label: language === 'hi' ? 'सर्वाधिक बचत' : 'Biggest Saving',
      icon: <Tag size={12} color={sortBy === 'savings' ? '#16A34A' : '#64748B'} />,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + (selectedSlotDoctor ? 150 : 90),
        }}
      >
        {/* App Header with Switch */}
        <AppHeader
          title={
            activeTab === 'hospitals'
              ? (language === 'hi' ? 'अस्पताल नेटवर्क' : 'Hospital Networks')
              : (language === 'hi' ? 'विशेषज्ञ डॉक्टर' : 'Specialist Doctors')
          }
          onPressProfile={() => setProfileVisible(true)}
          style={{ backgroundColor: '#F8FAFC' }}
        >
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={
              activeTab === 'hospitals'
                ? (language === 'hi' ? 'अस्पताल या विशेषता खोजें...' : 'Search hospital or specialty...')
                : (language === 'hi' ? 'डॉक्टर या विशेषज्ञता खोजें...' : 'Search doctor or specialty...')
            }
          />

          {/* Segmented Switch: अस्पताल | डॉक्टर */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#E2E8F0',
              borderRadius: 14,
              padding: 3,
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => handleTabSwitch('hospitals')}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: activeTab === 'hospitals' ? '#2563EB' : 'transparent',
                shadowColor: activeTab === 'hospitals' ? '#2563EB' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeTab === 'hospitals' ? 0.25 : 0,
                shadowRadius: 4,
                elevation: activeTab === 'hospitals' ? 2 : 0,
                gap: 6,
              }}
            >
              <Building2
                size={16}
                color={activeTab === 'hospitals' ? '#FFFFFF' : '#475569'}
                strokeWidth={2}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: activeTab === 'hospitals' ? '#FFFFFF' : '#475569',
                }}
              >
                {language === 'hi' ? 'अस्पताल' : 'Hospitals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabSwitch('doctors')}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: activeTab === 'doctors' ? '#2563EB' : 'transparent',
                shadowColor: activeTab === 'doctors' ? '#2563EB' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeTab === 'doctors' ? 0.25 : 0,
                shadowRadius: 4,
                elevation: activeTab === 'doctors' ? 2 : 0,
                gap: 6,
              }}
            >
              <UserCheck
                size={16}
                color={activeTab === 'doctors' ? '#FFFFFF' : '#475569'}
                strokeWidth={2}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: activeTab === 'doctors' ? '#FFFFFF' : '#475569',
                }}
              >
                {language === 'hi' ? 'डॉक्टर' : 'Doctors'}
              </Text>
            </TouchableOpacity>
          </View>
        </AppHeader>

        {/* Categories Capsule Pills Section */}
        <View style={{ paddingTop: 14, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
              {t.categoriesTitle}
            </Text>
            {selectedSpecialty !== 'All' && (
              <TouchableOpacity
                onPress={() => setSelectedSpecialty('All')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                  {language === 'hi' ? 'सभी देखें' : 'Reset to All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
          >
            {categories.map((cat) => {
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

        {/* Sort Chips Row */}
        <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {sortChips.map((chip) => {
              const isSelected = sortBy === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setSortBy(chip.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 11,
                    paddingVertical: 6.5,
                    borderRadius: 12,
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                    gap: 5,
                  }}
                >
                  {chip.icon}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? '800' : '600',
                      color: isSelected ? '#2563EB' : '#475569',
                    }}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* TAB 1: HOSPITALS LIST */}
        <View style={{ display: activeTab === 'hospitals' ? 'flex' : 'none' }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#182F3B', letterSpacing: -0.3 }}>
                  {t.hospitalNetworksTitle}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                  {language === 'hi'
                    ? `${filteredHospitals.length} अस्पताल नेटवर्क उपलब्ध`
                    : `${filteredHospitals.length} ${filteredHospitals.length === 1 ? 'Hospital Network' : 'Hospital Networks'} available`}
                </Text>
              </View>
            </View>

            {(isLoading || screenLoading) ? (
              <View>
                <HospitalCardSkeleton />
                <HospitalCardSkeleton />
                <HospitalCardSkeleton />
              </View>
            ) : filteredHospitals.length === 0 ? (
              <View style={{ paddingVertical: 64, alignItems: 'center', paddingHorizontal: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Building2 size={28} color="#94A3B8" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}>
                  {t.noHospitalsFound}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  {t.noHospitalsSub}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: isTablet ? 'row' : 'column',
                  flexWrap: isTablet ? 'wrap' : 'nowrap',
                  gap: isTablet ? cardGap : 0,
                  justifyContent: 'space-between',
                }}
              >
                {filteredHospitals.map((hospital) => {
                  const branches = hospital.branches || [];
                  const totalDoctors = branches.reduce(
                    (sum, b) => sum + (b.doctors?.length || 0),
                    0
                  );

                  return (
                    <View
                      key={hospital.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden',
                        width: isTablet ? tabletCardWidth : '100%',
                        marginBottom: isTablet ? cardGap : 16,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#1E3A8A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 3,
                      }}
                    >
                    {/* Compact Photo Header */}
                    <View style={{ height: 138, backgroundColor: '#EFF6FF' }}>
                      {hospital.image_url ? (
                        <Image
                          source={{ uri: hospital.image_url }}
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            ...StyleSheet.absoluteFill,
                            backgroundColor: '#EFF6FF',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Building2 size={32} color="#2563EB" strokeWidth={1.5} />
                        </View>
                      )}

                      {/* Photo contrast gradient */}
                      <LinearGradient
                        colors={[
                          'rgba(15, 23, 42, 0.20)',
                          'transparent',
                          'rgba(15, 23, 42, 0.38)',
                        ]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />

                      {/* Rating Badge */}
                      {hospital.rating != null && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            gap: 4,
                            elevation: 2,
                            shadowColor: '#000',
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                          }}
                        >
                          <Star size={13} color="#F59E0B" fill="#F59E0B" />
                          <Text
                            style={{
                              color: '#0F172A',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {hospital.rating}
                          </Text>
                          {hospital.total_reviews != null && (
                            <Text style={{ color: '#64748B', fontSize: 10 }}>
                              ({hospital.total_reviews})
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Partner Privilege label ONLY if featured */}
                      {hospital.featured && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            backgroundColor: '#FEF3C7',
                            borderWidth: 1,
                            borderColor: '#FDE68A',
                            borderRadius: 14,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: '#92400E',
                              fontSize: 9,
                              fontWeight: '800',
                              letterSpacing: 0.4,
                            }}
                          >
                            {t.partnerPrivilegeTag}
                          </Text>
                        </View>
                      )}

                      {/* Distance Pill */}
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 14,
                          left: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 16,
                          backgroundColor: 'rgba(15, 23, 42, 0.82)',
                        }}
                      >
                        <MapPin size={11} color="#93C5FD" />
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: '700',
                          }}
                        >
                          {hospital.distance_km != null
                            ? `${hospital.distance_km} ${t.kmAway}`
                            : 'Nearby'}
                        </Text>
                      </View>

                      {/* Wave transition with seamless overlap to prevent sub-pixel horizontal bleed */}
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          left: -1,
                          right: -1,
                          height: 32,
                        }}
                      >
                        <Svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 360 42"
                          preserveAspectRatio="none"
                        >
                          <Path
                            d="M-2 14 C48 39 95 34 150 20 C205 5 242 35 292 27 C324 23 342 5 362 9 L362 44 L-2 44 Z"
                            fill="#FFFFFF"
                          />
                        </Svg>
                      </View>

                      {/* Solid white seam overlap to guarantee zero sub-pixel dark bleed on any screen */}
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          bottom: -1,
                          left: 0,
                          right: 0,
                          height: 3,
                          backgroundColor: '#FFFFFF',
                          zIndex: 1,
                        }}
                      />

                      {/* Discount Pill */}
                      {hospital.discount_percentage > 0 && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 16,
                            zIndex: 3,
                          }}
                        >
                          <Tag size={11} color="#2563EB" />
                          <Text
                            style={{
                              color: '#1D4ED8',
                              fontSize: 10,
                              fontWeight: '800',
                            }}
                          >
                            {language === 'hi'
                              ? `${hospital.discount_percentage}% छूट (ओपीडी)`
                              : `${hospital.discount_percentage}% OFF OPD`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Card Body */}
                    <View
                      style={{
                        paddingHorizontal: 15,
                        paddingTop: 6,
                        paddingBottom: 15,
                        backgroundColor: '#FFFFFF',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: '#0F172A',
                          fontSize: 16,
                          lineHeight: 22,
                          fontWeight: '800',
                          letterSpacing: -0.3,
                        }}
                      >
                        {translateHospitalName(hospital.name, language === 'hi')}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={{
                          color: '#64748B',
                          fontSize: 11,
                          lineHeight: 16,
                          marginTop: 2,
                        }}
                      >
                        {translateAddress(hospital.address, language === 'hi')}
                      </Text>

                        {/* Specialties Chips Row (Flex-wrap so never overflows) */}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 10,
                          }}
                        >
                          {(hospital.specialties || []).slice(0, 2).map((spec, i) => (
                            <View
                              key={`${spec}-${i}`}
                              style={{
                                backgroundColor: '#F1F5F9',
                                borderColor: '#E2E8F0',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 3.5,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#334155',
                                  fontSize: 11,
                                  fontWeight: '700',
                                }}
                              >
                                {translateSpecialty(spec, language === 'hi')}
                              </Text>
                            </View>
                          ))}
                          {(hospital.specialties || []).length > 2 && (
                            <View
                              style={{
                                backgroundColor: '#F8FAFC',
                                borderColor: '#E2E8F0',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 7,
                                paddingVertical: 3.5,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#64748B',
                                  fontSize: 10.5,
                                  fontWeight: '700',
                                }}
                              >
                                +{(hospital.specialties || []).length - 2}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Hospital Details Row: Branches & Verified Doctor Count */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 10,
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: '#F1F5F9',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Building2 size={13} color="#2563EB" />
                            <Text style={{ color: '#1E293B', fontSize: 11.5, fontWeight: '700' }}>
                              {branches.length}{' '}
                              {language === 'hi'
                                ? (branches.length === 1 ? 'शाखा' : 'शाखाएं')
                                : (branches.length === 1 ? 'Branch' : 'Branches')}
                            </Text>
                          </View>
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <UserCheck size={13} color="#16A34A" />
                            <Text style={{ color: '#1E293B', fontSize: 11.5, fontWeight: '700' }}>
                              {totalDoctors}+ {language === 'hi' ? 'सत्यापित डॉक्टर' : 'Verified Doctors'}
                            </Text>
                          </View>
                        </View>

                        {/* ONE Clear Action Button */}
                        <TouchableOpacity
                          onPress={() => handleSelectHospital(hospital)}
                          activeOpacity={0.85}
                          style={{
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: '#2563EB',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                            marginTop: 12,
                            shadowColor: '#2563EB',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.18,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: '800',
                            }}
                          >
                            {language === 'hi' ? 'डॉक्टर देखें' : 'Explore Doctors'}
                          </Text>
                          <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* TAB 2: DOCTORS LIST */}
        {hasVisitedDoctors && (
          <View style={{ display: activeTab === 'doctors' ? 'flex' : 'none', paddingHorizontal: 16, paddingTop: 16 }}>
            {(isLoading || screenLoading) ? (
              <View>
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
              </View>
            ) : filteredDoctors.length === 0 ? (
              <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                <UserCheck size={36} color="#94A3B8" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B', marginTop: 8 }}>
                  {language === 'hi' ? 'कोई डॉक्टर नहीं मिले' : 'No doctors found'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  {language === 'hi' ? 'कृपया अपनी विशेषता या खोज बदलें।' : 'Please change your specialty or search filter.'}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSpecialty('All')}
                  style={{ marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {language === 'hi' ? 'सभी डॉक्टर देखें' : 'Show All Doctors'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 1. TOP DOCTORS SPOTLIGHT (The Royal Blue Cards from Image 1) */}
                {showTopDoctors && topDoctors.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
                        {language === 'hi' ? 'शीर्ष डॉक्टर' : 'Top Doctors'}
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
                        const avatar = getDoctorAvatar(doc);
                        const docSlots = getDoctorSlots(doc, language === 'hi');

                        return (
                          <View
                            key={`top-${doc.id}`}
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
                                {/* Doctor Portrait with verified check badge (Balanced 3:4 aspect ratio) */}
                                <View style={{ width: 90, position: 'relative' }}>
                                  <Image
                                    source={avatar}
                                    style={{
                                      width: 90,
                                      height: 118,
                                      borderRadius: 16,
                                      backgroundColor: '#DBEAFE',
                                    }}
                                    resizeMode="cover"
                                  />
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

                                {/* Doctor Info, Frosted Credentials Box */}
                                <View style={{ flex: 1, paddingLeft: 12, justifyContent: 'space-between' }}>
                                  <View>
                                    {/* Name & Favorite Button */}
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
                                          numberOfLines={2}
                                        >
                                          {translateDoctorName(doc.name, language === 'hi')}
                                        </Text>
                                        <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                                          {translateSpecialty(doc.specialty, language === 'hi')}
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

                                    {/* Star Rating */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                      <Star size={11} color="#FBBF24" fill="#FBBF24" />
                                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                                        {doc.rating} ({doc.total_reviews} {language === 'hi' ? 'समीक्षाएं' : 'reviews'})
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
                                        {translateQualification(doc.qualification, language === 'hi')}
                                      </Text>
                                      <Text
                                        numberOfLines={1}
                                        style={{ color: '#DBEAFE', fontSize: 10, fontWeight: '700', marginTop: 1.5 }}
                                      >
                                        {doc.experience_years} {language === 'hi' ? 'वर्ष अनुभव' : 'yrs experience'}
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
                                {/* Concierge Helpline Call Button */}
                                <TouchableOpacity
                                  onPress={() => Linking.openURL('tel:+9118008902424').catch(() => { })}
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
                                  <Phone size={16} color="#2563EB" strokeWidth={2.5} />
                                </TouchableOpacity>

                                {/* Obvious Book Appointment Pill Button */}
                                <TouchableOpacity
                                  onPress={() => handleInitiateDoctorBooking(doc, undefined, doc.hospitalName)}
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
                                  <Text style={{ color: '#1E40AF', fontSize: 12.5, fontWeight: '900' }}>
                                    {language === 'hi' ? 'अपॉइंटमेंट लें' : 'Book Appointment'} · ₹{doc.discounted_fee}
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

                {/* 2. ALL SPECIALISTS SECTION HEADING */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#182F3B', letterSpacing: -0.3 }}>
                    {selectedSpecialty === 'All'
                      ? (language === 'hi' ? 'उपलब्ध विशेषज्ञ' : 'Available Specialists')
                      : (language === 'hi' ? `${translateSpecialty(selectedSpecialty, true)} विशेषज्ञ` : `${selectedSpecialty} Specialists`)}
                  </Text>
                  <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.6)' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                      {regularDoctors.length} {language === 'hi' ? 'डॉक्टर' : (regularDoctors.length === 1 ? 'Doctor' : 'Doctors')}
                    </Text>
                  </View>
                </View>

                {/* 3. REGULAR DOCTORS LIST (NO DUPLICATION) */}
                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    flexWrap: isTablet ? 'wrap' : 'nowrap',
                    gap: isTablet ? cardGap : 0,
                    justifyContent: 'space-between',
                  }}
                >
                  {regularDoctors.map((doc) => {
                    const isFav = !!favorites[doc.id];
                    const avatar = getDoctorAvatar(doc);
                    const docSlots = getDoctorSlots(doc, language === 'hi');

                    return (
                      <View
                        key={`${doc.id}-${doc.hospitalId}`}
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
                        {/* Doctor Profile Info Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                          <View style={{ position: 'relative' }}>
                            <Image
                              source={avatar}
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
                                {translateDoctorName(doc.name, language === 'hi')}
                              </Text>

                              <TouchableOpacity
                                onPress={() => toggleFavorite(doc.id)}
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

                            {/* Hospital & Branch with distance - 2 lines so NEVER truncated with ... */}
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: '#64748B',
                                marginTop: 2,
                              }}
                              numberOfLines={2}
                            >
                              {translateHospitalName(doc.hospitalName, language === 'hi')}
                              {doc.branchName ? ` • ${translateBranchName(doc.branchName, language === 'hi')}` : ''} ({doc.distanceKm} {language === 'hi' ? 'किमी' : 'km'})
                            </Text>

                            {/* Specialty & Experience Line */}
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: '#2563EB',
                                marginTop: 2,
                              }}
                            >
                              {translateSpecialty(doc.specialty, language === 'hi')} • {doc.experience_years} {language === 'hi' ? 'वर्ष अनुभव' : 'yrs exp'}
                            </Text>

                            {/* Single Qualification Line */}
                            <Text
                              style={{
                                fontSize: 11,
                                color: '#64748B',
                                fontWeight: '500',
                                marginTop: 2,
                              }}
                              numberOfLines={2}
                            >
                              {translateQualification(doc.qualification, language === 'hi')}
                            </Text>

                            {/* Star Rating Line */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Star size={11} color="#D97706" fill="#D97706" />
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#1E293B' }}>
                                {doc.rating}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>
                                ({doc.total_reviews} {language === 'hi' ? 'समीक्षा' : 'reviews'})
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
                                ₹{doc.consultation_fee}
                              </Text>
                              {' · '}
                              <Text style={{ color: '#16A34A', fontWeight: '900', fontSize: 14 }}>
                                {language === 'hi'
                                  ? `ऐप में ₹${doc.discounted_fee}`
                                  : `Pay in app ₹${doc.discounted_fee}`}
                              </Text>
                            </Text>
                            {doc.hospitalDiscount > 0 ? (
                              <Text style={{ fontSize: 10.5, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                                {language === 'hi'
                                  ? `${doc.hospitalDiscount}% छूट • इन-ऐप दर`
                                  : `Save ${doc.hospitalDiscount}% with in-app pay`}
                              </Text>
                            ) : null}
                          </View>

                          <TouchableOpacity
                            onPress={() => handleInitiateDoctorBooking(doc, undefined, doc.hospitalName)}
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
        )}
      </ScrollView>

      {/* Solid Floating Bottom Bar when slot is chosen (Floats right above bottom nav) */}
      {selectedSlotDoctor && (
        <View
          style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 12) + 62,
            left: 14,
            right: 14,
            backgroundColor: '#FFFFFF', // 100% Solid background, no see-through text
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: '#E2E8F0',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 12,
            elevation: 12,
            zIndex: 40,
          }}
        >
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                {selectedSlotDoctor.slot}
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>•</Text>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#16A34A' }}>
                ₹{selectedSlotDoctor.doctor.discounted_fee}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
              {translateDoctorName(selectedSlotDoctor.doctor.name, language === 'hi')} · {translateHospitalName(selectedSlotDoctor.hospitalName, language === 'hi')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedSlotDoctor(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleInitiateDoctorBooking(
                  selectedSlotDoctor.doctor,
                  selectedSlotDoctor.slot,
                  selectedSlotDoctor.hospitalName
                )
              }
              activeOpacity={0.88}
              style={{
                backgroundColor: '#2563EB',
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                {language === 'hi' ? 'बुक करें' : 'Book'}
              </Text>
              <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Booking Confirmation Modal */}
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
                  ? (language === 'hi' ? 'स्लॉट अनुरोध प्राप्त हुआ!' : 'OPD Slot Requested!')
                  : (language === 'hi' ? 'ओपीडी स्लॉट बुकिंग' : 'Confirm OPD Slot')}
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
                  {language === 'hi' ? 'ओपीडी स्लॉट सुरक्षित!' : 'OPD Slot Reserved!'}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>
                  {language === 'hi' ? 'संदर्भ संख्या:' : 'Reference:'} {confirmedBooking.booking_ref}
                </Text>
                <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 18 }}>
                  {language === 'hi'
                    ? `${confirmedBooking.doctor_name ? translateDoctorName(confirmedBooking.doctor_name, true) : 'डॉक्टर'} के साथ ${confirmedBooking.slot_time || 'आज'} का स्लॉट सुरक्षित किया जा रहा है। हमारे कंसीयर्ज समन्वयक एक्सोटेल द्वारा आपसे संपर्क करेंगे।`
                    : `Your consult with ${confirmedBooking.doctor_name} for ${confirmedBooking.slot_time || 'Today'} is reserved. Our concierge desk is contacting you via Exotel masked telephony.`}
                </Text>

                <View style={{ width: '100%', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#182F3B', textTransform: 'uppercase' }}>
                    {language === 'hi' ? 'वर्चुअल टेलीफोनी रूट' : 'Virtual Telephony Route'}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', color: '#1E293B', marginTop: 2 }}>
                    +91 11 4000 8800 ➔ {user?.phone || '+91 99999 99999'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600', marginTop: 4 }}>
                    {language === 'hi'
                      ? '✓ आपका व्यक्तिगत नंबर 100% गोपनीय रहता है।'
                      : '✓ Your personal number remains 100% confidential.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  style={{ width: '100%', backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                    {language === 'hi' ? 'पूर्ण' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : bookingTargetDoctor ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}>
                  {translateDoctorName(bookingTargetDoctor.doctor.name, language === 'hi')}
                </Text>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                  {translateSpecialty(bookingTargetDoctor.doctor.specialty, language === 'hi')} • {translateHospitalName(bookingTargetDoctor.hospitalName, language === 'hi')}
                </Text>
                {bookingTargetDoctor.doctor.qualification && (
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                    {translateQualification(bookingTargetDoctor.doctor.qualification, language === 'hi')}
                  </Text>
                )}

                {/* Doctor's OPD Consultation Timings / Schedule */}
                {bookingTargetDoctor.doctor.opd_timing && (
                  <View style={{ backgroundColor: 'rgba(239, 246, 255, 0.8)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(191, 219, 254, 0.7)', marginTop: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Clock size={16} color="#2563EB" strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {language === 'hi' ? 'डॉक्टर का ओपीडी समय (शेड्यूल):' : 'Doctor OPD Schedule:'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>
                        {translateTiming(bookingTargetDoctor.doctor.opd_timing, language === 'hi')}
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
                        {selectedModalSlot || bookingTargetDoctor.slot}
                      </Text>
                    </View>
                  </View>

                  {/* Interactive slot chips */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {getDoctorSlots(bookingTargetDoctor.doctor, language === 'hi').map((slot) => {
                      const isSelected = (selectedModalSlot || bookingTargetDoctor.slot) === slot;
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
                        ₹{bookingTargetDoctor.doctor.consultation_fee}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A' }}>
                        ₹{bookingTargetDoctor.doctor.discounted_fee}
                      </Text>
                    </View>
                  </View>
                </View>

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
                  onPress={handleConfirmBooking}
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
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Profile & Language Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
