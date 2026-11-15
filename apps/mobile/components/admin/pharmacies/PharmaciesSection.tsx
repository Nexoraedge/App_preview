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
import { Plus, Search, Store, ChevronRight, MapPin } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital } from '@adityam/types';
import { THEME, ExtendedPharmacy, PharmacyPayout, PharmacyStats, formatInr, getPharmacySlug } from './pharmacyTheme';
import { AdminListSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';

interface PharmaciesSectionProps {
  bookings: Booking[];
}

export function PharmaciesSection({ bookings }: PharmaciesSectionProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [pharmacies, setPharmacies] = useState<ExtendedPharmacy[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [payouts, setPayouts] = useState<PharmacyPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | '24X7' | 'DELIVERY' | 'STANDALONE'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [pharmRes, hospRes, payoutRes] = await Promise.all([
        supabase.from('pharmacies').select('*').order('name'),
        supabase.from('hospitals').select('id, name').order('name'),
        supabase.from('pharmacy_payouts').select('*').order('created_at', { ascending: false }),
      ]);
      if (pharmRes.data) setPharmacies(pharmRes.data as ExtendedPharmacy[]);
      if (hospRes.data) setHospitals(hospRes.data as Hospital[]);
      if (payoutRes.data) setPayouts(payoutRes.data as PharmacyPayout[]);
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pharmacyStatsList: PharmacyStats[] = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const hospMap = new Map(hospitals.map((h) => [h.id, h.name]));

    return pharmacies.map((pharm) => {
      const lowerName = pharm.name.toLowerCase();
      const matching = bookings.filter(
        (b) =>
          b.service_type === 'PHARMACY_SCAN_PAY' &&
          (b.hospital_id === pharm.id || (b.hospital_name || '').toLowerCase() === lowerName)
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

      const commRate = (pharm.commission_percentage ?? 10) / 100;
      const weeklyNetTotal = Math.round(weeklyGross * (1 - commRate));

      const pPayouts = payouts.filter(
        (p) => p.pharmacy_id === pharm.id && p.status === 'PAID'
      );
      const paidThisWeek = pPayouts
        .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= sevenDaysAgo)
        .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
      const monthlyPaid = pPayouts
        .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= monthStart)
        .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);

      const weeklyPayoutDue = Math.max(0, weeklyNetTotal - paidThisWeek);

      return {
        pharmacy: pharm,
        linkedHospitalName: pharm.hospital_id ? hospMap.get(pharm.hospital_id) || null : null,
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
  }, [pharmacies, hospitals, bookings, payouts]);

  const kpis = useMemo(() => {
    const total = pharmacyStatsList.length;
    const open24x7 = pharmacyStatsList.filter((s) => s.pharmacy.is_24x7).length;
    const deliveryCount = pharmacyStatsList.filter((s) => s.pharmacy.delivery !== false).length;
    const totalSales = pharmacyStatsList.reduce((acc, s) => acc + s.grossEarnings, 0);
    const totalWeeklyPayout = pharmacyStatsList.reduce(
      (acc, s) => acc + (s.pharmacy.hospital_id ? 0 : s.weeklyPayoutDue),
      0
    );
    return { total, open24x7, deliveryCount, totalSales, totalWeeklyPayout };
  }, [pharmacyStatsList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pharmacyStatsList.filter(({ pharmacy }) => {
      if (filterMode === '24X7' && !pharmacy.is_24x7) return false;
      if (filterMode === 'DELIVERY' && pharmacy.delivery === false) return false;
      if (filterMode === 'STANDALONE' && Boolean(pharmacy.hospital_id)) return false;
      if (!q) return true;
      return (
        pharmacy.name.toLowerCase().includes(q) ||
        pharmacy.area.toLowerCase().includes(q) ||
        (pharmacy.shop_phone || '').toLowerCase().includes(q) ||
        (pharmacy.drug_license_number || '').toLowerCase().includes(q)
      );
    });
  }, [pharmacyStatsList, searchQuery, filterMode]);

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
            Standalone pharmacies (7d net)
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
            Total Medicine Sales
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(kpis.totalSales)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Across all partner stores
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
            Partner Pharmacies
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {kpis.total}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {kpis.deliveryCount} offer home delivery
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
            24x7 Stores
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {kpis.open24x7}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Round-the-clock availability
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
            placeholder="Search pharmacy name, area, phone, drug license..."
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: '24X7', label: '24x7 Open' },
              { id: 'DELIVERY', label: 'Home Delivery' },
              { id: 'STANDALONE', label: 'Standalone' },
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
            onPress={() => router.push('/admin/pharmacies/add-new' as any)}
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
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>Add Pharmacy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pharmacies List */}
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
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>No Pharmacies Found</Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            Add your first Jaipur partner pharmacy to manage orders and payouts.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {pagedList.map((item) => {
            const p = item.pharmacy;
            const slug = getPharmacySlug(p);
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/admin/pharmacies/${slug}` as any)}
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
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
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
                      <Store size={20} color={THEME.greenPrimary} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>{p.name}</Text>
                      <View
                        style={{
                          backgroundColor: p.is_active === false ? THEME.redBg : THEME.greenSoft,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: p.is_active === false ? THEME.redText : THEME.greenPrimary,
                          }}
                        >
                          {p.is_active === false ? 'PAUSED' : 'ACTIVE'}
                        </Text>
                      </View>
                      {p.is_24x7 && (
                        <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amberText }}>24x7</Text>
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
                        {p.area}, {p.city || 'Jaipur'}
                        {p.shop_phone ? ` · ${p.shop_phone}` : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>DISCOUNT</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.amberText }}>
                      {p.app_discount_pct ?? 12}% OFF
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>DELIVERY</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>
                      {p.delivery !== false ? `${p.delivery_radius_km ?? 5} km` : 'Pickup Only'}
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
        itemLabel="pharmacies"
      />
    </View>
  );
}
