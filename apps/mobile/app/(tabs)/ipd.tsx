import React, { useState, useMemo, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  StatusBar as RNStatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bed,
  ShieldCheck,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Building2,
  Star,
  Activity,
  FileText,
  Phone,
  Users,
  Check,
  PhoneCall,
  Upload,
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
} from '../../components/ServiceIcons';
import { PressableCard } from '../../components/PressableCard';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppSearchBar } from '../../components/ui/AppSearchBar';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { IpdCardSkeleton } from '../../components/ui/SkeletonBox';

const { width } = Dimensions.get('window');

// ---------------- DATA STRUCTURES ---------------- //

export interface PlannedSurgery {
  id: string;
  shortName: string;
  shortNameHi: string;
  name: string; // medical procedure title
  nameHi: string;
  category: 'GeneralSurgery' | 'Orthopedics' | 'Cardiology' | 'Maternity' | 'Urology' | 'Ophthalmology';
  stayDays: string;
  stayDaysHi: string;
  price: number;
  tag: string;
  tagHi: string;
  whatItInvolves: string;
  whatItInvolvesHi: string;
  recoveryTimeline: string;
  recoveryTimelineHi: string;
}

export interface HospitalAdmissionInfo {
  id: string;
  name: string;
  nameHi: string;
  location: string;
  locationHi: string;
  distance_km: number;
  image_url: string;
  rating: number;
  total_reviews: number;
  tag: string;
  tagHi: string;
  specialties: string[];
  specialtiesHi: string[];
}

// Category Tint Palette
const TINT: Record<string, string> = {
  GeneralSurgery: '#ECFDF5',
  Orthopedics: '#FFFBEB',
  Cardiology: '#FEF2F2',
  Maternity: '#FDF2F8',
  Urology: '#F5F3FF',
  Ophthalmology: '#EFF6FF',
};

const CATEGORY_ACCENT: Record<string, string> = {
  GeneralSurgery: '#059669',
  Orthopedics: '#D97706',
  Cardiology: '#DC2626',
  Maternity: '#DB2777',
  Urology: '#7C3AED',
  Ophthalmology: '#2563EB',
};

// Helper for Indian Currency formatting
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// ---------------- MASTER DATA ---------------- //

const MASTER_SURGERIES: PlannedSurgery[] = [
  {
    id: 'surg-gallbladder',
    shortName: 'Gallbladder surgery',
    shortNameHi: 'पित्त की थैली सर्जरी (Gallbladder)',
    name: 'Laparoscopic Cholecystectomy',
    nameHi: 'लैप्रोस्कोपिक कोलेसिस्टेक्टॉमी (Cholecystectomy)',
    category: 'GeneralSurgery',
    stayDays: '1–2 days stay',
    stayDaysHi: '1–2 दिन भर्ती',
    price: 45000,
    tag: 'Minimal invasive',
    tagHi: 'कम चीरा (लैप्रोस्कोपिक)',
    whatItInvolves: 'Keyhole surgical removal of the inflamed gallbladder containing painful gallstones.',
    whatItInvolvesHi: 'दर्दनाक पथरी से ग्रस्त पित्त की थैली को लैप्रोस्कोपिक कीहोल विधि द्वारा सुरक्षित निकालना।',
    recoveryTimeline: 'Normal routine resumed in 5–7 days.',
    recoveryTimelineHi: '5–7 दिनों में सामान्य दिनचर्या फिर से शुरू।',
  },
  {
    id: 'surg-knee-replace',
    shortName: 'Knee replacement',
    shortNameHi: 'घुटना प्रत्यारोपण (Knee Replacement)',
    name: 'Total Knee Arthroplasty (TKR)',
    nameHi: 'टोटल नी आर्थ्रोप्लास्टी (TKR Surgery)',
    category: 'Orthopedics',
    stayDays: '3–4 days stay',
    stayDaysHi: '3–4 दिन भर्ती',
    price: 125000,
    tag: 'Implant included',
    tagHi: 'यूएस-एफडीए इम्प्लांट शामिल',
    whatItInvolves: 'Precision joint resurfacing using US-FDA approved cobalt-chromium implants.',
    whatItInvolvesHi: 'घिसे हुए जोड़ को उच्च गुणवत्ता वाले कोबाल्ट-क्रोमियम इम्प्लांट से बदलना।',
    recoveryTimeline: 'Assisted walking on day 2. Physiotherapy included.',
    recoveryTimelineHi: 'दूसरे दिन से फिजियोथेरेपी की मदद से चलना शुरू।',
  },
  {
    id: 'surg-hernia',
    shortName: 'Hernia repair',
    shortNameHi: 'हर्निया ऑपरेशन (Hernia Repair)',
    name: 'Laparoscopic Hernioplasty',
    nameHi: 'लैप्रोस्कोपिक हर्नियोप्लास्टी (Mesh Repair)',
    category: 'GeneralSurgery',
    stayDays: '1 day stay',
    stayDaysHi: '1 दिन भर्ती',
    price: 38000,
    tag: 'Daycare / 24 hrs',
    tagHi: '24 घंटे में छुट्टी',
    whatItInvolves: 'High-grade surgical mesh reinforcement for inguinal or umbilical wall weakness.',
    whatItInvolvesHi: 'कमजोर पेट की दीवार को मेडिकल मेश (जाली) लगाकर सुरक्षित रूप से मजबूत करना।',
    recoveryTimeline: 'Discharge within 24 hours. Light desk work in 3 days.',
    recoveryTimelineHi: '24 घंटे में डिस्चार्ज। 3 दिन में हल्का काम संभव।',
  },
  {
    id: 'surg-csection',
    shortName: 'Maternity delivery',
    shortNameHi: 'डिलीवरी व प्रसूति (C-Section)',
    name: 'Normal & C-Section Package',
    nameHi: 'नॉर्मल व सिजेरियन डिलीवरी (Maternity)',
    category: 'Maternity',
    stayDays: '2–3 days stay',
    stayDaysHi: '2–3 दिन भर्ती',
    price: 55000,
    tag: 'Baby care included',
    tagHi: 'शिशु देखभाल व कमरा शामिल',
    whatItInvolves: 'Complete delivery package with pediatrician attendance, baby care, and lactation consult.',
    whatItInvolvesHi: 'बाल रोग विशेषज्ञ, नवजात शिशु देखभाल और स्तनपान परामर्श सहित संपूर्ण प्रसूति पैकेज।',
    recoveryTimeline: '24–48 hours private room monitoring.',
    recoveryTimelineHi: '24–48 घंटे प्राइवेट रूम में विशेषज्ञ देखरेख।',
  },
  {
    id: 'surg-angioplasty',
    shortName: 'Coronary angioplasty',
    shortNameHi: 'हार्ट एंजियोप्लास्टी (Heart Stent)',
    name: 'PTCA with Drug Eluting Stent',
    nameHi: 'ड्रग एल्यूटिंग स्टेंट एंजियोप्लास्टी (PTCA)',
    category: 'Cardiology',
    stayDays: '2 days stay',
    stayDaysHi: '2 दिन भर्ती',
    price: 110000,
    tag: 'Cardiac desk',
    tagHi: 'कार्डियक डेस्क सहायता',
    whatItInvolves: 'Radial or femoral artery catheterization to clear blockages with DES stent.',
    whatItInvolvesHi: 'धमनियों में जमा ब्लॉकेज को हटाकर यूएस-एफडीए स्वीकृत स्टेंट लगाना।',
    recoveryTimeline: 'Radial site recovery with normal walking next morning.',
    recoveryTimelineHi: 'अगली सुबह से सामान्य चलना-फिरना शुरू।',
  },
  {
    id: 'surg-kidney-stone',
    shortName: 'Kidney stone removal',
    shortNameHi: 'गुर्दे की पथरी लेजर (Kidney Stone)',
    name: 'Laser RIRS / PCNL Lithotripsy',
    nameHi: 'लेजर RIRS / PCNL लिथोट्रिप्सी (Laser)',
    category: 'Urology',
    stayDays: '1 day stay',
    stayDaysHi: '1 दिन भर्ती',
    price: 42000,
    tag: 'No-cut laser',
    tagHi: 'बिना चीरे वाली लेजर',
    whatItInvolves: 'Holmium laser dusting of stones through natural urinary tract with zero incisions.',
    whatItInvolvesHi: 'होलमियम लेजर द्वारा बिना किसी चीरे के पथरी को पाउडर बनाकर बाहर निकालना।',
    recoveryTimeline: 'Same-day or next-morning discharge.',
    recoveryTimelineHi: 'उसी दिन या अगली सुबह तक डिस्चार्ज।',
  },
  {
    id: 'surg-cataract',
    shortName: 'Cataract eye surgery',
    shortNameHi: 'मोतियाबिंद ऑपरेशन (Cataract)',
    name: 'Micro-Incision Phaco Laser',
    nameHi: 'माइक्रो-इंसीजन फेको लेजर (Phaco Lens)',
    category: 'Ophthalmology',
    stayDays: 'Daycare (4 hrs)',
    stayDaysHi: 'डेकेयर (4 घंटे)',
    price: 24000,
    tag: 'Bladeless phaco',
    tagHi: 'ब्लेडलेस फोल्डेबल लेंस',
    whatItInvolves: 'Foldable hydrophobic IOL lens implantation under gentle topical drop anesthesia.',
    whatItInvolvesHi: 'आई-ड्रॉप एनेस्थीसिया के साथ प्रीमियम हाइड्रोफोबिक फोल्डेबल लेंस प्रत्यारोपण।',
    recoveryTimeline: 'Walk home in 4 hours; crystal clear vision next day.',
    recoveryTimelineHi: '4 घंटे में घर जाएं; अगले दिन से स्पष्ट दृष्टि।',
  },
  {
    id: 'surg-appendix',
    shortName: 'Appendectomy',
    shortNameHi: 'अपेंडिक्स सर्जरी (Appendectomy)',
    name: 'Emergency Laparoscopic Appendectomy',
    nameHi: 'इमरजेंसी लैप्रोस्कोपिक अपेंडिसेक्टॉमी',
    category: 'GeneralSurgery',
    stayDays: '1–2 days stay',
    stayDaysHi: '1–2 दिन भर्ती',
    price: 40000,
    tag: 'Emergency fast-track',
    tagHi: 'आपातकालीन त्वरित भर्ती',
    whatItInvolves: 'Urgent keyhole removal of inflamed appendix to prevent abdominal perforation.',
    whatItInvolvesHi: 'सूजे हुए अपेंडिक्स को कीहोल सर्जरी से तुरंत सुरक्षित रूप से बाहर निकालना।',
    recoveryTimeline: 'Prompt discharge within 24–36 hours.',
    recoveryTimelineHi: '24–36 घंटों के भीतर सुरक्षित डिस्चार्ज।',
  },
];

const MASTER_HOSPITALS: HospitalAdmissionInfo[] = [
  {
    id: 'hosp-1',
    name: 'Max Super Speciality Hospital',
    nameHi: 'मैक्स सुपर स्पेशियलिटी अस्पताल (Max Hospital)',
    location: 'Press Enclave Marg, Saket',
    locationHi: 'प्रेस एन्क्लेव मार्ग, साकेत',
    distance_km: 1.4,
    image_url:
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    total_reviews: 420,
    tag: 'NABH Accredited Partner',
    tagHi: 'NABH मान्यता प्राप्त पार्टनर',
    specialties: ['Cardiology', 'Orthopedics', 'Laparoscopy'],
    specialtiesHi: ['हृदय रोग', 'हड्डी व जोड़', 'लैप्रोस्कोपी'],
  },
  {
    id: 'hosp-2',
    name: 'Indraprastha Apollo Hospitals',
    nameHi: 'इंद्रप्रस्थ अपोलो अस्पताल (Apollo Hospitals)',
    location: 'Mathura Road, Sarita Vihar',
    locationHi: 'मथुरा रोड, सरिता विहार',
    distance_km: 8.1,
    image_url:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    total_reviews: 490,
    tag: 'JCI & NABH Certified',
    tagHi: 'JCI व NABH प्रमाणित',
    specialties: ['Cardiac Surgery', 'Joint Care', 'Transplant'],
    specialtiesHi: ['कार्डियक सर्जरी', 'जोड़ देखभाल', 'अंग प्रत्यारोपण'],
  },
  {
    id: 'hosp-3',
    name: 'Fortis Escorts Heart Institute',
    nameHi: 'फोर्टिस एस्कॉर्ट्स हार्ट इंस्टीट्यूट (Fortis Escorts)',
    location: 'Okhla Road, Sukhdev Vihar',
    locationHi: 'ओखला रोड, सुखदेव विहार',
    distance_km: 6.5,
    image_url:
      'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    total_reviews: 350,
    tag: 'Specialist Cardiac Care',
    tagHi: 'विशेषज्ञ हृदय देखभाल',
    specialties: ['Cardiac Surgery', 'Vascular Care', 'Cathlab'],
    specialtiesHi: ['हृदय शल्य चिकित्सा', 'वैस्कुलर केयर', 'कैथलैब'],
  },
  {
    id: 'hosp-4',
    name: 'Medanta Super Speciality Clinic',
    nameHi: 'मेदांता सुपर स्पेशियलिटी क्लिनिक (Medanta)',
    location: 'Defence Colony, South Delhi',
    locationHi: 'डिफेंस कॉलोनी, दक्षिण दिल्ली',
    distance_km: 5.0,
    image_url:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    total_reviews: 280,
    tag: 'Cashless Desk Partner',
    tagHi: 'कैशलेस डेस्क पार्टनर',
    specialties: ['Minimal Invasive', 'Urology', 'General Surgery'],
    specialtiesHi: ['कम चीरे वाली सर्जरी', 'मूत्र रोग', 'जनरल सर्जरी'],
  },
];

// Room choice cards
const getRoomOptions = (isHi: boolean) => [
  {
    id: 'DELUXE',
    title: isHi ? 'सिंगल डीलक्स रूम (Single Deluxe)' : 'Single Deluxe',
    subtitle: isHi ? 'मरीज व तीमारदार हेतु प्राइवेट अटैच्ड रूम' : 'Private en-suite room for patient & attendant',
    icon: (c: string) => <Bed size={18} color={c} />,
  },
  {
    id: 'SEMI',
    title: isHi ? 'ट्विन शेयरिंग (Twin Sharing)' : 'Twin Sharing',
    subtitle: isHi ? 'पर्दे के विभाजन के साथ दो मरीजों का रूम' : 'Semi-private room with curtain partition',
    icon: (c: string) => <Users size={18} color={c} />,
  },
  {
    id: 'GENERAL',
    title: isHi ? 'जनरल वार्ड (General Ward)' : 'General Ward',
    subtitle: isHi ? 'किफायती साझा अस्पताल वार्ड' : 'Economy multi-bed shared healthcare ward',
    icon: (c: string) => <Building2 size={18} color={c} />,
  },
  {
    id: 'ICU',
    title: isHi ? 'आईसीयू (ICU / Critical Care)' : 'ICU / Critical Care',
    subtitle: isHi ? 'निरंतर कार्डियक टेलीमेट्री व गहन निगरानी' : 'Continuous cardiac telemetry & specialist care',
    icon: (c: string) => <HeartPulseIcon size={18} color={c} />,
  },
];

export default function IpdScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Bottom Sheet State for Procedure / Hospital Booking
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalAdmissionInfo | null>(null);

  // Booking fields
  const [patientName, setPatientName] = useState(user?.full_name || 'Rahul Jain');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98112 44550');
  const [roomType, setRoomType] = useState<'DELUXE' | 'SEMI' | 'GENERAL' | 'ICU'>('DELUXE');
  const [insurancePolicy, setInsurancePolicy] = useState('Star Health Insurance');
  const [admissionReason, setAdmissionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  // Doctor Slip Upload Sheet State
  const [adviceSheetVisible, setAdviceSheetVisible] = useState(false);
  const [adviceNote, setAdviceNote] = useState('');
  const [isSubmittingAdvice, setIsSubmittingAdvice] = useState(false);
  const [adviceSuccessRef, setAdviceSuccessRef] = useState<string | null>(null);

  // Filtered surgeries based on search query
  const filteredSurgeries = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_SURGERIES;
    const q = searchQuery.toLowerCase().trim();
    return MASTER_SURGERIES.filter(
      (s) =>
        s.shortName.toLowerCase().includes(q) ||
        (s.shortNameHi && s.shortNameHi.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q) ||
        (s.nameHi && s.nameHi.toLowerCase().includes(q)) ||
        s.tag.toLowerCase().includes(q) ||
        (s.tagHi && s.tagHi.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered hospitals based on search query
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_HOSPITALS;
    const q = searchQuery.toLowerCase().trim();
    return MASTER_HOSPITALS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.nameHi && h.nameHi.toLowerCase().includes(q)) ||
        h.location.toLowerCase().includes(q) ||
        (h.locationHi && h.locationHi.toLowerCase().includes(q)) ||
        h.specialties.some((spec) => spec.toLowerCase().includes(q)) ||
        (h.specialtiesHi && h.specialtiesHi.some((spec) => spec.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  // Handlers to open bottom sheet
  const handleOpenProcedureSheet = (surgery: PlannedSurgery) => {
    setSelectedSurgery(surgery);
    setSelectedHospital(MASTER_HOSPITALS[0]);
    setConfirmedBookingId(null);
    setBottomSheetVisible(true);
  };

  const handleOpenHospitalBooking = (hosp: HospitalAdmissionInfo) => {
    setSelectedHospital(hosp);
    setSelectedSurgery(null);
    setConfirmedBookingId(null);
    setBottomSheetVisible(true);
  };

  // Submit Admission Request
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
      hospital_name: selectedHospital?.name || 'Partner Hospital',
      doctor_fee: selectedSurgery ? selectedSurgery.price : 0,
      slot_time: 'Tomorrow, Morning Admission',
      specialty_requested: selectedSurgery ? selectedSurgery.name : 'Hospital Admission',
      status: 'NEW',
      call_status: 'pending',
      notes: `Room: ${roomType}. Insurance: ${insurancePolicy}. Reason: ${admissionReason || 'Inpatient admission booking assistance.'
        }`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBookingId(bookingRef);
    }, 600);
  };

  // Submit Doctor's Slip Upload
  const handleConfirmAdviceUpload = async () => {
    setIsSubmittingAdvice(true);
    const adviceRef = `AN-ADV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: adviceRef,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: 'Adityam Hospital Care Concierge Desk',
      specialty_requested: 'Doctor Advice Slip Upload',
      status: 'NEW',
      call_status: 'pending',
      notes: `Slip note: ${adviceNote || 'Doctor advised hospital admission.'}`,
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
    }, 600);
  };

  // Icon for category
  const iconForCategory = (cat: string) => {
    const accent = CATEGORY_ACCENT[cat] || '#2563EB';
    switch (cat) {
      case 'GeneralSurgery':
        return <IpdHospitalBedIcon size={22} color={accent} />;
      case 'Orthopedics':
        return <BoneJointIcon size={22} color={accent} />;
      case 'Cardiology':
        return <HeartPulseIcon size={22} color={accent} />;
      case 'Maternity':
        return <ChildCareIcon size={22} color={accent} />;
      case 'Urology':
        return <Activity size={22} color={accent} />;
      default:
        return <Sparkles size={22} color={accent} />;
    }
  };

  const roomOptions = getRoomOptions(isHi);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" translucent={false} />

      {/* Main Content Container with max width constraint for tablets/web */}
      <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* Consistent Standard Header & Search Bar */}
        <AppHeader
          title={isHi ? 'अस्पताल भर्ती (IPD)' : 'Hospital Admissions'}
          onPressProfile={() => setProfileVisible(true)}
        >
          <AppSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={isHi ? 'सर्जरी, प्रक्रिया या अस्पताल खोजें...' : 'Search surgery, procedure or hospital...'}
          />
        </AppHeader>

        {/* SCROLLABLE BODY */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 16) + 76,
          }}
        >
          {/* 2. ONE HERO ACTION CARD (Merged Upload & Insurance) */}
          <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
            <View
              style={{
                backgroundColor: '#1E40AF',
                borderRadius: 20,
                padding: 18,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Tag */}
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BFDBFE' }}>
                  {isHi ? 'आदित्यम केयर कंसीयर्ज' : 'ADITYAM CARE CONCIERGE'}
                </Text>
              </View>

              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 }}>
                {isHi
                  ? 'डॉक्टर का पर्चा है? अपलोड करें, हमारे सलाहकार तुरंत संपर्क करेंगे'
                  : "Have a doctor's advice? Upload it, an advisor calls you"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '400',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginTop: 4,
                  lineHeight: 17,
                }}
              >
                {isHi
                  ? 'हम शीर्ष प्रमाणित अस्पतालों में पैकेज दरों की तुलना करते हैं और कैशलेस बीमा प्री-ऑथ संभालते हैं।'
                  : 'We compare package rates across top accredited hospitals & handle your cashless insurance pre-auth.'}
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                onPress={() => {
                  setAdviceSuccessRef(null);
                  setAdviceSheetVisible(true);
                }}
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  alignSelf: 'flex-start',
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={14} color="#1E40AF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF' }}>
                  {isHi ? 'पर्चा अपलोड करें और कॉल पाएं →' : 'Upload Slip & Get Call →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. FOUR-STEP "HOW IT WORKS" STRIP */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 14,
              marginHorizontal: 16,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
              {isHi ? 'अस्पताल कंसीयर्ज कैसे काम करता है' : 'How Hospital Concierge Works'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
              {/* Connecting line behind circles */}
              <View
                style={{
                  position: 'absolute',
                  top: 15,
                  left: 24,
                  right: 24,
                  height: 2,
                  backgroundColor: '#E2E8F0',
                  zIndex: 0,
                }}
              />

              {/* Step 1 */}
              <View style={{ alignItems: 'center', width: '23%', zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 2,
                    borderColor: '#2563EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>1</Text>
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#0F172A', marginTop: 4, textAlign: 'center', lineHeight: 14 }}>
                  {isHi ? 'पर्चा भेजें\n(Upload)' : 'Upload slip'}
                </Text>
              </View>

              {/* Step 2 */}
              <View style={{ alignItems: 'center', width: '23%', zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 2,
                    borderColor: '#2563EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>2</Text>
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#0F172A', marginTop: 4, textAlign: 'center', lineHeight: 14 }}>
                  {isHi ? 'सलाहकार कॉल\n(Advisor)' : 'Advisor calls'}
                </Text>
              </View>

              {/* Step 3 */}
              <View style={{ alignItems: 'center', width: '23%', zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 2,
                    borderColor: '#2563EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>3</Text>
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#0F172A', marginTop: 4, textAlign: 'center', lineHeight: 14 }}>
                  {isHi ? 'दरें तुलना\n(Compare)' : 'Compare'}
                </Text>
              </View>

              {/* Step 4 */}
              <View style={{ alignItems: 'center', width: '23%', zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#EFF6FF',
                    borderWidth: 2,
                    borderColor: '#2563EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>4</Text>
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#0F172A', marginTop: 4, textAlign: 'center', lineHeight: 14 }}>
                  {isHi ? 'भर्ती सहायता\n(Admission)' : 'Get admitted'}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. PROCEDURES (Two-Column Tile Grid) */}
          <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? 'प्रमुख सर्जरी व उपचार पैकेज' : 'Common Procedures & Packages'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'कैशलेस बीमा प्री-ऑथ सहायता के साथ निश्चित लागत पैकेज' : 'Fixed-cost packages with pre-auth insurance support'}
                </Text>
              </View>
            </View>

            {filteredSurgeries.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 18,
                  padding: 24,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>
                  {isHi ? `"${searchQuery}" से कोई प्रक्रिया नहीं मिली` : `No procedures match "${searchQuery}"`}
                </Text>
              </View>
            ) : isLoading ? (
              <View style={{ width: '100%' }}>
                <IpdCardSkeleton />
                <IpdCardSkeleton />
                <IpdCardSkeleton />
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  rowGap: 12,
                }}
              >
                {filteredSurgeries.map((s, i) => {
                  const displayName = isHi && s.nameHi ? s.nameHi : s.name;
                  const displayShort = isHi && s.shortNameHi ? s.shortNameHi : s.shortName;
                  const displayStay = isHi && s.stayDaysHi ? s.stayDaysHi : s.stayDays;
                  const displayTag = isHi && s.tagHi ? s.tagHi : s.tag;

                  return (
                    <PressableCard
                      key={s.id}
                      index={i}
                      style={{ width: '48.5%' }}
                      onPress={() => handleOpenProcedureSheet(s)}
                    >
                      <View
                        style={{
                          backgroundColor: TINT[s.category] || '#F8FAFC',
                          borderRadius: 22,
                          padding: 14,
                          minHeight: 165,
                          justifyContent: 'space-between',
                          borderWidth: 1,
                          borderColor: 'rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {/* Top White Icon Tile + Tag */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 13,
                              backgroundColor: '#FFFFFF',
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: '#0F172A',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            {iconForCategory(s.category)}
                          </View>

                          <View
                            style={{
                              backgroundColor: '#FFFFFF',
                              paddingHorizontal: 7,
                              paddingVertical: 2.5,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>
                              {displayStay}
                            </Text>
                          </View>
                        </View>

                        {/* Title & Medical Subtitle */}
                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 18 }}
                            numberOfLines={2}
                          >
                            {displayShort}
                          </Text>
                          <Text
                            style={{ fontSize: 10.5, fontWeight: '400', color: '#64748B', marginTop: 2 }}
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>
                        </View>

                        {/* Bottom Row: Feature Tag & Price Pill */}
                        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.05)' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: CATEGORY_ACCENT[s.category] || '#2563EB' }} numberOfLines={1}>
                              {displayTag}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              {inr(s.price)}*
                            </Text>
                          </View>

                          {/* Interactive subtle CTA tap prompt */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>
                              {isHi ? 'परामर्श व पैकेज →' : 'Book Consultation →'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </PressableCard>
                  );
                })}
              </View>
            )}
          </View>

          {/* 5. TOP ACCREDITED PARTNER HOSPITALS (Horizontal Carousel) */}
          <View style={{ marginTop: 22, paddingBottom: 10 }}>
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                {isHi ? 'शीर्ष मान्यता प्राप्त अस्पताल नेटवर्क' : 'Top Accredited Partner Hospitals'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B', marginTop: 1 }}>
                {isHi ? 'कैशलेस भर्ती डेस्क और समर्पित मरीज सहायता' : 'Direct cashless admission desk & dedicated patient care'}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
            >
              {filteredHospitals.map((hosp, idx) => {
                const displayName = isHi && hosp.nameHi ? hosp.nameHi : hosp.name;
                const displayLoc = isHi && hosp.locationHi ? hosp.locationHi : hosp.location;
                const displayTag = isHi && hosp.tagHi ? hosp.tagHi : hosp.tag;

                return (
                  <PressableCard
                    key={hosp.id}
                    index={idx}
                    style={{ width: 280 }}
                    onPress={() => handleOpenHospitalBooking(hosp)}
                  >
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Photo with Rating and Distance */}
                      <View style={{ height: 130, position: 'relative', backgroundColor: '#EFF6FF' }}>
                        <Image
                          source={{ uri: hosp.image_url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.65)']}
                          style={StyleSheet.absoluteFill}
                        />

                        {/* Rating Badge */}
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Star size={11} color="#D97706" fill="#D97706" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>
                            {hosp.rating}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            ({hosp.total_reviews})
                          </Text>
                        </View>

                        {/* Distance Badge */}
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            left: 8,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <MapPin size={11} color="#93C5FD" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                            {hosp.distance_km} {isHi ? 'किमी दूर' : 'km away'}
                          </Text>
                        </View>
                      </View>

                      {/* Content: Name, location, and one tag */}
                      <View style={{ padding: 14 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 18 }}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        <Text
                          style={{ fontSize: 11, fontWeight: '400', color: '#64748B', marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {displayLoc}
                        </Text>

                        {/* Single clean tag */}
                        <View
                          style={{
                            marginTop: 10,
                            alignSelf: 'flex-start',
                            backgroundColor: '#EFF6FF',
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563EB' }}>
                            {displayTag}
                          </Text>
                        </View>

                        {/* Quick Action Button */}
                        <TouchableOpacity
                          onPress={() => handleOpenHospitalBooking(hosp)}
                          activeOpacity={0.85}
                          style={{
                            marginTop: 12,
                            backgroundColor: '#2563EB',
                            paddingVertical: 9,
                            borderRadius: 12,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                            {isHi ? 'भर्ती बुक करें →' : 'Book Admission →'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </PressableCard>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* ---------------- 6. BOTTOM SHEET: PROCEDURE & HOSPITAL ADMISSION BOOKING ---------------- */}
      <Modal
        visible={bottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBottomSheetVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
        >
          {/* Backdrop Tap */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setBottomSheetVisible(false)}
          />

          {/* Bottom Sheet Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              maxHeight: '88%',
              maxWidth: 520,
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Drag Handle */}
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#CBD5E1',
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />

            {/* Header: Title & Close */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                  {selectedSurgery
                    ? (isHi && selectedSurgery.shortNameHi ? selectedSurgery.shortNameHi : selectedSurgery.shortName)
                    : (selectedHospital ? (isHi && selectedHospital.nameHi ? selectedHospital.nameHi : selectedHospital.name) : '')}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B', marginTop: 1 }}>
                  {selectedSurgery
                    ? (isHi && selectedSurgery.nameHi ? selectedSurgery.nameHi : selectedSurgery.name)
                    : (selectedHospital ? (isHi && selectedHospital.locationHi ? selectedHospital.locationHi : selectedHospital.location) : '')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setBottomSheetVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {confirmedBookingId ? (
              /* Success View */
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle2 size={32} color="#059669" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                  {isHi ? 'भर्ती अनुरोध पंजीकृत हो गया है' : 'Admission Request Registered'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 4 }}>
                  {isHi ? 'संदर्भ आईडी: ' : 'Reference ID: '}{confirmedBookingId}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 8,
                    lineHeight: 18,
                    paddingHorizontal: 12,
                  }}
                >
                  {isHi
                    ? 'हमारे वरिष्ठ चिकित्सा सलाहकार 15 मिनट के भीतर आपसे संपर्क कर अस्पताल विकल्प, रूम उपलब्धता और कैशलेस प्री-ऑथ प्रक्रिया शुरू करेंगे।'
                    : 'Our senior medical advisor will call you within 15 minutes to review hospital options, room availability, and initiate your cashless pre-auth.'}
                </Text>

                <TouchableOpacity
                  onPress={() => setBottomSheetVisible(false)}
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    marginTop: 20,
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {isHi ? 'पूर्ण' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Booking Form */
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                {selectedSurgery && (
                  /* Package Overview Card */
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#DBEAFE',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>
                        {isHi ? 'पैकेज विवरण' : 'PACKAGE OVERVIEW'}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E40AF' }}>
                        {isHi && selectedSurgery.stayDaysHi ? selectedSurgery.stayDaysHi : selectedSurgery.stayDays}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', marginTop: 4, lineHeight: 16 }}>
                      {isHi && selectedSurgery.whatItInvolvesHi ? selectedSurgery.whatItInvolvesHi : selectedSurgery.whatItInvolves}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>
                        {isHi ? 'रिकवरी: ' : 'Recovery: '}
                        {isHi && selectedSurgery.recoveryTimelineHi ? selectedSurgery.recoveryTimelineHi : selectedSurgery.recoveryTimeline}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D4ED8' }}>
                        {isHi ? 'न्यूनतम ' : 'From '}{inr(selectedSurgery.price)}*
                      </Text>
                    </View>
                  </View>
                )}

                {/* Visual Room Choice Section */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
                  {isHi ? 'पसंदीदा रूम चुनें' : 'Choose Room Preference'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 14 }}>
                  {roomOptions.map((r) => {
                    const isSelected = roomType === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setRoomType(r.id as any)}
                        activeOpacity={0.85}
                        style={{
                          width: '48.5%',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                          borderRadius: 14,
                          padding: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: isSelected ? '#DBEAFE' : '#F1F5F9',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {r.icon(isSelected ? '#2563EB' : '#64748B')}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isSelected ? '#1E40AF' : '#0F172A',
                            }}
                            numberOfLines={1}
                          >
                            {r.title}
                          </Text>
                          <Text
                            style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}
                            numberOfLines={1}
                          >
                            {r.subtitle}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Patient Information Inputs */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                  {isHi ? 'मरीज संपर्क विवरण' : 'Patient Contact Details'}
                </Text>
                <View style={{ gap: 8, marginBottom: 14 }}>
                  <TextInput
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder={isHi ? 'मरीज का पूरा नाम' : 'Patient full name'}
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                  <TextInput
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                    placeholder={isHi ? 'कॉल के लिए मोबाइल नंबर' : 'Mobile number for callback'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                  <TextInput
                    value={insurancePolicy}
                    onChangeText={setInsurancePolicy}
                    placeholder={isHi ? 'स्वास्थ्य बीमा कंपनी (उदा. स्टार हेल्थ, केयर)' : 'Health Insurance provider (e.g. Star Health, Care)'}
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                  <TextInput
                    value={admissionReason}
                    onChangeText={setAdmissionReason}
                    placeholder={isHi ? 'संक्षिप्त विवरण (उदा. डॉक्टर ने अगले हफ्ते सर्जरी की सलाह दी)' : 'Brief notes (e.g. doctor advised surgery next week)'}
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#0F172A',
                    }}
                  />
                </View>

                {/* Cashless guarantee note */}
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    borderRadius: 12,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <ShieldCheck size={16} color="#059669" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#065F46', flex: 1 }}>
                    {isHi
                      ? 'कैशलेस प्री-ऑथ और प्राथमिकता अस्पताल डेस्क भर्ती हेतु समर्पित सहायता।'
                      : 'Dedicated assistance for cashless pre-auth & priority hospital desk admission.'}
                  </Text>
                </View>

                {/* Submit CTA */}
                <TouchableOpacity
                  onPress={handleConfirmAdmissionBooking}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 14,
                    paddingVertical: 13,
                    alignItems: 'center',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                      {isHi ? 'भर्ती सहायता का अनुरोध करें' : 'Request Admission Assistance'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---------------- 7. BOTTOM SHEET: DOCTOR ADVICE SLIP UPLOAD ---------------- */}
      <Modal
        visible={adviceSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdviceSheetVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setAdviceSheetVisible(false)}
          />

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              maxHeight: '80%',
              maxWidth: 520,
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Drag Handle */}
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#CBD5E1',
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}
            >
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  {isHi ? "डॉक्टर का पर्चा अपलोड करें" : "Upload Doctor's Advice Slip"}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B', marginTop: 1 }}>
                  {isHi ? 'पारदर्शी अस्पताल दरें और बीमा सहायता प्राप्त करें' : 'Get transparent hospital rates & insurance assistance'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAdviceSheetVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {adviceSuccessRef ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle2 size={32} color="#059669" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                  {isHi ? 'पर्चा सफलतापूर्वक प्राप्त हुआ' : 'Slip Received Successfully'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 4 }}>
                  {isHi ? 'केस आईडी: ' : 'Case ID: '}{adviceSuccessRef}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 8,
                    lineHeight: 18,
                  }}
                >
                  {isHi
                    ? `आदित्यम केयर सलाहकार आपके पर्चे की समीक्षा कर रहे हैं। हम जल्द ही ${patientPhone} पर अस्पताल पैकेज अनुमान के साथ संपर्क करेंगे।`
                    : `An Adityam care advisor is reviewing your prescription. We will contact you at ${patientPhone} with comparative package estimates.`}
                </Text>

                <TouchableOpacity
                  onPress={() => setAdviceSheetVisible(false)}
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    marginTop: 20,
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {isHi ? 'पूर्ण' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                {/* Upload simulated box */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#93C5FD',
                    borderRadius: 16,
                    padding: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Upload size={24} color="#2563EB" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 8 }}>
                    {isHi ? 'डॉक्टर का पर्चा संलग्न करें' : "Doctor's prescription attached"}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {isHi ? 'पीडीएफ या फोटो (अधिकतम 10 एमबी)' : 'PDF or Image (Max 10 MB)'}
                  </Text>
                </View>

                {/* Additional details */}
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder={isHi ? 'मरीज का नाम' : 'Patient name'}
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#0F172A',
                    marginBottom: 8,
                  }}
                />

                <TextInput
                  value={patientPhone}
                  onChangeText={setPatientPhone}
                  placeholder={isHi ? 'संपर्क फोन नंबर' : 'Contact phone number'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#0F172A',
                    marginBottom: 8,
                  }}
                />

                <TextInput
                  value={adviceNote}
                  onChangeText={setAdviceNote}
                  placeholder={isHi ? 'उपचार या अस्पताल की प्राथमिकता का विवरण लिखें...' : 'Describe advised treatment or specific hospital preference...'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#0F172A',
                    minHeight: 70,
                    textAlignVertical: 'top',
                    marginBottom: 14,
                  }}
                />

                <TouchableOpacity
                  onPress={handleConfirmAdviceUpload}
                  disabled={isSubmittingAdvice}
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 14,
                    paddingVertical: 13,
                    alignItems: 'center',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                >
                  {isSubmittingAdvice ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                      {isHi ? 'पर्चा भेजें और कॉल का अनुरोध करें' : 'Submit Advice & Request Callback'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile & Language Modal */}
      <ProfileModal visible={profileVisible} onClose={() => setProfileVisible(false)} />
    </View>
  );
}
