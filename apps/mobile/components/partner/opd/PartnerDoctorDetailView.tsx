import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit3,
  IndianRupee,
  ShieldCheck,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { HospitalBranch } from '@adityam/types';
import { getDoctorSlug, type SoloDoctor } from '../../admin/doctors/doctorTheme';

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

const DAY_LABELS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export function PartnerDoctorDetailView({
  slug,
  hospitalId,
  onBack,
  onEdit,
}: {
  slug: string;
  hospitalId?: string | null;
  onBack: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<SoloDoctor | null>(null);
  const [branch, setBranch] = useState<HospitalBranch | null>(null);
  const [regNumber, setRegNumber] = useState<string>('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingTimings, setEditingTimings] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<Record<string, any>>({});
  const [draftSlotCap, setDraftSlotCap] = useState('6');
  const [savingTimings, setSavingTimings] = useState(false);
  const [timingMsg, setTimingMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: docsData } = await supabase.from('doctors').select('*');
      const found = ((docsData || []) as SoloDoctor[]).find(
        (d) => getDoctorSlug(d) === slug || d.id === slug
      );
      if (!found) {
        setDoctor(null);
        return;
      }
      setDoctor(found);

      const [branchRes, bookingsRes, vrRes] = await Promise.all([
        found.branch_id
          ? supabase.from('hospital_branches').select('*').eq('id', found.branch_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('bookings')
          .select('*')
          .in('service_type', ['OPD_CONCIERGE', 'OPD'])
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('partner_verification_requests')
          .select('verification_docs, entity_slug, target_entity_id')
          .eq('entity_type', 'DOCTOR')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setBranch((branchRes.data as HospitalBranch) || null);
      const matchedVr = ((vrRes.data || []) as any[]).find(
        (r) => r.entity_slug === slug || r.target_entity_id === found.id
      );
      setRegNumber(
        found.registration_number || matchedVr?.verification_docs?.registrationNumber || ''
      );

      const docBookings = (bookingsRes.data || []).filter((b: any) => {
        if (b.doctor_id && b.doctor_id === found.id) return true;
        if (
          !b.doctor_id &&
          b.doctor_name &&
          String(b.doctor_name).trim().toLowerCase() === String(found.name).trim().toLowerCase() &&
          (!hospitalId || !b.hospital_id || b.hospital_id === hospitalId)
        ) {
          return true;
        }
        return false;
      });
      setBookings(docBookings);
    } finally {
      setLoading(false);
    }
  }, [slug, hospitalId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const startEditTimings = () => {
    const base: Record<string, any> = {};
    const existing = (doctor?.weekly_schedule || {}) as Record<string, any>;
    for (const d of DAY_LABELS) {
      const row = existing[d.key];
      base[d.key] = row
        ? { ...row }
        : {
            open: d.key !== 'sun',
            start: '09:00',
            end: '13:00',
            hasBreak: true,
            start2: '16:00',
            end2: '20:00',
          };
    }
    setDraftSchedule(base);
    setDraftSlotCap(String((doctor as any)?.slot_capacity || 6));
    setTimingMsg(null);
    setEditingTimings(true);
  };

  const handleSaveTimingsLive = async () => {
    if (!doctor) return;
    setSavingTimings(true);
    setTimingMsg(null);
    try {
      const supabase = getSupabaseClient();
      const mon = draftSchedule.mon || {};
      const summaryHours = mon.open
        ? `${mon.start || '09:00'} - ${mon.hasBreak && mon.end2 ? mon.end2 : mon.end || '17:00'}`
        : '9:00 AM - 5:00 PM';
      const cap = Math.max(1, Math.min(20, Number(draftSlotCap) || 6));

      const { error } = await supabase
        .from('doctors')
        .update({
          weekly_schedule: draftSchedule,
          opd_hours: summaryHours,
          available_timings: summaryHours,
          slot_capacity: cap,
        })
        .eq('id', doctor.id);

      if (error) throw error;
      setTimingMsg('Timings updated live without admin approval ✓');
      setEditingTimings(false);
      await loadData();
    } catch (e: any) {
      setTimingMsg(e?.message || 'Could not update timings.');
    } finally {
      setSavingTimings(false);
    }
  };

  const metrics = useMemo(() => {
    const commPct = Number(doctor?.commission_percentage ?? 5);
    let completedCount = 0;
    let upcomingCount = 0;
    let cancelledCount = 0;
    let completedGross = 0;

    for (const b of bookings) {
      if (b.status === 'COMPLETED') {
        completedCount += 1;
        completedGross += Number(b.final_payable ?? b.doctor_fee ?? doctor?.discounted_fee ?? 0);
      } else if (b.status === 'CANCELLED' || b.status === 'MISSED') {
        cancelledCount += 1;
      } else {
        upcomingCount += 1;
      }
    }

    const totalCommission = Math.round((completedGross * commPct) / 100);
    const netEarnings = Math.max(0, completedGross - totalCommission);
    return {
      commPct,
      completedCount,
      upcomingCount,
      cancelledCount,
      completedGross,
      totalCommission,
      netEarnings,
    };
  }, [bookings, doctor]);

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, color: THEME.muted }}>Loading doctor profile & earnings...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Doctor Not Found</Text>
        <TouchableOpacity
          onPress={onBack}
          style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>← Back to Doctors</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mrp = Number(doctor.consultation_fee || 0);
  const payable = Number(doctor.discounted_fee || mrp);
  const discAmt = Math.max(0, mrp - payable);
  const discPct = mrp > 0 ? Math.round((discAmt / mrp) * 100) : 0;
  const perConsultComm = Math.round((payable * metrics.commPct) / 100);
  const perConsultNet = Math.max(0, payable - perConsultComm);
  const weekly = (doctor.weekly_schedule || {}) as Record<string, any>;

  return (
    <View style={{ gap: 16 }}>
      {/* Hero Doctor Card */}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 260 }}>
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: THEME.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={16} color={THEME.ink} />
            </TouchableOpacity>

            {doctor.avatar_url ? (
              <Image
                source={{ uri: doctor.avatar_url }}
                resizeMode="cover"
                style={{
                  width: 72,
                  height: 96,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  backgroundColor: THEME.bg,
                }}
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 96,
                  borderRadius: 12,
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Stethoscope size={24} color={THEME.muted} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>No Photo</Text>
              </View>
            )}

            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.ink }}>{doctor.name}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: Number((doctor as any).total_reviews ?? 0) > 0 ? THEME.amberBg : THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: Number((doctor as any).total_reviews ?? 0) > 0 ? THEME.amberBorder : THEME.greenBorder,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 99,
                  }}
                >
                  <Star
                    size={11}
                    color={Number((doctor as any).total_reviews ?? 0) > 0 ? '#D97706' : THEME.green}
                    fill={Number((doctor as any).total_reviews ?? 0) > 0 ? '#D97706' : THEME.green}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: Number((doctor as any).total_reviews ?? 0) > 0 ? THEME.amberText : THEME.greenDark,
                    }}
                  >
                    {Number((doctor as any).total_reviews ?? 0) > 0
                      ? `${doctor.rating} (${(doctor as any).total_reviews} reviews)`
                      : 'New'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.green }}>
                {doctor.specialty} · {doctor.qualification}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                <View style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>
                    {branch?.area || branch?.name || 'Main Campus'}
                  </Text>
                </View>
                <View style={{ backgroundColor: THEME.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.ink }}>
                    {doctor.experience_years || 0} yrs experience
                  </Text>
                </View>
                {regNumber ? (
                  <View style={{ backgroundColor: THEME.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                      Reg: {regNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
              {doctor.languages?.length ? (
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Languages: {doctor.languages.join(', ')}
                </Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            onPress={onEdit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Edit3 size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
              Edit Doctor & Timings
            </Text>
          </TouchableOpacity>
        </View>

        {doctor.about ? (
          <View style={{ backgroundColor: THEME.bg, borderRadius: 10, borderWidth: 1, borderColor: THEME.border, padding: 11 }}>
            <Text style={{ fontSize: 12.5, color: THEME.ink, lineHeight: 19 }}>{doctor.about}</Text>
          </View>
        ) : null}
      </View>

      {/* 4 Earnings & Consultation KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flex: 1,
            minWidth: 180,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#A7D7C0', letterSpacing: 0.5 }}>
              NET DOCTOR EARNINGS
            </Text>
            <IndianRupee size={15} color="#A7D7C0" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF' }}>
            ₹{metrics.netEarnings.toLocaleString('en-IN')}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#C6E2D4' }}>
            After {metrics.commPct}% platform fee (₹{metrics.totalCommission.toLocaleString('en-IN')})
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 180,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              COMPLETED CONSULTS
            </Text>
            <ShieldCheck size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.ink }}>
            {metrics.completedCount}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>
            Gross billed ₹{metrics.completedGross.toLocaleString('en-IN')}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 180,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              UPCOMING QUEUE
            </Text>
            <Users size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.green }}>
            {metrics.upcomingCount}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>
            {metrics.cancelledCount} cancelled / no-show
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 180,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              NET PER CONSULT
            </Text>
            <Building2 size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.greenDark }}>
            ₹{perConsultNet.toLocaleString('en-IN')}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>
            MRP ₹{mrp} · Patient pays ₹{payable}
          </Text>
        </View>
      </View>

      {/* Two-Column Detail Section */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: Offer/Payout + Weekly Sitting Schedule */}
        <View style={{ flex: 1, minWidth: 290, gap: 16, width: '100%' }}>
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
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Fee, Offer & Commission Breakdown
            </Text>
            {[
              { label: 'Hospital Consultation MRP', value: `₹${mrp.toLocaleString('en-IN')}` },
              { label: `Patient In-App Offer (${discPct}% off)`, value: `−₹${discAmt.toLocaleString('en-IN')}` },
              { label: 'Patient Pays Online', value: `₹${payable.toLocaleString('en-IN')}`, bold: true },
              { label: `Platform Commission (${metrics.commPct}%)`, value: `−₹${perConsultComm.toLocaleString('en-IN')}` },
              { label: 'Partner Net Payout / Consult', value: `₹${perConsultNet.toLocaleString('en-IN')}`, highlight: THEME.greenDark, bold: true },
              { label: 'Slot Capacity', value: `${(doctor as any).slot_capacity ?? (doctor.weekly_schedule as any)?._slot_capacity ?? 6} patients / hour` },
            ].map((row: any) => (
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
                <Text style={{ fontSize: 12.5, color: THEME.muted, fontWeight: '600' }}>{row.label}</Text>
                <Text style={{ fontSize: row.bold ? 14 : 12.5, fontWeight: row.bold ? '900' : '700', color: row.highlight || THEME.ink }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Calendar size={16} color={THEME.green} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Weekly Sitting Schedule
                </Text>
              </View>
              {!editingTimings ? (
                <TouchableOpacity
                  onPress={startEditTimings}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Edit3 size={12} color={THEME.greenDark} />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>Edit Timings</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {timingMsg ? (
              <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 8, padding: 9, borderWidth: 1, borderColor: THEME.greenBorder }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>{timingMsg}</Text>
              </View>
            ) : null}

            {editingTimings ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: THEME.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Patients / Hour Slot Capacity</Text>
                  <TextInput
                    value={draftSlotCap}
                    onChangeText={setDraftSlotCap}
                    keyboardType="number-pad"
                    style={{
                      width: 60,
                      textAlign: 'center',
                      backgroundColor: THEME.surface,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 7,
                      paddingVertical: 5,
                      fontSize: 13,
                      fontWeight: '800',
                      color: THEME.ink,
                    }}
                  />
                </View>

                {DAY_LABELS.map((d) => {
                  const row = draftSchedule[d.key] || { open: false, start: '09:00', end: '13:00', hasBreak: false, start2: '16:00', end2: '20:00' };
                  const updateDay = (patch: Record<string, any>) =>
                    setDraftSchedule((prev) => ({
                      ...prev,
                      [d.key]: { ...row, ...patch },
                    }));
                  return (
                    <View
                      key={d.key}
                      style={{
                        backgroundColor: THEME.bg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        padding: 10,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>{d.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: row.open ? THEME.green : THEME.redText }}>
                            {row.open ? 'Open' : 'Closed'}
                          </Text>
                          <Switch
                            value={Boolean(row.open)}
                            onValueChange={(v) => updateDay({ open: v })}
                            trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
                            thumbColor={row.open ? THEME.green : '#9CA3AF'}
                          />
                        </View>
                      </View>
                      {row.open ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <TextInput
                            value={row.start || '09:00'}
                            onChangeText={(t) => updateDay({ start: t })}
                            placeholder="09:00"
                            style={{ width: 68, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12, fontWeight: '700', color: THEME.ink }}
                          />
                          <Text style={{ fontSize: 11.5, color: THEME.muted }}>to</Text>
                          <TextInput
                            value={row.end || '13:00'}
                            onChangeText={(t) => updateDay({ end: t })}
                            placeholder="13:00"
                            style={{ width: 68, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12, fontWeight: '700', color: THEME.ink }}
                          />
                          <TouchableOpacity
                            onPress={() => updateDay({ hasBreak: !row.hasBreak })}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 6,
                              backgroundColor: row.hasBreak ? THEME.greenSoft : THEME.surface,
                              borderWidth: 1,
                              borderColor: row.hasBreak ? THEME.greenBorder : THEME.border,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: row.hasBreak ? THEME.greenDark : THEME.muted }}>
                              {row.hasBreak ? '+ Eve Shift' : '+ Add Eve'}
                            </Text>
                          </TouchableOpacity>
                          {row.hasBreak ? (
                            <>
                              <TextInput
                                value={row.start2 || '16:00'}
                                onChangeText={(t) => updateDay({ start2: t })}
                                placeholder="16:00"
                                style={{ width: 68, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12, fontWeight: '700', color: THEME.ink }}
                              />
                              <Text style={{ fontSize: 11.5, color: THEME.muted }}>to</Text>
                              <TextInput
                                value={row.end2 || '20:00'}
                                onChangeText={(t) => updateDay({ end2: t })}
                                placeholder="20:00"
                                style={{ width: 68, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12, fontWeight: '700', color: THEME.ink }}
                              />
                            </>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => setEditingTimings(false)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleSaveTimingsLive()}
                    disabled={savingTimings}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: THEME.greenDark }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                      {savingTimings ? 'Saving...' : 'Save Timings Live'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              DAY_LABELS.map((d) => {
                const row = weekly[d.key];
                const isOpen = row ? Boolean(row.open) : d.key !== 'sun';
                const timingStr = !isOpen
                  ? 'Closed'
                  : row
                    ? `${row.start || '09:00'} – ${row.end || '13:00'}${row.hasBreak && row.start2 ? `, ${row.start2} – ${row.end2 || '20:00'}` : ''}`
                    : (doctor as any).opd_hours || '9:00 AM – 5:00 PM';
                return (
                  <View
                    key={d.key}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 6,
                      borderBottomWidth: 1,
                      borderBottomColor: THEME.surfaceAlt,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>{d.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isOpen ? THEME.green : THEME.redText }}>
                      {timingStr}
                    </Text>
                  </View>
                );
              })
            )}

            {doctor.services_offered?.length ? (
              <View style={{ marginTop: 6, gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted }}>SERVICES OFFERED</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {doctor.services_offered.map((svc) => (
                    <View key={svc} style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenDark }}>{svc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Right: Doctor's Live & Completed Appointments */}
        <View
          style={{
            flex: 1.3,
            minWidth: 300,
            width: '100%',
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 18,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Clock size={16} color={THEME.green} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Appointments & Earnings Log ({bookings.length})
              </Text>
            </View>
          </View>

          {bookings.length === 0 ? (
            <View style={{ backgroundColor: THEME.bg, borderRadius: 12, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>
                No appointments booked for {doctor.name} yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {bookings.slice(0, 25).map((b) => {
                const bFee = Number(b.final_payable ?? b.doctor_fee ?? payable);
                const isComp = b.status === 'COMPLETED';
                const isCanc = b.status === 'CANCELLED' || b.status === 'MISSED';
                return (
                  <TouchableOpacity
                    key={b.id || b.booking_ref}
                    onPress={() => router.push(`/partner/opd/appointments/${b.booking_ref}` as any)}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                          #{b.booking_ref}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isComp ? THEME.greenSoft : isCanc ? THEME.redBg : '#E0F2FE',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 99,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: isComp ? THEME.greenDark : isCanc ? THEME.redText : '#0284C7',
                            }}
                          >
                            {b.status === 'PAID' ? 'PAID ONLINE' : b.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                        {b.patient_name} · {b.patient_phone || 'N/A'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                        {b.slot_time || new Date(b.created_at).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.greenDark }}>
                        ₹{bFee.toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.green }}>
                        Open →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
