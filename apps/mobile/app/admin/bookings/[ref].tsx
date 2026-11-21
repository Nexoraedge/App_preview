import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Menu,
  MessageCircle,
  Phone,
  Printer,
  Receipt,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, BookingStatus } from '@adityam/types';
import { fetchAllBookings } from '../../../src/services/bookingStorage';
import { AdminSidebar, AdminNavSection } from '../../../components/admin/AdminSidebar';
import { useAdminAuth, getSourcePanelForRole } from '../../../components/admin/AdminAuthGate';
import { logAdminAudit } from '../../../src/services/adminAudit';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2EA',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  amberText: '#92400E',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
  redText: '#991B1B',
};

function parsePurpose(rawNotes?: string | null): string {
  if (!rawNotes) return '';
  let cleaned = String(rawNotes)
    .replace(/Counter OTP:\s*\d+\.?/gi, '')
    .replace(/Paid online via [^.]+\.?/gi, '')
    .replace(/Direct OPD consult booked for [^.]+\.?/gi, '')
    .replace(/Priority QR pass issued\.?/gi, '')
    .replace(/^Reason\s*\/\s*Symptoms:\s*/i, '')
    .trim();
  if (cleaned.endsWith('.')) cleaned = cleaned.slice(0, -1).trim();
  return cleaned;
}

function extractPaymentInfo(rawNotes?: string | null): string {
  if (!rawNotes) return 'Online In-App Payment';
  const match = String(rawNotes).match(/Paid online via ([^.]+)/i);
  return match?.[1]?.trim() || 'Online In-App Payment';
}

export default function AdminBookingDetailSlugRoute() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { adminUser } = useAdminAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [crmLogs, setCrmLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editStatus, setEditStatus] = useState<BookingStatus>('NEW');
  const [editAgent, setEditAgent] = useState('');
  const [newLogNote, setNewLogNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    totalBookings: 0,
    pendingRx: 0,
    hospitals: 0,
    enquiries: 0,
    verifications: 0,
    labs: 0,
    pharmacies: 0,
    patients: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [
        bookingRes,
        crmRes,
        auditRes,
        cloudBookings,
        localList,
        hospRes,
        labRes,
        pharmRes,
        usersRes,
        enqRes,
        verifRes,
      ] = await Promise.all([
        supabase.from('bookings').select('*').eq('booking_ref', String(ref || '')).maybeSingle(),
        supabase.from('booking_crm_logs').select('*').eq('booking_ref', String(ref || '')).order('created_at', { ascending: false }),
        supabase.from('admin_audit_logs').select('*').eq('entity_id', String(ref || '')).order('created_at', { ascending: false }).limit(25),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(250),
        fetchAllBookings(),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('lab_centres').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('partner_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
        supabase.from('partner_verification_requests').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'UNDER_REVIEW']),
      ]);

      if (bookingRes.data) {
        const b = bookingRes.data as Booking;
        setBooking(b);
        setEditStatus(b.status);
        setEditAgent(b.assigned_agent || '');

        // Resolve partner phone if available
        if ((b as any).hospital_id) {
          const { data: h } = await supabase
            .from('hospitals')
            .select('contact_number, secondary_contact_number')
            .eq('id', (b as any).hospital_id)
            .maybeSingle();
          setPartnerPhone(h?.contact_number || h?.secondary_contact_number || null);
        } else if ((b as any).pharmacy_id) {
          const { data: p } = await supabase
            .from('pharmacies')
            .select('phone')
            .eq('id', (b as any).pharmacy_id)
            .maybeSingle();
          setPartnerPhone(p?.phone || null);
        } else if ((b as any).lab_centre_id) {
          const { data: l } = await supabase
            .from('lab_centres')
            .select('phone')
            .eq('id', (b as any).lab_centre_id)
            .maybeSingle();
          setPartnerPhone(l?.phone || null);
        } else {
          setPartnerPhone(null);
        }
      }
      setCrmLogs(crmRes.data || []);
      setAuditLogs(auditRes.data || []);

      const merged = new Map<string, Booking>();
      if (cloudBookings.data) {
        for (const b of cloudBookings.data as Booking[]) {
          if (b.booking_ref) merged.set(b.booking_ref, b);
        }
      }
      if (Array.isArray(localList)) {
        for (const b of localList) {
          if (b.booking_ref && !merged.has(b.booking_ref)) merged.set(b.booking_ref, b);
        }
      }
      const list = Array.from(merged.values());
      setCounts({
        totalBookings: list.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (b.status as string) !== 'MISSED').length,
        pendingRx: list.filter((b) => Boolean(b.bill_image_url) && b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length,
        hospitals: hospRes.count ?? 0,
        enquiries: enqRes.count ?? 0,
        verifications: verifRes.count ?? 0,
        labs: labRes.count ?? 0,
        pharmacies: pharmRes.count ?? 0,
        patients: usersRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveBookingUpdate = async () => {
    if (!booking) return;
    setBusy(true);
    setMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: editStatus,
          assigned_agent: editAgent.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', booking.booking_ref);
      if (error) {
        setMsg(`Error: ${error.message}`);
        return;
      }
      if (adminUser?.id) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'UPDATE_BOOKING_STATUS',
          entityType: 'booking',
          entityId: booking.booking_ref,
          details: { status: editStatus, assignedAgent: editAgent },
        });
      }
      setMsg('Booking updated successfully.');
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const handleAddCrmLog = async () => {
    if (!booking || !newLogNote.trim()) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('booking_crm_logs').insert({
        booking_ref: booking.booking_ref,
        agent_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
        outcome: 'Call Center Note',
        notes: newLogNote.trim(),
      });
      setNewLogNote('');
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const handleSelectSection = (sec: AdminNavSection) => {
    router.replace(`/admin?section=${sec}` as any);
  };

  const waPhone = String(booking?.patient_phone || '').replace(/\D/g, '');
  const anyB = booking as any;
  const netPaid = Number(booking?.final_payable ?? booking?.doctor_fee ?? booking?.bill_amount ?? 0);
  const mrpFee = Number(booking?.doctor_fee ?? booking?.bill_amount ?? netPaid);
  const discountAmt = Number(anyB?.discount_amount ?? (mrpFee > netPaid ? mrpFee - netPaid : 0));
  const commissionAmt = Number(anyB?.platform_commission ?? 0);
  const partnerPayout = Number(anyB?.partner_payout ?? Math.max(0, netPaid - commissionAmt));
  const purpose = parsePurpose(booking?.notes);
  const paymentMethodText = extractPaymentInfo(booking?.notes);
  const partnerLogs = auditLogs.filter((a) => String(a.source_panel || '').toUpperCase().includes('PARTNER'));
  const adminLogs = auditLogs.filter((a) => !String(a.source_panel || '').toUpperCase().includes('PARTNER'));

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: THEME.bg,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      <AdminSidebar
        activeSection="bookings"
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/(tabs)')}
        counts={counts}
        realtimeConnected={true}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Top Header */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!isDesktop && (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: '#F3EFE4',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Menu size={19} color={THEME.ink} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.replace('/admin?section=bookings' as any)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#F3EFE4',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <ArrowLeft size={17} color={THEME.ink} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 19, fontWeight: '800', color: THEME.ink }}>
                Booking #{ref}
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted }}>
                Full audit, call center & hospital logs, itemized bill & payout
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {Platform.OS === 'web' && booking ? (
              <TouchableOpacity
                onPress={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: THEME.surfaceAlt,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                }}
              >
                <Printer size={14} color={THEME.ink} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Print Bill</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.replace('/admin?section=patients' as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9,
              }}
            >
              <User size={14} color={THEME.green} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                Patient Directory →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: isDesktop ? 24 : 14, gap: 16, paddingBottom: 60 }}
        >
          {loading ? (
            <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={THEME.green} />
              <Text style={{ fontSize: 13, color: THEME.muted }}>Loading booking details...</Text>
            </View>
          ) : !booking ? (
            <View style={{ padding: 32, alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Booking Not Found</Text>
            </View>
          ) : (
            <>
              {/* Hero Summary Card */}
              <View
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  padding: 18,
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ gap: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: THEME.ink }}>
                        {booking.patient_name} · {booking.patient_phone || 'N/A'}
                      </Text>
                      <View
                        style={{
                          backgroundColor: booking.status === 'COMPLETED' ? THEME.greenSoft : booking.status === 'CANCELLED' ? THEME.redBg : '#E0F2FE',
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                          borderRadius: 99,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: booking.status === 'COMPLETED' ? THEME.greenDark : booking.status === 'CANCELLED' ? THEME.redText : '#0284C7',
                          }}
                        >
                          {booking.status === 'PAID' ? 'PAID ONLINE' : booking.status}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: THEME.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>{booking.service_type}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {booking.patient_phone ? (
                      <TouchableOpacity
                        onPress={() => void Linking.openURL(`tel:${booking.patient_phone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.surfaceAlt,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          paddingHorizontal: 11,
                          paddingVertical: 8,
                          borderRadius: 9,
                        }}
                      >
                        <Phone size={13} color={THEME.ink} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call Patient</Text>
                      </TouchableOpacity>
                    ) : null}
                    {partnerPhone ? (
                      <TouchableOpacity
                        onPress={() => void Linking.openURL(`tel:${partnerPhone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: '#EFF6FF',
                          borderWidth: 1,
                          borderColor: '#BFDBFE',
                          paddingHorizontal: 11,
                          paddingVertical: 8,
                          borderRadius: 9,
                        }}
                      >
                        <Phone size={13} color="#1D4ED8" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>Call Partner</Text>
                      </TouchableOpacity>
                    ) : null}
                    {waPhone ? (
                      <TouchableOpacity
                        onPress={() => void Linking.openURL(`https://wa.me/${waPhone.length === 10 ? `91${waPhone}` : waPhone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                          paddingHorizontal: 11,
                          paddingVertical: 8,
                          borderRadius: 9,
                        }}
                      >
                        <MessageCircle size={13} color={THEME.greenDark} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* 3-Tile Info Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, borderRadius: 11, padding: 12, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <CalendarClock size={12} color={THEME.amberText} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amberText, letterSpacing: 0.4 }}>APPOINTMENT / SLOT TIMING</Text>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      {booking.slot_time || 'Scheduled / On-Demand'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Stethoscope size={12} color={THEME.green} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>DOCTOR / SERVICE</Text>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenDark }}>
                      {booking.doctor_name || booking.service_type}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
                      {anyB?.specialty_requested || 'Adityam Care'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Building2 size={12} color={THEME.muted} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>HOSPITAL / PARTNER</Text>
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      {booking.hospital_name || 'Adityam Network'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
                      {anyB?.branch_name || 'Main Branch'}
                    </Text>
                  </View>
                </View>

                {/* Full-Width Visit Purpose / Symptoms */}
                <View style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                    VISIT PURPOSE / PATIENT SYMPTOMS
                  </Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.ink, lineHeight: 20 }}>
                    {purpose || booking.notes || 'Standard Booking'}
                  </Text>
                </View>
              </View>

              {/* 2-Column Workspace */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
                {/* Left Column: Status, Call Center Logs, Hospital Logs, Rx */}
                <View style={{ flex: 1.7, minWidth: 300, gap: 16, width: '100%' }}>
                  {/* Status & Coordinator Control */}
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 18,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      Status & Coordinator Assignment
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(['NEW', 'CALLING', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED'] as const).map((st) => {
                        const active = editStatus === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setEditStatus(st)}
                            style={{
                              paddingHorizontal: 11,
                              paddingVertical: 7,
                              borderRadius: 99,
                              backgroundColor: active ? THEME.greenDark : THEME.bg,
                              borderWidth: 1,
                              borderColor: active ? THEME.greenDark : THEME.border,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : THEME.muted }}>
                              {st === 'PAID' ? 'PAID ONLINE' : st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      value={editAgent}
                      onChangeText={setEditAgent}
                      placeholder="Assigned coordinator name..."
                      placeholderTextColor="#9CA3AF"
                      style={{
                        backgroundColor: THEME.bg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        borderRadius: 9,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 13,
                        color: THEME.ink,
                      }}
                    />
                    {msg ? <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }}>{msg}</Text> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <TouchableOpacity
                        onPress={() => void handleSaveBookingUpdate()}
                        disabled={busy}
                        style={{
                          backgroundColor: THEME.green,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={15} color="#FFFFFF" />
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                          {busy ? 'Saving...' : 'Save Status'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Call Center & CRM Logs */}
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 18,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Phone size={16} color={THEME.green} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        Call Center & Coordinator Logs ({crmLogs.length + adminLogs.length})
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={newLogNote}
                        onChangeText={setNewLogNote}
                        placeholder="Add call center / coordinator follow-up note..."
                        placeholderTextColor="#9CA3AF"
                        style={{
                          flex: 1,
                          backgroundColor: THEME.bg,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 9,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          fontSize: 13,
                          color: THEME.ink,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => void handleAddCrmLog()}
                        disabled={busy || !newLogNote.trim()}
                        style={{
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 14,
                          borderRadius: 9,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Add Log</Text>
                      </TouchableOpacity>
                    </View>

                    {crmLogs.length === 0 && adminLogs.length === 0 ? (
                      <Text style={{ fontSize: 12.5, color: THEME.muted }}>No call center notes logged yet.</Text>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {crmLogs.map((l) => (
                          <View key={l.id} style={{ backgroundColor: THEME.bg, borderRadius: 9, padding: 10, borderWidth: 1, borderColor: THEME.border, gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                              {l.agent_name || 'Coordinator'} · {l.outcome || 'Call Log'}
                            </Text>
                            <Text style={{ fontSize: 12.5, color: THEME.ink }}>{l.notes}</Text>
                            <Text style={{ fontSize: 10.5, color: THEME.muted }}>{new Date(l.created_at).toLocaleString('en-IN')}</Text>
                          </View>
                        ))}
                        {adminLogs.map((a) => (
                          <View key={a.id} style={{ backgroundColor: THEME.surfaceAlt, borderRadius: 9, padding: 10, gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                              {String(a.action || '').replace(/_/g, ' ')} · {a.actor_name || a.source_panel}
                            </Text>
                            <Text style={{ fontSize: 10.5, color: THEME.muted }}>{new Date(a.created_at).toLocaleString('en-IN')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Hospital / Partner Counter Logs */}
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <History size={16} color={THEME.green} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        Hospital & Partner Desk Logs ({partnerLogs.length})
                      </Text>
                    </View>

                    {anyB?.checked_in_at ? (
                      <View style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, borderRadius: 10, padding: 11, gap: 2 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
                          ✓ Counter Check-In Completed
                        </Text>
                        <Text style={{ fontSize: 12, color: THEME.ink }}>
                          {new Date(anyB.checked_in_at).toLocaleString('en-IN')}
                          {anyB.checked_in_by ? ` · Verified by ${anyB.checked_in_by}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {anyB?.partner_notes ? (
                      <View style={{ backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, borderRadius: 10, padding: 11, gap: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.amberText }}>PARTNER / DOCTOR NOTES</Text>
                        <Text style={{ fontSize: 12.5, color: THEME.ink }}>{anyB.partner_notes}</Text>
                      </View>
                    ) : null}

                    {partnerLogs.length === 0 && !anyB?.checked_in_at && !anyB?.partner_notes ? (
                      <Text style={{ fontSize: 12.5, color: THEME.muted }}>No hospital counter activity recorded yet.</Text>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {partnerLogs.map((a) => (
                          <View key={a.id} style={{ backgroundColor: THEME.greenSoft, borderRadius: 9, padding: 10, borderWidth: 1, borderColor: THEME.greenBorder, gap: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                              {String(a.action || '').replace(/_/g, ' ')} · {a.actor_name || 'Partner Desk'}
                            </Text>
                            <Text style={{ fontSize: 10.5, color: THEME.muted }}>{new Date(a.created_at).toLocaleString('en-IN')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Prescription / Slip Preview */}
                  {booking.bill_image_url ? (
                    <View
                      style={{
                        backgroundColor: THEME.surface,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        padding: 18,
                        gap: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <FileText size={16} color={THEME.green} />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                            Uploaded Prescription / Bill Slip
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => void Linking.openURL(booking.bill_image_url!)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Open Full</Text>
                          <ExternalLink size={12} color={THEME.green} />
                        </TouchableOpacity>
                      </View>
                      <Image
                        source={{ uri: booking.bill_image_url }}
                        resizeMode="cover"
                        style={{ width: '100%', maxWidth: 360, height: 220, borderRadius: 10, backgroundColor: '#F1F5F9' }}
                      />
                    </View>
                  ) : null}
                </View>

                {/* Right Column: Itemized Bill, Pricing, Payout & Lifecycle */}
                <View style={{ flex: 1, minWidth: 280, gap: 16, width: '100%' }}>
                  {/* Itemized Bill & Payout Card */}
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ backgroundColor: THEME.greenDark, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Receipt size={17} color="#FFFFFF" />
                        <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' }}>
                          Adityam Itemized Bill & Payout
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#C6E2D4' }}>
                        #{booking.booking_ref}
                      </Text>
                    </View>

                    <View style={{ padding: 16, gap: 10 }}>
                      {[
                        { label: 'Gross Consultation / MRP', value: `₹${mrpFee.toLocaleString('en-IN')}` },
                        ...(discountAmt > 0 ? [{ label: 'Adityam Discount', value: `-₹${discountAmt.toLocaleString('en-IN')}`, highlight: THEME.green }] : []),
                        { label: 'Net Paid Online', value: `₹${netPaid.toLocaleString('en-IN')}`, bold: true },
                        { label: 'Payment Gateway', value: paymentMethodText },
                      ].map((row: any) => (
                        <View
                          key={row.label}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingBottom: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.surfaceAlt,
                          }}
                        >
                          <Text style={{ fontSize: 12.5, color: THEME.muted, fontWeight: '600' }}>{row.label}</Text>
                          <Text
                            style={{
                              fontSize: row.bold ? 14.5 : 12.5,
                              color: row.highlight || THEME.ink,
                              fontWeight: row.bold ? '900' : '700',
                            }}
                          >
                            {row.value}
                          </Text>
                        </View>
                      ))}

                      <View style={{ backgroundColor: THEME.bg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: THEME.border, gap: 6, marginTop: 4 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                          PARTNER SETTLEMENT & PAYOUT
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: THEME.muted }}>Platform Commission</Text>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                            ₹{commissionAmt.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>Partner Net Payout</Text>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.greenDark }}>
                            ₹{partnerPayout.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={{ fontSize: 11.5, color: THEME.muted }}>Settlement Status</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: booking.status === 'COMPLETED' ? THEME.green : THEME.amberText }}>
                            {booking.status === 'COMPLETED' ? 'Ready / Verified' : booking.status === 'CANCELLED' ? 'Cancelled / Refund' : 'Awaiting Check-In'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Lifecycle & Security Timestamps */}
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 16,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <ShieldCheck size={16} color={THEME.green} />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                        Lifecycle & Verification
                      </Text>
                    </View>
                    {[
                      {
                        label: 'Booked At',
                        value: new Date(booking.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      },
                      {
                        label: 'Completed / Check-In',
                        value: anyB?.checked_in_at
                          ? new Date(anyB.checked_in_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : booking.status === 'COMPLETED'
                            ? 'Completed'
                            : 'Pending',
                      },
                      {
                        label: 'Confidential Counter OTP',
                        value: anyB?.verification_code ? `${anyB.verification_code}` : 'Not Issued',
                        highlight: '#1D4ED8',
                      },
                    ].map((row) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingBottom: 7,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.surfaceAlt,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>{row.label}</Text>
                        <Text style={{ fontSize: 12.5, color: row.highlight || THEME.ink, fontWeight: '800' }}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
