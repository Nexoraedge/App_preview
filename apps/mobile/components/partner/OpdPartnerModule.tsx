import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  CheckCircle2,
  Clock,
  FileImage,
  MessageCircle,
  PackageCheck,
  Phone,
  QrCode,
  Search,
  Upload,
  XCircle,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { playAdminAlertChime, playPartnerOrderAlarm } from '../../src/services/adminAlerts';
import { logAdminAudit } from '../../src/services/adminAudit';
import { SelectDropdown } from '../admin/SelectDropdown';

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
  amberText: '#92400E',
  amberBg: '#FEF3C7',
  amberBorder: '#FDE68A',
  redText: '#991B1B',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
};

interface OpdPartnerModuleProps {
  hospitalId?: string | null;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  soundEnabled?: boolean;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function extractScanToken(raw: string): string {
  const trimmed = (raw || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.otp) return String(parsed.otp).trim();
    if (parsed?.ref) return String(parsed.ref).trim();
    if (parsed?.booking_ref) return String(parsed.booking_ref).trim();
  } catch {}
  try {
    if (trimmed.includes('://') || trimmed.includes('ref=')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://adityam.health/pass?${trimmed}`);
      const otp = url.searchParams.get('otp');
      const ref = url.searchParams.get('ref');
      if (otp) return otp.trim();
      if (ref) return ref.trim();
    }
  } catch {}
  return trimmed;
}

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

export function OpdPartnerModule({
  hospitalId,
  actorId,
  actorName = 'OPD Desk',
  actorRole = 'hospital_partner',
  soundEnabled = true,
}: OpdPartnerModuleProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('ACTIVE');
  const [dateFilter, setDateFilter] = useState<'7D' | 'TODAY' | 'ALL'>('7D');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [pinByRef, setPinByRef] = useState<Record<string, string>>({});
  const [errByRef, setErrByRef] = useState<Record<string, string>>({});
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [uploadingRxRef, setUploadingRxRef] = useState<string | null>(null);
  const [qrOpenRef, setQrOpenRef] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const loadOpdBookings = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      let hospitalName: string | null = null;
      if (hospitalId) {
        const { data: hospRow } = await supabase
          .from('hospitals')
          .select('name')
          .eq('id', hospitalId)
          .maybeSingle();
        hospitalName = hospRow?.name || null;
      }

      const { data } = await supabase
        .from('bookings')
        .select('*')
        .in('service_type', ['OPD_CONCIERGE', 'OPD'])
        .order('created_at', { ascending: false })
        .limit(150);

      const rows = (data || []).filter((b: any) => {
        if (!hospitalId) return true;
        if (b.hospital_id === hospitalId) return true;
        // Fallback for older bookings synced before hospital_id was included
        if (!b.hospital_id && hospitalName && String(b.hospital_name || '').toLowerCase() === hospitalName.toLowerCase()) {
          return true;
        }
        return false;
      });
      setBookings(rows);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadOpdBookings();
    try {
      const supabase = getSupabaseClient();
      const ch = supabase
        .channel('partner-opd-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload: any) => {
            const row = payload?.new || {};
            if (row.service_type === 'OPD_CONCIERGE' || row.service_type === 'OPD') {
              if (payload?.eventType === 'INSERT' && soundEnabled) {
                playPartnerOrderAlarm(
                  'New OPD Appointment!',
                  `${row.patient_name || 'Patient'} booked ${row.doctor_name || 'Doctor'} (#${row.booking_ref})`
                );
              }
              loadOpdBookings();
            }
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
    } catch {
      return undefined;
    }
  }, [loadOpdBookings, soundEnabled]);

  const opdStats = useMemo(() => {
    const nowMs = Date.now();
    const WEEK_MS = 7 * 86400000;
    let upcoming = 0;
    let visitedThisWeek = 0;
    let totalGross = 0;
    for (const b of bookings) {
      if (b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'MISSED') {
        upcoming += 1;
      }
      if (b.status === 'COMPLETED') {
        totalGross += Number(b.final_payable ?? b.doctor_fee ?? 0);
        const refDate = b.checked_in_at || b.created_at;
        const ms = new Date(refDate).getTime();
        if (!Number.isNaN(ms) && nowMs - ms <= WEEK_MS) {
          visitedThisWeek += 1;
        }
      }
    }
    return { upcoming, visitedThisWeek, totalGross };
  }, [bookings]);

  const doctorOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        bookings
          .map((b) => String(b.doctor_name || '').trim())
          .filter(Boolean)
      )
    ).sort();
    return [
      { value: 'ALL', label: 'All Doctors' },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const todayStr = new Date().toDateString();
    return bookings.filter((b) => {
      if (dateFilter === 'TODAY' && new Date(b.created_at).toDateString() !== todayStr) return false;
      if (dateFilter === '7D' && now - new Date(b.created_at).getTime() > 7 * 86400000) return false;
      if (doctorFilter !== 'ALL' && String(b.doctor_name || '').trim() !== doctorFilter) return false;

      if (filter === 'ACTIVE') {
        if (b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'MISSED') return false;
      } else if (filter === 'COMPLETED') {
        if (b.status !== 'COMPLETED') return false;
      } else if (filter === 'CANCELLED') {
        if (b.status !== 'CANCELLED' && b.status !== 'MISSED') return false;
      }
      if (!q) return true;
      return (
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.patient_name || '').toLowerCase().includes(q) ||
        String(b.patient_phone || '').toLowerCase().includes(q) ||
        String(b.doctor_name || '').toLowerCase().includes(q) ||
        String(b.branch_name || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, filter, dateFilter, doctorFilter, search]);

  const handleVerifyCheckIn = async (b: any, overrideToken?: string) => {
    const expected = String(b.verification_code || '').trim();
    const entered = String(overrideToken ?? (pinByRef[b.booking_ref] || '')).trim();
    const isQrScan = Boolean(overrideToken);
    if (!entered) {
      setErrByRef((prev) => ({
        ...prev,
        [b.booking_ref]: 'Please enter the 6-digit Patient OTP or scan their QR pass.',
      }));
      return;
    }
    if (expected) {
      const ok = entered === expected || (isQrScan && entered.toUpperCase() === String(b.booking_ref || '').toUpperCase());
      if (!ok) {
        setErrByRef((prev) => ({
          ...prev,
          [b.booking_ref]: 'Incorrect Patient OTP. Ask the patient for the 6-digit OTP on their pass.',
        }));
        return;
      }
    } else if (entered.toUpperCase() !== String(b.booking_ref || '').toUpperCase()) {
      setErrByRef((prev) => ({
        ...prev,
        [b.booking_ref]: 'Incorrect code or QR. Ask the patient at the counter.',
      }));
      return;
    }

    setBusyRef(b.booking_ref);
    setErrByRef((prev) => ({ ...prev, [b.booking_ref]: '' }));
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'COMPLETED',
          checked_in_at: nowIso,
          checked_in_by: actorName,
          updated_at: nowIso,
        })
        .eq('booking_ref', b.booking_ref);
      if (error) throw error;

      if (actorId) {
        logAdminAudit({
          actorId,
          actorName,
          actorRole,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'OPD_COUNTER_CHECKIN',
          entityType: 'booking',
          entityId: b.booking_ref,
          details: { doctorName: b.doctor_name, branchName: b.branch_name },
        });
      }

      playAdminAlertChime('OPD Visit Checked In', `Patient ${b.patient_name} checked in (#${b.booking_ref}).`);
      setPinByRef((prev) => ({ ...prev, [b.booking_ref]: '' }));
      setQrOpenRef(null);
      await loadOpdBookings();
    } catch (err: any) {
      setErrByRef((prev) => ({
        ...prev,
        [b.booking_ref]: err?.message || 'Could not complete check-in.',
      }));
    } finally {
      setBusyRef(null);
    }
  };

  const handleCancelOpd = async (b: any) => {
    setBusyRef(b.booking_ref);
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          partner_notes: 'Cancelled / Patient No-Show at OPD Desk',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', b.booking_ref);
      await loadOpdBookings();
    } catch {}
    setBusyRef(null);
  };

  const handleUploadDoctorRx = async (b: any) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.75 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setUploadingRxRef(b.booking_ref);
      const url = await uploadPrescriptionSlip(res.assets[0].uri, `${b.booking_ref}_opd_rx.jpg`);
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          bill_image_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', b.booking_ref);
      playAdminAlertChime('Prescription Uploaded', `Rx uploaded for #${b.booking_ref}.`);
      await loadOpdBookings();
    } catch {
      // handled silently
    } finally {
      setUploadingRxRef(null);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={THEME.green} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {/* OPD KPI Row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          {
            label: 'UPCOMING OPD',
            value: String(opdStats.upcoming),
            sub: 'Waiting for check-in',
            bg: filter === 'ACTIVE' ? THEME.greenSoft : THEME.surface,
            borderColor: filter === 'ACTIVE' ? THEME.green : THEME.border,
            color: THEME.ink,
            onPress: () => setFilter('ACTIVE'),
          },
          {
            label: 'VISITED THIS WEEK',
            value: String(opdStats.visitedThisWeek),
            sub: 'Verified via OTP / QR (7d)',
            bg: THEME.greenDark,
            borderColor: THEME.greenDark,
            color: '#FFFFFF',
            onPress: () => setFilter(filter === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED'),
          },
          {
            label: 'OPD GROSS',
            value: `₹${opdStats.totalGross.toLocaleString('en-IN')}`,
            sub: 'Completed consultations',
            bg: THEME.surface,
            borderColor: THEME.border,
            color: THEME.greenDark,
            onPress: () => setFilter('COMPLETED'),
          },
        ].map((kpi) => (
          <TouchableOpacity
            key={kpi.label}
            onPress={kpi.onPress}
            style={{
              flex: 1,
              minWidth: 160,
              backgroundColor: kpi.bg,
              borderRadius: 12,
              padding: 13,
              borderWidth: 1,
              borderColor: kpi.borderColor,
              gap: 3,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: kpi.bg === THEME.greenDark ? '#C6E2D4' : THEME.muted }}>
              {kpi.label}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: kpi.color }}>{kpi.value}</Text>
            <Text style={{ fontSize: 11, color: kpi.bg === THEME.greenDark ? '#EBF5F0' : THEME.muted }}>{kpi.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search + Dropdown Filters */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: THEME.bg,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: THEME.border,
            paddingHorizontal: 11,
            paddingVertical: 8,
          }}
        >
          <Search size={15} color={THEME.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient, phone, doctor, branch, or booking ref..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <SelectDropdown
              label="Status"
              value={filter}
              onChange={(val) => setFilter(val as any)}
              options={[
                { value: 'ACTIVE', label: 'Upcoming / Active' },
                { value: 'COMPLETED', label: 'Visited / Completed' },
                { value: 'CANCELLED', label: 'Cancelled / No-Show' },
                { value: 'ALL', label: 'All Appointments' },
              ]}
            />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <SelectDropdown
              label="Date Range"
              value={dateFilter}
              onChange={(val) => setDateFilter(val as any)}
              options={[
                { value: '7D', label: 'Last 7 Days' },
                { value: 'TODAY', label: 'Today' },
                { value: 'ALL', label: 'All Dates' },
              ]}
            />
          </View>
          <View style={{ flex: 1, minWidth: 180 }}>
            <SelectDropdown
              label="Doctor"
              value={doctorFilter}
              onChange={setDoctorFilter}
              options={doctorOptions}
            />
          </View>
        </View>
      </View>

      {filtered.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
            No OPD appointments match this filter
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((b) => {
            const isCompleted = b.status === 'COMPLETED';
            const isCancelled = b.status === 'CANCELLED' || b.status === 'MISSED';
            const waPhone = normalizePhone(b.patient_phone);
            const fee = Number(b.final_payable ?? b.doctor_fee ?? 0);
            const mrpFee = Number(b.doctor_fee ?? fee);
            const discountAmt = Number(b.discount_amount ?? (mrpFee > fee ? mrpFee - fee : 0));
            const isPaidOnline =
              b.status === 'PAID' ||
              String(b.payment_status || '').toUpperCase() === 'PAID' ||
              /paid online/i.test(String(b.notes || '')) ||
              String(b.payment_mode || '').toUpperCase().includes('ONLINE') ||
              String(b.payment_mode || '').toUpperCase().includes('UPI');
            const isQrOpen = qrOpenRef === b.booking_ref;
            const patientMetaParts = [
              b.patient_age ? `${b.patient_age} yrs` : null,
              b.patient_gender || null,
              b.family_member_relation || null,
            ].filter(Boolean);
            return (
              <View
                key={b.id || b.booking_ref}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  padding: 15,
                  borderWidth: 1,
                  borderColor: isCompleted ? THEME.greenBorder : THEME.border,
                  gap: 10,
                }}
              >
                {/* Top Header Row: Ref + Token + Status + Payment + Slot Timing + Fee */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      #{b.booking_ref}
                    </Text>
                    {b.token_number ? (
                      <View
                        style={{
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' }}>
                          Token #{b.token_number}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        backgroundColor: isCompleted ? THEME.greenSoft : isCancelled ? THEME.redBg : '#E0F2FE',
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: isCompleted ? THEME.greenDark : isCancelled ? THEME.redText : '#0284C7',
                        }}
                      >
                        {b.status === 'PAID' ? 'PAID ONLINE' : b.status}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#FEF7E6',
                        borderWidth: 1,
                        borderColor: '#F3DBA8',
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 8,
                      }}
                    >
                      <Clock size={12} color="#92400E" />
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#92400E' }}>
                        {b.slot_time || 'Scheduled Slot'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.greenDark }}>
                      ₹{fee.toLocaleString('en-IN')}
                    </Text>
                    {discountAmt > 0 ? (
                      <Text style={{ fontSize: 10.5, color: THEME.green, fontWeight: '700' }}>
                        MRP ₹{mrpFee.toLocaleString('en-IN')} · Saved ₹{discountAmt.toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 10.5, color: THEME.muted }}>
                      Booked {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {/* Organized Compact 3-Column Summary: Patient, Timing, Assigned Doctor */}
                <View
                  style={{
                    backgroundColor: THEME.surfaceAlt,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                        PATIENT
                      </Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                        {b.patient_name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
                        {b.patient_phone || 'No phone'}
                        {patientMetaParts.length > 0 ? ` · ${patientMetaParts.join(' · ')}` : ''}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                        APPOINTMENT TIMING
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                        {b.slot_time || 'Scheduled Slot'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
                        {b.branch_name || b.hospital_name || 'Main Clinic'}
                      </Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 170, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                        ASSIGNED DOCTOR
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.green }}>
                        {b.doctor_name || 'Assigned Doctor'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
                        {b.specialty_requested || 'General OPD'}
                      </Text>
                    </View>
                  </View>

                  {parsePurpose(b.notes) ? (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: THEME.border,
                        paddingTop: 7,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, color: THEME.ink }} numberOfLines={1}>
                        <Text style={{ fontWeight: '800', color: THEME.muted }}>Purpose: </Text>
                        {parsePurpose(b.notes)}
                      </Text>
                    </View>
                  ) : null}

                  {isCompleted && b.checked_in_at ? (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenDark }}>
                      ✓ Checked in {new Date(b.checked_in_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {b.checked_in_by ? ` by ${b.checked_in_by}` : ''}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {b.patient_phone ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${b.patient_phone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.surfaceAlt,
                          borderWidth: 1,
                          borderColor: THEME.border,
                        }}
                      >
                        <Phone size={12} color={THEME.ink} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call</Text>
                      </TouchableOpacity>
                    ) : null}
                    {waPhone ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://wa.me/${waPhone}`)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                        }}
                      >
                        <MessageCircle size={12} color={THEME.greenDark} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>WhatsApp</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/partner/opd/appointments/${b.booking_ref}` as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 9,
                      backgroundColor: THEME.greenDark,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {isCompleted ? 'View Details & Rx →' : 'View Client & Check-In →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
