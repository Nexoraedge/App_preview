import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowUpRight, Plus, Search } from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import type { Booking, Doctor } from '@adityam/types';
import {
  THEME,
  ExtendedHospital,
  ExtendedBranch,
  HospitalPayout,
  HospitalStats,
  formatInr,
} from './hospitals/hospitalTheme';
import { HospitalDetailView } from './hospitals/HospitalDetailView';
import { AdminPageSkeleton } from './AdminSkeleton';
import { AdminPagination } from './AdminPagination';

interface HospitalsSectionProps {
  bookings: Booking[];
  initialSlug?: string | null;
  onOpenSlugRoute?: (slug: string) => void;
  onBackToList?: () => void;
}

export function HospitalsSection({
  bookings,
  initialSlug = null,
  onOpenSlugRoute,
  onBackToList,
}: HospitalsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();

  const [hospitals, setHospitals] = useState<ExtendedHospital[]>([]);
  const [branches, setBranches] = useState<ExtendedBranch[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [payouts, setPayouts] = useState<HospitalPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    setSelectedSlug(initialSlug);
  }, [initialSlug]);

  const loadHospitalsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [hospRes, branchRes, docRes, payoutRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('name', { ascending: true }),
        supabase.from('hospital_branches').select('*').order('is_main_branch', { ascending: false }),
        supabase.from('doctors').select('*').order('name', { ascending: true }),
        supabase.from('hospital_payouts').select('*').order('settled_at', { ascending: false }),
      ]);

      if (hospRes.data) setHospitals(hospRes.data as ExtendedHospital[]);
      if (branchRes.data) setBranches(branchRes.data as ExtendedBranch[]);
      if (docRes.data) setDoctors(docRes.data as Doctor[]);
      if (payoutRes.data) setPayouts(payoutRes.data as HospitalPayout[]);
    } catch (err) {
      console.warn('Error fetching hospitals data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHospitalsData();
  }, [loadHospitalsData]);

  const getHospitalBookings = useCallback(
    (h: ExtendedHospital) => {
      const hName = (h.name || '').toLowerCase();
      return bookings.filter((b) => {
        if (b.hospital_id && b.hospital_id === h.id) return true;
        const bName = (b.hospital_name || '').toLowerCase();
        if (!bName) return false;
        return bName === hName || bName.includes(hName) || hName.includes(bName);
      });
    },
    [bookings]
  );

  const hospitalStatsList = useMemo<HospitalStats[]>(() => {
    const now = new Date();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return hospitals.map((h) => {
      const hBookings = getHospitalBookings(h);
      const confirmedCount = hBookings.filter((b) =>
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
      ).length;
      const missedCount = hBookings.filter((b) => b.status === 'MISSED').length;
      const cancelledCount = hBookings.filter((b) => b.status === 'CANCELLED').length;

      const paidOrConfirmed = hBookings.filter((b) =>
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
      );

      const grossEarnings = paidOrConfirmed.reduce((sum, b) => {
        const val = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const totalDiscountGiven = paidOrConfirmed.reduce((sum, b) => {
        const disc = Number(b.discount_amount ?? 0);
        if (disc > 0) return sum + disc;
        const fee = Number(b.final_payable ?? b.doctor_fee ?? 0);
        const pct = Number(h.discount_percentage ?? 0);
        if (fee > 0 && pct > 0) return sum + Math.round((fee * pct) / 100);
        return sum;
      }, 0);

      const weeklyBookings = paidOrConfirmed.filter(
        (b) => new Date(b.created_at).getTime() >= sevenDaysAgo
      );
      const weeklyGross = weeklyBookings.reduce((sum, b) => {
        const val = Number(b.final_payable ?? b.bill_amount ?? b.doctor_fee ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const monthlyBookings = paidOrConfirmed.filter(
        (b) => new Date(b.created_at).getTime() >= monthStart
      );
      const monthlyGross = monthlyBookings.reduce((sum, b) => {
        const val = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const netRate = Math.max(0, 100 - Number(h.commission_percentage ?? 10)) / 100;
      const weeklyNetTotal = Math.round(weeklyGross * netRate);

      const hPayouts = payouts.filter(
        (p) => p.hospital_id === h.id && String(p.status || 'PAID').toUpperCase() !== 'PENDING'
      );
      const paidThisWeek = hPayouts
        .filter((p) => new Date(p.settled_at).getTime() >= sevenDaysAgo)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const monthlyPaid = hPayouts
        .filter((p) => new Date(p.settled_at).getTime() >= monthStart)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        hospital: h,
        totalBookings: hBookings.length,
        confirmedCount,
        missedCount,
        cancelledCount,
        grossEarnings,
        totalDiscountGiven,
        weeklyPayoutDue: Math.max(0, weeklyNetTotal - paidThisWeek),
        weeklyBookingsCount: weeklyBookings.length,
        paidThisWeek,
        lastPayoutDate: hPayouts[0]?.settled_at || null,
        monthlyGross,
        monthlyBookingsCount: monthlyBookings.length,
        monthlyPaid,
        doctorsCount: doctors.filter((d) => d.hospital_id === h.id).length,
        branchesCount: branches.filter((br) => br.hospital_id === h.id).length,
      };
    });
  }, [hospitals, doctors, branches, payouts, getHospitalBookings]);

  const overallMetrics = useMemo(() => {
    const activeHospitals = hospitals.filter((h) => h.is_active !== false).length;
    const totalEarnings = hospitalStatsList.reduce((s, item) => s + item.grossEarnings, 0);
    const totalWeeklyPayout = hospitalStatsList.reduce((s, item) => s + item.weeklyPayoutDue, 0);
    const totalConfirmed = hospitalStatsList.reduce((s, item) => s + item.confirmedCount, 0);
    const totalMissed = hospitalStatsList.reduce((s, item) => s + item.missedCount, 0);
    const avgDiscount =
      hospitals.length > 0
        ? Math.round(
            hospitals.reduce((s, h) => s + Number(h.discount_percentage ?? 0), 0) / hospitals.length
          )
        : 0;

    return {
      totalHospitals: hospitals.length,
      activeHospitals,
      totalBranches: branches.length,
      totalEarnings,
      totalWeeklyPayout,
      totalConfirmed,
      totalMissed,
      avgDiscount,
    };
  }, [hospitals, branches.length, hospitalStatsList]);

  const filteredHospitals = useMemo(() => {
    return hospitalStatsList.filter(({ hospital }) => {
      if (statusFilter === 'ACTIVE' && hospital.is_active === false) return false;
      if (statusFilter === 'PAUSED' && hospital.is_active !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          hospital.name.toLowerCase().includes(q) ||
          hospital.slug.toLowerCase().includes(q) ||
          (hospital.city || '').toLowerCase().includes(q) ||
          (hospital.address || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [hospitalStatsList, statusFilter, searchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);
  const pagedHospitals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHospitals.slice(start, start + pageSize);
  }, [filteredHospitals, page, pageSize]);

  const selectedHospitalStats = useMemo(
    () => hospitalStatsList.find((item) => item.hospital.slug === selectedSlug) || null,
    [hospitalStatsList, selectedSlug]
  );

  const handlePickPhoto = async (onPicked: (url: string) => void) => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.75,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setIsUploadingPhoto(true);
      const uploadedUrl = await uploadPrescriptionSlip(
        asset.uri,
        `hospital_${Date.now()}.jpg`,
        asset.base64 ?? undefined
      );
      onPicked(uploadedUrl);
    } catch {
      Alert.alert('Upload Notice', 'Could not pick image. You can also paste an image URL.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  // ==================== DEEP HOSPITAL DETAIL VIEW (/slug) ====================
  if (selectedHospitalStats) {
    const h = selectedHospitalStats.hospital;
    return (
      <HospitalDetailView
        stats={selectedHospitalStats}
        hospitalBookings={getHospitalBookings(h)}
        hospitalBranches={branches.filter((br) => br.hospital_id === h.id)}
        hospitalDoctors={doctors.filter((d) => d.hospital_id === h.id)}
        isUploadingPhoto={isUploadingPhoto}
        onPickPhoto={handlePickPhoto}
        onBack={() => {
          setSelectedSlug(null);
          if (onBackToList) onBackToList();
        }}
        onOpenSlugRoute={onOpenSlugRoute}
        onRefreshData={loadHospitalsData}
      />
    );
  }

  // ==================== ALL HOSPITALS OVERVIEW ====================
  return (
    <View style={{ gap: 18 }}>
      {/* Overall Hospitals KPI Row */}
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
            Partner Hospitals
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {overallMetrics.totalHospitals}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.greenPrimary, fontWeight: '600', marginTop: 6 }}>
            {overallMetrics.activeHospitals} active · {overallMetrics.totalBranches} branches
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
            Total Hospital Earnings
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
            Net payable to hospitals (7d)
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
            Avg Discount Offered
          </Text>
          <Text style={{ fontSize: 25, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {overallMetrics.avgDiscount}%
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 6 }}>
            Across Jaipur hospital network
          </Text>
        </View>
      </View>

      {/* Search, Filter & Onboard Hospital */}
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
              placeholder="Search hospital name, /slug, or locality..."
              placeholderTextColor="#8B9891"
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: THEME.ink }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((f) => {
              const active = statusFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setStatusFilter(f)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenPrimary : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? THEME.greenPrimary : THEME.muted,
                    }}
                  >
                    {f === 'ALL' ? 'All Hospitals' : f === 'ACTIVE' ? 'Active' : 'Paused'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => router.push('/admin/hospitals/add-new')}
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
                Add Hospital
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hospitals Table / List */}
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
              <Text style={{ flex: 2.2, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>HOSPITAL & BRANCHES</Text>
              <Text style={{ flex: 0.9, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>CONF / MISS</Text>
              <Text style={{ flex: 1, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>EARNINGS</Text>
              <Text style={{ flex: 1, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>WEEK PAYOUT</Text>
              <Text style={{ flex: 0.8, fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>DISCOUNT</Text>
              <Text style={{ width: 110, fontSize: 10.5, fontWeight: '700', color: THEME.muted, textAlign: 'right' }}>MANAGE</Text>
            </View>

            {pagedHospitals.map((item) => (
              <TouchableOpacity
                key={item.hospital.id}
                onPress={() => router.push(`/admin/hospitals/${item.hospital.slug}` as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  paddingHorizontal: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.border,
                }}
              >
                <View style={{ flex: 2.2, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {item.hospital.image_url ? (
                    <Image
                      source={{ uri: item.hospital.image_url }}
                      style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: THEME.creamSoft }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                      {item.hospital.name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }} numberOfLines={1}>
                      {item.branchesCount} branches · {item.doctorsCount} doctors · {item.hospital.city}
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

                <View style={{ flex: 1 }}>
                  {item.paidThisWeek > 0 && item.weeklyPayoutDue === 0 ? (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: THEME.greenSoft,
                        borderWidth: 1,
                        borderColor: THEME.greenBorder,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 99,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>
                        PAID · {formatInr(item.paidThisWeek)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: item.weeklyPayoutDue > 0 ? THEME.amberText : THEME.ink }}>
                      {formatInr(item.weeklyPayoutDue)}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 0.8 }}>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: THEME.amberBg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amberText }}>
                      {item.hospital.discount_percentage}% OFF
                    </Text>
                  </View>
                </View>

                <View style={{ width: 110, alignItems: 'flex-end' }}>
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
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                      Manage
                    </Text>
                    <ArrowUpRight size={13} color={THEME.greenPrimary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pagedHospitals.map((item) => (
              <TouchableOpacity
                key={item.hospital.id}
                onPress={() => router.push(`/admin/hospitals/${item.hospital.slug}` as any)}
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
                  {item.hospital.image_url ? (
                    <Image
                      source={{ uri: item.hospital.image_url }}
                      style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: THEME.creamSoft }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{item.hospital.name}</Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      {item.branchesCount} branches · {item.doctorsCount} doctors
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amberText }}>
                    {item.hospital.discount_percentage}% OFF
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: THEME.border }}>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Conf/Miss: <Text style={{ fontWeight: '700', color: THEME.ink }}>{item.confirmedCount}/{item.missedCount}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Week Payout:{' '}
                    {item.paidThisWeek > 0 && item.weeklyPayoutDue === 0 ? (
                      <Text style={{ fontWeight: '800', color: THEME.greenPrimary }}>
                        PAID ({formatInr(item.paidThisWeek)})
                      </Text>
                    ) : (
                      <Text style={{ fontWeight: '800', color: item.weeklyPayoutDue > 0 ? THEME.amberText : THEME.greenPrimary }}>
                        {formatInr(item.weeklyPayoutDue)}
                      </Text>
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <AdminPagination
        totalCount={filteredHospitals.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="hospitals"
      />
    </View>
  );
}
