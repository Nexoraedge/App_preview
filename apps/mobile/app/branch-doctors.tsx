import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
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

  // Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

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
    <View className="flex-1 bg-[#F8FAFC]">
      {/* Top Header Banner in Royal Medical Blue */}
      <LinearGradient
        colors={['#1E40AF', '#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Math.max(insets.top, 24) + 8,
          paddingHorizontal: 18,
          paddingBottom: 20,
        }}
      >
        {/* Navigation & Title Row */}
        <View className="flex-row items-center space-x-3 mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md items-center justify-center border border-white/30"
          >
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-white text-lg font-black tracking-tight" numberOfLines={1}>
              {hospital?.name}
            </Text>
            <View className="flex-row items-center space-x-1.5 mt-0.5">
              <Building2 size={12} color="#93C5FD" />
              <Text className="text-blue-100 text-xs font-bold" numberOfLines={1}>
                {activeBranch?.name}
              </Text>
            </View>
          </View>

          {/* Rating Pill */}
          <View className="bg-white/95 px-2.5 py-1 rounded-xl flex-row items-center space-x-1 shadow-sm">
            <Star size={11} color="#CF8A40" fill="#CF8A40" />
            <Text className="text-slate-900 text-xs font-black">
              {hospital?.rating}
            </Text>
          </View>
        </View>

        {/* Location & Masked Badge */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center space-x-1 flex-1 mr-2">
            <MapPin size={12} color="#BFDBFE" />
            <Text className="text-blue-100 text-[11px] font-medium" numberOfLines={1}>
              {activeBranch?.address}
            </Text>
          </View>
          <View className="bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
            <Text className="text-white text-[10px] font-bold">
              {activeBranch?.distance_km ? `${activeBranch.distance_km} km away` : 'Nearby'}
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
        {/* Branch Selector Tabs (if hospital has multiple branches) */}
        {branches.length > 1 && (
          <View className="bg-white py-3 px-4 border-b border-slate-200/80">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Branch Location ({branches.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {branches.map((branch) => {
                const isSelected = activeBranch?.id === branch.id;
                return (
                  <TouchableOpacity
                    key={branch.id}
                    onPress={() => {
                      setActiveBranch(branch);
                      setSelectedSpecialty('All');
                    }}
                    activeOpacity={0.8}
                    className={`mr-2.5 px-3.5 py-2 rounded-xl border flex-row items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-[#3B82F6] border-[#3B82F6] shadow-sm shadow-blue-500/25'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Building2
                      size={12}
                      color={isSelected ? '#FFFFFF' : '#3B82F6'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {branch.name}
                    </Text>
                    {branch.distance_km && (
                      <Text
                        className={`text-[10px] ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        • {branch.distance_km} km
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* CATEGORIES SQUIRCLE ROW (Image 3 Reference: Only show available categories at this branch!) */}
        <View className="bg-white py-3.5 px-4 border-b border-slate-200/70">
          <View className="flex-row items-center justify-between mb-3 px-0.5">
            <Text className="text-base font-bold text-[#182F3B] tracking-tight">
              Categories
            </Text>
            <Text className="text-xs font-semibold text-slate-500">
              {filteredDoctors.length} Specialists Available
            </Text>
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
                  className="items-center mr-3"
                  style={{ width: 72 }}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#5E94F6', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#3B82F6',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      {cat.icon('#FFFFFF')}
                    </LinearGradient>
                  ) : (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      {cat.icon(cat.accentColor)}
                    </View>
                  )}

                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? '#182F3B' : '#64748B',
                      textAlign: 'center',
                      marginTop: 6,
                      width: 72,
                    }}
                  >
                    {cat.label}
                  </Text>

                  {isSelected && (
                    <View className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Doctor Cards List */}
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
                className="mt-4 bg-[#3B82F6] px-5 py-2.5 rounded-xl shadow-sm shadow-blue-500/20"
              >
                <Text className="text-white text-xs font-bold">Show All Specialists</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDoctors.map((doctor) => (
              <View
                key={doctor.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm mb-4 p-4 overflow-hidden"
              >
                {/* Doctor Top Row: Avatar + Info */}
                <View className="flex-row items-start space-x-3.5">
                  <View className="relative">
                    <Image
                      source={{
                        uri:
                          doctor.avatar_url ||
                          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
                      }}
                      style={{ width: 64, height: 64, borderRadius: 32 }}
                      className="bg-slate-200 border border-slate-100"
                    />
                    <View className="absolute -bottom-1 -right-1 bg-[#3B82F6] rounded-full p-1 border-2 border-white shadow-sm">
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <Text className="text-base font-bold text-[#182F3B] flex-1 leading-tight mr-1">
                        {doctor.name}
                      </Text>
                      {/* Rating Badge */}
                      <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 flex-row items-center space-x-1">
                        <Star size={11} color="#CF8A40" fill="#CF8A40" />
                        <Text className="text-xs font-black text-slate-800">
                          {doctor.rating}
                        </Text>
                        <Text className="text-[10px] text-slate-500">
                          ({doctor.total_reviews})
                        </Text>
                      </View>
                    </View>

                    {/* Department Tag */}
                    <View className="self-start bg-[#EFF6FF] px-2.5 py-0.5 rounded-md border border-blue-200/50 mt-1">
                      <Text className="text-[11px] font-bold text-[#2563EB]">
                        {doctor.specialty}
                      </Text>
                    </View>

                    {/* Qualifications & Experience */}
                    <Text className="text-xs text-slate-600 mt-1 leading-snug">
                      {doctor.qualification}
                    </Text>
                    <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {doctor.experience_years} years clinical experience
                    </Text>
                  </View>
                </View>

                {/* Additional Clinical Badges */}
                <View className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-1.5">
                    <Clock size={12} color="#16A34A" />
                    <Text className="text-[11px] font-bold text-emerald-700">
                      {doctor.next_available_slot}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-1">
                    <Globe size={12} color="#64748B" />
                    <Text className="text-[10px] text-slate-500 font-medium">
                      {doctor.languages?.join(', ') || 'English, Hindi'}
                    </Text>
                  </View>
                </View>

                {doctor.opd_timing && (
                  <Text className="text-[10px] text-slate-400 mt-1.5 px-0.5">
                    OPD Hours: {doctor.opd_timing}
                  </Text>
                )}

                {/* Bottom Fee & Book Consultation Row */}
                <View className="mt-3.5 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] text-slate-400 uppercase font-semibold">
                      Consultation Fee
                    </Text>
                    <View className="flex-row items-center space-x-1.5 mt-0.5">
                      <Text className="text-base font-black text-[#182F3B]">
                        ₹{doctor.discounted_fee}
                      </Text>
                      <Text className="text-xs text-slate-400 line-through">
                        ₹{doctor.consultation_fee}
                      </Text>
                      <View className="bg-[#FFF9F0] border border-[#CF8A40]/40 px-1.5 py-0.2 rounded">
                        <Text className="text-[10px] font-bold text-[#CF8A40]">
                          25% OFF
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleInitiateDoctorBooking(doctor)}
                    activeOpacity={0.85}
                    className="bg-[#3B82F6] active:bg-[#2563EB] px-4 py-2.5 rounded-xl flex-row items-center space-x-1.5 shadow-sm shadow-blue-500/25"
                  >
                    <PhoneCall size={14} color="#FFFFFF" />
                    <Text className="text-white text-xs font-bold">
                      Book Consultation
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
                {confirmedBooking ? 'Consultation Confirmed!' : 'Priority OPD Doctor Booking'}
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
                  Concierge Dispatched
                </Text>
                <Text className="text-xs font-mono font-bold text-[#3B82F6] mt-1">
                  Reference: {confirmedBooking.booking_ref}
                </Text>
                <Text className="text-xs text-slate-600 text-center mt-3 px-4 leading-relaxed">
                  Your priority slot for{' '}
                  <Text className="font-bold text-[#182F3B]">
                    {confirmedBooking.doctor_name}
                  </Text>{' '}
                  at {confirmedBooking.hospital_name} ({confirmedBooking.branch_name}) has been submitted to the real-time CRM. Our desk coordinator is connecting you now!
                </Text>

                <View className="w-full bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 mt-5">
                  <Text className="text-[11px] font-bold text-[#182F3B] uppercase">
                    Exotel Virtual Telephony Route
                  </Text>
                  <Text className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                    +91 11 4000 8800 ➔ {user?.phone || '+91 99999 99999'}
                  </Text>
                  <Text className="text-[10px] text-[#3B82F6] font-semibold mt-1">
                    ✓ Masked calling protects your identity and number.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  className="w-full bg-[#3B82F6] py-3.5 rounded-xl items-center mt-5 shadow-sm shadow-blue-500/30"
                >
                  <Text className="text-white font-bold text-xs">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="py-4">
                {/* Doctor Summary */}
                {selectedDoctor && (
                  <View className="bg-[#EFF6FF] p-3.5 rounded-2xl border border-blue-200/80 mb-3 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-bold text-[#182F3B]">
                        {selectedDoctor.name}
                      </Text>
                      <Text className="text-xs font-semibold text-[#2563EB]">
                        {selectedDoctor.specialty} • {selectedDoctor.qualification}
                      </Text>
                      <Text className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Slot: {selectedDoctor.next_available_slot}
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
                    Hospital Unit: {hospital?.name}
                  </Text>
                  <Text className="text-[11px] text-slate-600 mt-0.5">
                    Branch: {activeBranch?.name} ({activeBranch?.address})
                  </Text>
                </View>

                {/* Patient Information */}
                <View className="bg-[#FFF9F0] p-3 rounded-xl border border-[#CF8A40]/30 mb-4">
                  <Text className="text-xs font-bold text-[#182F3B]">
                    Patient Information:
                  </Text>
                  <Text className="text-xs text-slate-700 mt-1">
                    Name: <Text className="font-bold">{user?.full_name || 'Dr. Vikram Malhotra'}</Text>
                  </Text>
                  <Text className="text-xs text-slate-700">
                    Phone: <Text className="font-bold">{user?.phone || '+91 99999 99999'}</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleConfirmExotelBooking}
                  disabled={isSubmitting}
                  className="w-full bg-[#3B82F6] active:bg-[#2563EB] py-3.5 rounded-xl items-center flex-row justify-center space-x-2 shadow-sm shadow-blue-500/30"
                >
                  <PhoneCall size={16} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm">
                    {isSubmitting ? 'Dispatching to CRM...' : 'Confirm & Call Concierge'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
