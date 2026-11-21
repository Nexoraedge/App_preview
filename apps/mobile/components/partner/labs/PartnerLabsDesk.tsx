import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  Home as HomeIcon,
  Building2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  amberBg: '#FEF7E6',
  amberText: '#92400E',
  amberBorder: '#F3DBA8',
  blueBg: '#EFF6FF',
  blueText: '#1D4ED8',
  ink: '#1A2421',
  muted: '#5C6B64',
};

type LabFilter = 'ACTIVE' | 'HOME' | 'CENTRE' | 'READY' | 'ALL';

interface LabBookingRow {
  id: string;
  booking_ref: string;
  patient_name: string | null;
  patient_phone: string | null;
  hospital_name: string | null;
  branch_name: string | null;
  doctor_name: string | null;
  lab_centre_id: string | null;
  slot_time: string | null;
  status: string;
  doctor_fee: number | null;
  final_payable: number | null;
  notes: string | null;
  prescription_url: string | null;
  created_at: string;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function PartnerLabsDesk({ labCentreId }: { labCentreId?: string | null }) {
  const [bookings, setBookings] = useState<LabBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LabFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [etaPickerId, setEtaPickerId] = useState<string | null>(null);

  const loadLabBookings = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      let q = supabase
        .from('bookings')
        .select(
          'id, booking_ref, patient_name, patient_phone, hospital_name, branch_name, doctor_name, lab_centre_id, slot_time, status, doctor_fee, final_payable, notes, prescription_url, created_at'
        )
        .in('service_type', ['INVESTIGATION', 'LAB_TEST'])
        .order('created_at', { ascending: false })
        .limit(150);
      if (labCentreId) {
        q = q.eq('lab_centre_id', labCentreId);
      }
      const { data } = await q;
      setBookings((data as LabBookingRow[]) || []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [labCentreId]);

  useEffect(() => {
    void loadLabBookings();
    const supabase = getSupabaseClient();
    const ch = supabase
      .channel('partner-labs-desk-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void loadLabBookings();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadLabBookings]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let processing = 0;
    let ready = 0;
    let gross = 0;
    for (const b of bookings) {
      const st = String(b.status || '').toUpperCase();
      if (st === 'CANCELLED' || st === 'REJECTED') continue;
      if (st === 'COMPLETED') {
        ready += 1;
        gross += Number(b.final_payable || b.doctor_fee || 0);
      } else if (st === 'SAMPLE_COLLECTED' || st === 'PROCESSING' || st === 'IN_PROGRESS') {
        processing += 1;
        gross += Number(b.final_payable || b.doctor_fee || 0);
      } else {
        scheduled += 1;
        gross += Number(b.final_payable || b.doctor_fee || 0);
      }
    }
    return { scheduled, processing, ready, gross };
  }, [bookings]);

  const isHomeCollection = (b: LabBookingRow) =>
    String(b.notes || '').toLowerCase().includes('home sample collection');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      if (filter === 'ACTIVE' && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(st)) return false;
      if (filter === 'HOME' && !isHomeCollection(b)) return false;
      if (filter === 'CENTRE' && isHomeCollection(b)) return false;
      if (filter === 'READY' && st !== 'COMPLETED') return false;
      if (!q) return true;
      return (
        String(b.patient_name || '').toLowerCase().includes(q) ||
        String(b.patient_phone || '').toLowerCase().includes(q) ||
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.doctor_name || '').toLowerCase().includes(q) ||
        String(b.notes || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, filter, search]);

  const updateStage = async (b: LabBookingRow, nextStatus: string, etaText?: string) => {
    setBusyId(b.id);
    try {
      const supabase = getSupabaseClient();
      const cleanedNotes = String(b.notes || '').replace(/\s*\|\s*Report ETA:[^|]*/gi, '').trim();
      const nextNotes = etaText ? `${cleanedNotes} | Report ETA: ${etaText}` : cleanedNotes;
      await supabase
        .from('bookings')
        .update({ status: nextStatus, notes: nextNotes })
        .eq('id', b.id);
      setEtaPickerId(null);
      await loadLabBookings();
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadReport = async (b: LabBookingRow) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow photo/file access to upload the lab report.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;

      setBusyId(b.id);
      const asset = res.assets[0];
      const url = await uploadPrescriptionSlip(
        asset.uri,
        `lab-report-${b.booking_ref}-${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );

      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          prescription_url: url,
          status: 'COMPLETED',
        })
        .eq('id', b.id);

      const gross = Number(b.final_payable || b.doctor_fee || 0);
      if (b.lab_centre_id && gross > 0) {
        const comm = Math.round(gross * 0.1);
        await supabase.from('lab_payouts').insert({
          centre_id: b.lab_centre_id,
          gross_amount: gross,
          commission_amount: comm,
          net_amount: Math.max(0, gross - comm),
          period_label: `Lab #${b.booking_ref}`,
          status: 'PENDING',
        });
      }

      await loadLabBookings();
      Alert.alert('Report Uploaded', `Report for #${b.booking_ref} is now live in the patient app.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload report.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Header Banner */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: THEME.greenSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlaskConical size={20} color={THEME.green} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Labs & Scans Operations Desk
            </Text>
            <Text style={{ fontSize: 12.5, color: THEME.muted }}>
              Manage home sample collections, scan walk-ins, processing ETAs & online report uploads
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={loadLabBookings}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
          }}
        >
          <RefreshCw size={14} color={THEME.green} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Strip */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'SCHEDULED / NEW', value: String(stats.scheduled), sub: 'Awaiting visit / pickup', dark: false },
          { label: 'SAMPLE / PROCESSING', value: String(stats.processing), sub: 'In lab analysis', dark: false },
          { label: 'REPORTS READY', value: String(stats.ready), sub: 'Uploaded online', dark: true },
          { label: 'LAB GROSS', value: `₹${stats.gross.toLocaleString('en-IN')}`, sub: 'Total booked diagnostics', dark: false },
        ].map((kpi) => (
          <View
            key={kpi.label}
            style={{
              flex: 1,
              minWidth: 165,
              backgroundColor: kpi.dark ? THEME.greenDark : THEME.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: kpi.dark ? THEME.greenDark : THEME.border,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: kpi.dark ? '#A7D7C0' : THEME.muted }}>
              {kpi.label}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: kpi.dark ? '#FFFFFF' : THEME.ink }}>
              {kpi.value}
            </Text>
            <Text style={{ fontSize: 11.5, color: kpi.dark ? '#C6E2D4' : THEME.muted }}>{kpi.sub}</Text>
          </View>
        ))}
      </View>

      {/* Search & Filters */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: THEME.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: THEME.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Search size={15} color={THEME.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient, phone, test name, or #AN-LAB ref..."
            placeholderTextColor="#8B9690"
            style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              { id: 'ACTIVE', label: 'Active Queue' },
              { id: 'HOME', label: 'Home Collection' },
              { id: 'CENTRE', label: 'In-Lab / Hospital' },
              { id: 'READY', label: 'Reports Ready' },
              { id: 'ALL', label: 'All Bookings' },
            ] as { id: LabFilter; label: string }[]
          ).map((t) => {
            const active = filter === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setFilter(t.id)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? THEME.greenDark : THEME.bg,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={{ padding: 36, alignItems: 'center' }}>
          <ActivityIndicator color={THEME.green} />
        </View>
      ) : filtered.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 16,
            padding: 32,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FlaskConical size={28} color={THEME.muted} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            No lab or scan bookings in this view
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center' }}>
            New Home Collection and In-Lab / Hospital Scan bookings will appear here in real time.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((b) => {
            const st = String(b.status || 'PAID').toUpperCase();
            const isHome = isHomeCollection(b);
            const phone = normalizePhone(b.patient_phone);
            return (
              <View
                key={b.id}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        #{b.booking_ref}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isHome ? THEME.blueBg : THEME.amberBg,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        {isHome ? <HomeIcon size={11} color={THEME.blueText} /> : <Building2 size={11} color={THEME.amberText} />}
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: isHome ? THEME.blueText : THEME.amberText }}>
                          {isHome ? 'HOME COLLECTION' : 'IN-LAB / HOSPITAL'}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: st === 'COMPLETED' ? THEME.greenSoft : THEME.bg,
                          borderWidth: 1,
                          borderColor: st === 'COMPLETED' ? THEME.greenBorder : THEME.border,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: st === 'COMPLETED' ? THEME.green : THEME.ink }}>
                          {st}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                      {b.patient_name || 'Patient'} · {b.patient_phone || 'No phone'}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.green }}>
                      {b.doctor_name || 'Diagnostic Panel'} · {b.slot_time || 'Scheduled Slot'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      {b.hospital_name || 'Lab Centre'} {b.branch_name ? `· ${b.branch_name}` : ''}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.greenDark }}>
                    ₹{Number(b.final_payable || b.doctor_fee || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                {b.notes ? (
                  <View style={{ backgroundColor: THEME.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: THEME.border }}>
                    <Text style={{ fontSize: 12, color: THEME.ink }}>{b.notes}</Text>
                  </View>
                ) : null}

                {etaPickerId === b.id && (
                  <View style={{ backgroundColor: THEME.amberBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: THEME.amberBorder, gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.amberText }}>
                      Select Estimated Report Delivery Time (shown to patient):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {['6 hrs', '12 hrs', '24 hrs (1 day)', '1–2 days', '2–3 days'].map((eta) => (
                        <TouchableOpacity
                          key={eta}
                          onPress={() => updateStage(b, 'PROCESSING', eta)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: THEME.amberBorder,
                            paddingHorizontal: 11,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>{eta}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity onPress={() => setEtaPickerId(null)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {phone ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:+${phone}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: THEME.bg,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                        >
                          <Phone size={13} color={THEME.ink} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(
                              `https://wa.me/${phone}?text=${encodeURIComponent(
                                `Hello ${b.patient_name || ''}, update on your Adityam Lab booking #${b.booking_ref}.`
                              )}`
                            )
                          }
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                        >
                          <MessageCircle size={13} color={THEME.green} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>WhatsApp</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {st !== 'SAMPLE_COLLECTED' && st !== 'PROCESSING' && st !== 'COMPLETED' && (
                      <TouchableOpacity
                        disabled={busyId === b.id}
                        onPress={() => updateStage(b, 'SAMPLE_COLLECTED')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.blueBg,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <CheckCircle2 size={13} color={THEME.blueText} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.blueText }}>
                          {isHome ? 'Sample Collected' : 'Visited & Collected'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {st !== 'PROCESSING' && st !== 'COMPLETED' && (
                      <TouchableOpacity
                        disabled={busyId === b.id}
                        onPress={() => setEtaPickerId(b.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.amberBg,
                          borderWidth: 1,
                          borderColor: THEME.amberBorder,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Clock size={13} color={THEME.amberText} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.amberText }}>
                          Processing + ETA
                        </Text>
                      </TouchableOpacity>
                    )}

                    {st !== 'COMPLETED' ? (
                      <TouchableOpacity
                        disabled={busyId === b.id}
                        onPress={() => handleUploadReport(b)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Upload size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          {busyId === b.id ? 'Uploading...' : 'Upload Report & Mark Ready'}
                        </Text>
                      </TouchableOpacity>
                    ) : b.prescription_url ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(b.prescription_url!)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <CheckCircle2 size={13} color={THEME.green} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                          Report Online ✓
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
