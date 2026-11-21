import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Upload,
  XCircle,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { usePartnerAuth } from '../PartnerAuthGate';
import { logAdminAudit } from '../../../src/services/adminAudit';
import { playAdminAlertChime } from '../../../src/services/adminAlerts';

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

function extractScanData(raw: string): { ref?: string; otp?: string } {
  const trimmed = (raw || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    return {
      ref: parsed?.ref || parsed?.booking_ref || undefined,
      otp: parsed?.otp || undefined,
    };
  } catch {}
  try {
    if (trimmed.includes('://') || trimmed.includes('ref=')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://adityam.health/pass?${trimmed}`);
      return {
        ref: url.searchParams.get('ref') || undefined,
        otp: url.searchParams.get('otp') || undefined,
      };
    }
  } catch {}
  if (/^\d{4,6}$/.test(trimmed)) return { otp: trimmed };
  return { ref: trimmed };
}

export function OpdAppointmentDetailView({
  bookingRef,
  onBack,
}: {
  bookingRef: string;
  onBack: () => void;
}) {
  const { partnerUser } = usePartnerAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingRx, setUploadingRx] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonType, setCancelReasonType] = useState<'NO_SHOW' | 'DOCTOR_UNAVAILABLE' | 'CLINIC_ISSUE' | 'PATIENT_REQUEST'>('NO_SHOW');
  const [cancelResolution, setCancelResolution] = useState<'RESCHEDULE' | 'REFUND'>('REFUND');
  const [cancelNote, setCancelNote] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const supabase = getSupabaseClient();
      const [{ data, error }, { data: logs }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('booking_ref', bookingRef)
          .maybeSingle(),
        supabase
          .from('admin_audit_logs')
          .select('*')
          .eq('entity_id', bookingRef)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (error) {
        setErrMsg(error.message);
      } else if (data) {
        setBooking(data);
        setNotesInput(data.partner_notes || '');
      }
      setAuditLogs(logs || []);
    } finally {
      setLoading(false);
    }
  }, [bookingRef]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const completeCheckIn = async (via: 'OTP' | 'QR') => {
    if (!booking) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const actor = partnerUser?.fullName || partnerUser?.email || 'Partner Staff';
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'COMPLETED',
          checked_in_at: nowIso,
          checked_in_by: actor,
          updated_at: nowIso,
        })
        .eq('booking_ref', booking.booking_ref);
      if (error) throw error;

      if (partnerUser?.id) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: via === 'QR' ? 'OPD_QR_CHECKIN' : 'OPD_COUNTER_CHECKIN',
          entityType: 'booking',
          entityId: booking.booking_ref,
          details: { doctorName: booking.doctor_name, branchName: booking.branch_name, via },
        });
      }

      playAdminAlertChime('OPD Visit Checked In', `Patient ${booking.patient_name} verified (#${booking.booking_ref}).`);
      setOkMsg(`${via === 'QR' ? 'QR Pass' : '4-digit OTP'} verified! Patient checked in & marked COMPLETED.`);
      setOtpInput('');
      setScannerOpen(false);
      await loadBooking();
    } catch (e: any) {
      setErrMsg(e?.message || 'Could not complete check-in.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!booking) return;
    setErrMsg(null);
    setOkMsg(null);

    const expected = String(booking.verification_code || '').trim();
    const entered = otpInput.trim();

    if (!entered) {
      setErrMsg('Please enter the confidential 4-digit Counter OTP from the patient.');
      return;
    }
    if (!expected) {
      setErrMsg('No OTP was generated for this appointment. Please scan the patient QR pass.');
      return;
    }
    if (entered !== expected) {
      setErrMsg('Incorrect 4-digit OTP. Ask the patient to check their Adityam Appointment Pass.');
      return;
    }
    await completeCheckIn('OTP');
  };

  const handleQrScanned = async (raw: string) => {
    if (!booking || busy) return;
    setErrMsg(null);
    setOkMsg(null);
    const parsed = extractScanData(raw);
    const refMatches = parsed.ref && parsed.ref.toUpperCase() === String(booking.booking_ref || '').toUpperCase();
    const expectedOtp = String(booking.verification_code || '').trim();
    const otpMatches = parsed.otp && expectedOtp && parsed.otp === expectedOtp;

    if (refMatches || otpMatches) {
      await completeCheckIn('QR');
    } else {
      setErrMsg(`Scanned QR (${parsed.ref || 'Unknown'}) does not match #${booking.booking_ref}.`);
    }
  };

  const handleSaveNotes = async () => {
    if (!booking) return;
    setBusy(true);
    setErrMsg(null);
    setOkMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          partner_notes: notesInput.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', booking.booking_ref);
      if (error) throw error;
      if (partnerUser?.id) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'OPD_NOTES_UPDATED',
          entityType: 'booking',
          entityId: booking.booking_ref,
          details: { hasNotes: Boolean(notesInput.trim()) },
        });
      }
      setOkMsg('Consultation notes saved.');
      await loadBooking();
    } catch (e: any) {
      setErrMsg(e?.message || 'Could not save notes.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadRx = async () => {
    if (!booking) return;
    setErrMsg(null);
    setOkMsg(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingRx(true);
      const url = await uploadPrescriptionSlip(
        asset.uri,
        `${booking.booking_ref}_opd_rx_${Date.now()}.jpg`,
        asset.base64 ?? undefined
      );
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          bill_image_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', booking.booking_ref);
      if (error) throw error;
      if (partnerUser?.id) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'OPD_RX_UPLOADED',
          entityType: 'booking',
          entityId: booking.booking_ref,
          details: { doctorName: booking.doctor_name },
        });
      }
      playAdminAlertChime('Prescription Uploaded', `Rx uploaded for #${booking.booking_ref}.`);
      setOkMsg('Doctor prescription uploaded and visible to the patient.');
      await loadBooking();
    } catch (e: any) {
      setErrMsg(e?.message || 'Could not upload prescription.');
    } finally {
      setUploadingRx(false);
    }
  };

  const handleConfirmCancelNoShow = async () => {
    if (!booking) return;
    const cleanNote = cancelNote.trim();
    if (!cleanNote) {
      setErrMsg('Please enter a brief reason note for the patient & Adityam Care Desk.');
      return;
    }
    const reasonLabelMap: Record<typeof cancelReasonType, string> = {
      NO_SHOW: 'Patient No-Show',
      DOCTOR_UNAVAILABLE: 'Doctor Unavailable / Emergency',
      CLINIC_ISSUE: 'Clinic / Slot Issue',
      PATIENT_REQUEST: 'Patient Requested Cancellation',
    };
    const resLabel = cancelResolution === 'RESCHEDULE' ? 'Recommended: Free Reschedule' : 'Recommended: Full Refund';
    const combinedPartnerNote = `[${reasonLabelMap[cancelReasonType]} · ${resLabel}] ${cleanNote}`;

    setBusy(true);
    setErrMsg(null);
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          partner_notes: combinedPartnerNote,
          updated_at: nowIso,
        })
        .eq('booking_ref', booking.booking_ref);
      if (error) throw error;

      // Also log to booking_crm_logs so Admin Call Center & Hospital Desk both see it immediately
      await supabase.from('booking_crm_logs').insert({
        booking_ref: booking.booking_ref,
        agent_name: partnerUser?.fullName || partnerUser?.email || 'Hospital Desk',
        outcome: reasonLabelMap[cancelReasonType],
        notes: `${resLabel} — ${cleanNote}`,
      });

      if (partnerUser?.id) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'OPD_MARKED_NOSHOW',
          entityType: 'booking',
          entityId: booking.booking_ref,
          details: { reasonType: cancelReasonType, resolution: cancelResolution, note: cleanNote },
        });
      }

      setCancelModalOpen(false);
      setCancelNote('');
      setOkMsg('Appointment cancelled and reason shared with Adityam Care Desk & patient.');
      await loadBooking();
    } catch (e: any) {
      setErrMsg(e?.message || 'Could not cancel booking.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, color: THEME.muted }}>Loading appointment details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Appointment Not Found</Text>
        <TouchableOpacity
          onPress={onBack}
          style={{ backgroundColor: THEME.green, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>← Back to OPD Queue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCompleted = booking.status === 'COMPLETED';
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'MISSED';
  const fee = Number(booking.final_payable ?? booking.doctor_fee ?? 0);
  const mrpFee = Number(booking.doctor_fee ?? fee);
  const discountAmt = Number(booking.discount_amount ?? (mrpFee > fee ? mrpFee - fee : 0));
  const isPaidOnline =
    booking.status === 'PAID' ||
    String(booking.payment_status || '').toUpperCase() === 'PAID' ||
    /paid online/i.test(String(booking.notes || '')) ||
    String(booking.payment_mode || '').toUpperCase().includes('ONLINE') ||
    String(booking.payment_mode || '').toUpperCase().includes('UPI');
  const waPhone = String(booking.patient_phone || '').replace(/[^0-9]/g, '');
  const purpose = parsePurpose(booking.notes);

  return (
    <View style={{ gap: 14 }}>
      {/* Hero Summary Card */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={onBack}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <ArrowLeft size={15} color={THEME.ink} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>OPD Queue</Text>
            </TouchableOpacity>

            <View style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 19, fontWeight: '900', color: THEME.ink }}>
                  #{booking.booking_ref}
                </Text>
                {booking.token_number ? (
                  <View style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Token #{booking.token_number}</Text>
                  </View>
                ) : null}
                <View
                  style={{
                    backgroundColor: isCompleted ? THEME.greenSoft : isCancelled ? THEME.redBg : '#E0F2FE',
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 99,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isCompleted ? THEME.greenDark : isCancelled ? THEME.redText : '#0284C7',
                    }}
                  >
                    {booking.status === 'PAID' ? 'PAID ONLINE' : booking.status}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                {booking.patient_name || 'Patient'}
                {booking.patient_phone ? ` · ${booking.patient_phone}` : ''}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {booking.patient_phone ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${booking.patient_phone}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: THEME.surfaceAlt,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Phone size={13} color={THEME.ink} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Call Patient</Text>
              </TouchableOpacity>
            ) : null}
            {waPhone ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://wa.me/${waPhone.length === 10 ? `91${waPhone}` : waPhone}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                }}
              >
                <MessageCircle size={13} color={THEME.greenDark} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenDark }}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.greenDark }}>
                ₹{fee.toLocaleString('en-IN')}
              </Text>
              {discountAmt > 0 ? (
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.green }}>
                  MRP ₹{mrpFee.toLocaleString('en-IN')} · Saved ₹{discountAmt}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 3-Tile Info Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, borderRadius: 11, padding: 12, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Clock size={12} color={THEME.amberText} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amberText, letterSpacing: 0.4 }}>APPOINTMENT TIMING</Text>
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
              {booking.slot_time || 'Scheduled Slot'}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Stethoscope size={12} color={THEME.green} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>ASSIGNED DOCTOR</Text>
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenDark }}>
              {booking.doctor_name || 'Assigned Doctor'}
            </Text>
            <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
              {booking.specialty_requested || 'General OPD'}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 200, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Building2 size={12} color={THEME.muted} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>HOSPITAL & BRANCH</Text>
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
              {booking.hospital_name || 'Hospital'}
            </Text>
            <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }}>
              {booking.branch_name || 'Main Branch'}
            </Text>
          </View>
        </View>

        {/* Full-Width Visit Purpose / Symptoms */}
        <View style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 11, padding: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <FileText size={12} color={THEME.muted} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>VISIT PURPOSE / PATIENT SYMPTOMS</Text>
          </View>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: THEME.ink, lineHeight: 20 }}>
            {purpose || 'Standard OPD Consultation'}
          </Text>
        </View>
      </View>

      {errMsg ? (
        <View style={{ backgroundColor: THEME.redBg, borderWidth: 1, borderColor: THEME.redBorder, borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.redText }}>{errMsg}</Text>
        </View>
      ) : null}

      {okMsg ? (
        <View style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.greenDark }}>{okMsg}</Text>
        </View>
      ) : null}

      {/* Two-Column Workspace */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
        {/* Left / Main Column */}
        <View style={{ flex: 2, minWidth: 300, gap: 14, width: '100%' }}>
          {/* 1. Counter Check-In */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color={THEME.green} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
                  1. Counter Check-In (4-Digit OTP or QR Pass)
                </Text>
              </View>
            </View>

            {isCompleted ? (
              <View
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <CheckCircle2 size={22} color={THEME.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.greenDark }}>
                    Patient Checked In & Consultation Completed
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    {booking.checked_in_at
                      ? `Verified on ${new Date(booking.checked_in_at).toLocaleString('en-IN')}`
                      : 'Verified at counter'}
                    {booking.checked_in_by ? ` · by ${booking.checked_in_by}` : ''}
                  </Text>
                </View>
              </View>
            ) : isCancelled ? (
              <View
                style={{
                  backgroundColor: THEME.redBg,
                  borderWidth: 1,
                  borderColor: THEME.redBorder,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.redText }}>
                  This appointment was marked {booking.status}.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                  Ask the patient for their confidential 4-digit Counter OTP shown on their pass, or scan their QR code for instant check-in.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextInput
                    value={otpInput}
                    onChangeText={setOtpInput}
                    placeholder="Enter 4-digit OTP"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      flex: 1,
                      minWidth: 160,
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      fontSize: 17,
                      fontWeight: '800',
                      color: THEME.ink,
                      letterSpacing: 4,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={busy}
                    style={{
                      backgroundColor: THEME.greenDark,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {busy ? 'Verifying...' : 'Verify OTP & Check In'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!scannerOpen && !permission?.granted) {
                        await requestPermission();
                      }
                      setScannerOpen((prev) => !prev);
                    }}
                    style={{
                      backgroundColor: scannerOpen ? THEME.redBg : THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: scannerOpen ? THEME.redBorder : THEME.border,
                      paddingHorizontal: 13,
                      paddingVertical: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <QrCode size={15} color={scannerOpen ? THEME.redText : THEME.ink} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: scannerOpen ? THEME.redText : THEME.ink }}>
                      {scannerOpen ? 'Close Scanner' : 'Scan QR Pass'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCancelNote('');
                      setErrMsg(null);
                      setCancelModalOpen(true);
                    }}
                    disabled={busy}
                    style={{
                      backgroundColor: THEME.redBg,
                      borderWidth: 1,
                      borderColor: THEME.redBorder,
                      paddingHorizontal: 13,
                      paddingVertical: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <XCircle size={15} color={THEME.redText} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.redText }}>No-Show / Cancel</Text>
                  </TouchableOpacity>
                </View>

                {scannerOpen ? (
                  <View
                    style={{
                      height: 240,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#000',
                      borderWidth: 2,
                      borderColor: THEME.green,
                    }}
                  >
                    <CameraView
                      style={{ flex: 1 }}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={({ data }) => {
                        if (data) void handleQrScanned(data);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* 2. Doctor Prescription & Consultation Notes */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color={THEME.green} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
                  2. Doctor Prescription & Consultation Notes
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleUploadRx}
                disabled={uploadingRx}
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={14} color={THEME.greenDark} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
                  {uploadingRx ? 'Uploading...' : booking.bill_image_url ? 'Replace Doctor Rx' : 'Upload Doctor Rx'}
                </Text>
              </TouchableOpacity>
            </View>

            {booking.bill_image_url ? (
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <Image
                  source={{ uri: booking.bill_image_url }}
                  style={{ width: 150, height: 110, borderRadius: 10, borderWidth: 1, borderColor: THEME.border }}
                  resizeMode="cover"
                />
                <View style={{ gap: 6, flex: 1, minWidth: 180 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>
                    Prescription Uploaded ✓
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Visible to the patient in their Adityam app for pharmacy ordering.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(booking.bill_image_url)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}
                  >
                    <ExternalLink size={13} color={THEME.green} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>Open Full Rx Image</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                No prescription uploaded yet. Upload the doctor's prescription slip so the patient can access it in their app.
              </Text>
            )}

            <TextInput
              value={notesInput}
              onChangeText={setNotesInput}
              placeholder="Add reception / doctor consultation notes or follow-up instructions..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                color: THEME.ink,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={handleSaveNotes}
                disabled={busy}
                style={{
                  backgroundColor: THEME.greenDark,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {busy ? 'Saving...' : 'Save Consultation Notes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Right / Side Column */}
        <View style={{ flex: 1, minWidth: 260, gap: 14, width: '100%' }}>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
              Booking & Payment Summary
            </Text>
            {[
              { label: 'Booking Ref', value: `#${booking.booking_ref}` },
              { label: 'Booked On', value: new Date(booking.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Payment', value: isPaidOnline ? 'Paid Online' : 'Pay at Clinic' },
              { label: 'Net Fee', value: `₹${fee.toLocaleString('en-IN')}` },
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
                <Text style={{ fontSize: 12.5, color: THEME.ink, fontWeight: '800' }}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <History size={15} color={THEME.green} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                Activity & Check-In Logs
              </Text>
            </View>
            {auditLogs.length === 0 ? (
              <Text style={{ fontSize: 12, color: THEME.muted }}>
                No counter actions logged yet.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {auditLogs.map((log, idx) => (
                  <View
                    key={log.id || idx}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 9,
                      padding: 9,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      gap: 2,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                      {String(log.action || '').replace(/_/g, ' ')}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.muted }}>
                      {log.actor_name || 'Staff'} · {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Are You Sure? Cancel / No-Show Modal */}
      <Modal
        visible={cancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: THEME.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: THEME.redText }}>
                Are you sure you want to cancel / mark No-Show?
              </Text>
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                This reason will be shared with the patient ({booking.patient_name}) and Adityam Care Desk for reschedule or refund processing.
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>1. Select Reason</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(
                  [
                    { id: 'NO_SHOW', label: 'Patient No-Show' },
                    { id: 'DOCTOR_UNAVAILABLE', label: 'Doctor Unavailable' },
                    { id: 'CLINIC_ISSUE', label: 'Clinic / Slot Issue' },
                    { id: 'PATIENT_REQUEST', label: 'Patient Requested' },
                  ] as const
                ).map((item) => {
                  const active = cancelReasonType === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setCancelReasonType(item.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: active ? THEME.redBg : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.redText : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? THEME.redText : THEME.ink }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>2. Next Step for Patient</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(
                  [
                    { id: 'RESCHEDULE', label: 'Free Reschedule' },
                    { id: 'REFUND', label: 'Full Refund' },
                  ] as const
                ).map((res) => {
                  const active = cancelResolution === res.id;
                  return (
                    <TouchableOpacity
                      key={res.id}
                      onPress={() => setCancelResolution(res.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 9,
                        alignItems: 'center',
                        backgroundColor: active ? THEME.greenSoft : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.green : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: active ? THEME.greenDark : THEME.muted }}>
                        {res.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>
                3. Reason Note (Required — visible to Patient & Admin)
              </Text>
              <TextInput
                value={cancelNote}
                onChangeText={setCancelNote}
                placeholder="e.g., Patient did not arrive within slot window / Doctor in emergency OT..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: THEME.ink,
                  minHeight: 74,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setCancelModalOpen(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: THEME.surfaceAlt,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>Keep Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleConfirmCancelNoShow()}
                disabled={busy || !cancelNote.trim()}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: !cancelNote.trim() ? '#FCA5A5' : THEME.redText,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                  {busy ? 'Cancelling...' : 'Yes, Confirm Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
