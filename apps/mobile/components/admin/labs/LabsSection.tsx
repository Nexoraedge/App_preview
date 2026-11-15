import React, { useState, useEffect, useMemo } from 'react';
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
import { Plus, Search, FlaskConical, ChevronRight, MapPin, ListChecks } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital } from '@adityam/types';
import { THEME, ExtendedLabCentre, LabPayout, LabStats, formatInr, getLabSlug } from './labTheme';
import { MasterCatalogModal } from './MasterCatalogModal';
import { AdminListSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';

interface LabsSectionProps {
  bookings: Booking[];
}

export function LabsSection({ bookings }: LabsSectionProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [centres, setCentres] = useState<ExtendedLabCentre[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [payouts, setPayouts] = useState<LabPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LAB' | 'SCAN' | 'HOME' | 'HOSPITAL'>('ALL');
  const [showMasterCatalog, setShowMasterCatalog] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [labRes, hospRes, payoutRes] = await Promise.all([
        supabase.from('lab_centres').select('*').order('name'),
        supabase.from('hospitals').select('id, name').order('name'),
        supabase.from('lab_payouts').select('*').order('created_at', { ascending: false }),
      ]);
      if (labRes.data) setCentres(labRes.data as ExtendedLabCentre[]);
      if (hospRes.data) setHospitals(hospRes.data as Hospital[]);
      if (payoutRes.data) setPayouts(payoutRes.data as LabPayout[]);
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const labStatsList: LabStats[] = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const hospMap = new Map(hospitals.map((h) => [h.id, h.name]));

    return centres.map((centre) => {
      const lowerName = centre.name.toLowerCase();
      const matching = bookings.filter(
        (b) =>
          b.service_type === 'INVESTIGATION' &&
          (b.hospital_id === centre.id || (b.hospital_name || '').toLowerCase() === lowerName)
      );

      let confirmedCount = 0;
      let missedCount = 0;
      let cancelledCount = 0;
      let grossEarnings = 0;
      let weeklyGross = 0;
      let weeklyBookingsCount = 0;
      let monthlyGross = 0;
      let monthlyBookingsCount = 0;
      let totalDiscountGiven = 0;

      for (const b of matching) {
        if (b.status === 'MISSED') missedCount += 1;
        else if (b.status === 'CANCELLED') cancelledCount += 1;
        else if (['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)) confirmedCount += 1;

        const amt = b.final_payable || b.bill_amount || 0;
        const disc = b.discount_amount || 0;
        if (b.status !== 'CANCELLED' && b.status !== 'MISSED') {
          grossEarnings += amt;
          totalDiscountGiven += disc;
          const createdTs = new Date(b.created_at).getTime();
          if (createdTs >= sevenDaysAgo) {
            weeklyGross += amt;
            weeklyBookingsCount += 1;
          }
          if (createdTs >= monthStart) {
            monthlyGross += amt;
            monthlyBookingsCount += 1;
          }
        }
      }

      const commRate = (centre.commission_percentage ?? 12) / 100;
      const weeklyNetTotal = Math.round(weeklyGross * (1 - commRate));
      const cPayouts = payouts.filter((p) => p.centre_id === centre.id && p.status === 'PAID');
      const paidThisWeek = cPayouts
        .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= sevenDaysAgo)
        .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
      const monthlyPaid = cPayouts
        .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= monthStart)
        .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
      const weeklyPayoutDue = Math.max(0, weeklyNetTotal - paidThisWeek);

      return {
        centre,
        linkedHospitalName: centre.hospital_id ? hospMap.get(centre.hospital_id) || null : null,
        totalBookings: matching.length,
        confirmedCount,
        missedCount,
        cancelledCount,
        grossEarnings,
        weeklyGross,
        weeklyPayoutDue,
        weeklyBookingsCount,
        paidThisWeek,
        monthlyGross,
        monthlyBookingsCount,
        monthlyPaid,
        totalDiscountGiven,
      };
    });
  }, [centres, hospitals, bookings, payouts]);

  const kpis = useMemo(() => {
    const total = labStatsList.length;
    const homeCount = labStatsList.filter((s) => s.centre.home_collection !== false).length;
    const scanCount = labStatsList.filter((s) =>
      Array.isArray(s.centre.offers) ? s.centre.offers.includes('scan') : false
    ).length;
    const totalSales = labStatsList.reduce((acc, s) => acc + s.grossEarnings, 0);
    const totalWeeklyPayout = labStatsList.reduce(
      (acc, s) => acc + (s.centre.hospital_id ? 0 : s.weeklyPayoutDue),
      0
    );
    return { total, homeCount, scanCount, totalSales, totalWeeklyPayout };
  }, [labStatsList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return labStatsList.filter(({ centre }) => {
      const offers = Array.isArray(centre.offers) ? centre.offers : ['lab'];
      if (filterMode === 'LAB' && !offers.includes('lab')) return false;
      if (filterMode === 'SCAN' && !offers.includes('scan')) return false;
      if (filterMode === 'HOME' && centre.home_collection === false) return false;
      if (filterMode === 'HOSPITAL' && !centre.hospital_id) return false;
      if (!q) return true;
      return (
        centre.name.toLowerCase().includes(q) ||
        centre.area.toLowerCase().includes(q) ||
        (centre.phone || '').toLowerCase().includes(q) ||
        (centre.license_number || '').toLowerCase().includes(q)
      );
    });
  }, [labStatsList, searchQuery, filterMode]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterMode]);
  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  return (
    <View style={{ gap: 18 }}>
      {/* Top 4 KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
            This Week Payout Due
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {formatInr(kpis.totalWeeklyPayout)}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            Standalone labs & scan centres
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Total Lab & Scan Sales
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(kpis.totalSales)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Across all diagnostic centres
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Diagnostic Centres
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {kpis.total}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {kpis.scanCount} offer MRI / CT / X-Ray
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Home Checkup Enabled
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {kpis.homeCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Home blood sample collection
          </Text>
        </View>
      </View>

      {/* Search, Filter & Add Bar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: THEME.creamBg,
            borderRadius: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 8,
          }}
        >
          <Search size={15} color={THEME.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search lab, MRI centre, area, NABL..."
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'LAB', label: 'Blood Labs' },
              { id: 'SCAN', label: 'Scans & MRI' },
              { id: 'HOME', label: 'Home Checkup' },
              { id: 'HOSPITAL', label: 'Hospital-Linked' },
            ] as const
          ).map((f) => {
            const active = filterMode === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterMode(f.id)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenPrimary : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? THEME.greenPrimary : THEME.muted }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => setShowMasterCatalog(true)}
            style={{
              backgroundColor: THEME.creamSoft,
              borderWidth: 1,
              borderColor: THEME.border,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ListChecks size={15} color={THEME.ink} />
            <Text style={{ color: THEME.ink, fontSize: 12, fontWeight: '700' }}>Master Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/admin/labs/add-new' as any)}
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
            <Plus size={15} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>Add Lab / Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lab Centres List */}
      {loading ? (
        <AdminListSkeleton rows={5} />
      ) : filteredList.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 36,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>No Lab Centres Found</Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            Add a diagnostic lab, MRI/CT centre, or home checkup provider.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {pagedList.map((item) => {
            const c = item.centre;
            const slug = getLabSlug(c);
            const offers = Array.isArray(c.offers) ? c.offers : ['lab'];
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/admin/labs/${slug}` as any)}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: isDesktop ? 'row' : 'column',
                  alignItems: isDesktop ? 'center' : 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {c.image_url ? (
                    <Image
                      source={{ uri: c.image_url }}
                      style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: THEME.creamSoft }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: THEME.greenSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FlaskConical size={20} color={THEME.greenPrimary} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>{c.name}</Text>
                      <View
                        style={{
                          backgroundColor: c.is_active === false ? THEME.redBg : THEME.greenSoft,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: c.is_active === false ? THEME.redText : THEME.greenPrimary,
                          }}
                        >
                          {c.is_active === false ? 'PAUSED' : 'ACTIVE'}
                        </Text>
                      </View>
                      {offers.includes('scan') && (
                        <View style={{ backgroundColor: THEME.blueBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.blueText }}>SCANS & MRI</Text>
                        </View>
                      )}
                      {c.home_collection !== false && (
                        <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amberText }}>HOME CHECKUP</Text>
                        </View>
                      )}
                      {Boolean(item.linkedHospitalName) && (
                        <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.ink }}>
                            {item.linkedHospitalName}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <MapPin size={12} color={THEME.muted} />
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        {c.area}, {c.city || 'Jaipur'}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>DISCOUNT</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.amberText }}>
                      {c.discount_percentage ?? 20}% OFF
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>HOME VISIT</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>
                      {c.home_collection !== false ? `${c.home_collection_radius_km ?? 10} km` : 'Walk-in'}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>SALES</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(item.grossEarnings)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>WEEK PAYOUT</Text>
                    {item.paidThisWeek > 0 && item.weeklyPayoutDue === 0 ? (
                      <View
                        style={{
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 99,
                          marginTop: 2,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.greenDark }}>
                          PAID · {formatInr(item.paidThisWeek)}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: item.weeklyPayoutDue > 0 ? THEME.amberText : THEME.ink,
                        }}
                      >
                        {formatInr(item.weeklyPayoutDue)}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={THEME.muted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <AdminPagination
        totalCount={filteredList.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="centres"
      />

      <MasterCatalogModal
        visible={showMasterCatalog}
        onClose={() => setShowMasterCatalog(false)}
      />
    </View>
  );
}
