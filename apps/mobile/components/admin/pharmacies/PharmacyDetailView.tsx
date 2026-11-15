import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Phone, Edit3, Store } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import {
  THEME,
  PharmacyStats,
  PharmacyPayout,
  formatInr,
  getPharmacySlug,
} from './pharmacyTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { WeeklyScheduleDisplay } from '../WeeklyScheduleEditor';

type PharmacyTab = 'overview' | 'ledger';

interface PharmacyDetailViewProps {
  stats: PharmacyStats;
  bookings: Booking[];
  onBack: () => void;
  onUpdated: () => Promise<void>;
}

export function PharmacyDetailView({
  stats,
  bookings,
  onBack,
  onUpdated,
}: PharmacyDetailViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const pharm = stats.pharmacy;
  const pharmSlug = getPharmacySlug(pharm);
  const isHospitalLinked = Boolean(pharm.hospital_id);

  const [activeTab, setActiveTab] = useState<PharmacyTab>('overview');
  const [payouts, setPayouts] = useState<PharmacyPayout[]>([]);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [isSettlingPayout, setIsSettlingPayout] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<'ALL' | 'CONFIRMED' | 'MISSED' | 'CANCELLED'>('ALL');

  const effectiveTab: PharmacyTab = isHospitalLinked && activeTab === 'ledger' ? 'overview' : activeTab;

  const TABS: { id: PharmacyTab; label: string }[] = [
    { id: 'overview', label: 'Overview & Store' },
    ...(!isHospitalLinked
      ? [{ id: 'ledger' as PharmacyTab, label: `Orders & Payouts (${stats.totalBookings})` }]
      : []),
  ];

  useEffect(() => {
    let active = true;
    const loadPayouts = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('pharmacy_payouts')
          .select('*')
          .eq('pharmacy_id', pharm.id)
          .order('created_at', { ascending: false });
        if (data && active) setPayouts(data as PharmacyPayout[]);
      } catch {
        // Table may not exist yet
      }
    };
    loadPayouts();
    return () => {
      active = false;
    };
  }, [pharm.id]);

  const handleToggleActive = async () => {
    const nextVal = pharm.is_active === false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('pharmacies')
        .update({ is_active: nextVal })
        .eq('id', pharm.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
      } else {
        await onUpdated();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update pharmacy status.');
    }
  };

  const handleMarkWeeklyPayoutPaid = async () => {
    if (stats.weeklyPayoutDue <= 0) {
      Alert.alert('No Payout Due', 'There are no pending medicine orders in the last 7 days.');
      return;
    }
    setIsSettlingPayout(true);
    try {
      const supabase = getSupabaseClient();
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      const commissionRate = (pharm.commission_percentage ?? 10) / 100;
      const commissionAmt = Math.round(stats.weeklyGross * commissionRate);

      const { error } = await supabase.from('pharmacy_payouts').insert({
        pharmacy_id: pharm.id,
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        gross_amount: stats.weeklyGross,
        commission_amount: commissionAmt,
        net_payout_amount: stats.weeklyPayoutDue,
        status: 'PAID',
        payment_ref: payoutRefInput.trim() || `UTR-${Date.now().toString().slice(-6)}`,
        paid_at: new Date().toISOString(),
      });

      if (error && !isMissingColumnError(error)) {
        Alert.alert('Payout Error', error.message);
      } else {
        setPayoutRefInput('');
        const { data } = await supabase
          .from('pharmacy_payouts')
          .select('*')
          .eq('pharmacy_id', pharm.id)
          .order('created_at', { ascending: false });
        if (data) setPayouts(data as PharmacyPayout[]);
        await onUpdated();
        Alert.alert('Payout Recorded', `Marked ${formatInr(stats.weeklyPayoutDue)} as PAID.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not record payout.');
    } finally {
      setIsSettlingPayout(false);
    }
  };

  const openMaps = () => {
    if (pharm.latitude && pharm.longitude) {
      Linking.openURL(`https://maps.google.com/?q=${pharm.latitude},${pharm.longitude}`).catch(() => {});
    } else {
      Linking.openURL(
        `https://maps.google.com/?q=${encodeURIComponent(`${pharm.name} ${pharm.area} ${pharm.city || 'Jaipur'}`)}`
      ).catch(() => {});
    }
  };

  const pharmBookings = useMemo(() => {
    const lowerName = pharm.name.toLowerCase();
    return bookings.filter(
      (b) =>
        b.service_type === 'PHARMACY_SCAN_PAY' &&
        (b.hospital_id === pharm.id || (b.hospital_name || '').toLowerCase() === lowerName)
    );
  }, [bookings, pharm.id, pharm.name]);

  const filteredBookings = useMemo(() => {
    return pharmBookings.filter((b) => {
      if (ledgerStatus === 'CONFIRMED') {
        return ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status);
      }
      if (ledgerStatus !== 'ALL') return b.status === ledgerStatus;
      return true;
    });
  }, [pharmBookings, ledgerStatus]);

  return (
    <View style={{ gap: 16 }}>
      {/* Header Card */}
      <View
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
          <TouchableOpacity
            onPress={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              backgroundColor: THEME.creamSoft,
              borderWidth: 1,
              borderColor: THEME.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={16} color={THEME.ink} />
          </TouchableOpacity>

          {pharm.image_url ? (
            <Image
              source={{ uri: pharm.image_url }}
              style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: THEME.creamSoft }}
              resizeMode="cover"
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17.5, fontWeight: '800', color: THEME.ink }}>{pharm.name}</Text>
              <View
                style={{
                  backgroundColor: pharm.is_active === false ? THEME.redBg : THEME.greenSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: pharm.is_active === false ? THEME.redText : THEME.greenPrimary,
                  }}
                >
                  {pharm.is_active === false ? 'PAUSED' : 'ACTIVE'}
                </Text>
              </View>
              {pharm.is_24x7 && (
                <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>24x7 OPEN</Text>
                </View>
              )}
              {Boolean(stats.linkedHospitalName) && (
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.ink }}>
                    In-House: {stats.linkedHospitalName}
                  </Text>
                </View>
              )}
            </View>

            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
              {pharm.area}, {pharm.city || 'Jaipur'}
              {pharm.drug_license_number ? ` · DL: ${pharm.drug_license_number}` : ''}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              {Boolean(pharm.shop_phone) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>{pharm.shop_phone}</Text>
                </View>
              )}
              <TouchableOpacity onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                  Store Location · Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleToggleActive}
            style={{
              backgroundColor: pharm.is_active === false ? THEME.greenSoft : THEME.redBg,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 9,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: pharm.is_active === false ? THEME.greenPrimary : THEME.redText,
              }}
            >
              {pharm.is_active === false ? 'Mark Active' : 'Pause Store'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
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
            {isHospitalLinked
              ? 'Payout Settlement'
              : stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0
              ? 'This Week Settled'
              : 'This Week Payout Due'}
          </Text>
          <Text
            style={{
              fontSize: isHospitalLinked ? 18 : 24,
              fontWeight: '900',
              color: '#FAF8F2',
              marginTop: 6,
            }}
          >
            {isHospitalLinked
              ? 'Handled via Hospital'
              : stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0
              ? `PAID · ${formatInr(stats.paidThisWeek)}`
              : formatInr(stats.weeklyPayoutDue)}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            {isHospitalLinked
              ? stats.linkedHospitalName || 'Settled in Hospital module'
              : `${stats.weeklyBookingsCount} orders (7d, ${100 - (pharm.commission_percentage ?? 10)}% net)`}
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
            Total Gross Sales
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(stats.grossEarnings)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.totalBookings} total orders
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
            Delivered vs Missed
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {stats.confirmedCount} / {stats.missedCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.cancelledCount} cancelled
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
            App Discount
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {pharm.app_discount_pct ?? 12}% OFF
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {formatInr(stats.totalDiscountGiven)} saved by patients
          </Text>
        </View>
      </View>

      {/* Clean Sub-Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((tab) => {
          const isActive = effectiveTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: isActive ? THEME.greenDark : THEME.surface,
                borderWidth: 1,
                borderColor: isActive ? THEME.greenDark : THEME.border,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: isActive ? '#FAF8F2' : THEME.muted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TAB 1: OVERVIEW & STORE */}
      {effectiveTab === 'overview' && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>Store Summary</Text>
            <TouchableOpacity
              onPress={() => router.push(`/admin/pharmacies/add-new?editSlug=${pharmSlug}` as any)}
              style={{
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 12,
                paddingVertical: 7.5,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Edit3 size={13} color={THEME.ink} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Edit Pharmacy</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            {/* Left Card: License & Timings */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                License & Operating Hours
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>DRUG LICENSE</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {pharm.drug_license_number || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 120 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>GST NUMBER</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {pharm.gst_number || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 90 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>COMMISSION</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                    {pharm.commission_percentage ?? 10}%
                  </Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>STORE HOURS</Text>
                <WeeklyScheduleDisplay
                  schedule={pharm.weekly_schedule}
                  is24x7={Boolean(pharm.is_24x7)}
                />
              </View>
            </View>

            {/* Right Card: Contacts, Location & Delivery */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                Contacts, Address & Delivery Rules
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>STORE PHONE</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {pharm.shop_phone || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ALT / OWNER PHONE</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {pharm.secondary_phone || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>SHOP ADDRESS</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {pharm.shop_address || `${pharm.area}, ${pharm.city || 'Jaipur'}`}
                  {pharm.pincode ? ` - ${pharm.pincode}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={openMaps}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MapPin size={13} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                  Open Store in Google Maps
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Delivery: {pharm.delivery !== false ? `Yes (${pharm.delivery_radius_km ?? 5} km)` : 'No'}
                  </Text>
                </View>
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Store Pickup: {pharm.pickup !== false ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    ETA: {pharm.delivery_time_mins ?? 35} mins · Free ≥ {formatInr(pharm.min_order_free_delivery ?? 299)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* TAB 2: ORDERS & PAYOUTS */}
      {!isHospitalLinked && effectiveTab === 'ledger' && (
        <View style={{ gap: 16 }}>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: THEME.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.border }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>THIS MONTH EARNINGS</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.ink, marginTop: 4 }}>
                  {formatInr(stats.monthlyGross)}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  {stats.monthlyBookingsCount} orders this month
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: THEME.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.border }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PAID THIS MONTH</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.greenPrimary, marginTop: 4 }}>
                  {formatInr(stats.monthlyPaid)}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  Total settled to pharmacy this month
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0 ? THEME.greenSoft : THEME.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0 ? THEME.greenBorder : THEME.border }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>WEEKLY STATUS</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0 ? THEME.greenDark : THEME.amberText, marginTop: 4 }}>
                  {stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0 ? 'PAID ✓' : `${formatInr(stats.weeklyPayoutDue)} DUE`}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  {stats.paidThisWeek > 0 ? `Paid ${formatInr(stats.paidThisWeek)} in last 7d` : 'Awaiting weekly payout'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                justifyContent: 'space-between',
                alignItems: isDesktop ? 'center' : 'flex-start',
                gap: 10,
              }}
            >
              <View>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                  {stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0
                    ? `Weekly Payout Settled (${formatInr(stats.paidThisWeek)} Paid)`
                    : `Weekly Payout (${formatInr(stats.weeklyPayoutDue)})`}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  Net after {pharm.commission_percentage ?? 10}% platform fee · Last 7 days
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={payoutRefInput}
                  onChangeText={setPayoutRefInput}
                  placeholder="UTR / Bank Ref (optional)"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    fontSize: 12.5,
                    color: THEME.ink,
                    width: 190,
                  }}
                />
                <TouchableOpacity
                  onPress={handleMarkWeeklyPayoutPaid}
                  disabled={isSettlingPayout}
                  style={{
                    backgroundColor: THEME.greenPrimary,
                    paddingHorizontal: 14,
                    paddingVertical: 9.5,
                    borderRadius: 9,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                    {isSettlingPayout ? 'Saving...' : 'Mark Paid'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {payouts.length > 0 && (
              <View style={{ gap: 6, marginTop: 4 }}>
                {payouts.slice(0, 4).map((p) => (
                  <View
                    key={p.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 6,
                      borderTopWidth: 1,
                      borderTopColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: THEME.ink, fontWeight: '600' }}>
                      {p.period_start} to {p.period_end} · Ref: {p.payment_ref || '—'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(p.net_payout_amount)} · {p.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
              Medicine Orders Ledger ({filteredBookings.length})
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['ALL', 'CONFIRMED', 'MISSED', 'CANCELLED'] as const).map((st) => {
                const active = ledgerStatus === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setLedgerStatus(st)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 7,
                      backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenPrimary : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: active ? THEME.greenPrimary : THEME.muted,
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredBookings.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center', paddingVertical: 16 }}>
                No medicine orders recorded for this pharmacy yet.
              </Text>
            ) : (
              filteredBookings.map((b) => (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                      #{b.booking_ref} · {b.patient_name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      {new Date(b.created_at).toLocaleDateString('en-IN')} · {b.slot_time || 'Store Pickup / Delivery'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(b.final_payable || b.bill_amount || 0)}
                    </Text>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>{b.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}
