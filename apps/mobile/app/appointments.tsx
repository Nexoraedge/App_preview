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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmDialog } from '../src/utils/crossAlert';
import { generateInvoiceHtml, type HistoryItem } from '../src/data/pharmacyData';
import type { BillLine } from '../src/data/pharmacySample';
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
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  Lock,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, ServiceType, BookingStatus } from '@adityam/types';
import {
  fetchAllBookings,
  updateBookingStatus,
  subscribeBookings,
  isBookingUpcoming,
  parseSlotDetails,
} from '../src/services/bookingStorage';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { inr } from '../src/theme';
import { PressableCard } from '../components/PressableCard';
import { PaymentGatewayModal, PaymentMethod } from '../components/payment/PaymentGatewayModal';
import { AppointmentQrCode } from '../components/ui/AppointmentQrCode';

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
  billAmount?: number;
  discountAmount?: number;
  paymentStatus: 'PAID' | 'CANCELLED';
  prescriptionUrl?: string;
  verificationCode?: string;
  assignedAgent?: string;
  isUpcoming: boolean;
  notes?: string;
  createdDate: string;
}

// Realtime Bookings from Supabase
const SEED_APPOINTMENTS: EnrichedAppointment[] = [];

type TabType = 'UPCOMING' | 'PAST' | 'ALL';
type ServiceFilterType = 'ALL' | ServiceType;

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>(SEED_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState<EnrichedAppointment | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [payingAppointment, setPayingAppointment] = useState<EnrichedAppointment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Fetch real bookings from local storage & Supabase
  const loadBookings = useCallback(async () => {
    try {
      const data = await fetchAllBookings(user?.phone, user?.id);
      if (Array.isArray(data)) {
        const realMapped: EnrichedAppointment[] = data.map((b: Booking, idx: number) => {
          const isUpc = isBookingUpcoming(b);
          const isCancelled = b.status === 'CANCELLED';
          const isMissed = b.status === 'MISSED';
          const slot = parseSlotDetails(b.slot_time, b.service_type, isHi);

          // For fee display: IPD & Prescription uploads without finalized bills should show 0 (Quote Pending) rather than fallback 800
          const isRxOrInquiry =
            b.service_type === 'IPD_ENQUIRY' ||
            b.service_type === 'PHARMACY_SCAN_PAY' ||
            (b.booking_ref || '').includes('-RX-') ||
            (b.booking_ref || '').includes('DOC-ADVICE');
          const fee = isRxOrInquiry
            ? Number(b.final_payable ?? b.bill_amount ?? b.doctor_fee ?? 0)
            : Number(b.doctor_fee ?? b.final_payable ?? 800);

          return {
            id: b.id,
            bookingRef: b.booking_ref || `AN-${b.service_type.slice(0, 3)}-${1000 + idx}`,
            serviceType: b.service_type,
            status: isCancelled ? 'CANCELLED' : isMissed ? 'MISSED' : (!isUpc ? 'COMPLETED' : b.status),
            doctorName:
              b.doctor_name ||
              (b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'Adityam Partner Pharmacy'
                : b.service_type === 'INVESTIGATION'
                  ? 'Diagnostic Tests Panel'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'Inpatient Surgery Care'
                    : 'Specialist Consultation'),
            doctorNameHi:
              b.doctor_name ||
              (b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'आदित्यम पार्टनर फार्मेसी'
                : b.service_type === 'INVESTIGATION'
                  ? 'डायग्नोस्टिक जांच पैनल'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'अस्पताल भर्ती व सर्जरी'
                    : 'विशेषज्ञ परामर्श'),
            specialty:
              b.specialty_requested ||
              (b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'Pharmacy & Medicines'
                : b.service_type === 'INVESTIGATION'
                  ? 'Pathology & Scans'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'Surgery & Inpatient Care'
                    : 'General Consultation'),
            specialtyHi:
              b.specialty_requested ||
              (b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'दवाएं व फार्मेसी'
                : b.service_type === 'INVESTIGATION'
                  ? 'पैथोलॉजी व स्कैन'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'सर्जरी व भर्ती देखभाल'
                    : 'सामान्य परामर्श'),
            qualification:
              b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'Licensed Pharmacy Partner'
                : b.service_type === 'INVESTIGATION'
                  ? '100% NABL Accredited Diagnostics'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'NABH / JCI Partner Facility'
                    : 'Verified Specialist • 5.0 ★',
            hospitalName: b.hospital_name || 'Adityam Partner Network',
            hospitalNameHi: b.hospital_name || 'आदित्यम पार्टनर नेटवर्क',
            hospitalAddress: b.branch_name || 'Hospital Campus Desk',
            hospitalAddressHi: b.branch_name || 'अस्पताल परिसर डेस्क',
            patientName: b.patient_name || user?.full_name || 'Patient',
            patientPhone: b.patient_phone || (user?.phone && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910') && user.phone !== '+91 99999 99999' ? user.phone : ''),
            slotDate: slot.slotDate,
            slotDateHi: slot.slotDateHi,
            slotTime: slot.slotTime,
            tokenNumber: 10 + (idx % 20),
            roomNumber:
              b.service_type === 'PHARMACY_SCAN_PAY'
                ? 'Pharmacy Dispatch Desk'
                : b.service_type === 'INVESTIGATION'
                  ? 'Sample Collection Bay'
                  : b.service_type === 'IPD_ENQUIRY'
                    ? 'Inpatient Desk Room 101'
                    : 'OPD Desk Room 101',
            doctorFee: fee,
            billAmount: Number(b.bill_amount || 0),
            discountAmount: Number(b.discount_amount || 0),
            paymentStatus: (b.status === 'CANCELLED' ? 'CANCELLED' : 'PAID') as any,
            prescriptionUrl: b.bill_image_url || undefined,
            verificationCode: (b as any).verification_code || undefined,
            assignedAgent: b.assigned_agent || undefined,
            isUpcoming: isUpc,
            notes: b.notes || 'Hospital booking confirmed.',
            createdDate: new Date(b.created_at).toLocaleDateString(),
          };
        });

        setAppointments(realMapped);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    }
  }, [user, isHi]);

  useEffect(() => {
    loadBookings();
    const unsubscribe = subscribeBookings(() => {
      loadBookings();
    });

    // Realtime listener for bookings changes from cloud
    let channel: any = null;
    try {
      const supabase = getSupabaseClient();
      channel = supabase
        .channel('realtime-bookings-screen')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => {
            loadBookings();
          }
        )
        .subscribe();
    } catch {}

    return () => {
      unsubscribe();
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {}
      }
    };
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

    if (serviceFilter !== 'ALL') {
      list = list.filter((a) => a.serviceType === serviceFilter);
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
  }, [appointments, activeTab, serviceFilter, searchQuery]);

  const upcomingCount = useMemo(() => appointments.filter((a) => a.isUpcoming).length, [appointments]);
  const pastCount = useMemo(() => appointments.filter((a) => !a.isUpcoming).length, [appointments]);

  const serviceCounts = useMemo(() => {
    const tabScoped = appointments.filter((a) =>
      activeTab === 'UPCOMING' ? a.isUpcoming : activeTab === 'PAST' ? !a.isUpcoming : true
    );
    return {
      ALL: tabScoped.length,
      OPD_CONCIERGE: tabScoped.filter((a) => a.serviceType === 'OPD_CONCIERGE').length,
      INVESTIGATION: tabScoped.filter((a) => a.serviceType === 'INVESTIGATION').length,
      PHARMACY_SCAN_PAY: tabScoped.filter((a) => a.serviceType === 'PHARMACY_SCAN_PAY').length,
      IPD_ENQUIRY: tabScoped.filter((a) => a.serviceType === 'IPD_ENQUIRY').length,
    };
  }, [appointments, activeTab]);

  // Cancel Appointment Handler with permanent storage persistence
  const handleCancelAppointment = (apt: EnrichedAppointment) => {
    confirmDialog(
      isHi ? 'अपॉइंटमेंट रद्द करें' : 'Cancel Appointment',
      isHi
        ? `क्या आप निश्चित रूप से ${apt.doctorName} के साथ अपॉइंटमेंट (${apt.bookingRef}) रद्द करना चाहते हैं?`
        : `Are you sure you want to cancel appointment ${apt.bookingRef} with ${apt.doctorName}?`,
      async () => {
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
      isHi ? 'हाँ, रद्द करें' : 'Yes, Cancel',
      isHi ? 'नहीं' : 'No',
      true
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

  // Payment Handler
  const handlePaymentSuccess = async (method: PaymentMethod, txnId: string) => {
    if (!payingAppointment) return;
    const ref = payingAppointment.bookingRef;
    await updateBookingStatus(ref, 'PAID', `Paid via ${method} (${txnId})`);

    setAppointments((prev) =>
      prev.map((item) =>
        item.bookingRef === ref
          ? { ...item, status: 'PAID' as BookingStatus, paymentStatus: 'PAID' }
          : item
      )
    );

    if (selectedAppointment?.bookingRef === ref) {
      setSelectedAppointment((prev) =>
        prev ? { ...prev, status: 'PAID' as BookingStatus, paymentStatus: 'PAID' } : null
      );
    }

    setPayingAppointment(null);
    Alert.alert(
      isHi ? 'भुगतान सफल! 🎉' : 'Payment Successful! 🎉',
      isHi
        ? `संदर्भ: ${ref}\nलेनदेन आईडी: ${txnId}\nआपकी रसीद जारी कर दी गई है।`
        : `Ref: ${ref}\nTransaction ID: ${txnId}\nPaid receipt & digital token confirmed.`
    );
  };

  // Prescription / Receipt Download (Uses exact Pharmacy Tax Invoice template on Web + Share Sheet on Mobile)
  const handleDownloadPrescription = (apt: EnrichedAppointment) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const parsedItems: BillLine[] = [];
      const docText = String(apt.doctorName || '').trim();
      if (apt.serviceType === 'PHARMACY_SCAN_PAY' && docText && docText !== 'Adityam Partner Pharmacy') {
        docText.split(',').map((s) => s.trim()).filter(Boolean).forEach((part, idx) => {
          const m = part.match(/^(.+?)\s*\(([^)]+)\)\s*₹\s*([0-9.]+)$/);
          if (m) {
            parsedItems.push({
              id: `rx-${idx}`,
              name: m[1].trim(),
              nameHi: m[1].trim(),
              qty: Number(m[2]) || 1,
              price: Number(m[3]) || 0,
            });
          }
        });
      }
      const gross = apt.billAmount && apt.billAmount > 0 ? apt.billAmount : apt.doctorFee || 0;
      const disc = apt.discountAmount || 0;
      const isPickup = (apt.slotTime || '').toLowerCase().includes('pickup');
      const invoiceOrder: HistoryItem = {
        ref: apt.bookingRef,
        shop: apt.hospitalName,
        shopAddress: apt.hospitalAddress,
        shopPhone: apt.patientPhone || '+91 82713 10911',
        total: apt.doctorFee || 0,
        subtotal: gross,
        discount: disc,
        deliveryFee: 0,
        mode: isPickup ? 'pickup' : 'delivery',
        paidInApp: apt.status === 'PAID' || apt.status === 'COMPLETED',
        date: `${apt.slotDate}${apt.slotTime ? `, ${apt.slotTime}` : ''}`,
        status: apt.status === 'COMPLETED' ? (isPickup ? 'picked_up' : 'delivered') : 'ready',
        patientName: apt.patientName,
        items:
          parsedItems.length > 0
            ? parsedItems
            : [
                {
                  id: 'svc-1',
                  name: apt.doctorName || apt.specialty || 'Healthcare Service',
                  nameHi: apt.doctorNameHi || apt.specialtyHi || 'स्वास्थ्य सेवा',
                  qty: 1,
                  price: gross,
                },
              ],
      };
      const html = generateInvoiceHtml(invoiceOrder);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 250);
      }
      return;
    }

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
              onPress={handleBack}
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

          {/* SERVICE CATEGORY FILTER PILLS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 2 }}
          >
            {(
              [
                { id: 'ALL' as ServiceFilterType, label: isHi ? 'सभी सेवाएं' : 'All Services', count: serviceCounts.ALL },
                { id: 'OPD_CONCIERGE' as ServiceFilterType, label: isHi ? 'ओपीडी डॉक्टर' : 'OPD Consult', count: serviceCounts.OPD_CONCIERGE },
                { id: 'INVESTIGATION' as ServiceFilterType, label: isHi ? 'लैब व स्कैन' : 'Labs & Scans', count: serviceCounts.INVESTIGATION },
                { id: 'PHARMACY_SCAN_PAY' as ServiceFilterType, label: isHi ? 'दवाएं (Pharmacy)' : 'Pharmacy', count: serviceCounts.PHARMACY_SCAN_PAY },
                { id: 'IPD_ENQUIRY' as ServiceFilterType, label: isHi ? 'आईपीडी भर्ती' : 'Hospital IPD', count: serviceCounts.IPD_ENQUIRY },
              ]
            ).map((pill) => {
              const active = serviceFilter === pill.id;
              return (
                <TouchableOpacity
                  key={pill.id}
                  onPress={() => setServiceFilter(pill.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 12,
                    paddingVertical: 6.5,
                    borderRadius: 20,
                    backgroundColor: active ? '#1E40AF' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: active ? '#1E40AF' : '#E2E8F0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: active ? '700' : '600',
                      color: active ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {pill.label}
                  </Text>
                  {pill.count > 0 && (
                    <View
                      style={{
                        backgroundColor: active ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                        paddingHorizontal: 5.5,
                        paddingVertical: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: active ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {pill.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
              const isMissed = apt.status === 'MISSED';

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
                                  : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                    ? '#FFFBEB'
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
                                    : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                      ? '#B45309'
                                      : '#059669',
                              textTransform: 'uppercase',
                              letterSpacing: 0.3,
                            }}
                          >
                            {apt.serviceType === 'OPD_CONCIERGE'
                              ? isHi ? 'ओपीडी परामर्श' : 'OPD Consultation'
                              : apt.serviceType === 'IPD_ENQUIRY'
                                ? isHi ? 'अस्पताल भर्ती' : 'Hospital Admission'
                                : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                  ? isHi ? 'दवाएं व फार्मेसी' : 'Pharmacy Order'
                                  : isHi ? 'लैब व स्कैन' : 'Diagnostic Lab'}
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
                            : isMissed
                              ? '#FFFBEB'
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
                        ) : isMissed ? (
                          <AlertCircle size={11} color="#D97706" />
                        ) : isUpcoming ? (
                          <CheckCircle2 size={11} color="#059669" />
                        ) : (
                          <Check size={11} color="#475569" />
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isCancelled ? '#DC2626' : isMissed ? '#D97706' : isUpcoming ? '#059669' : '#475569',
                          }}
                        >
                          {isCancelled
                            ? isHi ? 'रद्द' : 'Cancelled'
                            : isMissed
                              ? isHi ? 'छूट गया' : 'Missed'
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
                                : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                  ? '#FFFBEB'
                                  : '#ECFDF5',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {apt.serviceType === 'OPD_CONCIERGE' ? (
                          <Stethoscope size={22} color="#2563EB" />
                        ) : apt.serviceType === 'IPD_ENQUIRY' ? (
                          <Bed size={20} color="#7C3AED" />
                        ) : apt.serviceType === 'PHARMACY_SCAN_PAY' ? (
                          <Pill size={20} color="#D97706" />
                        ) : (
                          <FlaskConical size={20} color="#059669" />
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
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '800',
                              color:
                                apt.serviceType === 'IPD_ENQUIRY'
                                  ? '#7C3AED'
                                  : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                    ? '#D97706'
                                    : apt.serviceType === 'INVESTIGATION'
                                      ? '#059669'
                                      : '#1E40AF',
                            }}
                          >
                            {apt.serviceType === 'IPD_ENQUIRY'
                              ? `${isHi ? 'प्रवेश #' : 'Admission #'}${apt.tokenNumber}`
                              : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                ? `${isHi ? 'ऑर्डर #' : 'Order #'}${apt.tokenNumber}`
                                : apt.serviceType === 'INVESTIGATION'
                                  ? `${isHi ? 'लैब बे #' : 'Lab Bay #'}${apt.tokenNumber}`
                                  : `${isHi ? 'टोकन #' : 'Token #'}${apt.tokenNumber}`}
                          </Text>
                        </View>
                        {apt.serviceType === 'IPD_ENQUIRY' ? (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED', marginTop: 2 }}>
                            {isHi ? 'कैशलेस टीपीए • सक्रिय' : 'Cashless TPA • Active'}
                          </Text>
                        ) : apt.doctorFee === 0 && (apt.bookingRef.includes('-RX-') || apt.serviceType === 'PHARMACY_SCAN_PAY') ? (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706', marginTop: 2 }}>
                            {isHi ? 'बिल कोटेशन प्रतीक्षित' : 'Quote Pending'}
                          </Text>
                        ) : apt.status === 'PAID' || apt.status === 'COMPLETED' ? (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669', marginTop: 2 }}>
                            {inr(apt.doctorFee)} {isHi ? '• भुगतान पूर्ण' : '• Paid'}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706', marginTop: 2 }}>
                            {inr(apt.doctorFee)} {isHi ? '• भुगतान शेष' : '• Payment Due'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* LIVE CARE COORDINATOR / AGENT CONNECT BANNER */}
                    {isUpcoming &&
                      (apt.bookingRef.includes('-RX-') ||
                        apt.bookingRef.includes('DOC-ADVICE') ||
                        apt.serviceType === 'IPD_ENQUIRY' ||
                        (apt.serviceType === 'PHARMACY_SCAN_PAY' && apt.doctorFee === 0) ||
                        Boolean(apt.assignedAgent)) && (
                        <View
                          style={{
                            backgroundColor: '#EFF6FF',
                            borderRadius: 12,
                            padding: 10,
                            marginTop: 10,
                            borderWidth: 1,
                            borderColor: '#BFDBFE',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 9,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: '#DBEAFE',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <PhoneCall size={14} color="#1D4ED8" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#1E40AF' }}>
                              {apt.assignedAgent
                                ? isHi
                                  ? `समन्वयक नियुक्त: ${apt.assignedAgent}`
                                  : `Assigned Coordinator: ${apt.assignedAgent}`
                                : isHi
                                  ? 'केयर कोऑर्डिनेटर पर्चा जांच रहे हैं'
                                  : 'Care Coordinator Reviewing Request'}
                            </Text>
                            <Text style={{ fontSize: 10.5, color: '#1D4ED8', marginTop: 1 }}>
                              {isHi
                                ? 'हमारे स्वास्थ्य एजेंट जल्द ही अंतिम बिल व समय की पुष्टि हेतु कॉल करेंगे।'
                                : 'Our care desk agent will connect with you shortly to confirm details & bill.'}
                            </Text>
                          </View>
                        </View>
                      )}

                    {/* UPLOADED PRESCRIPTION SLIP PREVIEW ON CARD */}
                    {apt.prescriptionUrl && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedAppointment(apt);
                          setTicketModalVisible(true);
                        }}
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 12,
                          padding: 9,
                          marginTop: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Image
                            source={{ uri: apt.prescriptionUrl }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: '#E2E8F0',
                            }}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0F172A' }}>
                              {isHi ? 'अपलोड किया गया डॉक्टर पर्चा' : 'Uploaded Prescription Slip'}
                            </Text>
                            <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>
                              {isHi ? 'पूरा पर्चा देखने के लिए टैप करें' : 'Tap to preview full uploaded image'}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#EFF6FF',
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 8,
                          }}
                        >
                          <Eye size={12} color="#2563EB" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                            {isHi ? 'देखें' : 'View'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* REFUND STATUS STRIP FOR CANCELLED APPOINTMENTS */}
                    {isCancelled && (
                      <View
                        style={{
                          backgroundColor: '#FEF2F2',
                          borderRadius: 12,
                          padding: 11,
                          marginTop: 10,
                          borderWidth: 1,
                          borderColor: '#FEE2E2',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={13} color="#DC2626" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                              {isHi ? '100% रिफंड जारी किया गया' : '100% Refund Processed'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>
                            {inr(apt.doctorFee)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#7F1D1D', marginTop: 3 }}>
                          {isHi
                            ? `रिफंड संदर्भ: RFND-${apt.bookingRef} • मूल भुगतान स्रोत पर 2–6 कार्य दिवसों में क्रेडिट`
                            : `Ref: RFND-${apt.bookingRef} • Credited back to original source in 2–6 working days`}
                        </Text>
                      </View>
                    )}

                    {/* MISSED BY DOCTOR NOTICE STRIP */}
                    {isMissed && (
                      <View
                        style={{
                          backgroundColor: '#FFFBEB',
                          borderRadius: 12,
                          padding: 11,
                          marginTop: 10,
                          borderWidth: 1,
                          borderColor: '#FEF3C7',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={14} color="#D97706" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>
                            {isHi ? 'डॉक्टर आपातकालीन ड्यूटी पर थे / परामर्श छूट गया' : 'Doctor Emergency / Missed Slot'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#92400E', marginTop: 3, lineHeight: 15 }}>
                          {isHi
                            ? 'डॉक्टर को आपातकालीन केस में जाना पड़ा। आप बिना किसी अतिरिक्त शुल्क के तुरंत समय बदल सकते हैं या 100% रिफंड ले सकते हैं।'
                            : 'The doctor was called into an urgent emergency procedure. You can reschedule for free or claim a 100% refund.'}
                        </Text>
                      </View>
                    )}

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
                              flex: 1,
                              backgroundColor: '#1E40AF',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <QrCode size={13} color="#FFFFFF" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                              {isHi ? 'पास देखें' : 'Pass'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : isCancelled ? (
                        <>
                          <TouchableOpacity
                            onPress={() => Linking.openURL('tel:+919811244550')}
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
                            <Phone size={13} color="#475569" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569' }}>
                              {isHi ? 'सहायता केंद्र' : 'Help Desk'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => router.push('/opd')}
                            activeOpacity={0.85}
                            style={{
                              flex: 1.2,
                              backgroundColor: '#2563EB',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Calendar size={13} color="#FFFFFF" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                              {isHi ? 'नया अपॉइंटमेंट' : 'Book New Slot'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : isMissed ? (
                        <>
                          <TouchableOpacity
                            onPress={() => Linking.openURL('tel:+919811244550')}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              backgroundColor: '#FEF3C7',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <Phone size={13} color="#B45309" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B45309' }}>
                              {isHi ? 'रिफंड सहायता' : 'Refund Help'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => router.push('/opd')}
                            activeOpacity={0.85}
                            style={{
                              flex: 1.3,
                              backgroundColor: '#2563EB',
                              paddingVertical: 8,
                              borderRadius: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <RefreshCw size={13} color="#FFFFFF" />
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                              {isHi ? 'मुफ्त में समय बदलें' : 'Free Reschedule'}
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
                              {apt.serviceType === 'INVESTIGATION'
                                ? isHi ? 'लैब रिपोर्ट' : 'Lab Report'
                                : apt.serviceType === 'PHARMACY_SCAN_PAY'
                                  ? isHi ? 'बिल रसीद' : 'Invoice'
                                  : apt.serviceType === 'IPD_ENQUIRY'
                                    ? isHi ? 'डिस्चार्ज सारांश' : 'Summary'
                                    : isHi ? 'पर्चा डाउनलोड' : 'Prescription'}
                            </Text>
                          </TouchableOpacity>

                          {/* Book Again */}
                          <TouchableOpacity
                            onPress={() => {
                              if (apt.serviceType === 'INVESTIGATION') router.push('/labs');
                              else if (apt.serviceType === 'PHARMACY_SCAN_PAY') router.push('/pharmacy');
                              else if (apt.serviceType === 'IPD_ENQUIRY') router.push('/ipd');
                              else router.push('/opd');
                            }}
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
                              {apt.serviceType === 'PHARMACY_SCAN_PAY'
                                ? isHi ? 'पुनः ऑर्डर' : 'Reorder'
                                : isHi ? 'पुनः बुक करें' : 'Book Again'}
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
              {selectedAppointment?.status === 'CANCELLED' ? (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 18,
                    padding: 18,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: '#FEE2E2',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <CheckCircle2 size={28} color="#DC2626" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#991B1B' }}>
                    {isHi ? 'रिफंड रसीद (100% स्वीकृत)' : '100% Refund Receipt'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626', marginTop: 4 }}>
                    {inr(selectedAppointment?.doctorFee || 0)}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#7F1D1D', marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
                    {isHi
                      ? `रिफंड संदर्भ: RFND-${selectedAppointment.bookingRef}\nराशि 2–6 कार्य दिवसों में आपके बैंक/UPI खाते में जमा कर दी जाएगी।`
                      : `Refund Ref: RFND-${selectedAppointment.bookingRef}\nAmount will reflect in your original payment method in 2–6 working days.`}
                  </Text>
                </View>
              ) : selectedAppointment?.status === 'MISSED' ? (
                <View
                  style={{
                    backgroundColor: '#FFFBEB',
                    borderRadius: 18,
                    padding: 18,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#FEF3C7',
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: '#FEF3C7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <AlertCircle size={28} color="#D97706" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#92400E', textAlign: 'center' }}>
                    {isHi ? 'डॉक्टर आपातकालीन ड्यूटी पर थे' : 'Doctor Emergency / Missed'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#78350F', marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
                    {isHi
                      ? 'डॉक्टर को आपातकालीन केस में जाना पड़ा। आप 1-टैप में निःशुल्क नया स्लॉट चुन सकते हैं।'
                      : 'Doctor had an emergency. You can reschedule for free at your convenience.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setTicketModalVisible(false);
                      router.push('/opd');
                    }}
                    style={{
                      marginTop: 12,
                      backgroundColor: '#2563EB',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                      {isHi ? 'मुफ्त में नया स्लॉट चुनें' : 'Reschedule for Free'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* QR Code and Token Card */
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 18,
                    padding: 18,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  {selectedAppointment && (
                    <AppointmentQrCode
                      bookingRef={selectedAppointment.bookingRef}
                      tokenNumber={selectedAppointment.tokenNumber}
                      patientName={selectedAppointment.patientName}
                      doctorName={isHi && selectedAppointment.doctorNameHi ? selectedAppointment.doctorNameHi : selectedAppointment.doctorName}
                      hospitalName={isHi && selectedAppointment.hospitalNameHi ? selectedAppointment.hospitalNameHi : selectedAppointment.hospitalName}
                      slotTime={`${selectedAppointment.slotDate} • ${selectedAppointment.slotTime}`}
                      size={140}
                    />
                  )}

                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 12 }}>
                    {selectedAppointment?.serviceType === 'IPD_ENQUIRY'
                      ? `${isHi ? 'प्रवेश टोकन #' : 'Admission Token #'}${selectedAppointment?.tokenNumber}`
                      : selectedAppointment?.serviceType === 'PHARMACY_SCAN_PAY'
                        ? `${isHi ? 'ऑर्डर टोकन #' : 'Order Token #'}${selectedAppointment?.tokenNumber}`
                        : selectedAppointment?.serviceType === 'INVESTIGATION'
                          ? `${isHi ? 'लैब बे #' : 'Lab Bay #'}${selectedAppointment?.tokenNumber}`
                          : `${isHi ? 'टोकन क्रमांक #' : 'Token #'}${selectedAppointment?.tokenNumber}`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
                    {selectedAppointment?.serviceType === 'PHARMACY_SCAN_PAY'
                      ? isHi
                        ? 'फार्मेसी काउंटर पर यह QR कोड या बुकिंग कोड दिखाएं'
                        : 'Show this QR code or booking code at the pharmacy counter'
                      : isHi
                        ? 'अस्पताल रिसेप्शन डेस्क पर यह QR कोड दिखाएं'
                        : 'Scan at hospital reception for fast-track entry'}
                  </Text>
                  {selectedAppointment?.bookingRef && (
                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A', letterSpacing: 0.6 }}>
                        REF: {selectedAppointment.bookingRef}
                      </Text>
                    </View>
                  )}
                  {selectedAppointment?.verificationCode && (
                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1.5,
                        borderColor: '#2563EB',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#1E40AF', letterSpacing: 0.5 }}>
                        {isHi ? 'डिलीवरी / पिकअप सत्यापन कोड' : 'DELIVERY / PICKUP VERIFICATION PIN'}
                      </Text>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: '#1D4ED8', letterSpacing: 5, marginTop: 2 }}>
                        {selectedAppointment.verificationCode}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Patient and Visit Details Grid */}
              <View style={{ marginTop: 16, gap: 10 }}>
                {/* Doctor */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{isHi ? 'सेवा / डॉक्टर' : 'Service / Doctor'}</Text>
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
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {selectedAppointment?.serviceType === 'IPD_ENQUIRY'
                      ? (isHi ? 'प्रवेश व टीपीए' : 'Coverage / Concierge')
                      : selectedAppointment?.serviceType === 'PHARMACY_SCAN_PAY'
                        ? (isHi ? 'दवा राशि' : 'Medicine Total')
                        : selectedAppointment?.serviceType === 'INVESTIGATION'
                          ? (isHi ? 'जांच पैकेज शुल्क' : 'Test Package Fee')
                          : (isHi ? 'परामर्श शुल्क' : 'Consultation Fee')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color:
                        selectedAppointment?.serviceType === 'IPD_ENQUIRY'
                          ? '#7C3AED'
                          : selectedAppointment?.doctorFee === 0
                            ? '#D97706'
                            : '#059669',
                      textAlign: 'right',
                    }}
                  >
                    {selectedAppointment?.serviceType === 'IPD_ENQUIRY'
                      ? (isHi ? 'कैशलेस टीपीए समन्वय (निशुल्क)' : 'Cashless TPA Coordination (Free)')
                      : selectedAppointment?.doctorFee === 0
                        ? (isHi ? 'पर्चा समीक्षाधीन (एजेंट कॉल करेगा)' : 'Under Review (Agent Connecting)')
                        : selectedAppointment?.status === 'PAID' || selectedAppointment?.status === 'COMPLETED'
                          ? `${inr(selectedAppointment?.doctorFee || 0)} (${isHi ? 'भुगतान पूर्ण' : 'Paid'})`
                          : `${inr(selectedAppointment?.doctorFee || 0)} (${isHi ? 'भुगतान शेष' : 'Payment Due'})`}
                  </Text>
                </View>
              </View>

              {/* Uploaded Prescription Image inside Modal */}
              {selectedAppointment?.prescriptionUrl && (
                <View
                  style={{
                    marginTop: 16,
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} color="#2563EB" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                        {isHi ? 'अपलोड किया गया पर्चा / स्लिप' : 'Uploaded Prescription / Doctor Slip'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedAppointment.prescriptionUrl) {
                          Linking.openURL(selectedAppointment.prescriptionUrl).catch(() => {});
                        }
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                        {isHi ? 'बड़ा करके देखें ↗' : 'Open Full ↗'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Image
                    source={{ uri: selectedAppointment.prescriptionUrl }}
                    style={{
                      width: '100%',
                      height: 190,
                      borderRadius: 12,
                      backgroundColor: '#E2E8F0',
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}

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

      {/* Payment Gateway Modal (Razorpay / UPI / Cards) */}
      {payingAppointment && (
        <PaymentGatewayModal
          visible={Boolean(payingAppointment)}
          onClose={() => setPayingAppointment(null)}
          amount={payingAppointment.doctorFee}
          serviceTitle={payingAppointment.specialty}
          providerName={payingAppointment.doctorName}
          patientName={payingAppointment.patientName}
          bookingRef={payingAppointment.bookingRef}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </View>
  );
}
