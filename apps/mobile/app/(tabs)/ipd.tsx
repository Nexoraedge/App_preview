import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bed,
  ShieldCheck,
  PhoneCall,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Building2,
  Calendar,
  AlertCircle,
  Star,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  Activity,
  FileText,
  Award,
  Info,
  Phone,
  HelpCircle,
  UserCheck,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import {
  IpdHospitalBedIcon,
  HeartPulseIcon,
  BoneJointIcon,
  ChildCareIcon,
  AllCategoriesIcon,
} from '../../components/ServiceIcons';

interface SurgeryCategory {
  id: string;
  label: string;
  subtitle: string;
  count: string;
  accentColor: string;
  icon: (color: string) => React.ReactNode;
}

interface PlannedSurgery {
  id: string;
  name: string;
  category: string;
  stayDays: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  insuranceCovered: boolean;
  tag: string;
}

interface HospitalAdmissionInfo {
  id: string;
  name: string;
  location: string;
  distance_km: number;
  image_url: string;
  rating: number;
  total_reviews: number;
  icuAvailable: number;
  privateRooms: number;
  cashlessPreAuth: string;
  discount_percentage: number;
  specialties: string[];
  tpaInsurance: string[];
  featured: boolean;
}

export default function IpdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Admission / Bed Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalAdmissionInfo | null>(null);
  const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);

  const [patientName, setPatientName] = useState(user?.full_name || 'Hardik Gupta');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98112 44550');
  const [roomType, setRoomType] = useState<'DELUXE' | 'SEMI' | 'ICU' | 'GENERAL'>('DELUXE');
  const [insuranceType, setInsuranceType] = useState<string>('Star Health Insurance (Cashless Desk)');
  const [plannedDate, setPlannedDate] = useState('Tomorrow');
  const [admissionReason, setAdmissionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Doctor's Admission Slip / Advice Upload Modal State
  const [adviceModalVisible, setAdviceModalVisible] = useState(false);
  const [adviceNote, setAdviceNote] = useState('');
  const [isSubmittingAdvice, setIsSubmittingAdvice] = useState(false);
  const [adviceSuccessRef, setAdviceSuccessRef] = useState<string | null>(null);

  // Surgery & Inpatient Categories (Capsule Pills 1:1 with OPD)
  const categories: SurgeryCategory[] = useMemo(
    () => [
      {
        id: 'All',
        label: language === 'hi' ? 'सभी सर्जरी' : 'All Surgeries',
        subtitle: 'Comprehensive admissions & surgeries',
        count: '18 Procedures',
        accentColor: '#2563EB',
        icon: (color: string) => <AllCategoriesIcon size={20} color={color} />,
      },
      {
        id: 'GeneralSurgery',
        label: language === 'hi' ? 'लेप्रोस्कोपिक' : 'Laparoscopy',
        subtitle: 'Gallbladder, Hernia, Appendix, Piles',
        count: '4 Surgeries',
        accentColor: '#059669',
        icon: (color: string) => <IpdHospitalBedIcon size={20} color={color} />,
      },
      {
        id: 'Orthopedics',
        label: language === 'hi' ? 'हड्डी व जोड़' : 'Orthopedics',
        subtitle: 'Knee & Hip Replacement, Spine',
        count: '3 Surgeries',
        accentColor: '#D97706',
        icon: (color: string) => <BoneJointIcon size={20} color={color} />,
      },
      {
        id: 'Cardiology',
        label: language === 'hi' ? 'कार्डियक' : 'Cardiology',
        subtitle: 'Angioplasty, Bypass, Pacemaker',
        count: '3 Surgeries',
        accentColor: '#DC2626',
        icon: (color: string) => <HeartPulseIcon size={20} color={color} />,
      },
      {
        id: 'Maternity',
        label: language === 'hi' ? 'प्रसूति व सिजेरियन' : 'Maternity',
        subtitle: 'Normal & C-Section Delivery Packages',
        count: '3 Surgeries',
        accentColor: '#DB2777',
        icon: (color: string) => <ChildCareIcon size={20} color={color} />,
      },
      {
        id: 'Urology',
        label: language === 'hi' ? 'किडनी स्टोन' : 'Urology',
        subtitle: 'Laser Kidney Stones, Prostate',
        count: '2 Surgeries',
        accentColor: '#7C3AED',
        icon: (color: string) => <Activity size={19} color={color} />,
      },
      {
        id: 'Ophthalmology',
        label: language === 'hi' ? 'मोतियाबिंद' : 'Cataract / Eye',
        subtitle: 'Laser Cataract (Phaco), Cornea',
        count: '2 Surgeries',
        accentColor: '#2563EB',
        icon: (color: string) => <Sparkles size={19} color={color} />,
      },
      {
        id: 'CriticalCare',
        label: language === 'hi' ? 'लाइव आईसीयू' : 'Live ICU Beds',
        subtitle: 'Emergency ICU / CCU bed allocation',
        count: 'Live Beds',
        accentColor: '#E11D48',
        icon: (color: string) => <Building2 size={19} color={color} />,
      },
    ],
    [language]
  );

  // Partner Hospitals Catalog for IPD
  const partnerHospitals: HospitalAdmissionInfo[] = useMemo(
    () => [
      {
        id: 'hosp-1',
        name: 'Max Super Speciality Hospital',
        location: '1, 2, Press Enclave Marg, Saket, New Delhi',
        distance_km: 1.4,
        image_url:
          'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        total_reviews: 420,
        icuAvailable: 4,
        privateRooms: 9,
        cashlessPreAuth: 'Cashless Pre-Auth in 30 Mins',
        discount_percentage: 20,
        specialties: ['Cardiology', 'Orthopedics', 'Oncology', 'Laparoscopy'],
        tpaInsurance: ['Star Health', 'HDFC ERGO', 'Care', 'ICICI Lombard', 'Niva Bupa'],
        featured: true,
      },
      {
        id: 'hosp-2',
        name: 'Indraprastha Apollo Hospitals',
        location: 'Delhi-Mathura Road, Sarita Vihar, New Delhi',
        distance_km: 8.1,
        image_url:
          'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        total_reviews: 490,
        icuAvailable: 2,
        privateRooms: 14,
        cashlessPreAuth: 'Zero Deposit • 100% Cashless Desk',
        discount_percentage: 20,
        specialties: ['Organ Transplant', 'Cardiac Surgery', 'Neurosciences', 'Joint Care'],
        tpaInsurance: ['All Major TPAs', 'Star Health', 'Medi Assist', 'Paramount'],
        featured: true,
      },
      {
        id: 'hosp-3',
        name: 'Fortis Escorts Heart Institute',
        location: 'Okhla Road, Sukhdev Vihar Metro, New Delhi',
        distance_km: 6.5,
        image_url:
          'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        total_reviews: 350,
        icuAvailable: 6,
        privateRooms: 11,
        cashlessPreAuth: 'Dedicated Desk • Instant Approvals',
        discount_percentage: 25,
        specialties: ['Cardiac Surgery', 'Pediatric Heart', 'Vascular', 'Thoracic'],
        tpaInsurance: ['Star Health', 'Vidal Health', 'Raksha TPA', 'FHPL'],
        featured: false,
      },
      {
        id: 'hosp-4',
        name: 'Medanta - The Medicity',
        location: 'CH Bakhtawar Singh Road, Sector 38, Gurugram',
        distance_km: 14.2,
        image_url:
          'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        total_reviews: 580,
        icuAvailable: 8,
        privateRooms: 22,
        cashlessPreAuth: 'Zero-Advance Admission Protection',
        discount_percentage: 20,
        specialties: ['Robotic Surgery', 'Orthopedics', 'Gastroenterology', 'Cardiology'],
        tpaInsurance: ['HDFC ERGO', 'Star Health', 'Niva Bupa', 'Care Health', 'Bajaj Allianz'],
        featured: true,
      },
      {
        id: 'hosp-5',
        name: 'Artemis Hospital',
        location: 'Sector 51, Near Artemis Roundabout, Gurugram',
        distance_km: 16.5,
        image_url:
          'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        total_reviews: 410,
        icuAvailable: 5,
        privateRooms: 12,
        cashlessPreAuth: 'Fast Cashless Clearance Guarantee',
        discount_percentage: 20,
        specialties: ['Joint Replacement', 'Oncology', 'Bariatric Surgery', 'Urology'],
        tpaInsurance: ['Star Health', 'Care', 'ICICI Lombard', 'Medi Assist'],
        featured: false,
      },
    ],
    []
  );

  // Planned Surgeries Catalog
  const plannedSurgeries: PlannedSurgery[] = useMemo(
    () => [
      {
        id: 'surg-gallbladder',
        name: 'Laparoscopic Gallbladder Removal (Cholecystectomy)',
        category: 'GeneralSurgery',
        stayDays: '1-2 Days Stay',
        price: 45000,
        originalPrice: 75000,
        discountPercent: 40,
        insuranceCovered: true,
        tag: 'MINIMAL INVASIVE',
      },
      {
        id: 'surg-knee-replace',
        name: 'Total Knee Replacement (TKR - Unilateral)',
        category: 'Orthopedics',
        stayDays: '3-4 Days Stay',
        price: 125000,
        originalPrice: 190000,
        discountPercent: 34,
        insuranceCovered: true,
        tag: 'IMPLANT INCLUDED',
      },
      {
        id: 'surg-hernia',
        name: 'Laparoscopic Inguinal / Umbilical Hernia Repair',
        category: 'GeneralSurgery',
        stayDays: '1 Day Stay',
        price: 38000,
        originalPrice: 65000,
        discountPercent: 41,
        insuranceCovered: true,
        tag: 'DAYCARE / 1 DAY',
      },
      {
        id: 'surg-csection',
        name: 'Normal & C-Section Delivery Maternity Package',
        category: 'Maternity',
        stayDays: '2-3 Days Stay',
        price: 55000,
        originalPrice: 90000,
        discountPercent: 38,
        insuranceCovered: true,
        tag: 'BABY CARE INCLUDED',
      },
      {
        id: 'surg-angioplasty',
        name: 'Coronary Angioplasty (PTCA with Drug Eluting Stent)',
        category: 'Cardiology',
        stayDays: '2 Days Stay',
        price: 110000,
        originalPrice: 165000,
        discountPercent: 33,
        insuranceCovered: true,
        tag: 'CARDIAC CARE',
      },
      {
        id: 'surg-kidney-stone',
        name: 'Laser Kidney Stone Removal (RIRS / PCNL)',
        category: 'Urology',
        stayDays: '1 Day Stay',
        price: 42000,
        originalPrice: 70000,
        discountPercent: 40,
        insuranceCovered: true,
        tag: 'NO CUT LASER',
      },
      {
        id: 'surg-cataract',
        name: 'Micro-Incision Laser Cataract Surgery (Phaco)',
        category: 'Ophthalmology',
        stayDays: 'Daycare (4 hrs)',
        price: 24000,
        originalPrice: 45000,
        discountPercent: 46,
        insuranceCovered: true,
        tag: 'BLADELESS LASER',
      },
      {
        id: 'surg-appendix',
        name: 'Laparoscopic Emergency Appendectomy',
        category: 'GeneralSurgery',
        stayDays: '1-2 Days Stay',
        price: 40000,
        originalPrice: 68000,
        discountPercent: 41,
        insuranceCovered: true,
        tag: 'EMERGENCY / FAST',
      },
    ],
    []
  );

  // Filtered Hospitals
  const filteredHospitals = useMemo(() => {
    return partnerHospitals.filter((hosp) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        hosp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hosp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hosp.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'CriticalCare' && hosp.icuAvailable > 0) ||
        (selectedCategory === 'Cardiology' && hosp.specialties.includes('Cardiology')) ||
        (selectedCategory === 'Orthopedics' && hosp.specialties.includes('Orthopedics')) ||
        (selectedCategory === 'GeneralSurgery' && hosp.specialties.includes('Laparoscopy')) ||
        selectedCategory === 'Maternity' ||
        selectedCategory === 'Urology' ||
        selectedCategory === 'Ophthalmology';

      return matchSearch && matchCategory;
    });
  }, [partnerHospitals, searchQuery, selectedCategory]);

  // Filtered Surgeries
  const filteredSurgeries = useMemo(() => {
    return plannedSurgeries.filter((surg) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        surg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        surg.tag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === 'All' || surg.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [plannedSurgeries, searchQuery, selectedCategory]);

  // Booking Modal Triggers
  const handleOpenHospitalBooking = (hosp: HospitalAdmissionInfo) => {
    setSelectedHospital(hosp);
    setSelectedSurgery(null);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleOpenSurgeryBooking = (surg: PlannedSurgery) => {
    setSelectedSurgery(surg);
    setSelectedHospital(partnerHospitals[0]);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  // Confirm Bed / Admission Request via Supabase
  const handleConfirmAdmissionBooking = async () => {
    setIsSubmitting(true);
    const bookingRef = `AN-IPD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: selectedHospital?.name || 'Partner Super Speciality Hospital',
      doctor_fee: selectedSurgery ? selectedSurgery.price : 0,
      slot_time: plannedDate,
      specialty_requested: selectedSurgery ? selectedSurgery.name : 'Hospital Bed Admission',
      status: 'NEW',
      call_status: 'pending',
      notes: `Room: ${roomType}. Insurance TPA: ${insuranceType}. Reason: ${
        admissionReason || 'Hospital Admission & Zero Deposit Cashless Desk'
      }`,
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

  // Doctor Admission Slip / Advice Upload Submission
  const handleConfirmAdviceUpload = async () => {
    setIsSubmittingAdvice(true);
    const adviceRef = `AN-IPD-ADV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: adviceRef,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: 'Adityam Hospital Care Concierge Desk',
      specialty_requested: 'Doctor Admission Advice Slip Submission',
      status: 'NEW',
      call_status: 'pending',
      notes: `Admission Advice Uploaded. Notes: ${adviceNote || 'Doctor advised hospital admission / surgery.'}`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback
    }

    setTimeout(() => {
      setIsSubmittingAdvice(false);
      setAdviceSuccessRef(adviceRef);
    }, 700);
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 36,
        }}
      >
        {/* 1. Header Section in Royal Medical Blue Gradient (1:1 with OPD & Home) */}
        <LinearGradient
          colors={['#172554', '#1E40AF', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingHorizontal: 16,
            paddingBottom: 22,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient light glow circle */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />

          {/* Top Status & Geolocation Pills - 1:1 Clean with OPD */}
          <View className="flex-row items-center justify-between mb-3.5 gap-2">
            <View className="flex-row items-center space-x-1.5 bg-white/15 border border-white/25 px-2.5 py-1 rounded-full shrink min-w-0">
              <MapPin size={11} color="#BFDBFE" />
              <Text className="text-[10.5px] font-bold text-white shrink" numberOfLines={1}>
                South Delhi NCR • 50 km radius
              </Text>
            </View>

            <View className="flex-row items-center space-x-1 bg-white/20 px-2.5 py-1 rounded-full border border-white/30 shrink-0">
              <ShieldCheck size={11} color="#FFFFFF" />
              <Text className="text-[10px] font-bold text-white">0% Advance Deposit</Text>
            </View>
          </View>

          {/* Title & Tagline */}
          <Text className="text-[26px] font-black text-white tracking-tight leading-[32px]">
            {language === 'hi' ? 'अस्पताल भर्ती व सर्जरी केयर' : 'Hospital Care & Admissions'}
          </Text>
          <Text className="text-xs font-medium text-blue-100 mt-1 mb-4">
            {language === 'hi'
              ? 'बिना अग्रिम भुगतान • 30 मिनट में कैशलेस अप्रूवल • प्राथमिकता बेड'
              : 'Zero-advance deposit, 30-min cashless insurance & priority bed allotment'}
          </Text>

          {/* Search Bar - Exact Match to OPD & Home Floating Search Bar */}
          <View className="bg-white rounded-full flex-row items-center pl-4 pr-1.5 py-1.5 shadow-lg shadow-blue-950/20 mb-1">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                language === 'hi'
                  ? 'अस्पताल, सर्जरी खोजें (जैसे पित्त की थैली, घुटना)...'
                  : 'Search surgery, hospital, procedure (e.g. Gallbladder, Knee)...'
              }
              placeholderTextColor="#94A3B8"
              className="flex-1 text-sm text-slate-800 font-medium py-1 px-1"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center mr-1"
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            )}
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
          </View>
        </LinearGradient>

        {/* 2. Categories Capsule Pills Section (1:1 with OPD) */}
        <View className="pt-4 px-4">
          <View className="flex-row items-center justify-between mb-2.5 px-0.5">
            <Text className="text-base font-black text-[#0F172A] tracking-tight">
              {language === 'hi' ? 'सर्जरी व विशेषज्ञता' : 'Specialization & Surgeries'}
            </Text>
            {selectedCategory !== 'All' && (
              <TouchableOpacity
                onPress={() => setSelectedCategory('All')}
                className="flex-row items-center space-x-1"
              >
                <Text className="text-xs font-bold text-[#2563EB]">
                  {language === 'hi' ? 'सभी देखें' : 'Reset to All'}
                </Text>
                <X size={12} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                  className="mr-2"
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#2563EB', '#1D4ED8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
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
                      <Text className="text-[#334155] text-xs font-bold">{cat.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. 24x7 Emergency Admission Call Card */}
        <View className="px-4 mt-4">
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:1800123456')}
            activeOpacity={0.92}
            className="bg-white rounded-3xl p-4 border border-rose-200 shadow-sm"
            style={{
              shadowColor: '#BE123C',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex-row items-center space-x-1.5">
                <View className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <Text className="text-[9.5px] font-black text-rose-700 uppercase tracking-wider">
                  24x7 Emergency Admission Desk
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-emerald-700">LIVE BEDS READY</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[14.5px] font-black text-slate-900 leading-snug">
                  Need an Immediate ICU or Hospital Bed?
                </Text>
                <Text className="text-[11px] text-slate-500 font-medium mt-0.5 leading-4">
                  Direct admission desk with zero advance security deposit & fast triage support.
                </Text>
              </View>

              <View className="w-11 h-11 rounded-2xl bg-rose-600 items-center justify-center shadow-md shadow-rose-600/30 shrink-0">
                <PhoneCall size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Have Doctor's Admission Advice / Surgery Slip? (1:1 with Labs Prescription Card) */}
        <View className="px-4 mt-4">
          <TouchableOpacity
            onPress={() => {
              setAdviceSuccessRef(null);
              setAdviceModalVisible(true);
            }}
            activeOpacity={0.92}
            className="bg-white rounded-3xl p-4 border border-blue-200/90 shadow-sm"
            style={{
              shadowColor: '#1E3A8A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            {/* Header Status Pills */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full flex-row items-center space-x-1">
                <Sparkles size={11} color="#2563EB" />
                <Text className="text-[9.5px] font-black text-[#2563EB] uppercase tracking-wider">
                  Admission Concierge
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex-row items-center space-x-1">
                <Clock size={10} color="#059669" />
                <Text className="text-[9.5px] font-black text-emerald-700">30-MIN CASHLESS APPROVAL</Text>
              </View>
            </View>

            {/* Middle: Icon + Title + Description */}
            <View className="flex-row items-start space-x-3.5">
              <View className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center shrink-0 mt-0.5">
                <FileText size={24} color="#2563EB" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-[#0F172A] leading-snug">
                  {language === 'hi'
                    ? 'डॉक्टर का भर्ती पर्चा / सलाह है?'
                    : 'Have Doctor’s Admission Advice or Slip?'}
                </Text>
                <Text className="text-[11.5px] text-slate-500 font-medium mt-1 leading-4">
                  {language === 'hi'
                    ? 'पर्चा अपलोड करें • 30 मिनट में 0% अग्रिम पर कैशलेस अप्रूवल व प्राथमिकता बेड'
                    : 'Upload admission advice to pre-authorize 100% cashless insurance with zero advance deposit & priority bed allotment.'}
                </Text>
              </View>
            </View>

            {/* Bottom Row: Trust Chips + Dedicated CTA Button */}
            <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
              <View className="flex-row items-center space-x-2">
                <View className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-slate-600">✓ 30+ TPAs</Text>
                </View>
                <View className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-slate-600">✓ 0% Deposit</Text>
                </View>
              </View>

              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="px-4 py-2 rounded-xl flex-row items-center space-x-1.5 shadow-xs"
              >
                <Text className="text-white text-xs font-black">
                  {language === 'hi' ? 'अपलोड करें' : 'Upload Slip'}
                </Text>
                <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Cashless TPA Insurance Banner */}
        <View className="px-4 mt-4">
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl p-4 border border-blue-200 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3 flex-1 pr-2">
              <View className="w-11 h-11 rounded-2xl bg-[#2563EB] items-center justify-center shrink-0">
                <ShieldCheck size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-blue-950">
                  Cashless Pre-Auth in 30 Mins Across 30+ Insurers
                </Text>
                <Text className="text-[11px] text-blue-800 mt-0.5 leading-4">
                  Star Health, HDFC ERGO, Care, ICICI Lombard, Niva Bupa & All Major TPAs.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 6. Planned Surgeries & Package Section */}
        {filteredSurgeries.length > 0 && (
          <View className="mt-5 px-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-black text-[#0F172A]">
                  {language === 'hi' ? 'प्रमुख सर्जरी व पैकेज' : 'Planned Surgeries & Packages'}
                </Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {language === 'hi'
                    ? 'पारदर्शी पैकेज, कम समय में अस्पताल प्रवास व कैशलेस क्लीयरेंस'
                    : 'Fixed-price surgical packages with 100% cashless insurance claim'}
                </Text>
              </View>
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                <Text className="text-[10px] font-black text-emerald-700">UP TO 40% OFF</Text>
              </View>
            </View>

            <View style={{ rowGap: 12 }}>
              {filteredSurgeries.map((surg) => (
                <View
                  key={surg.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs"
                  style={{
                    shadowColor: '#1E3A8A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 5,
                    elevation: 1,
                  }}
                >
                  {/* Top row: Badge + Stay Duration */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[9px] font-black text-[#2563EB] tracking-wider uppercase">
                        {surg.tag}
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-1">
                      <Clock size={11} color="#64748B" />
                      <Text className="text-[11px] font-bold text-slate-600">{surg.stayDays}</Text>
                    </View>
                  </View>

                  {/* Surgery Name */}
                  <Text className="text-[15px] font-black text-[#0F172A] leading-snug">
                    {surg.name}
                  </Text>

                  {/* Insurance tag */}
                  <View className="mt-2 flex-row items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 self-start">
                    <ShieldCheck size={11} color="#059669" />
                    <Text className="text-[10.5px] font-bold text-emerald-700">
                      100% Cashless Insurance Covered • Zero Deposit
                    </Text>
                  </View>

                  {/* Bottom Row: Price & Book CTA */}
                  <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
                    <View>
                      <View className="flex-row items-baseline space-x-1.5">
                        <Text className="text-lg font-black text-[#0F172A]">₹{surg.price}</Text>
                        <Text className="text-xs line-through text-slate-400 font-medium">
                          ₹{surg.originalPrice}
                        </Text>
                      </View>
                      <Text className="text-[10px] font-bold text-emerald-600">
                        Save ₹{surg.originalPrice - surg.price} ({surg.discountPercent}% OFF)
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleOpenSurgeryBooking(surg)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#2563EB', '#1D4ED8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="px-3.5 py-2 rounded-xl flex-row items-center space-x-1 shadow-2xs"
                      >
                        <Text className="text-white text-xs font-black">Book Package</Text>
                        <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 7. Partner Hospitals for Admissions (Organic Wave Design 1:1 with OPD) */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-1 pr-2">
              <Text className="text-lg font-black text-[#0F172A]">
                {language === 'hi' ? 'पार्टनर अस्पताल नेटवर्क' : 'Partner Hospitals for Admission'}
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                {filteredHospitals.length} Super Speciality Hospitals with Live Bed Access
              </Text>
            </View>
            <View className="bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full shrink-0">
              <Text className="text-[10px] font-black text-[#2563EB]">NABH Verified</Text>
            </View>
          </View>

          {filteredHospitals.length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-slate-200/90 shadow-sm my-2">
              <Building2 size={36} color="#94A3B8" />
              <Text className="text-sm font-bold text-slate-700 mt-2">No hospitals found</Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                Try searching for Max, Apollo, Fortis, or Medanta
              </Text>
            </View>
          ) : (
            <View style={{ rowGap: 14 }}>
              {filteredHospitals.map((hosp) => (
                <View
                  key={hosp.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm"
                  style={{
                    shadowColor: '#1E3A8A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  {/* Photo Header with Curve & Badges */}
                  <View style={{ height: 138, backgroundColor: '#EFF6FF', position: 'relative' }}>
                    <Image
                      source={{ uri: hosp.image_url }}
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      resizeMode="cover"
                    />

                    {/* Gradient Overlay for legibility */}
                    <LinearGradient
                      colors={['rgba(15, 23, 42, 0.20)', 'transparent', 'rgba(15, 23, 42, 0.45)']}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />

                    {/* Top Row Badges: Partner Privilege & Rating */}
                    {hosp.featured && (
                      <View className="absolute top-2.5 left-2.5 bg-amber-100/95 border border-amber-300 px-2.5 py-1 rounded-full">
                        <Text className="text-[9px] font-black text-amber-900 tracking-wider">
                          PARTNER PRIVILEGE
                        </Text>
                      </View>
                    )}

                    <View className="absolute top-2.5 right-2.5 bg-white/95 px-2.5 py-1 rounded-full flex-row items-center space-x-1 shadow-xs">
                      <Star size={11} color="#D97706" fill="#D97706" />
                      <Text className="text-[10.5px] font-black text-slate-900">{hosp.rating}</Text>
                      <Text className="text-[9px] text-slate-400">({hosp.total_reviews})</Text>
                    </View>

                    {/* Distance Pill */}
                    <View className="absolute bottom-3 left-2.5 bg-slate-900/80 px-2.5 py-1 rounded-full flex-row items-center space-x-1">
                      <MapPin size={11} color="#93C5FD" />
                      <Text className="text-[10px] font-bold text-white">
                        {hosp.distance_km} km away
                      </Text>
                    </View>

                    {/* Organic Wave Transition (Exact SVG from OPD) */}
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

                    {/* Pre-Auth Badge on wave */}
                    <View className="absolute bottom-1 right-2.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex-row items-center space-x-1">
                      <Tag size={11} color="#2563EB" />
                      <Text className="text-[10px] font-black text-[#2563EB]">
                        {hosp.cashlessPreAuth}
                      </Text>
                    </View>
                  </View>

                  {/* Hospital Details Body */}
                  <View className="p-4 pt-2">
                    <Text className="text-base font-black text-[#0F172A] leading-snug">
                      {hosp.name}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5 leading-4" numberOfLines={1}>
                      {hosp.location}
                    </Text>

                    {/* Live Bed Counters */}
                    <View className="flex-row items-center space-x-2 mt-2.5">
                      <View className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl flex-row items-center space-x-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <Text className="text-[10.5px] font-black text-rose-700">
                          {hosp.icuAvailable} ICU Beds Live
                        </Text>
                      </View>

                      <View className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl flex-row items-center space-x-1">
                        <Bed size={11} color="#2563EB" />
                        <Text className="text-[10.5px] font-black text-[#2563EB]">
                          {hosp.privateRooms} Deluxe Rooms
                        </Text>
                      </View>
                    </View>

                    {/* TPA Support Pills */}
                    <View className="flex-row flex-wrap items-center gap-1.5 mt-2.5">
                      {hosp.tpaInsurance.slice(0, 4).map((ins, idx) => (
                        <View
                          key={idx}
                          className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
                        >
                          <Text className="text-[9.5px] font-semibold text-slate-600">{ins}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Actions Row: Call Desk + Book Admission (Exact 1:1 with OPD) */}
                    <View className="flex-row items-center space-x-2 mt-3.5 pt-3 border-t border-slate-100">
                      <TouchableOpacity
                        onPress={() => Linking.openURL('tel:1800123456')}
                        activeOpacity={0.85}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center justify-center flex-row space-x-1.5"
                      >
                        <PhoneCall size={13} color="#2563EB" />
                        <Text className="text-xs font-bold text-[#2563EB]">Call Hospital</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenHospitalBooking(hosp)}
                        activeOpacity={0.88}
                        className="flex-1"
                      >
                        <LinearGradient
                          colors={['#2563EB', '#1D4ED8']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="py-2.5 rounded-xl items-center justify-center flex-row space-x-1.5 shadow-2xs"
                        >
                          <Text className="text-white text-xs font-black">Book Bed / Care</Text>
                          <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 8. Trust Strip */}
        <View className="px-4 mt-6 mb-4">
          <View className="bg-blue-50/70 border border-blue-100 rounded-3xl p-4 flex-row items-center space-x-3.5">
            <View className="w-11 h-11 rounded-2xl bg-white border border-blue-200 items-center justify-center shrink-0">
              <ShieldCheck size={22} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-black text-slate-900">
                Niramayaa Cashless Admission Guarantee
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5 leading-4">
                Zero security deposit, personal care manager assigned at reception, seamless TPA
                settlement and subsidized room rents.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* DOCTOR ADMISSION SLIP / ADVICE UPLOAD MODAL */}
      <Modal
        visible={adviceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdviceModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[85%]">
            {adviceSuccessRef ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  Admission Slip Submitted!
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
                  Our hospital bed coordinator & insurance pre-auth desk will review your advice
                  slip and call you on {patientPhone} within 15 minutes with bed options & 0% deposit
                  cashless clearance.
                </Text>

                <View className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 space-y-1">
                  <Text className="text-xs text-slate-500 font-medium">Inquiry Reference</Text>
                  <Text className="text-sm font-black text-blue-600">{adviceSuccessRef}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setAdviceModalVisible(false)}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-white text-sm font-black">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View>
                    <Text className="text-base font-black text-slate-900">
                      Upload Admission Advice Slip
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Get 0% advance admission & 30-min cashless clearance
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAdviceModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Upload Box Preview Simulation */}
                <View className="border-2 border-dashed border-blue-300 rounded-3xl p-5 my-4 items-center justify-center bg-blue-50/40">
                  <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center mb-2">
                    <FileText size={24} color="#2563EB" />
                  </View>
                  <Text className="text-xs font-black text-slate-800">
                    Admission Slip / Prescription Attached
                  </Text>
                  <Text className="text-[11px] text-slate-500 text-center mt-0.5">
                    Our on-call care coordinator will verify diagnosis & book private bed
                  </Text>
                </View>

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Patient Full Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter patient name"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </Text>
                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter phone"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Doctor Advice / Surgery / Hospital Preference (Optional)
                </Text>
                <TextInput
                  value={adviceNote}
                  onChangeText={setAdviceNote}
                  multiline
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold mb-4"
                  placeholder="e.g. Doctor advised Gallbladder Laparoscopic surgery at Max Saket"
                />

                <TouchableOpacity
                  onPress={handleConfirmAdviceUpload}
                  disabled={isSubmittingAdvice}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center shadow-md shadow-blue-500/20"
                >
                  {isSubmittingAdvice ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-black">
                      Request Cashless Pre-Auth & Bed Allotment
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ADMISSION & BED BOOKING MODAL */}
      <Modal
        visible={bookingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[88%]">
            {confirmedBooking ? (
              <View className="py-6 items-center">
                <View className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center mb-3">
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900 text-center">
                  Admission Request Dispatched!
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1 px-4 leading-relaxed">
                  Your dedicated Adityam Hospital Care Manager will contact you on {patientPhone} within
                  10 minutes to verify bed allotment and coordinate 0% deposit cashless clearance.
                </Text>

                <View className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Inquiry ID</Text>
                    <Text className="text-xs font-black text-blue-600">
                      {confirmedBooking.booking_ref}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Hospital</Text>
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                      {confirmedBooking.hospital_name}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">Room Preference</Text>
                    <Text className="text-xs font-bold text-blue-700">{roomType} Room</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 font-medium">TPA Insurance</Text>
                    <Text className="text-xs font-bold text-slate-800">{insuranceType}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setBookingModalVisible(false)}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center"
                >
                  <Text className="text-white text-sm font-black">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-black text-slate-900">
                      Book Hospital Admission
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {selectedHospital?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBookingModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Surgery / Procedure if selected */}
                {selectedSurgery && (
                  <View className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100 my-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-[10px] font-bold text-[#2563EB] uppercase">
                        Selected Procedure
                      </Text>
                      <Text className="text-xs font-black text-slate-900" numberOfLines={1}>
                        {selectedSurgery.name}
                      </Text>
                    </View>
                    <Text className="text-sm font-black text-blue-700">₹{selectedSurgery.price}</Text>
                  </View>
                )}

                {/* Patient Information */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mt-3 mb-1.5">
                  Patient Full Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter patient name"
                />

                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Phone Number
                </Text>
                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  keyboardType="phone-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold mb-3"
                  placeholder="Enter 10-digit mobile number"
                />

                {/* Room Type Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Select Room Preference
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {[
                    { id: 'DELUXE', label: 'Deluxe Single' },
                    { id: 'SEMI', label: 'Twin Sharing' },
                    { id: 'GENERAL', label: 'General Ward' },
                    { id: 'ICU', label: 'ICU / CCU Bed' },
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setRoomType(r.id as any)}
                      className={`px-3.5 py-2 rounded-xl border ${
                        roomType === r.id
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          roomType === r.id ? 'text-[#2563EB]' : 'text-slate-600'
                        }`}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Insurance / TPA Selection */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Health Insurance / Payment Mode
                </Text>
                <View style={{ rowGap: 6 }} className="mb-3">
                  {[
                    'Star Health Insurance (Cashless Desk)',
                    'HDFC ERGO / Care Health Insurance',
                    'Niva Bupa / ICICI Lombard',
                    'Other Insurance / TPA Card',
                    'Self-Pay (Subsidized Platform Rate)',
                  ].map((ins) => (
                    <TouchableOpacity
                      key={ins}
                      onPress={() => setInsuranceType(ins)}
                      className={`p-2.5 rounded-xl border flex-row items-center justify-between ${
                        insuranceType === ins
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          insuranceType === ins ? 'text-[#2563EB] font-bold' : 'text-slate-700'
                        }`}
                      >
                        {ins}
                      </Text>
                      {insuranceType === ins && <CheckCircle2 size={15} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Admission Timing */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Expected Admission Date
                </Text>
                <View className="flex-row space-x-2 mb-3">
                  {['Today (Urgent)', 'Tomorrow', 'Planned Next Week'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setPlannedDate(d)}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        plannedDate === d
                          ? 'bg-blue-50 border-[#2563EB]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          plannedDate === d ? 'text-[#2563EB]' : 'text-slate-600'
                        }`}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reason / Notes */}
                <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Diagnosis / Specific Requirements (Optional)
                </Text>
                <TextInput
                  value={admissionReason}
                  onChangeText={setAdmissionReason}
                  multiline
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold mb-4"
                  placeholder="e.g. Doctor advised Gallbladder Laparoscopic surgery on Friday"
                />

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleConfirmAdmissionBooking}
                  disabled={isSubmitting}
                  className="w-full bg-[#2563EB] py-3.5 rounded-2xl items-center shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-sm font-black">
                      Confirm Admission Request (0% Deposit)
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
