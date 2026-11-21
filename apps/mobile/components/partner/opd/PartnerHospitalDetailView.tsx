import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Clock,
  Edit3,
  IndianRupee,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Doctor, Hospital, HospitalBranch } from '@adityam/types';
import { getDoctorSlug } from '../../admin/doctors/doctorTheme';

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
  redBg: '#FDF2F2',
  redText: '#991B1B',
};

export function PartnerHospitalDetailView({
  slug,
  hospitalId,
  onBack,
  onEditHospital,
  onAddDoctor,
}: {
  slug: string;
  hospitalId?: string | null;
  onBack: () => void;
  onEditHospital: (hospitalSlug: string) => void;
  onAddDoctor: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<(Hospital & { is_active?: boolean; is_24x7?: boolean }) | null>(null);
  const [branches, setBranches] = useState<(HospitalBranch & { is_active?: boolean })[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<(HospitalBranch & { is_active?: boolean }) | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [busyToggle, setBusyToggle] = useState(false);

  const loadData = useCallback(async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [hospRes, brRes, docRes, bookRes] = await Promise.all([
        supabase.from('hospitals').select('*').eq('id', hospitalId).maybeSingle(),
        supabase.from('hospital_branches').select('*').eq('hospital_id', hospitalId).order('is_main_branch', { ascending: false }),
        supabase.from('doctors').select('*').eq('hospital_id', hospitalId).order('name', { ascending: true }),
        supabase.from('bookings').select('*').in('service_type', ['OPD_CONCIERGE', 'OPD', 'IPD_ENQUIRY', 'INVESTIGATION']).order('created_at', { ascending: false }).limit(250),
      ]);

      const hosp = (hospRes.data as any) || null;
      const brList = (brRes.data || []) as (HospitalBranch & { is_active?: boolean })[];
      setHospital(hosp);
      setBranches(brList);
      setDoctors((docRes.data || []) as Doctor[]);

      const matchedBranch = brList.find(
        (b) => b.id === slug || (b as any).slug === slug
      ) || null;
      setSelectedBranch(matchedBranch);

      const hospBookings = (bookRes.data || []).filter((b: any) => {
        if (b.hospital_id && b.hospital_id !== hospitalId) return false;
        if (!b.hospital_id && hosp?.name && String(b.hospital_name || '').toLowerCase() !== hosp.name.toLowerCase()) {
          return false;
        }
        if (matchedBranch) {
          if (b.branch_id && b.branch_id === matchedBranch.id) return true;
          if (!b.branch_id && b.branch_name && String(b.branch_name).toLowerCase() === matchedBranch.name.toLowerCase()) return true;
          return false;
        }
        return true;
      });
      setBookings(hospBookings);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const branchDoctors = useMemo(() => {
    if (!selectedBranch) return doctors;
    return doctors.filter((d) => d.branch_id === selectedBranch.id || !d.branch_id);
  }, [doctors, selectedBranch]);

  const stats = useMemo(() => {
    const commPct = Number((hospital as any)?.commission_percentage ?? 10);
    let completed = 0;
    let active = 0;
    let completedGross = 0;
    for (const b of bookings) {
      if (b.status === 'COMPLETED') {
        completed += 1;
        completedGross += Number(b.final_payable ?? b.doctor_fee ?? 0);
      } else if (b.status !== 'CANCELLED' && b.status !== 'MISSED') {
        active += 1;
      }
    }
    const commission = Math.round((completedGross * commPct) / 100);
    const netPayout = Math.max(0, completedGross - commission);
    return { commPct, completed, active, completedGross, commission, netPayout };
  }, [bookings, hospital]);

  const handleToggleBranchActive = async (nextVal: boolean) => {
    if (!selectedBranch) return;
    setBusyToggle(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('hospital_branches').update({ is_active: nextVal }).eq('id', selectedBranch.id);
      await loadData();
    } finally {
      setBusyToggle(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, color: THEME.muted }}>Loading hospital & branch details...</Text>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Hospital Not Found</Text>
        <TouchableOpacity
          onPress={onBack}
          style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>← Back to Hospital & Branches</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = selectedBranch ? `${hospital.name} · ${selectedBranch.name}` : hospital.name;
  const displayAddress = selectedBranch?.address || hospital.address;
  const displayPhone = (selectedBranch as any)?.phone || hospital.contact_number;

  return (
    <View style={{ gap: 16 }}>
      {/* Hero Card */}
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
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

            {hospital.image_url ? (
              <Image
                source={{ uri: hospital.image_url }}
                resizeMode="cover"
                style={{ width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: THEME.border }}
              />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: THEME.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={26} color={THEME.green} />
              </View>
            )}

            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 19, fontWeight: '900', color: THEME.ink }}>{displayName}</Text>
                <View style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.greenDark }}>
                    {selectedBranch ? (selectedBranch.is_main_branch ? 'MAIN BRANCH' : 'BRANCH') : 'HOSPITAL NETWORK'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: Number((hospital as any).total_reviews ?? 0) > 0 ? '#FEF7E6' : THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: Number((hospital as any).total_reviews ?? 0) > 0 ? '#F3DBA8' : THEME.greenBorder,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 99,
                  }}
                >
                  <Star
                    size={10}
                    color={Number((hospital as any).total_reviews ?? 0) > 0 ? '#D97706' : THEME.green}
                    fill={Number((hospital as any).total_reviews ?? 0) > 0 ? '#D97706' : THEME.green}
                  />
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: Number((hospital as any).total_reviews ?? 0) > 0 ? '#92400E' : THEME.greenDark,
                    }}
                  >
                    {Number((hospital as any).total_reviews ?? 0) > 0
                      ? `${hospital.rating} (${(hospital as any).total_reviews})`
                      : 'New'}
                  </Text>
                </View>
              </View>
              {displayAddress ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} color={THEME.muted} />
                  <Text style={{ fontSize: 12.5, color: THEME.muted }}>{displayAddress}</Text>
                </View>
              ) : null}
              {displayPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Phone size={13} color={THEME.muted} />
                  <Text style={{ fontSize: 12.5, color: THEME.muted }}>{displayPhone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {selectedBranch ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: THEME.border }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: selectedBranch.is_active !== false ? THEME.green : THEME.redText }}>
                  {selectedBranch.is_active !== false ? 'BRANCH OPEN' : 'BRANCH CLOSED'}
                </Text>
                <Switch
                  value={selectedBranch.is_active !== false}
                  disabled={busyToggle}
                  onValueChange={(v) => void handleToggleBranchActive(v)}
                  trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
                  thumbColor={selectedBranch.is_active !== false ? THEME.green : '#9CA3AF'}
                />
              </View>
            ) : null}
            <TouchableOpacity
              onPress={onAddDoctor}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: THEME.greenDark,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 9,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Add Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onEditHospital(hospital.slug || hospital.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 9,
              }}
            >
              <Edit3 size={14} color={THEME.greenDark} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>Edit Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Branch Switcher */}
        {branches.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace(`/partner/opd/hospital/${hospital.slug || hospital.id}` as any)}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: !selectedBranch ? THEME.greenDark : THEME.bg,
                borderWidth: 1,
                borderColor: !selectedBranch ? THEME.greenDark : THEME.border,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: !selectedBranch ? '#FFFFFF' : THEME.ink }}>
                All Branches ({branches.length})
              </Text>
            </TouchableOpacity>
            {branches.map((br) => {
              const active = selectedBranch?.id === br.id;
              return (
                <TouchableOpacity
                  key={br.id}
                  onPress={() => router.replace(`/partner/opd/hospital/${br.id}` as any)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 99,
                    backgroundColor: active ? THEME.greenDark : THEME.bg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                    {br.name}{br.is_main_branch ? ' (Main)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* 4 Payout & Volume KPIs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 180, backgroundColor: THEME.greenDark, borderRadius: 14, padding: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#A7D7C0' }}>NET PAYOUT</Text>
            <IndianRupee size={15} color="#A7D7C0" />
          </View>
          <Text style={{ fontSize: 25, fontWeight: '900', color: '#FFFFFF' }}>
            ₹{stats.netPayout.toLocaleString('en-IN')}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#C6E2D4' }}>
            After {stats.commPct}% platform commission (₹{stats.commission.toLocaleString('en-IN')})
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: 180, backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>COMPLETED VISITS</Text>
            <ShieldCheck size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.ink }}>{stats.completed}</Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>Gross billed ₹{stats.completedGross.toLocaleString('en-IN')}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 180, backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>ACTIVE QUEUE</Text>
            <Users size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.green }}>{stats.active}</Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>Waiting check-in</Text>
        </View>

        <View style={{ flex: 1, minWidth: 180, backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>LINKED DOCTORS</Text>
            <Stethoscope size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.greenDark }}>{branchDoctors.length}</Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted }}>{hospital.discount_percentage ?? 20}% default hospital offer</Text>
        </View>
      </View>

      {/* 2-Column Workspace: Linked Doctors + Branch Bookings/Payouts */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 300, width: '100%', backgroundColor: THEME.surface, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 18, gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            Linked Doctors ({branchDoctors.length})
          </Text>
          {branchDoctors.length === 0 ? (
            <Text style={{ fontSize: 13, color: THEME.muted }}>No doctors linked to this branch yet.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {branchDoctors.map((doc) => {
                const docSlug = getDoctorSlug(doc as any);
                return (
                  <TouchableOpacity
                    key={doc.id}
                    onPress={() => router.push(`/partner/opd/doctors/${docSlug}` as any)}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {doc.avatar_url ? (
                      <Image source={{ uri: doc.avatar_url }} resizeMode="cover" style={{ width: 48, height: 64, borderRadius: 8 }} />
                    ) : (
                      <View style={{ width: 48, height: 64, borderRadius: 8, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Stethoscope size={18} color={THEME.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{doc.name}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>{doc.specialty} · {doc.qualification}</Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                        ₹{doc.consultation_fee} → ₹{doc.discounted_fee} · {(doc as any).opd_hours || '9:00 AM - 5:00 PM'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>View →</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ flex: 1.2, minWidth: 300, width: '100%', backgroundColor: THEME.surface, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Clock size={16} color={THEME.green} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Branch Bookings & Payout Log ({bookings.length})
            </Text>
          </View>
          {bookings.length === 0 ? (
            <Text style={{ fontSize: 13, color: THEME.muted }}>No bookings recorded for this location yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {bookings.slice(0, 20).map((b) => {
                const fee = Number(b.final_payable ?? b.doctor_fee ?? 0);
                return (
                  <TouchableOpacity
                    key={b.id || b.booking_ref}
                    onPress={() => router.push(`/partner/opd/appointments/${b.booking_ref}` as any)}
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 11,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                        #{b.booking_ref} · {b.status === 'PAID' ? 'PAID ONLINE' : b.status}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                        {b.patient_name} · {b.doctor_name || b.service_type}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                        {b.slot_time || new Date(b.created_at).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.greenDark }}>
                        ₹{fee.toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.green }}>Open →</Text>
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
