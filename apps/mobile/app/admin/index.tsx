import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Linking,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu,
  Search,
  RefreshCw,
  Eye,
  Phone,
  CheckCircle2,
  X,
  ExternalLink,
  ArrowUpRight,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import {
  fetchAllBookings,
  saveNewBooking,
  subscribeBookings,
} from '../../src/services/bookingStorage';
import {
  AdminSidebar,
  AdminNavSection,
} from '../../components/admin/AdminSidebar';
import { HospitalsSection } from '../../components/admin/HospitalsSection';
import { SoloDoctorsSection } from '../../components/admin/doctors/SoloDoctorsSection';
import { PartnerEnquiriesSection } from '../../components/admin/enquiries/PartnerEnquiriesSection';
import { PharmaciesSection } from '../../components/admin/pharmacies/PharmaciesSection';
import { LabsSection } from '../../components/admin/labs/LabsSection';
import { PatientsSection } from '../../components/admin/patients/PatientsSection';
import { PaymentsRefundsSection } from '../../components/admin/finance/PaymentsRefundsSection';
import { LiveBookingsSection } from '../../components/admin/operations/LiveBookingsSection';
import { PrescriptionQueueSection } from '../../components/admin/operations/PrescriptionQueueSection';
import { DashboardOverviewSection } from '../../components/admin/operations/DashboardOverviewSection';
import { AuditLogsSection } from '../../components/admin/security/AuditLogsSection';
import {
  getAllowedSectionsForRole,
  getSourcePanelForRole,
  useAdminAuth,
} from '../../components/admin/AdminAuthGate';
import { logAdminAudit } from '../../src/services/adminAudit';
import {
  playAdminAlertChime,
  requestDesktopNotificationPermission,
} from '../../src/services/adminAlerts';

// Green & Cream Clinical Design Tokens
const THEME = {
  creamBg: '#FAF8F2',
  creamSoft: '#F3EFE4',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  amberText: '#9A5B13',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const { adminUser } = useAdminAuth();

  // Navigation & Drawer State
  const [activeSection, setActiveSection] = useState<AdminNavSection>(
    (section as AdminNavSection) || 'dashboard'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (section) {
      setActiveSection(section as AdminNavSection);
    }
  }, [section]);

  useEffect(() => {
    if (!adminUser) return;
    const allowed = getAllowedSectionsForRole(adminUser.role);
    if (!allowed.includes(activeSection) && allowed.length > 0) {
      setActiveSection(allowed[0] as AdminNavSection);
    }
  }, [adminUser, activeSection]);

  // Live Data State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [networkCounts, setNetworkCounts] = useState({
    hospitals: 0,
    enquiries: 0,
    labs: 0,
    pharmacies: 0,
    patients: 0,
  });
  const [analyticsData, setAnalyticsData] = useState<{
    userCreatedDates: string[];
    partnerPayouts: { partnerType: 'HOSPITAL' | 'DOCTOR' | 'LAB' | 'PHARMACY'; amount: number; date: string; status: string }[];
    refundRequests: { amount: number; status: string; created_at: string }[];
  }>({
    userCreatedDates: [],
    partnerPayouts: [],
    refundRequests: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  // Dashboard Filters
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'RX_ONLY' | ServiceType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Booking Inspector & Editor Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState<BookingStatus>('NEW');
  const [editAgent, setEditAgent] = useState('');
  const [editDoctorOrPanel, setEditDoctorOrPanel] = useState('');
  const [editSlotTime, setEditSlotTime] = useState('');
  const [editGrossBill, setEditGrossBill] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editFinalPayable, setEditFinalPayable] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  // Sound & Desktop Alert Toggle + Refund Request State
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const soundAlertsRef = useRef(true);
  useEffect(() => {
    soundAlertsRef.current = soundAlertsEnabled;
  }, [soundAlertsEnabled]);

  const [showRefundRequestBox, setShowRefundRequestBox] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [refundRequestFeedback, setRefundRequestFeedback] = useState<string | null>(null);

  // Fetch all real bookings + network counts from Supabase
  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      const [
        cloudBookingsRes,
        localBookings,
        hospRes,
        labRes,
        pharmRes,
        usersRes,
        enqRes,
        hospPayoutsRes,
        labPayoutsRes,
        pharmPayoutsRes,
        refundsRes,
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        fetchAllBookings(),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('lab_centres').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id, created_at, role'),
        supabase
          .from('partner_enquiries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'NEW'),
        supabase.from('hospital_payouts').select('amount, settled_at, status'),
        supabase.from('lab_payouts').select('net_payout_amount, paid_at, created_at, status'),
        supabase.from('pharmacy_payouts').select('net_payout_amount, paid_at, created_at, status'),
        supabase.from('refund_requests').select('refund_amount, status, created_at'),
      ]);

      const mergedMap = new Map<string, Booking>();
      if (cloudBookingsRes.data && Array.isArray(cloudBookingsRes.data)) {
        for (const b of cloudBookingsRes.data as Booking[]) {
          if (b.booking_ref) mergedMap.set(b.booking_ref, b);
        }
      }
      if (Array.isArray(localBookings)) {
        for (const b of localBookings) {
          if (b.booking_ref && !mergedMap.has(b.booking_ref)) {
            mergedMap.set(b.booking_ref, b);
          }
        }
      }

      const sortedList = Array.from(mergedMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setBookings(sortedList);

      const userRows = (Array.isArray(usersRes.data) ? usersRes.data : []).filter(
        (u: any) => !u.role || String(u.role).toLowerCase() === 'patient'
      );
      const userCreatedDates = userRows
        .map((u: any) => u.created_at)
        .filter((d: any): d is string => Boolean(d));

      const partnerPayouts: {
        partnerType: 'HOSPITAL' | 'DOCTOR' | 'LAB' | 'PHARMACY';
        amount: number;
        date: string;
        status: string;
      }[] = [];
      (hospPayoutsRes.data || []).forEach((p: any) => {
        partnerPayouts.push({
          partnerType: 'HOSPITAL',
          amount: Number(p.amount || 0),
          date: p.settled_at || new Date().toISOString(),
          status: String(p.status || 'PAID').toUpperCase(),
        });
      });
      (labPayoutsRes.data || []).forEach((p: any) => {
        partnerPayouts.push({
          partnerType: 'LAB',
          amount: Number(p.net_payout_amount || 0),
          date: p.paid_at || p.created_at || new Date().toISOString(),
          status: String(p.status || 'PENDING').toUpperCase(),
        });
      });
      (pharmPayoutsRes.data || []).forEach((p: any) => {
        partnerPayouts.push({
          partnerType: 'PHARMACY',
          amount: Number(p.net_payout_amount || 0),
          date: p.paid_at || p.created_at || new Date().toISOString(),
          status: String(p.status || 'PENDING').toUpperCase(),
        });
      });

      const refundRequests = (refundsRes.data || []).map((r: any) => ({
        amount: Number(r.refund_amount || 0),
        status: String(r.status || 'PENDING').toUpperCase(),
        created_at: r.created_at || new Date().toISOString(),
      }));

      setAnalyticsData({
        userCreatedDates,
        partnerPayouts,
        refundRequests,
      });

      setNetworkCounts((prev) => ({
        ...prev,
        hospitals: hospRes.count ?? 4,
        enquiries: enqRes.error ? prev.enquiries : (enqRes.count ?? 0),
        labs: labRes.count ?? 5,
        pharmacies: pharmRes.count ?? 6,
        patients: userRows.length || 1,
      }));

      setLastSyncedAt(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (err) {
      console.warn('Admin dashboard load warning:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsubLocal = subscribeBookings(() => loadDashboardData(true));

    let channel: any = null;
    try {
      const supabase = getSupabaseClient();
      channel = supabase
        .channel('admin-dashboard-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload: any) => {
            if (payload?.eventType === 'INSERT' && soundAlertsRef.current) {
              const row = payload?.new || {};
              playAdminAlertChime(
                'New Booking Request',
                `${row.patient_name || 'Patient'} (${row.service_type || 'BOOKING'}) • #${row.booking_ref || 'NEW'}`
              );
            }
            loadDashboardData(true);
          }
        )
        .subscribe((status) => {
          setRealtimeConnected(status === 'SUBSCRIBED');
        });
    } catch {
      setRealtimeConnected(false);
    }

    return () => {
      unsubLocal();
      if (channel) {
        try {
          getSupabaseClient().removeChannel(channel);
        } catch {}
      }
    };
  }, [loadDashboardData]);

  const handleSelectSection = (sec: AdminNavSection) => {
    setActiveSection(sec);
    if (sec === 'prescriptions') {
      setServiceFilter('RX_ONLY');
    } else if (sec === 'bookings' || sec === 'dashboard') {
      setServiceFilter('ALL');
    }
  };

  const isPrescriptionOrTriage = useCallback((b: Booking) => {
    const ref = b.booking_ref || '';
    return (
      Boolean(b.bill_image_url) ||
      ref.includes('-RX-') ||
      ref.includes('DOC-ADVICE') ||
      b.service_type === 'IPD_ENQUIRY' ||
      b.service_type === 'PHARMACY_SCAN_PAY'
    );
  }, []);

  const openInspector = (b: Booking) => {
    setSelectedBooking(b);
    setShowRefundRequestBox(false);
    setRefundReason('');
    setRefundRequestFeedback(null);
    setEditStatus(b.status);
    setEditAgent(b.assigned_agent || '');
    setEditDoctorOrPanel(b.doctor_name || '');
    setEditSlotTime(b.slot_time || '');
    setEditGrossBill(b.bill_amount ? String(b.bill_amount) : '');
    setEditDiscount(b.discount_amount ? String(b.discount_amount) : '');
    const payable = b.final_payable ?? b.doctor_fee ?? 0;
    setEditFinalPayable(payable ? String(payable) : '');
    setEditNotes(b.notes || '');
  };

  const handleSaveBookingChanges = async () => {
    if (!selectedBooking) return;
    setIsSavingBooking(true);
    try {
      const grossNum = editGrossBill ? Number(editGrossBill) : 0;
      const discountNum = editDiscount ? Number(editDiscount) : 0;
      const payableNum = editFinalPayable
        ? Number(editFinalPayable)
        : Math.max(0, grossNum - discountNum);

      const updatedBooking: Booking = {
        ...selectedBooking,
        status: editStatus,
        assigned_agent: editAgent.trim() || null,
        doctor_name: editDoctorOrPanel.trim() || selectedBooking.doctor_name,
        slot_time: editSlotTime.trim() || selectedBooking.slot_time,
        bill_amount: grossNum,
        discount_amount: discountNum,
        final_payable: payableNum,
        doctor_fee: payableNum,
        notes: editNotes.trim() || selectedBooking.notes,
        updated_at: new Date().toISOString(),
      };

      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          status: updatedBooking.status,
          assigned_agent: updatedBooking.assigned_agent,
          doctor_name: updatedBooking.doctor_name,
          slot_time: updatedBooking.slot_time,
          bill_amount: updatedBooking.bill_amount,
          discount_amount: updatedBooking.discount_amount,
          final_payable: updatedBooking.final_payable,
          doctor_fee: updatedBooking.doctor_fee,
          notes: updatedBooking.notes,
          updated_at: updatedBooking.updated_at,
        })
        .eq('booking_ref', selectedBooking.booking_ref);

      await saveNewBooking(updatedBooking);

      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'BOOKING_TRIAGE_UPDATED',
          entityType: 'booking',
          entityId: updatedBooking.booking_ref,
          details: {
            prevStatus: selectedBooking.status,
            nextStatus: updatedBooking.status,
            assignedAgent: updatedBooking.assigned_agent,
            finalPayable: updatedBooking.final_payable,
          },
        });
      }

      setBookings((prev) =>
        prev.map((item) =>
          item.booking_ref === updatedBooking.booking_ref ? updatedBooking : item
        )
      );
      setSelectedBooking(null);
    } catch (err) {
      console.error('Failed to update booking:', err);
      Alert.alert('Update Failed', 'Could not save changes to Supabase.');
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!selectedBooking) return;
    const reason = refundReason.trim();
    if (!reason) {
      setRefundRequestFeedback('Please enter the reason for refund (e.g., Patient cancelled before sample pickup).');
      return;
    }

    const amount = Number(
      selectedBooking.final_payable || selectedBooking.bill_amount || 0
    );
    if (amount <= 0) {
      setRefundRequestFeedback('Cannot request refund on a ₹0 booking.');
      return;
    }

    setIsRequestingRefund(true);
    setRefundRequestFeedback(null);
    try {
      const supabase = getSupabaseClient();
      const { data: existing, error: checkErr } = await supabase
        .from('refund_requests')
        .select('id, status')
        .eq('booking_ref', selectedBooking.booking_ref)
        .neq('status', 'REJECTED')
        .limit(1);

      if (checkErr) throw checkErr;

      if (existing && existing.length > 0) {
        setRefundRequestFeedback(
          `A refund ticket (${existing[0].status}) already exists for #${selectedBooking.booking_ref}.`
        );
        return;
      }

      const requestedBy =
        adminUser?.fullName || adminUser?.email || 'Call Center';

      const { error: insertErr } = await supabase.from('refund_requests').insert({
        booking_id: selectedBooking.id || null,
        booking_ref: selectedBooking.booking_ref,
        patient_name: selectedBooking.patient_name || 'Patient',
        patient_phone: selectedBooking.patient_phone || 'N/A',
        service_type: selectedBooking.service_type || 'OPD_CONCIERGE',
        provider_name:
          selectedBooking.hospital_name || selectedBooking.doctor_name || null,
        refund_amount: amount,
        refund_mode: 'UPI_SOURCE',
        reason,
        status: 'PENDING',
        requested_by: requestedBy,
      });

      if (insertErr) throw insertErr;

      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'REFUND_REQUESTED',
          entityType: 'refund_request',
          entityId: selectedBooking.booking_ref,
          details: { amount, reason, requestedBy },
        });
      }

      setRefundRequestFeedback(
        `Refund request of ₹${amount.toLocaleString('en-IN')} queued for Finance approval.`
      );
      setRefundReason('');
      setShowRefundRequestBox(false);
      loadDashboardData(true);
    } catch (err: any) {
      setRefundRequestFeedback(err?.message || 'Could not queue refund request.');
    } finally {
      setIsRequestingRefund(false);
    }
  };

  const metrics = useMemo(() => {
    const activeList = bookings.filter((b) => b.status !== 'CANCELLED');
    const pendingRxCount = bookings.filter(
      (b) =>
        isPrescriptionOrTriage(b) &&
        b.status !== 'CANCELLED' &&
        b.status !== 'COMPLETED'
    ).length;

    const totalRevenue = activeList.reduce((sum, b) => {
      const amt = Number(b.final_payable ?? b.doctor_fee ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const totalSavings = activeList.reduce((sum, b) => {
      const disc = Number(b.discount_amount ?? 0);
      return sum + (isNaN(disc) ? 0 : disc);
    }, 0);

    const opdCount = bookings.filter((b) => b.service_type === 'OPD_CONCIERGE').length;
    const labCount = bookings.filter((b) => b.service_type === 'INVESTIGATION').length;
    const pharmacyCount = bookings.filter((b) => b.service_type === 'PHARMACY_SCAN_PAY').length;
    const ipdCount = bookings.filter((b) => b.service_type === 'IPD_ENQUIRY').length;

    const todayStr = new Date().toDateString();
    const todayBookings = bookings.filter(
      (b) => new Date(b.created_at).toDateString() === todayStr
    ).length;

    return {
      totalBookings: bookings.length,
      todayBookings,
      pendingRxCount,
      totalRevenue,
      totalSavings,
      opdCount,
      labCount,
      pharmacyCount,
      ipdCount,
    };
  }, [bookings, isPrescriptionOrTriage]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (serviceFilter === 'RX_ONLY') {
        if (!isPrescriptionOrTriage(b)) return false;
      } else if (serviceFilter !== 'ALL') {
        if (b.service_type !== serviceFilter) return false;
      }

      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (b.booking_ref || '').toLowerCase().includes(q) ||
          (b.patient_name || '').toLowerCase().includes(q) ||
          (b.patient_phone || '').toLowerCase().includes(q) ||
          (b.hospital_name || '').toLowerCase().includes(q) ||
          (b.doctor_name || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [bookings, serviceFilter, statusFilter, searchQuery, isPrescriptionOrTriage]);

  const formatInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const getServiceLabel = (serviceType: ServiceType) => {
    switch (serviceType) {
      case 'OPD_CONCIERGE':
        return 'OPD Consult';
      case 'INVESTIGATION':
        return 'Labs & Scans';
      case 'PHARMACY_SCAN_PAY':
        return 'Pharmacy';
      case 'IPD_ENQUIRY':
        return 'Hospital IPD';
      default:
        return serviceType;
    }
  };

  const getStatusStyle = (status: BookingStatus) => {
    switch (status) {
      case 'NEW':
        return { bg: '#FEF2F2', text: '#B91C1C' };
      case 'CALLING':
      case 'MISSED':
        return { bg: THEME.amberBg, text: THEME.amberText };
      case 'CONFIRMED':
      case 'PAID':
      case 'COMPLETED':
      case 'SERVED':
        return { bg: THEME.greenSoft, text: THEME.greenPrimary };
      default:
        return { bg: THEME.creamSoft, text: THEME.muted };
    }
  };

  const sectionTitleMap: Record<AdminNavSection, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Jaipur live bookings & prescription triage',
    },
    bookings: {
      title: 'Live Bookings',
      subtitle: 'All OPD, Lab, Pharmacy & IPD requests',
    },
    prescriptions: {
      title: 'Prescription Queue',
      subtitle: 'Review uploaded slips, assign coordinators & quote bills',
    },
    hospitals: {
      title: 'Hospitals',
      subtitle: 'Partner hospitals, earnings, weekly payouts & /slug analytics',
    },
    'solo-doctors': {
      title: 'Solo Doctors',
      subtitle: 'Independent practitioners, earnings, weekly payouts & /slug analytics',
    },
    enquiries: {
      title: 'Partner Enquiries',
      subtitle: 'Incoming hospital & doctor onboarding requests from website',
    },
    labs: {
      title: 'Labs & Scans',
      subtitle: 'Diagnostic centres, pathology tests & scans',
    },
    pharmacies: {
      title: 'Partner Pharmacies',
      subtitle: 'Medical stores, discount tiers & delivery zones',
    },
    patients: {
      title: 'Patients & Families',
      subtitle: 'Registered patients, dependents & addresses',
    },
    finance: {
      title: 'Payments & Refunds',
      subtitle: 'Booking volume, patient savings & refunds',
    },
    audit: {
      title: 'Team & Audit',
      subtitle: 'Team roles, login activity & staff audit trail',
    },
  };

  const currentHeader = sectionTitleMap[activeSection];

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: THEME.creamBg,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      {/* 1. FIXED SIDEBAR ON DESKTOP / DRAWER ON MOBILE */}
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/(tabs)')}
        counts={{
          totalBookings: metrics.totalBookings,
          pendingRx: metrics.pendingRxCount,
          hospitals: networkCounts.hospitals,
          enquiries: networkCounts.enquiries,
          labs: networkCounts.labs,
          pharmacies: networkCounts.pharmacies,
          patients: networkCounts.patients,
        }}
        realtimeConnected={realtimeConnected}
      />

      {/* 2. MAIN WORKSPACE */}
      <View style={{ flex: 1, minWidth: 0, backgroundColor: THEME.creamBg }}>
        {/* TOP HEADER */}
        <View
          style={{
            backgroundColor: THEME.surface,
            borderBottomWidth: 1,
            borderBottomColor: THEME.border,
            paddingHorizontal: isDesktop ? 28 : 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {!isDesktop && (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(true)}
                activeOpacity={0.8}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: THEME.creamSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Menu size={18} color={THEME.ink} />
              </TouchableOpacity>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: isDesktop ? 19 : 16,
                  fontWeight: '800',
                  color: THEME.ink,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {currentHeader.title}
              </Text>
              <Text
                style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}
                numberOfLines={1}
              >
                {currentHeader.subtitle}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <TouchableOpacity
              onPress={async () => {
                const next = !soundAlertsEnabled;
                setSoundAlertsEnabled(next);
                if (next) {
                  await requestDesktopNotificationPermission();
                  playAdminAlertChime(
                    'Sound Alerts Enabled',
                    'You will hear a chime when a new booking arrives.'
                  );
                }
              }}
              activeOpacity={0.8}
              style={{
                height: 38,
                paddingHorizontal: 11,
                borderRadius: 10,
                backgroundColor: soundAlertsEnabled ? THEME.amberBg : THEME.creamSoft,
                borderWidth: 1,
                borderColor: soundAlertsEnabled ? THEME.amberBorder : THEME.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {soundAlertsEnabled ? (
                <Volume2 size={14} color={THEME.amberText} />
              ) : (
                <VolumeX size={14} color={THEME.muted} />
              )}
              {isDesktop && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: soundAlertsEnabled ? THEME.amberText : THEME.muted,
                  }}
                >
                  {soundAlertsEnabled ? 'Sound On' : 'Muted'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsRefreshing(true);
                loadDashboardData(true);
              }}
              activeOpacity={0.8}
              style={{
                height: 38,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={14} color={THEME.greenPrimary} />
              {isDesktop && (
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                  {isRefreshing ? 'Syncing...' : 'Refresh'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SCROLLABLE BODY */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: isDesktop ? 28 : 16,
            paddingBottom: 60,
            gap: 20,
          }}
        >
          {activeSection === 'hospitals' ? (
            <HospitalsSection
              bookings={bookings}
              onOpenSlugRoute={(slug) => router.push(`/admin/hospitals/${slug}` as any)}
            />
          ) : activeSection === 'solo-doctors' ? (
            <SoloDoctorsSection bookings={bookings} />
          ) : activeSection === 'enquiries' ? (
            <PartnerEnquiriesSection
              onCountChange={(count) =>
                setNetworkCounts((prev) => (prev.enquiries === count ? prev : { ...prev, enquiries: count }))
              }
            />
          ) : activeSection === 'pharmacies' ? (
            <PharmaciesSection bookings={bookings} />
          ) : activeSection === 'labs' ? (
            <LabsSection bookings={bookings} />
          ) : activeSection === 'patients' ? (
            <PatientsSection bookings={bookings} />
          ) : activeSection === 'finance' ? (
            <PaymentsRefundsSection
              bookings={bookings}
              onRefreshBookings={() => loadDashboardData(true)}
            />
          ) : activeSection === 'audit' ? (
            <AuditLogsSection />
          ) : activeSection === 'bookings' ? (
            <LiveBookingsSection
              bookings={bookings}
              isLoading={isLoading}
              lastSyncedAt={lastSyncedAt}
              initialServiceFilter={serviceFilter === 'RX_ONLY' ? 'ALL' : serviceFilter}
              onRefresh={() => loadDashboardData(true)}
              onInspectBooking={openInspector}
            />
          ) : activeSection === 'prescriptions' ? (
            <PrescriptionQueueSection
              bookings={bookings}
              isLoading={isLoading}
              onRefresh={() => loadDashboardData(true)}
            />
          ) : (
            <DashboardOverviewSection
              bookings={bookings}
              isLoading={isLoading}
              networkCounts={networkCounts}
              analyticsData={analyticsData}
              onNavigate={(sec, svc) => {
                if (svc) setServiceFilter(svc);
                else if (sec === 'bookings') setServiceFilter('ALL');
                handleSelectSection(sec);
              }}
              onInspectBooking={openInspector}
            />
          )}
        </ScrollView>
      </View>

      {/* 4. BOOKING & PRESCRIPTION INSPECTOR MODAL */}
      <Modal
        visible={Boolean(selectedBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 18,
              width: '100%',
              maxWidth: 600,
              maxHeight: '92%',
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                backgroundColor: THEME.greenDark,
                paddingHorizontal: 20,
                paddingVertical: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
                  Booking & Prescription Triage
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FAF8F2', marginTop: 2 }} numberOfLines={1}>
                  #{selectedBooking?.booking_ref} · {selectedBooking?.patient_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedBooking(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, gap: 14 }}
            >
              {/* Summary Box */}
              <View
                style={{
                  backgroundColor: THEME.creamBg,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>Patient:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                    {selectedBooking?.patient_name} ({selectedBooking?.patient_phone || 'N/A'})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>Facility:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                    {selectedBooking?.hospital_name}
                  </Text>
                </View>
              </View>

              {/* Uploaded Prescription Image */}
              {selectedBooking?.bill_image_url && (
                <View
                  style={{
                    backgroundColor: THEME.greenSoft,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                      Uploaded Prescription / Slip
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedBooking.bill_image_url) {
                          Linking.openURL(selectedBooking.bill_image_url).catch(() => {});
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: THEME.greenPrimary,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 7,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                        Open Full
                      </Text>
                      <ExternalLink size={11} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <Image
                    source={{ uri: selectedBooking.bill_image_url }}
                    style={{
                      width: '100%',
                      height: 210,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Status */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase', marginBottom: 7 }}>
                  Booking Status
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {(
                    ['NEW', 'CALLING', 'CONFIRMED', 'PAID', 'COMPLETED', 'MISSED', 'CANCELLED'] as BookingStatus[]
                  ).map((st) => {
                    const active = editStatus === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setEditStatus(st)}
                        style={{
                          paddingHorizontal: 11,
                          paddingVertical: 6.5,
                          borderRadius: 7,
                          backgroundColor: active ? THEME.greenPrimary : THEME.creamBg,
                          borderWidth: 1,
                          borderColor: active ? THEME.greenPrimary : THEME.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: active ? '#FFFFFF' : THEME.ink,
                          }}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Coordinator & Slot */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Assigned Coordinator
                  </Text>
                  <TextInput
                    value={editAgent}
                    onChangeText={setEditAgent}
                    placeholder="e.g. Simran Sharma"
                    placeholderTextColor="#8B9690"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 8.5,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Confirmed Slot / Time
                  </Text>
                  <TextInput
                    value={editSlotTime}
                    onChangeText={setEditSlotTime}
                    placeholder="e.g. Tomorrow, 08:00 AM"
                    placeholderTextColor="#8B9690"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 8.5,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              {/* Doctor / Panel */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Doctor / Test Panel / Order Summary
                </Text>
                <TextInput
                  value={editDoctorOrPanel}
                  onChangeText={setEditDoctorOrPanel}
                  placeholder="e.g. CBC, Thyroid Profile"
                  placeholderTextColor="#8B9690"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 11,
                    paddingVertical: 8.5,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
              </View>

              {/* Billing */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Gross Bill (₹)
                  </Text>
                  <TextInput
                    value={editGrossBill}
                    onChangeText={setEditGrossBill}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8B9690"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 8.5,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Discount (₹)
                  </Text>
                  <TextInput
                    value={editDiscount}
                    onChangeText={setEditDiscount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8B9690"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 8.5,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary, marginBottom: 5 }}>
                    Final Payable (₹)
                  </Text>
                  <TextInput
                    value={editFinalPayable}
                    onChangeText={setEditFinalPayable}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8B9690"
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 8.5,
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: THEME.greenDark,
                    }}
                  />
                </View>
              </View>

              {/* Notes */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Coordinator Notes
                </Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Enter confirmation notes..."
                  placeholderTextColor="#8B9690"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 11,
                    paddingVertical: 9,
                    fontSize: 12.5,
                    color: THEME.ink,
                    minHeight: 68,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Request Refund (For Finance) — Only for PAID bookings > ₹0 */}
              {selectedBooking?.status === 'PAID' &&
                Number(selectedBooking?.final_payable || selectedBooking?.bill_amount || 0) > 0 && (
                  <View
                    style={{
                      backgroundColor: '#FEF7E6',
                      borderRadius: 10,
                      padding: 11,
                      borderWidth: 1,
                      borderColor: '#F3DBA8',
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#9A5B13' }}>
                          Patient Paid ₹
                          {Number(
                            selectedBooking?.final_payable || selectedBooking?.bill_amount || 0
                          ).toLocaleString('en-IN')}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#7A541C', marginTop: 1 }}>
                          Raise a PENDING refund ticket for Finance approval (does not disburse money directly).
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setShowRefundRequestBox((v) => !v);
                          setRefundRequestFeedback(null);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E6C27A',
                        }}
                      >
                        <RotateCcw size={12} color="#9A5B13" />
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#9A5B13' }}>
                          {showRefundRequestBox ? 'Close' : 'Request Refund'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showRefundRequestBox && (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          value={refundReason}
                          onChangeText={setRefundReason}
                          placeholder="Reason (e.g. Patient cancelled before sample pickup)"
                          placeholderTextColor="#9A7E4F"
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#E6C27A',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            fontSize: 12,
                            color: THEME.ink,
                          }}
                        />
                        <TouchableOpacity
                          onPress={handleRequestRefund}
                          disabled={isRequestingRefund}
                          style={{
                            alignSelf: 'flex-end',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: '#9A5B13',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                            {isRequestingRefund ? 'Submitting...' : 'Submit to Finance Queue'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {refundRequestFeedback && (
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#7A420E' }}>
                        {refundRequestFeedback}
                      </Text>
                    )}
                  </View>
                )}

              {/* Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                {selectedBooking?.patient_phone ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${selectedBooking.patient_phone}`).catch(() => {})}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Phone size={14} color={THEME.greenPrimary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                      Call
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.creamSoft,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveBookingChanges}
                    disabled={isSavingBooking}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: THEME.greenPrimary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                      {isSavingBooking ? 'Saving...' : 'Save & Sync'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
