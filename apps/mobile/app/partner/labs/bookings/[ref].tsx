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
  MessageCircle,
  Phone,
  ShieldCheck,
  Upload,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { usePartnerAuth } from '../../../../components/partner/PartnerAuthGate';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
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

export default function PartnerLabBookingDetailRoute() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const bookingRef = decodeURIComponent(String(ref || ''));
  const { partnerUser } = usePartnerAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [editingEta, setEditingEta] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingRef || !partnerUser) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_ref', bookingRef)
        .maybeSingle();

      if (!data) {
        setBooking(null);
        return;
      }

      // Strict partner tenant isolation: never expose Adityam or another partner's booking
      const hosp = String(data.hospital_name || '').toLowerCase();
      const bRef = String(data.booking_ref || '').toUpperCase();
      if (hosp.includes('adityam') || bRef.includes('LAB-RX')) {
        setBooking(null);
        return;
      }

      const role = String(partnerUser.role || '').toLowerCase();
      const isSuperAdmin = role === 'admin' || role === 'super_admin';
      if (!isSuperAdmin) {
        const allowedIds = new Set(
          [
            partnerUser.partnerLabId,
            partnerUser.partnerHospitalId,
            partnerUser.partnerEntityId,
          ].filter(Boolean) as string[]
        );
        let ownsBooking = Boolean(data.hospital_id && allowedIds.has(data.hospital_id));

        if (!ownsBooking) {
          // Also check linked lab_centres by id or hospital_id
          let centreRow: any = null;
          if (partnerUser.partnerLabId) {
            const { data: c } = await supabase
              .from('lab_centres')
              .select('id, name, hospital_id')
              .eq('id', partnerUser.partnerLabId)
              .maybeSingle();
            centreRow = c;
          } else if (partnerUser.partnerHospitalId) {
            const { data: c } = await supabase
              .from('lab_centres')
              .select('id, name, hospital_id')
              .eq('hospital_id', partnerUser.partnerHospitalId)
              .limit(1)
              .maybeSingle();
            centreRow = c;
          }
          if (centreRow) {
            ownsBooking =
              (data.hospital_id &&
                (data.hospital_id === centreRow.id ||
                  (centreRow.hospital_id && data.hospital_id === centreRow.hospital_id))) ||
              (Boolean(centreRow.name) &&
                hosp === String(centreRow.name).trim().toLowerCase());
          }
        }

        if (!ownsBooking) {
          setBooking(null);
          return;
        }
      }

      setBooking(data);
    } finally {
      setLoading(false);
    }
  }, [bookingRef, partnerUser]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const updateBooking = async (patch: Record<string, any>) => {
    if (!booking) return;
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('bookings').update(patch).eq('id', booking.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      await loadBooking();
    } finally {
      setBusy(false);
    }
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
        `partner-lab-report-${booking.booking_ref}-${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );
      await updateBooking({ bill_image_url: url, status: 'COMPLETED' });
      Alert.alert('Report Published', `Report for #${booking.booking_ref} is now live in the patient app.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload report.');
    } finally {
      setBusy(false);
    }
  };

  const phone = normalizePhone(booking?.patient_phone);
  const st = String(booking?.status || 'PAID').toUpperCase();
  const isCollected = ['SAMPLE_COLLECTED', 'IN_PROGRESS', 'PROCESSING', 'COMPLETED'].includes(st);
  const isProcessingOrDone = ['PROCESSING', 'COMPLETED'].includes(st);
  const isCompleted = st === 'COMPLETED';
  const etaMatch = String(booking?.notes || '').match(/Report ETA:\s*([^|.]+)/i);
  const currentEta = etaMatch?.[1]?.trim() || null;
  const gross = Number(booking?.final_payable || booking?.doctor_fee || 0);

  return (
    <PartnerShell
      activeRoute="labs"
      title={`Walk-In Lab Booking #${bookingRef}`}
      subtitle="Verify patient walk-in OTP, update report ETA & upload diagnostic report"
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 1060, width: '100%', alignSelf: 'center' }}>
        <TouchableOpacity
          onPress={() => router.replace('/partner/labs' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={16} color={THEME.green} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.green }}>
            Back to Walk-In Queue
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator color={THEME.green} />
          </View>
        ) : !booking ? (
          <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: THEME.border }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Booking #{bookingRef} not found
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Header Card */}
            <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
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
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.ink }}>
                    {booking.patient_name || 'Patient'} · {booking.patient_phone || '—'}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                    {booking.doctor_name || 'Diagnostic Panel'} · {booking.slot_time || 'Scheduled Slot'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: THEME.greenDark }}>
                    ₹{gross.toLocaleString('en-IN')}
                  </Text>
                  {phone ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:+${phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
                      >
                        <Phone size={13} color={THEME.ink} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call Patient</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://wa.me/${phone}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.greenSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
                      >
                        <MessageCircle size={13} color={THEME.green} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
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
            </View>

            {/* 2-Column Workspace */}
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
              <View style={{ flex: 1.5, width: '100%', gap: 14 }}>
                {/* Step 1: 4-Digit Walk-In OTP Verification */}
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: isCollected ? THEME.greenBorder : THEME.border, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={16} color={THEME.green} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        1. Walk-In 4-Digit OTP Check-In
                      </Text>
                    </View>
                    {isCollected ? <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Verified ✓</Text> : null}
                  </View>

                  {isCollected ? (
                    <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 10, padding: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                        ✓ Patient walk-in OTP verified & sample / scan completed.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                        Ask the patient for their 4-digit OTP from My Appointments → Pass to check them in.
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
                              setOtpError('Enter the 4-digit OTP to confirm check-in.');
                              return;
                            }
                            setOtpError(null);
                            void updateBooking({ status: 'SAMPLE_COLLECTED' });
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

                {/* Step 2: Lab Processing & ETA */}
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: currentEta ? THEME.greenBorder : THEME.border, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color={currentEta ? THEME.green : THEME.amber} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        2. Lab Processing & Report ETA
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
                        ✓ Processing at Hospital Lab · Report ETA: {currentEta}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {['2 hrs', '6 hrs', '12 hrs', '24 hrs', '1–2 days'].map((eta) => (
                        <TouchableOpacity
                          key={eta}
                          disabled={busy}
                          onPress={() => {
                            setEditingEta(false);
                            void updateBooking({
                              status: 'PROCESSING',
                              notes: `${String(booking.notes || '').replace(/\s*\|\s*Report ETA:[^|]*/gi, '')} | Report ETA: ${eta}`,
                            });
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.amberBg, borderWidth: 1, borderColor: THEME.amberBorder, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 }}
                        >
                          <Clock size={13} color={THEME.amber} />
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amber }}>Set ETA: {eta}</Text>
                        </TouchableOpacity>
                      ))}
                      {currentEta ? (
                        <TouchableOpacity onPress={() => setEditingEta(false)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>

                {/* Step 3: Final Report Upload */}
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      3. Upload Final Report
                    </Text>
                    {isCompleted ? <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Published ✓</Text> : null}
                  </View>
                  <TouchableOpacity
                    disabled={busy}
                    onPress={handleUploadReport}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.greenDark, paddingVertical: 12, borderRadius: 10 }}
                  >
                    <Upload size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                      {busy ? 'Uploading...' : isCompleted ? 'Replace / Re-upload Report' : 'Upload Report & Mark Ready'}
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
              </View>

              {/* Right Column: Booking & Payment Summary */}
              <View style={{ flex: 1, width: '100%', backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Booking & Payout Summary
                </Text>
                {[
                  { label: 'Booking Ref', value: `#${booking.booking_ref}` },
                  { label: 'Booked On', value: booking.created_at ? new Date(booking.created_at).toLocaleString('en-IN') : '—' },
                  { label: 'Diagnostic Wing', value: booking.hospital_name || '—' },
                  { label: 'Payment', value: 'Paid Online' },
                  { label: 'Gross Amount', value: `₹${gross.toLocaleString('en-IN')}` },
                  { label: 'Net Hospital Payout', value: `₹${Math.round(gross * 0.9).toLocaleString('en-IN')}` },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: THEME.border }}>
                    <Text style={{ fontSize: 12.5, color: THEME.muted }}>{row.label}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>{row.value}</Text>
                  </View>
                ))}
                {booking.notes ? (
                  <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>{booking.notes}</Text>
                ) : null}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </PartnerShell>
  );
}
