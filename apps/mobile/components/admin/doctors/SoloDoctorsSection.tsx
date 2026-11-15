import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpRight, Plus, Search } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital, HospitalBranch } from '@adityam/types';
import {
  THEME,
  SoloDoctor,
  DoctorStats,
  formatInr,
  getDoctorSlug,
} from './doctorTheme';
import { DoctorDetailView } from './DoctorDetailView';
import { getLiveOpenStatus } from '../WeeklyScheduleEditor';
import { AdminPageSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';

interface SoloDoctorsSectionProps {
  bookings: Booking[];
  initialSlug?: string | null;
  onBackToList?: () => void;
}

export function SoloDoctorsSection({
  bookings,
  initialSlug = null,
  onBackToList,
}: SoloDoctorsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();

  const [doctors, setDoctors] = useState<SoloDoctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOLO' | 'LINKED' | 'ON_LEAVE'>('ALL');

  const loadDoctorsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [docRes, hospRes, branchRes] = await Promise.all([
        supabase.from('doctors').select('*').order('name', { ascending: true }),
        supabase.from('hospitals').select('*').order('name', { ascending: true }),
        supabase.from('hospital_branches').select('*').order('is_main_branch', { ascending: false }),
      ]);
      if (docRes.data) setDoctors(docRes.data as SoloDoctor[]);
      if (hospRes.data) setHospitals(hospRes.data as Hospital[]);
      if (branchRes.data) setBranches(branchRes.data as HospitalBranch[]);
    } catch (err) {
      console.warn('Error loading doctors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctorsData();
  }, [loadDoctorsData]);

  const getDoctorBookings = useCallback(
    (doc: SoloDoctor) => {
      const dName = (doc.name || '').toLowerCase();
      return bookings.filter((b) => {
        if (b.doctor_id && b.doctor_id === doc.id) return true;
        const bDocName = (b.doctor_name || '').toLowerCase();
        if (!bDocName) return false;
        return bDocName === dName || bDocName.includes(dName) || dName.includes(bDocName);
      });
    },
    [bookings]
  );

  const doctorStatsList = useMemo<DoctorStats[]>(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return doctors.map((doc) => {
      const dBookings = getDoctorBookings(doc);
      const paidOrConfirmed = dBookings.filter((b) =>
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
      );
      const missedCount = dBookings.filter((b) => b.status === 'MISSED').length;
      const cancelledCount = dBookings.filter((b) => b.status === 'CANCELLED').length;

      const grossEarnings = paidOrConfirmed.reduce((sum, b) => {
        const val = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const discPct =
        doc.discount_percentage ??
        (doc.consultation_fee > 0 && doc.discounted_fee > 0
          ? Math.max(0, Math.round(((doc.consultation_fee - doc.discounted_fee) / doc.consultation_fee) * 100))
          : 0);

      const totalDiscountGiven = paidOrConfirmed.reduce((sum, b) => {
        const disc = Number(b.discount_amount ?? 0);
        if (disc > 0) return sum + disc;
        const fee = Number(b.final_payable ?? b.doctor_fee ?? 0);
        return fee > 0 && discPct > 0 ? sum + Math.round((fee * discPct) / 100) : sum;
      }, 0);

      const weeklyBookings = paidOrConfirmed.filter(
        (b) => new Date(b.created_at).getTime() >= sevenDaysAgo
      );
      const weeklyGross = weeklyBookings.reduce((sum, b) => {
        const val = Number(b.final_payable ?? b.doctor_fee ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const netRate = Math.max(0, 100 - Number(doc.commission_percentage ?? 10)) / 100;

      const linkedHosp = hospitals.find((h) => h.id === doc.hospital_id);
      const linkedBr = branches.find((br) => br.id === doc.branch_id);

      return {
        doctor: doc,
        linkedHospitalName: linkedHosp?.name || null,
        linkedBranchName: linkedBr ? linkedBr.area || linkedBr.name : null,
        totalBookings: dBookings.length,
        confirmedCount: paidOrConfirmed.length,
        missedCount,
        cancelledCount,
        grossEarnings,
        totalDiscountGiven,
        weeklyPayoutDue: Math.round(weeklyGross * netRate),
        weeklyBookingsCount: weeklyBookings.length,
      };
    });
  }, [doctors, hospitals, branches, getDoctorBookings]);

  const overallMetrics = useMemo(() => {
    const soloCount = doctors.filter((d) => d.is_solo || !d.hospital_id).length;
    const onLeaveCount = doctors.filter((d) => d.is_available_today === false).length;
    const totalEarnings = doctorStatsList.reduce((s, i) => s + i.grossEarnings, 0);
    const totalWeeklyPayout = doctorStatsList.reduce((s, i) => s + i.weeklyPayoutDue, 0);
    const totalConfirmed = doctorStatsList.reduce((s, i) => s + i.confirmedCount, 0);
    const totalMissed = doctorStatsList.reduce((s, i) => s + i.missedCount, 0);
    return {
      totalDoctors: doctors.length,
      soloCount,
      onLeaveCount,
      totalEarnings,
      totalWeeklyPayout,
      totalConfirmed,
      totalMissed,
    };
  }, [doctors, doctorStatsList]);

  const filteredDoctors = useMemo(() => {
    return doctorStatsList.filter((item) => {
      const d = item.doctor;
      if (filterMode === 'SOLO' && !d.is_solo && d.hospital_id) return false;
      if (filterMode === 'LINKED' && !d.hospital_id) return false;
      if (filterMode === 'ON_LEAVE' && d.is_available_today !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          (d.qualification || '').toLowerCase().includes(q) ||
          (d.clinic_name || '').toLowerCase().includes(q) ||
          (d.registration_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [doctorStatsList, filterMode, searchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  useEffect(() => {
    setPage(1);
  }, [filterMode, searchQuery]);
  const pagedDoctors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [filteredDoctors, page, pageSize]);

  const selectedDoctorStats = useMemo(() => {
    if (!initialSlug) return null;
    return (
      doctorStatsList.find(
        (item) => getDoctorSlug(item.doctor) === initialSlug || item.doctor.id === initialSlug
      ) || null
    );
  }, [doctorStatsList, initialSlug]);

  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  if (selectedDoctorStats) {
    return (
      <DoctorDetailView
        stats={selectedDoctorStats}
        doctorBookings={getDoctorBookings(selectedDoctorStats.doctor)}
        hospitals={hospitals}
        branches={branches}
        onBack={() => {
          if (onBackToList) onBackToList();
        }}
        onRefreshData={loadDoctorsData}
      />
    );
  }

  return (
    <View style={{ gap: 18 }}>
      {/* KPI Row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Total Doctors
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {overallMetrics.totalDoctors}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.greenPrimary, fontWeight: '600', marginTop: 6 }}>
            {overallMetrics.soloCount} solo · {overallMetrics.onLeaveCount} on leave
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Doctor Earnings
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(overallMetrics.totalEarnings)}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 6 }}>
            {overallMetrics.totalConfirmed} confirmed · {overallMetrics.totalMissed} missed
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
            Weekly Payout Due
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {formatInr(overallMetrics.totalWeeklyPayout)}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#B7D4C7', marginTop: 6 }}>
            Net payable to doctors (7d)
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Hospital Linked
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {doctors.filter((d) => Boolean(d.hospital_id)).length}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 6 }}>
            Practicing at partner hospitals
          </Text>
        </View>
      </View>

      {/* Search, Filter & Add Solo Doctor */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 14,
        }}
      >
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: isDesktop ? 'center' : 'stretch',
            gap: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: THEME.creamBg,
              borderRadius: 9,
              borderWidth: 1,
              borderColor: THEME.border,
              paddingHorizontal: 12,
              height: 40,
            }}
          >
            <Search size={14} color={THEME.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search doctor, specialty, qualification, or reg no..."
              placeholderTextColor="#8B9891"
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: THEME.ink }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                { id: 'ALL', label: 'All Doctors' },
                { id: 'SOLO', label: 'Solo Only' },
                { id: 'LINKED', label: 'Hospital Linked' },
                { id: 'ON_LEAVE', label: 'On Leave' },
              ] as const
            ).map((f) => {
              const active = filterMode === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFilterMode(f.id)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenPrimary : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? THEME.greenPrimary : THEME.muted }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => router.push('/admin/doctors/add-new' as any)}
              style={{
                backgroundColor: THEME.greenPrimary,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 9,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                Add Solo Doctor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctors Table / Cards */}
        {isDesktop ? (
          <View>
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: THEME.creamBg,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Text style={{ flex: 2.3, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>DOCTOR & QUALIFICATION</Text>
              <Text style={{ flex: 1.1, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>STATUS</Text>
              <Text style={{ flex: 0.9, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>CONF / MISS</Text>
              <Text style={{ flex: 1, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>EARNINGS</Text>
              <Text style={{ flex: 0.9, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>OPD FEE</Text>
              <Text style={{ width: 100, fontSize: 10.5, fontWeight: '700', color: THEME.muted, textAlign: 'right' }}>MANAGE</Text>
            </View>

            {pagedDoctors.map((item) => {
              const d = item.doctor;
              const live = getLiveOpenStatus(d.weekly_schedule, false);
              const onLeave = d.is_available_today === false;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => router.push(`/admin/doctors/${getDoctorSlug(d)}` as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 13,
                    paddingHorizontal: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: THEME.border,
                  }}
                >
                  <View style={{ flex: 2.3, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {d.avatar_url ? (
                      <Image
                        source={{ uri: d.avatar_url }}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.creamSoft }}
                      />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }} numberOfLines={1}>
                        {d.specialty} · {d.qualification || 'MBBS'}
                        {item.linkedHospitalName ? ` · ${item.linkedHospitalName}` : ' · Solo Clinic'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.1 }}>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: onLeave ? THEME.redBg : live.isOpen ? THEME.greenSoft : THEME.creamSoft,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: onLeave ? THEME.redText : live.isOpen ? THEME.greenPrimary : THEME.muted,
                        }}
                      >
                        {onLeave ? 'On Leave' : live.label}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 0.9 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                      {item.confirmedCount} / {item.missedCount}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(item.grossEarnings)}
                    </Text>
                  </View>

                  <View style={{ flex: 0.9 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                      {formatInr(d.discounted_fee || d.consultation_fee)}
                    </Text>
                  </View>

                  <View style={{ width: 100, alignItems: 'flex-end' }}>
                    <View
                      style={{
                        backgroundColor: THEME.greenSoft,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 7,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>Manage</Text>
                      <ArrowUpRight size={13} color={THEME.greenPrimary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pagedDoctors.map((item) => {
              const d = item.doctor;
              const onLeave = d.is_available_today === false;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => router.push(`/admin/doctors/${getDoctorSlug(d)}` as any)}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{d.name}</Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        {d.specialty} · {d.qualification || 'MBBS'}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: onLeave ? THEME.redText : THEME.greenPrimary,
                      }}
                    >
                      {onLeave ? 'ON LEAVE' : formatInr(d.discounted_fee || d.consultation_fee)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: THEME.border }}>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      {item.linkedHospitalName || 'Solo Clinic'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.greenPrimary, fontWeight: '700' }}>
                      {formatInr(item.grossEarnings)} earned
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <AdminPagination
        totalCount={filteredDoctors.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="doctors"
      />
    </View>
  );
}
