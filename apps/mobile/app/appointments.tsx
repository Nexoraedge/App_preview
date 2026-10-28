// apps/mobile/app/appointments.tsx
// Comprehensive Appointments screen for Adityam Niramayaa.
// Supports Upcoming consultations, Past/Completed visits, Digital Appointment Slips/QR,
// Directions, Prescription download simulation, and Hindi/English localization.

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Alert,
  Share,
  Dimensions,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  ChevronRight,
  Download,
  QrCode,
  X,
  Search,
  User,
  Building2,
  Stethoscope,
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  Share2,
  Eye,
  ShieldCheck,
  Check,
  Activity,
  Scissors,
  Sparkles,
  PhoneCall,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, ServiceType, BookingStatus } from '@adityam/types';
import {
  fetchAllBookings,
  updateBookingStatus,
  subscribeBookings,
} from '../src/services/bookingStorage';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { PressableCard } from '../components/PressableCard';

export interface EnrichedAppointment {
  id: string;
  bookingRef: string;
  serviceType: ServiceType;
  status: BookingStatus;
  doctorName: string;
  doctorNameHi: string;
  specialty: string;
  specialtyHi: string;
  qualification: string;
  hospitalName: string;
  hospitalNameHi: string;
  hospitalAddress: string;
  hospitalAddressHi: string;
  patientName: string;
  patientPhone: string;
  slotDate: string;
  slotDateHi: string;
  slotTime: string;
  tokenNumber: number;
  roomNumber: string;
  doctorFee: number;
  paymentStatus: 'PAID' | 'PAY_AT_CLINIC';
  prescriptionUrl?: string;
  isUpcoming: boolean;
  notes?: string;
  createdDate: string;
}

// Initial Realistic Seed Appointments
const SEED_APPOINTMENTS: EnrichedAppointment[] = [
  {
    id: 'apt-1',
    bookingRef: 'AN-OPD-7821',
    serviceType: 'OPD_CONCIERGE',
    status: 'CONFIRMED',
    doctorName: 'Dr. Satish Jain',
    doctorNameHi: 'डॉ. सतीश जैन',
    specialty: 'ENT & Head-Neck Surgery',
    specialtyHi: 'ईएनटी व हेड-नेक विशेषज्ञ',
    qualification: 'MBBS, MS (ENT), DLO • 24+ Yrs Exp • 5.0 ★',
    hospitalName: 'Jain ENT Hospital',
    hospitalNameHi: 'जैन ईएनटी अस्पताल',
    hospitalAddress: 'Press Enclave Marg, Saket, New Delhi',
    hospitalAddressHi: 'प्रेस एन्क्लेव मार्ग, साकेत, नई दिल्ली',
    patientName: 'Rahul Jain',
    patientPhone: '+91 98112 44550',
    slotDate: 'Tomorrow, Oct 21',
    slotDateHi: 'कल, 21 अक्टूबर',
    slotTime: '10:30 AM',
    tokenNumber: 14,
    roomNumber: 'OPD Block B, Room 204',
    doctorFee: 800,
    paymentStatus: 'PAID',
    isUpcoming: true,
    notes: 'Ear & sinus consultation with Dr. Satish Jain.',
    createdDate: 'Oct 19, 2026',
  },
  {
    id: 'apt-2',
    bookingRef: 'AN-IPD-4412',
    serviceType: 'IPD_ENQUIRY',
    status: 'CONFIRMED',
    doctorName: 'Dr. Alok Verma & Surgery Team',
    doctorNameHi: 'डॉ. आलोक वर्मा व सर्जरी टीम',
    specialty: 'Laparoscopic Surgery',
    specialtyHi: 'लैप्रोस्कोपिक सर्जरी (General Surgery)',
    qualification: 'MS (General Surgery), FIAGES • 18+ Yrs Exp • 5.0 ★',
    hospitalName: 'CSK Hospital',
    hospitalNameHi: 'सीएसके अस्पताल',
    hospitalAddress: 'A-24, Outer Ring Road, South Extension, New Delhi',
    hospitalAddressHi: 'साउथ एक्सटेंशन, नई दिल्ली',
    patientName: 'Rahul Jain',
    patientPhone: '+91 98112 44550',
    slotDate: 'Friday, Oct 24',
    slotDateHi: 'शुक्रवार, 24 अक्टूबर',
    slotTime: '02:00 PM',
    tokenNumber: 5,
    roomNumber: 'Concierge Desk, Ground Floor',
    doctorFee: 45000,
    paymentStatus: 'PAY_AT_CLINIC',
    isUpcoming: true,
    notes: 'Gallbladder keyhole procedure pre-admission evaluation.',
    createdDate: 'Oct 18, 2026',
  },
  {
    id: 'apt-3',
    bookingRef: 'AN-OPD-6109',
    serviceType: 'OPD_CONCIERGE',
    status: 'PAID',
    doctorName: 'Dr. Sunita Mehra',
    doctorNameHi: 'डॉ. सुनीता मेहरा',
    specialty: 'Pediatrics & Child Care',
    specialtyHi: 'बाल रोग विशेषज्ञ (Pediatrics)',
    qualification: 'MBBS, DCH, DNB (Pediatrics)',
    hospitalName: 'Fortis Memorial Research Institute',
    hospitalNameHi: 'फोर्टिस मेमोरियल रिसर्च इंस्टीट्यूट',
    hospitalAddress: 'Sector 44, Gurugram',
    hospitalAddressHi: 'सेक्टर 44, गुरुग्राम',
    patientName: 'Aarav Jain (Son)',
    patientPhone: '+91 98112 44550',
    slotDate: 'Oct 12, 2026',
    slotDateHi: '12 अक्टूबर 2026',
    slotTime: '11:30 AM',
    tokenNumber: 9,
    roomNumber: 'Pediatrics Wing, Room 102',
    doctorFee: 800,
    paymentStatus: 'PAID',
    prescriptionUrl: 'https://adityam.health/rx/AN-OPD-6109.pdf',
    isUpcoming: false,
    notes: 'Seasonal allergy & viral fever recovery checkup.',
    createdDate: 'Oct 11, 2026',
  },
  {
    id: 'apt-4',
    bookingRef: 'AN-OPD-5284',
    serviceType: 'OPD_CONCIERGE',
    status: 'PAID',
    doctorName: 'Dr. Vivek Tandon',
    doctorNameHi: 'डॉ. विवेक टंडन',
    specialty: 'Orthopedics & Joint Care',
    specialtyHi: 'हड्डी व जोड़ रोग (Orthopedics)',
    qualification: 'MBBS, MS (Ortho), MCh (Joint Replacement)',
    hospitalName: 'Medanta Super Speciality Clinic',
    hospitalNameHi: 'मेदांता सुपर स्पेशियलिटी क्लिनिक',
    hospitalAddress: 'Defence Colony, South Delhi',
    hospitalAddressHi: 'डिफेंस कॉलोनी, दक्षिण दिल्ली',
    patientName: 'Rahul Jain',
    patientPhone: '+91 98112 44550',
    slotDate: 'Sep 28, 2026',
    slotDateHi: '28 सितंबर 2026',
    slotTime: '04:00 PM',
    tokenNumber: 21,
    roomNumber: 'Ortho Suite 3',
    doctorFee: 1000,
    paymentStatus: 'PAID',
    prescriptionUrl: 'https://adityam.health/rx/AN-OPD-5284.pdf',
    isUpcoming: false,
    notes: 'Knee joint pain assessment. Physio advised.',
    createdDate: 'Sep 27, 2026',
  },
  {
    id: 'apt-5',
    bookingRef: 'AN-LAB-3190',
    serviceType: 'INVESTIGATION',
    status: 'PAID',
    doctorName: 'Comprehensive Health Checkup Desk',
    doctorNameHi: 'सम्पूर्ण स्वास्थ्य जांच डेस्क',
    specialty: 'Pathology & Diagnostics',
    specialtyHi: 'पैथोलॉजी व डायग्नोस्टिक्स (Lab)',
    qualification: 'NABL Accredited Diagnostics Team',
    hospitalName: 'Adityam Partner Labs • Saket Center',
    hospitalNameHi: 'आदित्यम पार्टनर लैब्स • साकेत केंद्र',
    hospitalAddress: 'Community Center, Saket, New Delhi',
    hospitalAddressHi: 'कम्युनिटी सेंटर, साकेत, नई दिल्ली',
    patientName: 'Rahul Jain',
    patientPhone: '+91 98112 44550',
    slotDate: 'Sep 15, 2026',
    slotDateHi: '15 सितंबर 2026',
    slotTime: '08:00 AM',
    tokenNumber: 3,
    roomNumber: 'Sample Collection Bay 2',
    doctorFee: 1499,
    paymentStatus: 'PAID',
    prescriptionUrl: 'https://adityam.health/reports/AN-LAB-3190.pdf',
    isUpcoming: false,
    notes: 'Lipid, HbA1c, Liver Function & Kidney Panel.',
    createdDate: 'Sep 14, 2026',
  },
];

type TabType = 'UPCOMING' | 'PAST' | 'ALL';

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>(SEED_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState<EnrichedAppointment | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real bookings from local storage & Supabase
  const loadBookings = useCallback(async () => {
    try {
      const data = await fetchAllBookings(user?.phone);
      if (Array.isArray(data) && data.length > 0) {
        // Merge with seeds
        const realMapped: EnrichedAppointment[] = data.map((b: Booking, idx: number) => {
          const isUpc = b.status === 'NEW' || b.status === 'CONFIRMED' || b.status === 'CALLING';
          return {
            id: b.id,
            bookingRef: b.booking_ref || `AN-${b.service_type.slice(0, 3)}-${1000 + idx}`,
            serviceType: b.service_type,
            status: b.status,
            doctorName: b.doctor_name || 'Dr. Satish Jain',
            doctorNameHi: b.doctor_name || 'डॉ. सतीश जैन',
            specialty: b.specialty_requested || 'ENT & Head-Neck Surgery',
            specialtyHi: b.specialty_requested || 'ईएनटी व हेड-नेक विशेषज्ञ',
            qualification: 'Certified Specialist • 5.0 ★',
            hospitalName: b.hospital_name || 'Jain ENT Hospital',
            hospitalNameHi: b.hospital_name || 'जैन ईएनटी अस्पताल',
            hospitalAddress: b.branch_name || 'Hospital Campus Desk',
            hospitalAddressHi: b.branch_name || 'अस्पताल परिसर डेस्क',
            patientName: b.patient_name || user?.full_name || 'Abhishek Jain',
            patientPhone: b.patient_phone || user?.phone || '+91 99999 99999',
            slotDate: b.slot_time ? b.slot_time.split(',')[0] || 'Scheduled Date' : 'Scheduled Date',
            slotDateHi: b.slot_time ? b.slot_time.split(',')[0] || 'नियत तिथि' : 'नियत तिथि',
            slotTime: b.slot_time && b.slot_time.includes(',') ? b.slot_time.split(',')[1].trim() : '11:00 AM',
            tokenNumber: 10 + (idx % 20),
            roomNumber: 'OPD Desk Room 101',
            doctorFee: b.doctor_fee || 800,
            paymentStatus: b.status === 'PAID' ? 'PAID' : 'PAY_AT_CLINIC',
            isUpcoming: isUpc,
            notes: b.notes || 'Hospital booking confirmed.',
            createdDate: new Date(b.created_at).toLocaleDateString(),
          };
        });

        // Avoid duplicate refs
        const existingRefs = new Set(realMapped.map((r) => r.bookingRef));
        const combined = [...realMapped, ...SEED_APPOINTMENTS.filter((s) => !existingRefs.has(s.bookingRef))];
        setAppointments(combined);
      } else {
        setAppointments([...SEED_APPOINTMENTS]);
      }
    } catch {
      setAppointments([...SEED_APPOINTMENTS]);
    }
  }, [user]);

  useEffect(() => {
    loadBookings();
    const unsubscribe = subscribeBookings(() => {
      loadBookings();
    });
    return unsubscribe;
  }, [loadBookings]);

  // Handle Manual Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBookings();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  }, [loadBookings]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (activeTab === 'UPCOMING') {
      list = list.filter((a) => a.isUpcoming);
    } else if (activeTab === 'PAST') {
      list = list.filter((a) => !a.isUpcoming);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (a) =>
        a.doctorName.toLowerCase().includes(q) ||
        (a.doctorNameHi && a.doctorNameHi.toLowerCase().includes(q)) ||
        a.hospitalName.toLowerCase().includes(q) ||
        (a.hospitalNameHi && a.hospitalNameHi.toLowerCase().includes(q)) ||
        a.specialty.toLowerCase().includes(q) ||
        (a.specialtyHi && a.specialtyHi.toLowerCase().includes(q)) ||
        a.bookingRef.toLowerCase().includes(q) ||
        a.patientName.toLowerCase().includes(q)
    );
  }, [appointments, activeTab, searchQuery]);

  const upcomingCount = useMemo(() => appointments.filter((a) => a.isUpcoming).length, [appointments]);
  const pastCount = useMemo(() => appointments.filter((a) => !a.isUpcoming).length, [appointments]);

  // Cancel Appointment Handler with permanent storage persistence
  const handleCancelAppointment = (apt: EnrichedAppointment) => {
    Alert.alert(
      isHi ? 'अपॉइंटमेंट रद्द करें' : 'Cancel Appointment',
      isHi
        ? `क्या आप निश्चित रूप से ${apt.doctorName} के साथ अपॉइंटमेंट (${apt.bookingRef}) रद्द करना चाहते हैं?`
        : `Are you sure you want to cancel appointment ${apt.bookingRef} with ${apt.doctorName}?`,
      [
        { text: isHi ? 'नहीं' : 'No', style: 'cancel' },
        {
          text: isHi ? 'हाँ, रद्द करें' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await updateBookingStatus(apt.bookingRef, 'CANCELLED', 'User requested cancellation');
            setAppointments((prev) =>
              prev.map((item) =>
                item.id === apt.id
                  ? { ...item, status: 'CANCELLED' as BookingStatus, isUpcoming: false }
                  : item
              )
            );
            if (selectedAppointment?.id === apt.id) {
              setTicketModalVisible(false);
            }
            Alert.alert(
              isHi ? 'अपॉइंटमेंट रद्द हो गई' : 'Appointment Cancelled',
              isHi
                ? 'आपकी अपॉइंटमेंट सफलतापूर्वक रद्द कर दी गई है।'
                : 'Your appointment has been cancelled successfully.'
            );
          },
        },
      ]
    );
  };

  // Directions
  const handleOpenMaps = (apt: EnrichedAppointment) => {
    const query = encodeURIComponent(`${apt.hospitalName}, ${apt.hospitalAddress}`);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Directions', 'Unable to open maps on this device.');
    });
  };

  // Prescription / Receipt Simulation
  const handleDownloadPrescription = (apt: EnrichedAppointment) => {
    Alert.alert(
      isHi ? 'प्रिस्क्रिप्शन व बिल डाउनलोड' : 'Download Prescription & Receipt',
      isHi
        ? `डॉ. ${apt.doctorName} का पर्चा और रसीद संदर्भ (${apt.bookingRef}) आपके डिवाइस पर सहेजा जा रहा है।`
        : `Prescription summary & invoice for ${apt.bookingRef} is ready for download.`,
      [
        {
          text: isHi ? 'शेयर करें' : 'Share',
          onPress: () => {
            Share.share({
              message: `Medical Visit Summary - ${apt.doctorName} at ${apt.hospitalName}. Ref: ${apt.bookingRef}. Date: ${apt.slotDate}.`,
            });
          },
        },
        { text: isHi ? 'ठीक है' : 'OK' },
      ]
    );
  };

  // Format Indian Currency
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Main Container constrained for tablets and web */}
      <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
        {/* TOP APP BAR */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={17} color="#0F172A" />
            </TouchableOpacity>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>
                {isHi ? 'मेरी अपॉइंटमेंट्स' : 'My Appointments'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 1 }} numberOfLines={1}>
                {isHi ? 'आगामी व पिछली विज़िट्स' : 'Upcoming & past consultations'}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: isRefreshing ? '#DBEAFE' : '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={15} color="#2563EB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/opd')}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#2563EB',
                paddingHorizontal: 10,
                paddingVertical: 6.5,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={13} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                {isHi ? 'नई बुकिंग' : 'Book New'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              paddingHorizontal: 12,
              paddingVertical: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Search size={16} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                isHi
                  ? 'डॉक्टर, अस्पताल या संदर्भ आईडी खोजें...'
                  : 'Search doctor, hospital or booking ID...'
              }
              placeholderTextColor="#94A3B8"
              style={[
                {
                  flex: 1,
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#0F172A',
                  padding: 0,
                },
                Platform.OS === 'web' && ({ outline: 'none', outlineStyle: 'none' } as any),
              ]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SEGMENT TABS */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View
            style={{
              backgroundColor: '#F1F5F9',
              borderRadius: 14,
              padding: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Upcoming Tab */}
            <TouchableOpacity
              onPress={() => setActiveTab('UPCOMING')}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                backgroundColor: activeTab === 'UPCOMING' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                shadowColor: activeTab === 'UPCOMING' ? '#0F172A' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'UPCOMING' ? 0.08 : 0,
                shadowRadius: 3,
                elevation: activeTab === 'UPCOMING' ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: activeTab === 'UPCOMING' ? '700' : '600',
                  color: activeTab === 'UPCOMING' ? '#1E40AF' : '#64748B',
                }}
              >
                {isHi ? 'आगामी' : 'Upcoming'}
              </Text>
              {upcomingCount > 0 && (
                <View
                  style={{
                    backgroundColor: activeTab === 'UPCOMING' ? '#EFF6FF' : '#E2E8F0',
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: activeTab === 'UPCOMING' ? '#2563EB' : '#475569',
                    }}
                  >
                    {upcomingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Past Tab */}
            <TouchableOpacity
              onPress={() => setActiveTab('PAST')}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                backgroundColor: activeTab === 'PAST' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                shadowColor: activeTab === 'PAST' ? '#0F172A' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'PAST' ? 0.08 : 0,
                shadowRadius: 3,
                elevation: activeTab === 'PAST' ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: activeTab === 'PAST' ? '700' : '600',
                  color: activeTab === 'PAST' ? '#1E40AF' : '#64748B',
                }}
              >
                {isHi ? 'पिछली विज़िट्स' : 'Past Visits'}
              </Text>
              {pastCount > 0 && (
                <View
                  style={{
                    backgroundColor: activeTab === 'PAST' ? '#EFF6FF' : '#E2E8F0',
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: activeTab === 'PAST' ? '#2563EB' : '#475569',
                    }}
                  >
                    {pastCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* All Tab */}
            <TouchableOpacity
              onPress={() => setActiveTab('ALL')}
              activeOpacity={0.8}
              style={{
                flex: 0.7,
                paddingVertical: 8,
                borderRadius: 11,
                backgroundColor: activeTab === 'ALL' ? '#FFFFFF' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: activeTab === 'ALL' ? '#0F172A' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === 'ALL' ? 0.08 : 0,
                shadowRadius: 3,
                elevation: activeTab === 'ALL' ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: activeTab === 'ALL' ? '700' : '600',
                  color: activeTab === 'ALL' ? '#1E40AF' : '#64748B',
                }}
              >
                {isHi ? 'सभी' : 'All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SCROLLABLE APPOINTMENTS LIST */}
        <ScrollView
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
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 36,
            paddingTop: 4,
            gap: 14,
          }}
        >
          {filteredAppointments.length === 0 ? (
            /* Empty State */
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 28,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Calendar size={26} color="#2563EB" />
              </View>

              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                {isHi ? 'कोई अपॉइंटमेंट नहीं मिली' : 'No Appointments Found'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#64748B',
                  textAlign: 'center',
                  marginTop: 6,
                  lineHeight: 18,
                  maxWidth: 320,
                }}
              >
                {activeTab === 'UPCOMING'
                  ? isHi
                    ? 'आपकी कोई आगामी डॉक्टर विज़िट निर्धारित नहीं है। पार्टनर अस्पतालों में शीर्ष डॉक्टरों से परामर्श लें।'
                    : 'You have no upcoming consultations scheduled. Book a visit with top verified specialists.'
                  : isHi
                    ? 'पिछला कोई विज़िट रिकॉर्ड नहीं मिला।'
                    : 'No past completed consultations found in your account.'}
              </Text>

              <TouchableOpacity
                onPress={() => router.push('/opd')}
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#2563EB',
                  borderRadius: 14,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  marginTop: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Stethoscope size={15} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                  {isHi ? 'डॉक्टर अपॉइंटमेंट बुक करें' : 'Book Doctor Appointment'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAppointments.map((apt, idx) => {
              const displayDoctor = isHi && apt.doctorNameHi ? apt.doctorNameHi : apt.doctorName;
              const displaySpecialty = isHi && apt.specialtyHi ? apt.specialtyHi : apt.specialty;
              const displayHospital = isHi && apt.hospitalNameHi ? apt.hospitalNameHi : apt.hospitalName;
              const displayAddress = isHi && apt.hospitalAddressHi ? apt.hospitalAddressHi : apt.hospitalAddress;
              const displayDate = isHi && apt.slotDateHi ? apt.slotDateHi : apt.slotDate;

              const isUpcoming = apt.isUpcoming;
              const isCancelled = apt.status === 'CANCELLED';

              return (
                <PressableCard
                  key={apt.id}
                  index={idx}
                  onPress={() => {
                    setSelectedAppointment(apt);
                    setTicketModalVisible(true);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 15,
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    {/* TOP STATUS & SERVICE BADGES */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 11,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F1F5F9',
                      }}
                    >
                      {/* Service Category */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            backgroundColor:
                              apt.serviceType === 'OPD_CONCIERGE'
                                ? '#EFF6FF'
                                : apt.serviceType === 'IPD_ENQUIRY'
                                  ? '#F5F3FF'
                                  : '#ECFDF5',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 7,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color:
                                apt.serviceType === 'OPD_CONCIERGE'
                                  ? '#1D4ED8'
                                  : apt.serviceType === 'IPD_ENQUIRY'
                                    ? '#7C3AED'
                                    : '#059669',
                              textTransform: 'uppercase',
                              letterSpacing: 0.3,
                            }}
                          >
                            {apt.serviceType === 'OPD_CONCIERGE'
                              ? isHi ? 'ओपीडी परामर्श' : 'OPD Consultation'
                              : apt.serviceType === 'IPD_ENQUIRY'
                                ? isHi ? 'अस्पताल भर्ती' : 'Hospital Admission'
                                : isHi ? 'लैब टेस्ट' : 'Diagnostic Lab'}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                          #{apt.bookingRef}
                        </Text>
                      </View>

                      {/* Status Tag */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isCancelled
                            ? '#FEF2F2'
                            : isUpcoming
                              ? '#ECFDF5'
                              : '#F1F5F9',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}
                      >
                        {isCancelled ? (
                          <X size={11} color="#DC2626" />
                        ) : isUpcoming ? (
                          <CheckCircle2 size={11} color="#059669" />
                        ) : (
                          <Check size={11} color="#475569" />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isCancelled ? '#DC2626' : isUpcoming ? '#059669' : '#475569',
                          }}
                        >
                          {isCancelled
                            ? isHi ? 'रद्द' : 'Cancelled'
                            : isUpcoming
                              ? isHi ? 'पुष्टि' : 'Confirmed'
                              : isHi ? 'संपन्न' : 'Completed'}
                        </Text>
                      </View>
                    </View>

                    {/* DOCTOR & CLINIC MAIN INFO */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor:
                            apt.serviceType === 'OPD_CONCIERGE'
                              ? '#EFF6FF'
                              : apt.serviceType === 'IPD_ENQUIRY'
                                ? '#F5F3FF'
                                : '#ECFDF5',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {apt.serviceType === 'OPD_CONCIERGE' ? (
                          <Stethoscope size={22} color="#2563EB" />
                        ) : apt.serviceType === 'IPD_ENQUIRY' ? (
                          <Scissors size={20} color="#7C3AED" />
                        ) : (
                          <Sparkles size={20} color="#059669" />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 20 }}>
                          {displayDoctor}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 1 }}>
                          {displaySpecialty}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                          {apt.qualification}
                        </Text>

                        {/* Hospital & Location */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                          <Building2 size={12} color="#475569" />
                          <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
                            {displayHospital}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} color="#64748B" />
                          <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                            {displayAddress}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* APPOINTMENT SLOT & TOKEN STRIP */}
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        padding: 10,
                        marginTop: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                        <Calendar size={14} color="#2563EB" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                            {displayDate} • {apt.slotTime}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                            {apt.roomNumber}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', flexShrink: 0, marginLeft: 6 }}>
                        <View
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#1E40AF' }}>
                            {isHi ? 'टोकन ' : 'Token '}#{apt.tokenNumber}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669', marginTop: 2 }}>
                          {inr(apt.doctorFee)} {apt.paymentStatus === 'PAID' ? (isHi ? '• भुगतान' : '• Paid') : (isHi ? '• काउंटर' : '• at Desk')}
                        </Text>
                      </View>
                    </View>

                    {/* ACTION BUTTONS ROW */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#F1F5F9',
                        gap: 6,
                      }}
                    >
                      {isUpcoming ? (
                        <>
                          {/* Get Directions */}
                          <TouchableOpacity
                            onPress={() => handleOpenMaps(apt)}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              backgroundColor: '#F1F5F9',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <MapPin size={13} color="#334155" />
                            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#334155' }}>
                              {isHi ? 'दिशा-निर्देश' : 'Directions'}
                            </Text>
                          </TouchableOpacity>

                          {/* Call Hospital */}
                          <TouchableOpacity
                            onPress={() => Linking.openURL('tel:+919811244550')}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              backgroundColor: '#EFF6FF',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Phone size={13} color="#2563EB" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                              {isHi ? 'कॉल करें' : 'Call Desk'}
                            </Text>
                          </TouchableOpacity>

                          {/* View Digital Pass */}
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedAppointment(apt);
                              setTicketModalVisible(true);
                            }}
                            activeOpacity={0.85}
                            style={{
                              backgroundColor: '#1E40AF',
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                            }}
                          >
                            <QrCode size={13} color="#FFFFFF" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                              {isHi ? 'पास' : 'Pass'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          {/* Download Rx or Summary */}
                          <TouchableOpacity
                            onPress={() => handleDownloadPrescription(apt)}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              backgroundColor: '#EFF6FF',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Download size={13} color="#2563EB" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                              {isHi ? 'पर्चा डाउनलोड' : 'Prescription'}
                            </Text>
                          </TouchableOpacity>

                          {/* Book Again */}
                          <TouchableOpacity
                            onPress={() => router.push('/opd')}
                            activeOpacity={0.85}
                            style={{
                              flex: 1,
                              backgroundColor: '#F8FAFC',
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Calendar size={13} color="#0F172A" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A' }}>
                              {isHi ? 'पुनः बुक करें' : 'Book Again'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </PressableCard>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ---------------- DIGITAL APPOINTMENT PASS / SLIP MODAL ---------------- */}
      <Modal
        visible={ticketModalVisible && !!selectedAppointment}
        transparent
        animationType="slide"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              overflow: 'hidden',
              maxWidth: 480,
              width: '100%',
              alignSelf: 'center',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Ticket Header */}
            <View
              style={{
                backgroundColor: '#1E40AF',
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#BFDBFE', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {isHi ? 'आदित्यम डिजिटल पास' : 'ADITYAM APPOINTMENT PASS'}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                  {selectedAppointment?.bookingRef}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setTicketModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Ticket Body */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520, padding: 20 }}>
              {/* Token & QR Simulation Card */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 18,
                  padding: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                  }}
                >
                  <QrCode size={48} color="#1E40AF" strokeWidth={1.8} />
                </View>

                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>
                  {isHi ? 'टोकन क्रमांक' : 'Token'} #{selectedAppointment?.tokenNumber}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {isHi ? 'अस्पताल रिसेप्शन डेस्क पर यह QR कोड दिखाएं' : 'Scan at hospital reception for fast-track entry'}
                </Text>
              </View>

              {/* Patient and Visit Details Grid */}
              <View style={{ marginTop: 16, gap: 10 }}>
                {/* Doctor */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'डॉक्टर' : 'Doctor'}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {isHi && selectedAppointment?.doctorNameHi ? selectedAppointment.doctorNameHi : selectedAppointment?.doctorName}
                  </Text>
                </View>

                {/* Specialty */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'विशेषज्ञता' : 'Specialty'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563EB', textAlign: 'right' }}>
                    {isHi && selectedAppointment?.specialtyHi ? selectedAppointment.specialtyHi : selectedAppointment?.specialty}
                  </Text>
                </View>

                {/* Hospital */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'अस्पताल' : 'Hospital'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'right', flex: 1, marginLeft: 16 }}>
                    {isHi && selectedAppointment?.hospitalNameHi ? selectedAppointment.hospitalNameHi : selectedAppointment?.hospitalName}
                  </Text>
                </View>

                {/* Date & Time */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'समय व कक्ष' : 'Slot & Room'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {selectedAppointment?.slotDate} • {selectedAppointment?.slotTime}
                  </Text>
                </View>

                {/* Patient Name */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'मरीज का नाम' : 'Patient'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {selectedAppointment?.patientName}
                  </Text>
                </View>

                {/* Fee & Payment */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'परामर्श शुल्क' : 'Consultation Fee'}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#059669', textAlign: 'right' }}>
                    {inr(selectedAppointment?.doctorFee || 0)} ({selectedAppointment?.paymentStatus === 'PAID' ? 'Paid' : 'Pay at Counter'})
                  </Text>
                </View>
              </View>

              {/* Pre-visit Guidance */}
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: 14,
                  padding: 12,
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <ShieldCheck size={16} color="#2563EB" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 11.5, color: '#1E40AF', flex: 1, lineHeight: 16 }}>
                  {isHi
                    ? 'कृपया अपने समय से 15 मिनट पूर्व अस्पताल पहुंचें और पुराने चिकित्सा पर्चे/रिपोर्ट्स साथ लाएं।'
                    : 'Please reach the hospital 15 minutes prior to your slot. Carry your government ID and previous medical records.'}
                </Text>
              </View>

              {/* Actions inside Modal */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedAppointment) {
                      handleOpenMaps(selectedAppointment);
                    }
                  }}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: '#F1F5F9',
                    borderRadius: 12,
                    paddingVertical: 11,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <MapPin size={14} color="#334155" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                    {isHi ? 'दिशा-निर्देश' : 'Directions'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Share.share({
                      message: `Adityam Appointment Pass: ${selectedAppointment?.bookingRef}\nDoctor: ${selectedAppointment?.doctorName}\nHospital: ${selectedAppointment?.hospitalName}\nDate: ${selectedAppointment?.slotDate} at ${selectedAppointment?.slotTime}\nToken: #${selectedAppointment?.tokenNumber}`,
                    });
                  }}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: '#2563EB',
                    borderRadius: 12,
                    paddingVertical: 11,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Share2 size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {isHi ? 'पास शेयर करें' : 'Share Pass'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cancel Button if upcoming */}
              {selectedAppointment?.isUpcoming && (
                <TouchableOpacity
                  onPress={() => {
                    if (selectedAppointment) {
                      handleCancelAppointment(selectedAppointment);
                    }
                  }}
                  style={{
                    marginTop: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>
                    {isHi ? 'अपॉइंटमेंट रद्द करें' : 'Cancel Appointment'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
