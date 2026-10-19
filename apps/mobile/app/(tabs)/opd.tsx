import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Star,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  X,
  Compass,
  Search,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Tag,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNearbyHospitals, getSupabaseClient } from '@adityam/supabase';
import type { Hospital, HospitalBranch, Booking } from '@adityam/types';
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
import {
  translateHospitalName,
  translateBranchName,
  translateAddress,
  translateSpecialty,
} from '../../src/utils/hindiDictionary';

interface SpecialtyCategory {
  id: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  accentColor: string;
}

export default function OpdConciergeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);

  // Track which hospital branch carousels are expanded (default all hidden)
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  const toggleBranches = (hospitalId: string) => {
    setExpandedBranches((prev) => ({
      ...prev,
      [hospitalId]: !prev[hospitalId],
    }));
  };

  // Booking Modal state for General Desk inquiries
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Categories list matching reference design
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
  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ['nearby-hospitals', selectedSpecialty],
    queryFn: () =>
      fetchNearbyHospitals(
        28.5355,
        77.2000,
        selectedSpecialty === 'All' ? undefined : selectedSpecialty
      ),
  });

  // Filter hospitals via search query
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return hospitals;
    const q = searchQuery.toLowerCase().trim();
    return hospitals.filter((h) => {
      const nameMatch = h.name.toLowerCase().includes(q);
      const addressMatch = h.address.toLowerCase().includes(q);
      const cityMatch = h.city.toLowerCase().includes(q);
      const specialtyMatch = h.specialties.some((s) => s.toLowerCase().includes(q));
      const facilitiesMatch = h.facilities.some((f) => f.toLowerCase().includes(q));
      const branchMatch = h.branches?.some(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.area.toLowerCase().includes(q) ||
          b.doctors.some(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.specialty.toLowerCase().includes(q)
          )
      );
      return nameMatch || addressMatch || cityMatch || specialtyMatch || facilitiesMatch || branchMatch;
    });
  }, [hospitals, searchQuery]);

  // Navigate to dedicated Branch Doctors Screen
  const handleSelectBranch = (hospital: Hospital, branch: HospitalBranch) => {
    router.push({
      pathname: '/branch-doctors',
      params: {
        hospitalId: hospital.id,
        branchId: branch.id,
        specialty: selectedSpecialty,
      },
    });
  };

  const handleInitiateGeneralBooking = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmExotelBooking = async () => {
    if (!selectedHospital) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id,
      patient_name: user?.full_name || 'Dr. Vikram Malhotra',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_id: selectedHospital.id,
      hospital_name: selectedHospital.name,
      specialty_requested: selectedSpecialty === 'All' ? 'General OPD Consult' : selectedSpecialty,
      status: 'NEW',
      call_status: 'pending',
      notes: `Requested priority OPD slot at ${selectedHospital.name}. Patient phone masked for Exotel agent dispatch.`,
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
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 85,
        }}
      >
        {/* Consistent Standard Header & Search Bar */}
        <AppHeader
          title={language === 'hi' ? 'विशेषज्ञ डॉक्टर' : 'Doctor Consults'}
          onPressProfile={() => setProfileVisible(true)}
          style={{ backgroundColor: '#F8FAFC' }}
        >
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={t.searchDoctorPlaceholder || 'Search doctor, specialty, hospital...'}
          />
        </AppHeader>

        {/* Categories Capsule Pills Section (Image 3 Inspiration) */}
        <View className="pt-4 px-5">
          <View className="flex-row items-center justify-between mb-2.5 px-0.5">
            <Text className="text-base font-black text-[#182F3B] tracking-tight">
              {t.categoriesTitle}
            </Text>
            {selectedSpecialty !== 'All' && (
              <TouchableOpacity
                onPress={() => setSelectedSpecialty('All')}
                className="flex-row items-center space-x-1"
              >
                <Text className="text-xs font-bold text-[#2563EB]">
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

        {/* Hospital Cards Section with Luxury Image Curve & Horizontal Branch Scroll */}
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-lg font-bold text-[#182F3B] tracking-tight">
                {t.hospitalNetworksTitle}
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                {language === 'hi'
                  ? `${filteredHospitals.length} अस्पताल नेटवर्क उपलब्ध`
                  : `${filteredHospitals.length} ${filteredHospitals.length === 1 ? 'Hospital Network' : 'Hospital Networks'} available`}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="text-xs text-slate-500 font-medium mt-3">
                {t.loadingSpecialists}
              </Text>
            </View>
          ) : filteredHospitals.length === 0 ? (
            <View className="py-16 items-center px-6">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Building2 size={28} color="#94A3B8" />
              </View>
              <Text className="text-base font-bold text-[#182F3B]">
                {t.noHospitalsFound}
              </Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                {t.noHospitalsSub}
              </Text>
            </View>
          ) : (
            filteredHospitals.map((hospital) => {
              const branches = hospital.branches || [];
              const totalDoctors = branches.reduce(
                (sum, b) => sum + (b.doctors?.length || 0),
                0
              );
              const isBranchesOpen = !!expandedBranches[hospital.id];

              return (
                <View
                  key={hospital.id}
                  className="bg-white mb-4 overflow-hidden"
                  style={{
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
                  {/* 1. Compact Photo Header */}
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

                    {/* Optional Partner Privilege label */}
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

                    {/* Organic Curved wave transition */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 28,
                      }}
                    >
                      <Svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 360 39"
                        preserveAspectRatio="none"
                      >
                        <Path
                          d="M0 14 C48 39 95 34 150 20 C205 5 242 35 292 27 C324 23 342 5 360 9 L360 39 L0 39 Z"
                          fill="#FFFFFF"
                        />
                      </Svg>
                    </View>

                    {/* Royal Blue Discount Pill on wave */}
                    {hospital.discount_percentage > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 5,
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

                  {/* 2. Compact Card Body */}
                  <View style={{ paddingHorizontal: 15, paddingTop: 4, paddingBottom: 13 }}>
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

                    {/* 3. Sleek Single-Line Tags & Stats */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 9,
                      }}
                    >
                      {/* Left: Top 2 Specialties */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {(hospital.specialties || []).slice(0, 2).map((spec, i) => (
                          <View
                            key={`${spec}-${i}`}
                            style={{
                              backgroundColor: '#F1F5F9',
                              borderColor: '#E2E8F0',
                              borderWidth: 1,
                              borderRadius: 7,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                            }}
                          >
                            <Text
                              style={{
                                color: '#334155',
                                fontSize: 10,
                                fontWeight: '700',
                              }}
                            >
                              {translateSpecialty(spec, language === 'hi')}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Right: Quick Unit/Doctor Counter */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Building2 size={13} color="#2563EB" />
                          <Text style={{ color: '#1E293B', fontSize: 11, fontWeight: '700' }}>
                            {branches.length}{' '}
                            {language === 'hi'
                              ? 'शाखाएं'
                              : branches.length === 1
                              ? 'Branch'
                              : 'Branches'}
                          </Text>
                        </View>
                        <Text style={{ color: '#CBD5E1' }}>•</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <UserCheck size={13} color="#16A34A" />
                          <Text style={{ color: '#1E293B', fontSize: 11, fontWeight: '700' }}>
                            {totalDoctors}+ {language === 'hi' ? 'डॉक्टर' : 'Dr.'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* 4. Action Buttons in Royal Medical Blue */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 11,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleInitiateGeneralBooking(hospital)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Call hospital general desk"
                        style={{
                          flex: 0.9,
                          height: 38,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <PhoneCall size={14} color="#2563EB" />
                        <Text
                          style={{
                            color: '#1E293B',
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          {language === 'hi' ? 'कॉल करें' : 'Call Hospital'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => toggleBranches(hospital.id)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Explore hospital branches and doctors"
                        accessibilityState={{ expanded: isBranchesOpen }}
                        style={{
                          flex: 1.25,
                          height: 38,
                          borderRadius: 11,
                          backgroundColor: '#2563EB',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          paddingHorizontal: 10,
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
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                          numberOfLines={1}
                        >
                          {language === 'hi'
                            ? (isBranchesOpen ? 'शाखाएं छिपाएं' : 'अस्पताल व डॉक्टर')
                            : (isBranchesOpen ? 'Hide Branches' : 'Explore Hospital')}
                        </Text>

                        {isBranchesOpen ? (
                          <ChevronUp size={14} color="#FFFFFF" />
                        ) : (
                          <ChevronDown size={14} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* 5. Expandable Branch Cards in Royal Medical Blue Theme */}
                    {isBranchesOpen && (
                      <View
                        style={{
                          marginTop: 11,
                          paddingTop: 11,
                          borderTopWidth: 1,
                          borderTopColor: '#F1F5F9',
                        }}
                      >
                        <Text
                          style={{
                            color: '#0F172A',
                            fontSize: 12,
                            fontWeight: '800',
                            marginBottom: 8,
                          }}
                        >
                          {language === 'hi' ? `अस्पताल शाखाएं (${branches.length})` : `Hospital Branches (${branches.length})`}
                        </Text>

                        {branches.length === 0 ? (
                          <Text style={{ color: '#64748B', fontSize: 11 }}>
                            {language === 'hi' ? 'कोई शाखा उपलब्ध नहीं है।' : 'No branches available.'}
                          </Text>
                        ) : (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 4 }}
                          >
                            {branches.map((branch) => (
                              <TouchableOpacity
                                key={branch.id}
                                onPress={() => handleSelectBranch(hospital, branch)}
                                activeOpacity={0.82}
                                style={{
                                  width: 210,
                                  marginRight: 10,
                                  padding: 11,
                                  borderRadius: 13,
                                  backgroundColor: '#F8FAFC',
                                  borderWidth: 1,
                                  borderColor: '#E2E8F0',
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      flex: 1,
                                      marginRight: 4,
                                      color: '#0F172A',
                                      fontSize: 12,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {translateBranchName(branch.name, language === 'hi')}
                                  </Text>

                                  {branch.is_main_branch && (
                                    <View
                                      style={{
                                        backgroundColor: '#EFF6FF',
                                        borderRadius: 5,
                                        paddingHorizontal: 5,
                                        paddingVertical: 2,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: '#2563EB',
                                          fontSize: 8,
                                          fontWeight: '800',
                                        }}
                                      >
                                        {language === 'hi' ? 'मुख्य' : 'MAIN'}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                <Text
                                  numberOfLines={1}
                                  style={{
                                    color: '#64748B',
                                    fontSize: 10,
                                    marginTop: 4,
                                  }}
                                >
                                  {translateAddress(branch.area, language === 'hi')}
                                  {branch.distance_km != null
                                    ? ` · ${branch.distance_km} ${language === 'hi' ? 'किमी' : 'km'}`
                                    : ''}
                                </Text>

                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: 8,
                                  }}
                                >
                                  <UserCheck size={12} color="#16A34A" />
                                  <Text
                                    style={{
                                      color: '#15803D',
                                      fontSize: 10,
                                      fontWeight: '700',
                                      marginLeft: 4,
                                    }}
                                  >
                                    {language === 'hi'
                                      ? `${branch.doctors?.length || 0} सत्यापित डॉक्टर`
                                      : `${branch.doctors?.length || 0} Verified Doctors`}
                                  </Text>
                                </View>

                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#EFF6FF',
                                    borderRadius: 8,
                                    paddingVertical: 6,
                                    marginTop: 9,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: '#2563EB',
                                      fontSize: 11,
                                      fontWeight: '800',
                                    }}
                                  >
                                    {language === 'hi' ? 'डॉक्टर देखें' : 'View Doctors'}
                                  </Text>
                                  <ChevronRight
                                    size={13}
                                    color="#2563EB"
                                    style={{ marginLeft: 3 }}
                                  />
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* General Desk Exotel Masked Call Booking Modal */}
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
                  ? (language === 'hi' ? 'अनुरोध सफलतापूर्वक भेजा गया!' : 'Request Dispatched!')
                  : (language === 'hi' ? 'प्राथमिकता ओपीडी जनरल डेस्क' : 'Priority OPD General Desk')}
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
                  {language === 'hi' ? 'कॉल कनेक्ट की जा रही है' : 'Concierge Call Dispatched'}
                </Text>
                <Text className="text-xs font-mono font-bold text-[#3B82F6] mt-1">
                  {language === 'hi' ? 'संदर्भ संख्या:' : 'Reference:'} {confirmedBooking.booking_ref}
                </Text>
                <Text className="text-xs text-slate-600 text-center mt-3 px-4 leading-relaxed">
                  {language === 'hi'
                    ? `${translateHospitalName(confirmedBooking.hospital_name || '', true)} में हमारे अस्पताल डेस्क समन्वयक को आपका अनुरोध प्राप्त हो गया है और वे एक्सोटेल टेलीफोनी द्वारा आपसे संपर्क कर रहे हैं!`
                    : `Our hospital desk coordinator at ${confirmedBooking.hospital_name} has received your request and is connecting you via Exotel masked telephony!`}
                </Text>

                <View className="w-full bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 mt-5">
                  <Text className="text-[11px] font-bold text-[#182F3B] uppercase">
                    {language === 'hi' ? 'वर्चुअल टेलीफोनी रूट' : 'Virtual Telephony Route'}
                  </Text>
                  <Text className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                    +91 11 4000 8800 ➔ {user?.phone || '+91 99999 99999'}
                  </Text>
                  <Text className="text-[10px] text-[#3B82F6] font-semibold mt-1">
                    {language === 'hi'
                      ? '✓ आपका व्यक्तिगत नंबर 100% गोपनीय रहता है।'
                      : '✓ Your personal number remains 100% confidential.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  className="w-full bg-[#3B82F6] py-3.5 rounded-xl items-center mt-5 shadow-sm shadow-blue-500/30"
                >
                  <Text className="text-white font-bold text-xs">
                    {language === 'hi' ? 'पूर्ण' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="py-4">
                <Text className="text-sm font-bold text-[#182F3B]">
                  {translateHospitalName(selectedHospital?.name || '', language === 'hi')}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {translateAddress(selectedHospital?.address || '', language === 'hi')}
                </Text>

                <View className="bg-[#FFF9F0] p-3.5 rounded-xl border border-[#CF8A40]/30 my-4">
                  <Text className="text-xs font-bold text-[#182F3B]">
                    {language === 'hi' ? 'मरीज की जानकारी:' : 'Patient Information:'}
                  </Text>
                  <Text className="text-xs text-slate-700 mt-1">
                    {language === 'hi' ? 'नाम: ' : 'Name: '}<Text className="font-bold">{user?.full_name || 'Dr. Vikram Malhotra'}</Text>
                  </Text>
                  <Text className="text-xs text-slate-700">
                    {language === 'hi' ? 'फ़ोन: ' : 'Phone: '}<Text className="font-bold">{user?.phone || '+91 99999 99999'}</Text>
                  </Text>
                  <Text className="text-xs text-slate-700">
                    {language === 'hi' ? 'विशेषज्ञता: ' : 'Specialty: '}<Text className="font-bold text-[#3B82F6]">{translateSpecialty(selectedSpecialty, language === 'hi')}</Text>
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
                      : (language === 'hi' ? 'पुष्टि करें और जनरल डेस्क को कॉल करें' : 'Confirm & Call General Desk')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile & Language Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
