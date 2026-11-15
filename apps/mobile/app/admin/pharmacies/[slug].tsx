import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital } from '@adityam/types';
import { AdminSidebar, AdminNavSection } from '../../../components/admin/AdminSidebar';
import { PharmacyDetailView } from '../../../components/admin/pharmacies/PharmacyDetailView';
import {
  ExtendedPharmacy,
  PharmacyPayout,
  PharmacyStats,
  getPharmacySlug,
} from '../../../components/admin/pharmacies/pharmacyTheme';

export default function PharmacySlugScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pharmacy, setPharmacy] = useState<ExtendedPharmacy | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts] = useState<PharmacyPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [pharmRes, hospRes, bookRes, payoutRes] = await Promise.all([
        supabase.from('pharmacies').select('*'),
        supabase.from('hospitals').select('id, name'),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(250),
        supabase.from('pharmacy_payouts').select('*').order('created_at', { ascending: false }),
      ]);

      if (hospRes.data) setHospitals(hospRes.data as Hospital[]);
      if (bookRes.data) setBookings(bookRes.data as Booking[]);
      if (payoutRes.data) setPayouts(payoutRes.data as PharmacyPayout[]);

      if (pharmRes.data && typeof slug === 'string') {
        const found = (pharmRes.data as ExtendedPharmacy[]).find(
          (p) => getPharmacySlug(p) === slug || p.id === slug
        );
        setPharmacy(found || null);
      }
    } catch {
      // Ignore load errors
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats: PharmacyStats | null = useMemo(() => {
    if (!pharmacy) return null;
    const now = new Date();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lowerName = pharmacy.name.toLowerCase();
    const matching = bookings.filter(
      (b) =>
        b.service_type === 'PHARMACY_SCAN_PAY' &&
        (b.hospital_id === pharmacy.id || (b.hospital_name || '').toLowerCase() === lowerName)
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

    const commRate = (pharmacy.commission_percentage ?? 10) / 100;
    const weeklyNetTotal = Math.round(weeklyGross * (1 - commRate));
    const pPayouts = payouts.filter((p) => p.pharmacy_id === pharmacy.id && p.status === 'PAID');
    const paidThisWeek = pPayouts
      .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= sevenDaysAgo)
      .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
    const monthlyPaid = pPayouts
      .filter((p) => new Date(p.paid_at || p.created_at).getTime() >= monthStart)
      .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);

    const linkedHosp = pharmacy.hospital_id
      ? hospitals.find((h) => h.id === pharmacy.hospital_id)?.name || null
      : null;

    return {
      pharmacy,
      linkedHospitalName: linkedHosp,
      totalBookings: matching.length,
      confirmedCount,
      missedCount,
      cancelledCount,
      grossEarnings,
      weeklyGross,
      weeklyPayoutDue: Math.max(0, weeklyNetTotal - paidThisWeek),
      weeklyBookingsCount,
      paidThisWeek,
      monthlyGross,
      monthlyBookingsCount,
      monthlyPaid,
      totalDiscountGiven,
    };
  }, [pharmacy, hospitals, bookings, payouts]);

  const handleSelectSection = (sec: AdminNavSection) => {
    router.replace(`/admin?section=${sec}` as any);
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#FAF8F2' }}>
      <AdminSidebar
        activeSection="pharmacies"
        onSelectSection={handleSelectSection}
        isDesktop={isDesktop}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenPatientApp={() => router.push('/(tabs)')}
        counts={{
          totalBookings: bookings.length,
          pendingRx: 0,
          hospitals: hospitals.length,
          labs: 5,
          pharmacies: 0,
          patients: 0,
        }}
        realtimeConnected={true}
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        {!isDesktop && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E6E1D5',
            }}
          >
            <TouchableOpacity onPress={() => setMobileMenuOpen(true)}>
              <Menu size={20} color="#1A2421" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A2421' }}>
              {pharmacy?.name || 'Pharmacy Detail'}
            </Text>
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isDesktop ? 28 : 16, paddingBottom: 60 }}>
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1B5E43" />
              <Text style={{ marginTop: 10, color: '#5C6B64', fontSize: 13 }}>Loading pharmacy...</Text>
            </View>
          ) : !stats ? (
            <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#14362B' }}>Pharmacy Not Found</Text>
              <TouchableOpacity
                onPress={() => router.replace('/admin?section=pharmacies' as any)}
                style={{
                  backgroundColor: '#1B5E43',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Back to Pharmacies</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PharmacyDetailView
              stats={stats}
              bookings={bookings}
              onBack={() => router.replace('/admin?section=pharmacies' as any)}
              onUpdated={loadData}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
