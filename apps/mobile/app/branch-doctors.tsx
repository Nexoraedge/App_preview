import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
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
  Stethoscope,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Hospital, HospitalBranch, Doctor, Booking } from '@adityam/types';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useLocation } from '../src/context/LocationContext';
import { calculateDistanceKm } from '../src/lib/supabase';
import { BookingSlotModal } from '../components/opd/BookingSlotModal';
import { saveNewBooking } from '../src/services/bookingStorage';
import { triggerBrowserNotification } from '../src/services/notificationService';
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
import { getDoctorAvatar } from '../src/utils/doctorAvatars';

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
  const { activeAddress } = useLocation();
  const { t, language } = useLanguage();
  const isHi = language === 'hi';
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cardGap = 16;
  const tabletCardWidth = (width - 40 - cardGap) / 2;
  const params = useLocalSearchParams<{
    hospitalId?: string;
    branchId?: string;
    specialty?: string;
  }>();

  // Live Hospital, Branches & Doctors from Supabase (no mock/seed fallback)
  const [hospital, setHospital] = useState<Hospital | undefined>(undefined);
  const [isLoadingHospital, setIsLoadingHospital] = useState(true);
  const [activeBranch, setActiveBranch] = useState<HospitalBranch | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const loadLiveHospital = async () => {
      if (!params.hospitalId) {
        if (active) {
          setHospital(undefined);
          setActiveBranch(undefined);
          setIsLoadingHospital(false);
        }
        return;
      }
      setIsLoadingHospital(true);
      try {
        const supabase = getSupabaseClient();
        const [hospRes, branchRes, docsRes] = await Promise.all([
          supabase.from('hospitals').select('*').eq('id', params.hospitalId).maybeSingle(),
          supabase
            .from('hospital_branches')
            .select('*')
            .eq('hospital_id', params.hospitalId)
            .order('is_main_branch', { ascending: false }),
          supabase
            .from('doctors')
            .select('*')
            .eq('hospital_id', params.hospitalId)
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ]);

        if (!active) return;
        const h = hospRes.data as (Hospital & { is_active?: boolean }) | null;
        if (!h || h.is_active === false) {
          setHospital(undefined);
          setActiveBranch(undefined);
          return;
        }

        const rawBranches = ((branchRes.data || []) as (HospitalBranch & { is_active?: boolean })[]).filter(
          (br) => br.is_active !== false
        );
        const rawDocs = (docsRes.data || []) as Doctor[];
        const fallbackBranchId = rawBranches[0]?.id;

        const hLat = Number((h as any).latitude);
        const hLng = Number((h as any).longitude);
        const hasUserCoords = Boolean(activeAddress?.latitude && activeAddress?.longitude);

        const hydratedBranches: HospitalBranch[] = await Promise.all(
          rawBranches.map(async (br) => {
            let brLat = Number(br.latitude);
            let brLng = Number(br.longitude);
            const sameAsMain =
              !br.is_main_branch &&
              Number.isFinite(hLat) &&
              Number.isFinite(hLng) &&
              Math.abs(brLat - hLat) < 0.0001 &&
              Math.abs(brLng - hLng) < 0.0001 &&
              Boolean(br.address) &&
              br.address !== h.address;

            if (!Number.isFinite(brLat) || !Number.isFinite(brLng) || brLat === 0 || brLng === 0 || sameAsMain) {
              if (br.is_main_branch && Number.isFinite(hLat) && Number.isFinite(hLng) && hLat !== 0) {
                brLat = hLat;
                brLng = hLng;
              } else {
                try {
                  const q = [br.area, br.city || h.city || 'Jaipur', 'India'].filter(Boolean).join(', ');
                  const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
                  );
                  const geoData = await geoRes.json();
                  if (Array.isArray(geoData) && geoData[0]?.lat && geoData[0]?.lon) {
                    brLat = Number(geoData[0].lat);
                    brLng = Number(geoData[0].lon);
                  }
                } catch {}
              }
            }

            const hasBrCoords = Number.isFinite(brLat) && Number.isFinite(brLng) && brLat !== 0 && brLng !== 0;
            const computedDist =
              hasUserCoords && hasBrCoords
                ? Number(calculateDistanceKm(activeAddress!.latitude!, activeAddress!.longitude!, brLat, brLng).toFixed(1))
                : Number(br.distance_km ?? 0);
            return {
              ...br,
              latitude: hasBrCoords ? brLat : br.latitude,
              longitude: hasBrCoords ? brLng : br.longitude,
              distance_km: computedDist,
              doctors: rawDocs.filter((d) => (d.branch_id || fallbackBranchId) === br.id),
            };
          })
        );
        hydratedBranches.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

        const hydratedHospital: Hospital = {
          ...h,
          branches: hydratedBranches,
        };
        setHospital(hydratedHospital);
        const picked =
          hydratedBranches.find((b) => b.id === params.branchId) || hydratedBranches[0];
        setActiveBranch(picked);
      } catch {
        if (active) {
          setHospital(undefined);
          setActiveBranch(undefined);
        }
      } finally {
        if (active) setIsLoadingHospital(false);
      }
    };
    void loadLiveHospital();
    return () => {
      active = false;
    };
  }, [params.hospitalId, params.branchId, activeAddress?.latitude, activeAddress?.longitude]);

  const branches = hospital?.branches || [];
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    params.specialty && params.specialty !== 'All' ? params.specialty : 'All'
  );

  // Booking Modal State & Favorites
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [branchDropdownVisible, setBranchDropdownVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingTargetDoctor, setBookingTargetDoctor] = useState<{
    doctor: Doctor;
    slot: string;
    hospitalName: string;
  } | null>(null);
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
    const initialSlot = chosenSlot || doctor.next_available_slot || slots[0] || 'Today, 6:30 PM';
    setSelectedModalSlot(initialSlot);
    if (chosenSlot) {
      setSelectedSlotDoctor({ doctor, slot: chosenSlot });
    }
    setBookingTargetDoctor({
      doctor,
      slot: initialSlot,
      hospitalName: hospital ? `${hospital.name} (${activeBranch?.name || ''})` : 'Hospital Network',
    });
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async (
    patientName?: string,
    patientPhone?: string,
    paymentMethod?: string,
    txnId?: string,
    reason?: string,
    slot?: string
  ) => {
    if (!bookingTargetDoctor || !hospital) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const fmtDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const rawSlot = slot || selectedModalSlot || bookingTargetDoctor.slot;
    const effectiveSlot = (rawSlot?.includes('·') || rawSlot?.includes(','))
      ? rawSlot
      : `Today, ${fmtDate} · ${rawSlot}`;

    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const newBooking: Booking = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      patient_name: patientName || user?.full_name || (isHi ? 'रोगी' : 'Patient'),
      patient_phone: patientPhone || (user?.phone && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910') && user.phone !== '+91 99999 99999' ? user.phone : ''),
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      branch_id: activeBranch?.id,
      branch_name: activeBranch?.name,
      doctor_id: bookingTargetDoctor.doctor.id,
      doctor_name: bookingTargetDoctor.doctor.name,
      doctor_fee: bookingTargetDoctor.doctor.consultation_fee,
      discount_amount: Math.max(0, bookingTargetDoctor.doctor.consultation_fee - bookingTargetDoctor.doctor.discounted_fee),
      final_payable: bookingTargetDoctor.doctor.discounted_fee,
      verification_code: otpCode,
      slot_time: effectiveSlot,
      specialty_requested: bookingTargetDoctor.doctor.specialty,
      status: 'PAID',
      call_status: 'connected',
      notes: `${reason ? `Reason / Symptoms: ${reason}. ` : ''}Paid online via ${paymentMethod || 'UPI'} (${txnId || 'RZP-SUCCESS'}). Direct OPD consult booked for ${bookingTargetDoctor.doctor.name} (${bookingTargetDoctor.doctor.specialty}) at ${hospital.name} - ${activeBranch?.name}.`,
      created_at: new Date().toISOString(),
    } as Booking;

    await saveNewBooking(newBooking);

    // Trigger Notification
    triggerBrowserNotification(
      'OPD Appointment Confirmed',
      `Token #14 issued for ${bookingTargetDoctor.doctor.name} at ${hospital.name}. Slot: ${effectiveSlot}`
    );

    setIsSubmitting(false);
    setConfirmedBooking(newBooking);
  };

  if (isLoadingHospital) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#475569' }}>
          Loading hospital & specialists...
        </Text>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
        <Building2 size={36} color="#64748B" />
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
          Hospital Currently Unavailable
        </Text>
        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 320 }}>
          This hospital is either paused or no longer active in our network.
        </Text>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/opd'))}
          style={{
            marginTop: 4,
            backgroundColor: '#1E40AF',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/opd');
                }
              }}
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
                {isHi && (hospital as any)?.name_hi
                  ? (hospital as any).name_hi
                  : translateHospitalName(hospital?.name || '', isHi)}
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
                {Number((hospital as any)?.total_reviews ?? 0) > 0
                  ? `${hospital?.rating}`
                  : (isHi ? 'नया' : 'New')}
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
                {activeBranch?.distance_km != null && activeBranch.distance_km >= 0
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
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#182F3B', marginTop: 8, textAlign: 'center' }}>
                  {isHi ? 'इस विभाग में कोई विशेषज्ञ उपलब्ध नहीं है' : 'No specialists in this department'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  {isHi
                    ? 'कृपया ऊपर "सभी" चुनें या दूसरी श्रेणी देखें।'
                    : 'Please switch to "All" or select another category squircle above.'}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSpecialty('All')}
                  style={{ marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {isHi ? 'सभी विशेषज्ञ देखें' : 'Show All Specialists'}
                  </Text>
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
                                  <View
                                    style={{
                                      width: 92,
                                      height: 140,
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
                                          {isHi && (doc as any).name_hi
                                            ? (doc as any).name_hi
                                            : translateDoctorName(doc.name, isHi)}
                                        </Text>
                                        <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                                          {isHi && (doc as any).specialty_hi
                                            ? (doc as any).specialty_hi
                                            : translateSpecialty(doc.specialty, isHi)} • {doc.experience_years} {isHi ? 'वर्ष अनुभव' : 'yrs exp'}
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
                                        {Number(doc.total_reviews ?? 0) > 0
                                          ? `${doc.rating} (${doc.total_reviews})`
                                          : (language === 'hi' ? 'नया' : 'New')}
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
                {regularDoctors.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 20,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#0F172A' }}>
                      {isHi ? 'अस्पताल खुला है · कोई डॉक्टर उपलब्ध नहीं' : 'Hospital is Open · No Doctors Listed for This Selection'}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18 }}>
                      {isHi
                        ? 'इस शाखा या विशेषज्ञता में अभी कोई डॉक्टर स्लॉट उपलब्ध नहीं है। आप सीधे अस्पताल रिसेप्शन पर कॉल कर सकते हैं या अन्य शाखा देख सकते हैं।'
                        : 'No doctor slots are currently listed for this branch or specialty. You can call hospital reception directly for walk-in/emergency OPD or switch branches.'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                      {hospital.contact_number ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${hospital.contact_number}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: '#2563EB',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                          }}
                        >
                          <PhoneCall size={14} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                            {isHi ? 'अस्पताल रिसेप्शन कॉल करें' : 'Call Hospital Reception'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {branches.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => setBranchDropdownVisible(true)}
                          style={{
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                          }}
                        >
                          <Text style={{ color: '#1E40AF', fontSize: 12.5, fontWeight: '800' }}>
                            {isHi ? 'अन्य शाखा देखें' : 'Check Other Branches'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
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
                          <View
                            style={{
                              width: 84,
                              height: 108,
                              borderRadius: 18,
                              overflow: 'hidden',
                              backgroundColor: '#EFF6FF',
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {doctor.avatar_url ? (
                              <Image
                                source={avatar}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <Stethoscope size={26} color="#2563EB" />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>
                                  {isHi ? 'फोटो नहीं' : 'No Photo'}
                                </Text>
                              </View>
                            )}
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
                                {isHi && (doctor as any).name_hi
                                  ? (doctor as any).name_hi
                                  : translateDoctorName(doctor.name, isHi)}
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
                              {isHi && (doctor as any).specialty_hi
                                ? (doctor as any).specialty_hi
                                : translateSpecialty(doctor.specialty, isHi)} • {doctor.experience_years} {isHi ? 'वर्ष अनुभव' : 'yrs exp'}
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
                            {Number(doctor.total_reviews ?? 0) > 0 ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Star size={11} color="#D97706" fill="#D97706" />
                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#1E293B' }}>
                                  {doctor.rating}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>
                                  ({doctor.total_reviews} {language === 'hi' ? 'समीक्षा' : 'reviews'})
                                </Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                <Star size={10} color="#2563EB" fill="#2563EB" />
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#1E40AF' }}>
                                  {language === 'hi' ? 'नया डॉक्टर' : 'New'}
                                </Text>
                              </View>
                            )}
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
                            {(() => {
                              const docDisc =
                                doctor.consultation_fee > 0 &&
                                doctor.discounted_fee > 0 &&
                                doctor.discounted_fee < doctor.consultation_fee
                                  ? Math.round(((doctor.consultation_fee - doctor.discounted_fee) / doctor.consultation_fee) * 100)
                                  : ((doctor as any).discount_percentage ?? hospital?.discount_percentage);
                              return docDisc ? (
                                <Text style={{ fontSize: 10.5, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                                  {isHi ? `${docDisc}% छूट • इन-ऐप दर` : `Save ${docDisc}% with in-app pay`}
                                </Text>
                              ) : null;
                            })()}
                          </View>

                          {((doctor as any).is_available === false) ? (
                            <View
                              style={{
                                backgroundColor: '#F1F5F9',
                                borderWidth: 1,
                                borderColor: '#CBD5E1',
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                              }}
                            >
                              <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '800' }}>
                                {isHi ? 'अभी उपलब्ध नहीं' : 'Unavailable'}
                              </Text>
                            </View>
                          ) : (
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
                                {isHi ? 'बुक करें' : 'Book'}
                              </Text>
                              <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
                )}
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

        {/* Modular Booking Slot Modal with Online Payment Gateway & Digital Pass */}
        <BookingSlotModal
          visible={bookingModalVisible}
          onClose={() => setBookingModalVisible(false)}
          confirmedBooking={confirmedBooking}
          bookingTargetDoctor={bookingTargetDoctor}
          selectedModalSlot={selectedModalSlot}
          onSelectModalSlot={setSelectedModalSlot}
          isSubmitting={isSubmitting}
          onConfirmBooking={handleConfirmBooking}
          userPhone={user?.phone}
          userName={user?.full_name}
          language={language}
          onViewAppointments={() => {
            setBookingModalVisible(false);
            router.push('/appointments');
          }}
        />

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
                        router.setParams({ branchId: b.id });
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
                          {b.distance_km != null && (
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
