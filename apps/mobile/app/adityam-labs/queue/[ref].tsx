import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Upload,
  UserCheck,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { logAdminAudit } from '../../../src/services/adminAudit';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  navy: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  amber: '#92400E',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  ink: '#1A2421',
  muted: '#5C6B64',
};

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function extractCollectionAddress(b: any): string {
  const notes = String(b?.notes || '');
  const m = notes.match(/Home Sample Collection at\s+([^.]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const m2 = notes.match(/Address:\s*([^.]+)/i);
  if (m2?.[1]?.trim()) return m2[1].trim();
  return b?.branch_name || 'Address in notes';
}

function extractTestsSummary(b: any): string {
  const notes = String(b?.notes || '');
  const m = notes.match(/Tests:\s*([^.]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  return b?.doctor_name || 'Diagnostic Panel';
}

function AdityamLabClientDetailContent() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const bookingRef = decodeURIComponent(String(ref || ''));

  const [booking, setBooking] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phlebInput, setPhlebInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [partnerLabInput, setPartnerLabInput] = useState('');
  const [editingEta, setEditingEta] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingRef) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ data }, { data: logs }] = await Promise.all([
        supabase.from('bookings').select('*').eq('booking_ref', bookingRef).maybeSingle(),
        supabase
          .from('admin_audit_logs')
          .select('*')
          .eq('entity_id', bookingRef)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (data) {
        setBooking(data);
        setPhlebInput((data as any).assigned_agent || '');
      }
      setAuditLogs((logs as any[]) || []);
    } finally {
      setLoading(false);
    }
  }, [bookingRef]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const recordAction = async (action: string, summary: string) => {
    await logAdminAudit({
      actorName: 'Adityam Labs Desk',
      actorRole: 'lab_ops',
      sourcePanel: 'ADMIN',
      action,
      entityType: 'lab_booking',
      entityId: bookingRef,
      details: { summary },
    });
  };

  const updateBooking = async (patch: Record<string, any>, auditAction?: string, auditSummary?: string) => {
    if (!booking) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('bookings').update(patch).eq('id', booking.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      if (auditAction && auditSummary) {
        await recordAction(auditAction, auditSummary);
      }
      await loadBooking();
    } finally {
      setBusy(false);
    }
  };

  const handleCallClient = async () => {
    if (!phone) return;
    await recordAction('CALL_PATIENT', `Called ${booking.patient_name || 'Patient'} (+${phone})`);
    await Linking.openURL(`tel:+${phone}`);
    await loadBooking();
  };

  const handleWhatsAppClient = async () => {
    if (!phone) return;
    await recordAction('WHATSAPP_PATIENT', `Sent WhatsApp message to ${booking.patient_name || 'Patient'}`);
    await Linking.openURL(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        `Hello ${booking.patient_name || ''}, Adityam Niramayaa Phlebotomy Team is scheduled for your home sample collection (#${bookingRef}).`
      )}`
    );
    await loadBooking();
  };

  const handleOpenDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    void recordAction('OPEN_DIRECTIONS', `Opened map directions to ${address}`);
    void Linking.openURL(url);
  };

  const handleUploadReport = async () => {
    if (!booking) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow photo access to upload report.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setBusy(true);
      const asset = res.assets[0];
      const url = await uploadPrescriptionSlip(
        asset.uri,
        `adityam-lab-report-${booking.booking_ref}-${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );
      await updateBooking(
        { bill_image_url: url, status: 'COMPLETED' },
        'UPLOAD_REPORT',
        `Final lab report uploaded & published online for #${bookingRef}`
      );
      Alert.alert('Report Published', `Report for #${booking.booking_ref} is now live in the patient app.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload report.');
    } finally {
      setBusy(false);
    }
  };

  const phone = normalizePhone(booking?.patient_phone);
  const address = extractCollectionAddress(booking);
  const tests = extractTestsSummary(booking);
  const st = String(booking?.status || 'PAID').toUpperCase();
  const isCollected = ['SAMPLE_COLLECTED', 'IN_PROGRESS', 'PROCESSING', 'COMPLETED'].includes(st);
  const isProcessingOrDone = ['PROCESSING', 'COMPLETED'].includes(st);
  const isCompleted = st === 'COMPLETED';
  const etaMatch = String(booking?.notes || '').match(/Report ETA:\s*([^|.]+)/i);
  const currentEta = etaMatch?.[1]?.trim() || null;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Top Bar */}
      <View
        style={{
          backgroundColor: THEME.navy,
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace('/adityam-labs/queue' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
            Back to Home Collection Queue
          </Text>
        </TouchableOpacity>
        <Text style={{ color: '#A7D7C0', fontSize: 12, fontWeight: '700' }}>
          Adityam Labs · #{bookingRef}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.green} />
        </View>
      ) : !booking ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
            Booking #{bookingRef} not found
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 1120, width: '100%', alignSelf: 'center' }}>
          {/* Summary Header Card */}
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
              <View style={{ gap: 4, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.ink }}>
                    #{booking.booking_ref}
                  </Text>
                  <View style={{ backgroundColor: isCompleted ? THEME.greenSoft : THEME.amberBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isCompleted ? THEME.green : THEME.amber }}>
                      {st}
                    </Text>
                  </View>
                  {booking.assigned_agent ? (
                    <View style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.green }}>
                        Phlebotomist: {booking.assigned_agent}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.ink }}>
                  {booking.patient_name || 'Patient'} · {booking.patient_phone || '—'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                  Scheduled Slot: {booking.slot_time || 'Scheduled'}
                </Text>
              </View>

              {/* Quick Action Buttons: Directions, Call, WhatsApp */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleOpenDirections}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.navy, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9 }}
                >
                  <Navigation size={13} color="#FFFFFF" />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Directions</Text>
                </TouchableOpacity>
                {phone ? (
                  <>
                    <TouchableOpacity
                      onPress={handleCallClient}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 }}
                    >
                      <Phone size={13} color={THEME.ink} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Call Client</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleWhatsAppClient}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 }}
                    >
                      <MessageCircle size={13} color={THEME.green} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }}>WhatsApp</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>

            {/* 4-Step Visual Progress Tracker */}
            {(() => {
              const stepIdx = isCompleted ? 4 : isProcessingOrDone ? 3 : isCollected ? 2 : 1;
              const steps = [
                { n: 1, label: 'Scheduled' },
                { n: 2, label: 'OTP Verified & Collected' },
                { n: 3, label: currentEta ? `Lab Processing (${currentEta})` : 'Lab Processing' },
                { n: 4, label: 'Report Online' },
              ];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: THEME.border }}>
                  {steps.map((s) => {
                    const done = stepIdx >= s.n;
                    return (
                      <View key={s.n} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? THEME.green : '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{done ? '✓' : s.n}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: done ? '800' : '600', color: done ? THEME.green : THEME.muted, textAlign: 'center' }}>
                          {s.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Address & Tests Box */}
            <View style={{ backgroundColor: THEME.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: THEME.border, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <MapPin size={14} color={THEME.green} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink, flex: 1 }}>
                  Collect at: {address}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                Tests: {tests}
              </Text>
            </View>
          </View>

          {/* 2-Column Workspace: Left = Step-by-Step Workflow | Right = Activity & Call Logs */}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.5, width: '100%', gap: 14 }}>
              {/* STEP 1: Phlebotomist Assignment */}
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <UserCheck size={16} color={THEME.green} />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      1. Phlebotomist Assignment
                    </Text>
                  </View>
                  {booking.assigned_agent ? (
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Assigned ✓</Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    value={phlebInput}
                    onChangeText={setPhlebInput}
                    placeholder="Enter Phlebotomist Name & Phone (e.g. Ramesh +91 98...)"
                    style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 }}
                  />
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() => {
                      const val = phlebInput.trim() || 'Adityam Phlebotomist';
                      void updateBooking({ assigned_agent: val }, 'ASSIGN_PHLEBOTOMIST', `Assigned phlebotomist: ${val}`);
                    }}
                    style={{ backgroundColor: THEME.navy, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Assign</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* STEP 2: 4-Digit Sample Collection OTP */}
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: isCollected ? THEME.greenBorder : THEME.border, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} color={THEME.green} />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      2. Sample Collection OTP Verification
                    </Text>
                  </View>
                  {isCollected ? <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Verified ✓</Text> : null}
                </View>

                {isCollected ? (
                  <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                      ✓ 4-digit OTP verified and sample collected from patient.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                      Ask the patient for their 4-digit Sample Collection OTP before collecting the sample.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <TextInput
                        value={otpInput}
                        onChangeText={(v) => {
                          setOtpInput(v.replace(/\D/g, '').slice(0, 4));
                          setOtpError(null);
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        placeholder="Enter 4-digit OTP"
                        style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '800', letterSpacing: 4 }}
                      />
                      <TouchableOpacity
                        disabled={busy}
                        onPress={() => {
                          const expected = String(booking.verification_code || '').trim();
                          if (expected && otpInput.trim() !== expected) {
                            setOtpError('Incorrect 4-digit OTP. Please check the patient pass.');
                            return;
                          }
                          if (!expected && otpInput.trim().length < 4) {
                            setOtpError('Enter the 4-digit OTP to confirm collection.');
                            return;
                          }
                          setOtpError(null);
                          void updateBooking(
                            { status: 'SAMPLE_COLLECTED' },
                            'SAMPLE_COLLECTED',
                            `Verified 4-digit OTP and collected sample`
                          );
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 }}
                      >
                        <CheckCircle2 size={15} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Verify & Collect</Text>
                      </TouchableOpacity>
                    </View>
                    {otpError ? <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>{otpError}</Text> : null}
                  </>
                )}
              </View>

              {/* STEP 3: Lab Processing & ETA (Unlocked after Sample Collected) */}
              {isCollected && (
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: currentEta ? THEME.greenBorder : THEME.border, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={currentEta ? THEME.green : THEME.amber} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        3. Lab Processing & Report ETA
                      </Text>
                    </View>
                    {currentEta && !editingEta ? (
                      <TouchableOpacity
                        onPress={() => setEditingEta(true)}
                        style={{ backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amber }}>Edit ETA</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {currentEta && !editingEta ? (
                    <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                        ✓ Processing at Lab · Report ETA: {currentEta}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        value={partnerLabInput}
                        onChangeText={setPartnerLabInput}
                        placeholder="Processing Lab / Partner Note (e.g. Dropped at NABL Central Lab)"
                        style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 }}
                      />

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['6 hrs', '12 hrs', '24 hrs', '1–2 days', '2–3 days'].map((eta) => (
                          <TouchableOpacity
                            key={eta}
                            disabled={busy}
                            onPress={() => {
                              const labTag = partnerLabInput.trim() ? ` | Lab: ${partnerLabInput.trim()}` : '';
                              setEditingEta(false);
                              void updateBooking(
                                {
                                  status: 'PROCESSING',
                                  notes: `${String(booking.notes || '').replace(/\s*\|\s*Report ETA:[^|]*/gi, '')}${labTag} | Report ETA: ${eta}`,
                                },
                                'PROCESSING_ETA',
                                `Sent for lab analysis · Report ETA: ${eta}`
                              );
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 }}
                          >
                            <Clock size={13} color={THEME.amber} />
                            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amber }}>Set ETA: {eta}</Text>
                          </TouchableOpacity>
                        ))}
                        {currentEta ? (
                          <TouchableOpacity
                            onPress={() => setEditingEta(false)}
                            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                          >
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* STEP 4: Final Report Upload (Unlocked after Sample Collected) */}
              {isCollected && (
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      4. Upload Final Lab Report
                    </Text>
                    {isCompleted ? <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Published ✓</Text> : null}
                  </View>

                  <TouchableOpacity
                    disabled={busy}
                    onPress={handleUploadReport}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.navy, paddingVertical: 12, borderRadius: 10 }}
                  >
                    <Upload size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {busy ? 'Uploading...' : isCompleted ? 'Replace / Re-upload Report' : 'Upload Final Report & Mark Ready'}
                    </Text>
                  </TouchableOpacity>

                  {booking.bill_image_url ? (
                    <Image
                      source={{ uri: booking.bill_image_url }}
                      style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: THEME.bg }}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
              )}
            </View>

            {/* Right Column: Call & Activity Logs */}
            <View style={{ flex: 1, width: '100%', backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Activity & Call Logs ({auditLogs.length})
              </Text>
              {auditLogs.length === 0 ? (
                <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                  No calls, directions, or status actions logged yet.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {auditLogs.map((log, i) => (
                    <View
                      key={log.id || i}
                      style={{
                        backgroundColor: THEME.bg,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        gap: 2,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                        {log.details?.summary || log.action}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.muted }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'Just now'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default function AdityamLabClientDetailRoute() {
  return <AdityamLabClientDetailContent />;
}
