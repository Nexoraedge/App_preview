import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
  Alert,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Edit3,
  FlaskConical,
  Search,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import {
  THEME,
  LabStats,
  LabItem,
  LabCentrePrice,
  LabPayout,
  formatInr,
  getLabSlug,
} from './labTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { SelectDropdown } from '../SelectDropdown';
import { WeeklyScheduleDisplay } from '../WeeklyScheduleEditor';

type LabTab = 'overview' | 'catalog' | 'ledger';

interface LabDetailViewProps {
  stats: LabStats;
  bookings: Booking[];
  onBack: () => void;
  onUpdated: () => Promise<void>;
}

export function LabDetailView({
  stats,
  bookings,
  onBack,
  onUpdated,
}: LabDetailViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const centre = stats.centre;
  const labSlug = getLabSlug(centre);
  const isHospitalLinked = Boolean(centre.hospital_id);

  const [activeTab, setActiveTab] = useState<LabTab>('overview');
  const [payouts, setPayouts] = useState<LabPayout[]>([]);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [isSettlingPayout, setIsSettlingPayout] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<'ALL' | 'CONFIRMED' | 'MISSED' | 'CANCELLED'>('ALL');

  // Catalog (lab_items + lab_centre_prices)
  const [labItems, setLabItems] = useState<LabItem[]>([]);
  const [centrePrices, setCentrePrices] = useState<Record<string, LabCentrePrice>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'lab' | 'scan' | 'package'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  // Booking collector & report tracking drafts
  const [bookingDrafts, setBookingDrafts] = useState<
    Record<string, { collectorName: string; collectorPhone: string; reportUrl: string; reportStatus: string }>
  >({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);

  // Add new test/scan modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSegment, setNewItemSegment] = useState<'lab' | 'scan' | 'package'>('lab');
  const [newItemCategory, setNewItemCategory] = useState('Pathology');
  const [newItemBasePrice, setNewItemBasePrice] = useState('500');
  const [newItemReportHrs, setNewItemReportHrs] = useState('12');
  const [creatingItem, setCreatingItem] = useState(false);

  const effectiveTab: LabTab = isHospitalLinked && activeTab === 'ledger' ? 'overview' : activeTab;

  const TABS: { id: LabTab; label: string }[] = [
    { id: 'overview', label: 'Overview & Home Checkups' },
    { id: 'catalog', label: `Tests, Scans & Pricing (${labItems.length})` },
    ...(!isHospitalLinked
      ? [{ id: 'ledger' as LabTab, label: `Bookings & Payouts (${stats.totalBookings})` }]
      : []),
  ];

  const loadCatalogAndPayouts = async () => {
    try {
      const supabase = getSupabaseClient();
      const [itemsRes, pricesRes, payoutsRes] = await Promise.all([
        supabase.from('lab_items').select('*').order('popular', { ascending: false }).order('name'),
        supabase.from('lab_centre_prices').select('*').eq('centre_id', centre.id),
        supabase
          .from('lab_payouts')
          .select('*')
          .eq('centre_id', centre.id)
          .order('created_at', { ascending: false }),
      ]);

      if (itemsRes.data) setLabItems(itemsRes.data as LabItem[]);
      if (pricesRes.data) {
        const map: Record<string, LabCentrePrice> = {};
        const drafts: Record<string, string> = {};
        for (const p of pricesRes.data as LabCentrePrice[]) {
          map[p.item_id] = p;
          drafts[p.item_id] = String(p.price);
        }
        setCentrePrices(map);
        setPriceDrafts(drafts);
      }
      if (payoutsRes.data) setPayouts(payoutsRes.data as LabPayout[]);
    } catch {
      // Ignore optional table errors
    }
  };

  useEffect(() => {
    loadCatalogAndPayouts();
  }, [centre.id]);

  const handleToggleActive = async () => {
    const nextVal = centre.is_active === false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('lab_centres')
        .update({ is_active: nextVal })
        .eq('id', centre.id);
      if (error) Alert.alert('Update Failed', error.message);
      else await onUpdated();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update status.');
    }
  };

  const handleSaveCentrePrice = async (item: LabItem, nextAvailable?: boolean) => {
    setSavingItemId(item.id);
    const existing = centrePrices[item.id];
    const priceVal = Number(priceDrafts[item.id] ?? existing?.price ?? item.base_price) || item.base_price;
    const isAvail = nextAvailable !== undefined ? nextAvailable : (existing ? existing.is_available : true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('lab_centre_prices')
        .upsert(
          {
            item_id: item.id,
            centre_id: centre.id,
            price: priceVal,
            is_available: isAvail,
          },
          { onConflict: 'item_id,centre_id' }
        )
        .select()
        .single();

      if (error) {
        Alert.alert('Save Error', error.message);
      } else if (data) {
        const saved = data as LabCentrePrice;
        setCentrePrices((prev) => ({ ...prev, [item.id]: saved }));
        setPriceDrafts((prev) => ({ ...prev, [item.id]: String(saved.price) }));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update item price.');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleBulkSyncPrices = async () => {
    if (labItems.length === 0) return;
    setIsBulkSyncing(true);
    const discPct = centre.discount_percentage ?? 20;
    const rows = labItems.map((item) => ({
      item_id: item.id,
      centre_id: centre.id,
      price: Math.max(10, Math.round(item.base_price * (1 - discPct / 100))),
      is_available: centrePrices[item.id] ? centrePrices[item.id].is_available : true,
    }));

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('lab_centre_prices')
        .upsert(rows, { onConflict: 'item_id,centre_id' });
      if (error) {
        Alert.alert('Bulk Sync Failed', error.message);
      } else {
        await loadCatalogAndPayouts();
        Alert.alert('Prices Synced', `Updated ${rows.length} tests/scans at ${discPct}% off MRP.`);
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Could not bulk sync prices.');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleSaveBookingTracking = async (b: Booking, nextReportStatus?: string) => {
    setSavingBookingId(b.id);
    const bAny = b as any;
    const draft = bookingDrafts[b.id] || {
      collectorName: bAny.collector_name || '',
      collectorPhone: bAny.collector_phone || '',
      reportUrl: bAny.report_url || '',
      reportStatus: bAny.report_status || 'PENDING',
    };
    const finalStatus = nextReportStatus || draft.reportStatus || 'PENDING';
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          collector_name: draft.collectorName.trim() || null,
          collector_phone: draft.collectorPhone.trim() || null,
          report_url: draft.reportUrl.trim() || null,
          report_status: finalStatus,
        })
        .eq('id', b.id);

      if (error && !isMissingColumnError(error)) {
        Alert.alert('Update Failed', error.message);
      } else {
        setBookingDrafts((prev) => ({
          ...prev,
          [b.id]: { ...draft, reportStatus: finalStatus },
        }));
        await onUpdated();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update booking tracking.');
    } finally {
      setSavingBookingId(null);
    }
  };

  const handleCreateLabItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Missing Name', 'Please enter Test / Scan / Package Name.');
      return;
    }
    setCreatingItem(true);
    try {
      const supabase = getSupabaseClient();
      const newId = `${newItemSegment}-${Date.now()}`;
      const basePriceNum = Number(newItemBasePrice) || 500;
      const { data: itemData, error: itemErr } = await supabase
        .from('lab_items')
        .insert({
          id: newId,
          name: newItemName.trim(),
          name_hi: newItemName.trim(),
          segment: newItemSegment,
          category: newItemCategory.trim() || 'Diagnostics',
          report_hrs: Number(newItemReportHrs) || 12,
          base_price: basePriceNum,
          is_active: true,
          popular: false,
        })
        .select()
        .single();

      if (itemErr) throw itemErr;

      await supabase.from('lab_centre_prices').upsert(
        {
          item_id: newId,
          centre_id: centre.id,
          price: basePriceNum,
          is_available: true,
        },
        { onConflict: 'item_id,centre_id' }
      );

      setLabItems((prev) => [itemData as LabItem, ...prev]);
      setShowAddItemModal(false);
      setNewItemName('');
      await loadCatalogAndPayouts();
    } catch (err: any) {
      Alert.alert('Create Failed', err?.message || 'Could not add test/scan.');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleMarkWeeklyPayoutPaid = async () => {
    if (stats.weeklyPayoutDue <= 0) {
      Alert.alert('No Payout Due', 'There are no pending lab bookings in the last 7 days.');
      return;
    }
    setIsSettlingPayout(true);
    try {
      const supabase = getSupabaseClient();
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      const commissionRate = (centre.commission_percentage ?? 12) / 100;
      const commissionAmt = Math.round(stats.weeklyGross * commissionRate);

      const { error } = await supabase.from('lab_payouts').insert({
        centre_id: centre.id,
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
        await loadCatalogAndPayouts();
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
    if (centre.latitude && centre.longitude) {
      Linking.openURL(`https://maps.google.com/?q=${centre.latitude},${centre.longitude}`).catch(() => {});
    } else {
      Linking.openURL(
        `https://maps.google.com/?q=${encodeURIComponent(`${centre.name} ${centre.area} ${centre.city || 'Jaipur'}`)}`
      ).catch(() => {});
    }
  };

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return labItems.filter((item) => {
      if (segmentFilter !== 'ALL' && item.segment !== segmentFilter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [labItems, segmentFilter, catalogSearch]);

  const labBookings = useMemo(() => {
    const lowerName = centre.name.toLowerCase();
    return bookings.filter(
      (b) =>
        (b.service_type === 'INVESTIGATION' || (b.service_type as string) === 'LAB_TEST') &&
        (b.hospital_id === centre.id ||
          (Boolean(centre.hospital_id) && b.hospital_id === centre.hospital_id) ||
          (b.hospital_name || '').toLowerCase() === lowerName)
    );
  }, [bookings, centre.id, centre.hospital_id, centre.name]);

  const filteredBookings = useMemo(() => {
    return labBookings.filter((b) => {
      if (ledgerStatus === 'CONFIRMED') {
        return ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED', 'SAMPLE_COLLECTED', 'PROCESSING'].includes(b.status);
      }
      if (ledgerStatus !== 'ALL') return b.status === ledgerStatus;
      return true;
    });
  }, [labBookings, ledgerStatus]);

  const inputStyle = {
    backgroundColor: THEME.creamBg,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 13,
    color: THEME.ink,
  } as const;

  const offers = Array.isArray(centre.offers) ? centre.offers : ['lab'];

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

          {centre.image_url ? (
            <Image
              source={{ uri: centre.image_url }}
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
              <FlaskConical size={20} color={THEME.greenPrimary} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17.5, fontWeight: '800', color: THEME.ink }}>{centre.name}</Text>
              <View
                style={{
                  backgroundColor: centre.is_active === false ? THEME.redBg : THEME.greenSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: centre.is_active === false ? THEME.redText : THEME.greenPrimary,
                  }}
                >
                  {centre.is_active === false ? 'PAUSED' : 'ACTIVE'}
                </Text>
              </View>
              {centre.nabl_certified !== false && (
                <View style={{ backgroundColor: THEME.blueBg, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.blueText }}>NABL</Text>
                </View>
              )}
              {centre.home_collection !== false && (
                <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>HOME CHECKUP</Text>
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
              {centre.area}, {centre.city || 'Jaipur'} · Offers: {offers.join(', ').toUpperCase()}
              {centre.license_number ? ` · ${centre.license_number}` : ''}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              {Boolean(centre.phone) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>{centre.phone}</Text>
                </View>
              )}
              <TouchableOpacity onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                  Centre Location · Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleToggleActive}
          style={{
            backgroundColor: centre.is_active === false ? THEME.greenSoft : THEME.redBg,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 9,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: centre.is_active === false ? THEME.greenPrimary : THEME.redText,
            }}
          >
            {centre.is_active === false ? 'Mark Active' : 'Pause Centre'}
          </Text>
        </TouchableOpacity>
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
              : `${stats.weeklyBookingsCount} bookings (7d, ${100 - (centre.commission_percentage ?? 12)}% net)`}
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
            {stats.totalBookings} total bookings
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
            Completed vs Missed
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
            {centre.discount_percentage ?? 20}% OFF
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {formatInr(stats.totalDiscountGiven)} saved by patients
          </Text>
        </View>
      </View>

      {/* Sub-Tabs */}
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

      {/* TAB 1: OVERVIEW & HOME CHECKUPS */}
      {effectiveTab === 'overview' && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>Centre Summary</Text>
            <TouchableOpacity
              onPress={() => router.push(`/admin/labs/add-new?editSlug=${labSlug}` as any)}
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
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Edit Lab Centre</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
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
                Capabilities & Operating Hours
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {offers.map((cap) => (
                  <View key={cap} style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenPrimary }}>
                      {cap === 'lab'
                        ? 'Pathology / Blood Labs'
                        : cap === 'scan'
                        ? 'Scans & MRI / CT / X-Ray'
                        : 'Health Checkup Packages'}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 130 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>NABL / LICENSE</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {centre.license_number || (centre.nabl_certified !== false ? 'NABL Certified' : '—')}
                  </Text>
                </View>
                <View style={{ minWidth: 100 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>REPORT TIME</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {centre.report_turnaround_hrs ?? 12} hrs
                  </Text>
                </View>
                <View style={{ minWidth: 90 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>COMMISSION</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                    {centre.commission_percentage ?? 12}%
                  </Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>CENTRE HOURS</Text>
                <WeeklyScheduleDisplay
                  schedule={centre.weekly_schedule}
                  is24x7={Boolean(centre.is_24x7)}
                />
              </View>
            </View>

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
                Home Sample Collection & Contacts
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>BOOKING DESK</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {centre.phone || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>HOME SAMPLE TEAM</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {centre.secondary_phone || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>CENTRE ADDRESS</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {centre.address || `${centre.area}, ${centre.city || 'Jaipur'}`}
                  {centre.pincode ? ` - ${centre.pincode}` : ''}
                </Text>
              </View>

              {centre.home_collection !== false ? (
                <View
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenPrimary }}>
                    ✓ Home Sample Collection Enabled
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.ink }}>
                    Radius: {centre.home_collection_radius_km ?? 10} km · Fee: {formatInr(centre.home_collection_fee ?? 0)} (Free ≥ {formatInr(centre.free_home_collection_above ?? 499)})
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                    Slots: {centre.home_collection_slots || '6:30 AM - 11:00 AM, 4:00 PM - 7:30 PM'}
                  </Text>
                  {Boolean(centre.home_collection_pincodes) && (
                    <Text style={{ fontSize: 11.5, color: THEME.ink, fontWeight: '600' }}>
                      Pincodes / Zones: {centre.home_collection_pincodes}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ backgroundColor: THEME.creamSoft, padding: 10, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                    Walk-In Centre Only (No Home Collection)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* TAB 2: TESTS, SCANS & PRICING */}
      {effectiveTab === 'catalog' && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 18,
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
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Tests, Scans & Centre Pricing
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Toggle availability and customize prices for {centre.name}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                disabled={isBulkSyncing || labItems.length === 0}
                onPress={handleBulkSyncPrices}
                style={{
                  backgroundColor: THEME.creamSoft,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: THEME.ink, fontSize: 12, fontWeight: '700' }}>
                  {isBulkSyncing
                    ? 'Syncing...'
                    : `Auto-Fill (-${centre.discount_percentage ?? 20}% MRP)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAddItemModal(true)}
                style={{
                  backgroundColor: THEME.greenPrimary,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Add Test / Scan</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, alignItems: isDesktop ? 'center' : 'stretch' }}>
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
              <Search size={14} color={THEME.muted} />
              <TextInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder="Search CBC, MRI, CT, Full Body Checkup..."
                placeholderTextColor={THEME.muted}
                style={{ flex: 1, paddingVertical: 8, fontSize: 12.5, color: THEME.ink }}
              />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'lab', label: 'Lab Tests' },
                  { id: 'scan', label: 'Scans & MRI' },
                  { id: 'package', label: 'Packages' },
                ] as const
              ).map((seg) => {
                const active = segmentFilter === seg.id;
                return (
                  <TouchableOpacity
                    key={seg.id}
                    onPress={() => setSegmentFilter(seg.id)}
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
                      {seg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {filteredCatalog.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center', paddingVertical: 20 }}>
              No lab tests or scans match your filter.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredCatalog.map((item) => {
                const priceRec = centrePrices[item.id];
                const isAvail = priceRec ? priceRec.is_available : true;
                const draftPrice = priceDrafts[item.id] ?? String(priceRec?.price ?? item.base_price);
                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: isAvail ? THEME.creamBg : '#F6F4EE',
                      borderRadius: 11,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      flexDirection: isDesktop ? 'row' : 'column',
                      alignItems: isDesktop ? 'center' : 'flex-start',
                      justifyContent: 'space-between',
                      gap: 10,
                      opacity: isAvail ? 1 : 0.65,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>{item.name}</Text>
                        <View style={{ backgroundColor: THEME.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: THEME.border }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>
                            {item.segment.toUpperCase()} · {item.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        Base MRP: {formatInr(item.base_price)} · Report: {item.report_hrs}h
                        {item.fasting_hrs ? ` · Fasting: ${item.fasting_hrs}h` : ''}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        disabled={savingItemId === item.id}
                        onPress={() => handleSaveCentrePrice(item, !isAvail)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 7,
                          backgroundColor: isAvail ? THEME.greenSoft : THEME.redBg,
                          borderWidth: 1,
                          borderColor: isAvail ? THEME.greenPrimary : THEME.redText,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: isAvail ? THEME.greenPrimary : THEME.redText,
                          }}
                        >
                          {isAvail ? 'Available' : 'Unavailable'}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        value={draftPrice}
                        onChangeText={(v) => setPriceDrafts((prev) => ({ ...prev, [item.id]: v }))}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: THEME.surface,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          width: 86,
                          fontSize: 13,
                          fontWeight: '700',
                          color: THEME.ink,
                        }}
                      />

                      <TouchableOpacity
                        disabled={savingItemId === item.id}
                        onPress={() => handleSaveCentrePrice(item)}
                        style={{
                          backgroundColor: THEME.greenPrimary,
                          paddingHorizontal: 11,
                          paddingVertical: 7.5,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={13} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                          {savingItemId === item.id ? '...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: BOOKINGS & PAYOUTS */}
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
                  {stats.monthlyBookingsCount} bookings this month
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: THEME.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.border }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PAID THIS MONTH</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.greenPrimary, marginTop: 4 }}>
                  {formatInr(stats.monthlyPaid)}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  Total settled to centre this month
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
                  Net after {centre.commission_percentage ?? 12}% platform fee · Last 7 days
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
              Lab & Scan Bookings ({filteredBookings.length})
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
                No lab or scan bookings recorded for this centre yet.
              </Text>
            ) : (
              filteredBookings.map((b) => {
                const bAny = b as any;
                const draft = bookingDrafts[b.id] || {
                  collectorName: bAny.collector_name || '',
                  collectorPhone: bAny.collector_phone || '',
                  reportUrl: bAny.report_url || '',
                  reportStatus: bAny.report_status || 'PENDING',
                };
                return (
                  <View
                    key={b.id}
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderRadius: 11,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                          #{b.booking_ref} · {b.patient_name} ({b.patient_phone})
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                          {new Date(b.created_at).toLocaleDateString('en-IN')} · {b.slot_time || 'Walk-in / Home Visit'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary }}>
                          {formatInr(b.final_payable || b.bill_amount || b.doctor_fee || 0)}
                        </Text>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>{b.status}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 8 }}>
                      <TextInput
                        value={draft.collectorName}
                        onChangeText={(v) =>
                          setBookingDrafts((prev) => ({ ...prev, [b.id]: { ...draft, collectorName: v } }))
                        }
                        placeholder="Phlebotomist / Collector Name"
                        style={[inputStyle, { flex: 1, backgroundColor: THEME.surface, paddingVertical: 7 }]}
                      />
                      <TextInput
                        value={draft.collectorPhone}
                        onChangeText={(v) =>
                          setBookingDrafts((prev) => ({ ...prev, [b.id]: { ...draft, collectorPhone: v } }))
                        }
                        placeholder="Collector Phone"
                        style={[inputStyle, { flex: 0.9, backgroundColor: THEME.surface, paddingVertical: 7 }]}
                      />
                      <TextInput
                        value={draft.reportUrl}
                        onChangeText={(v) =>
                          setBookingDrafts((prev) => ({ ...prev, [b.id]: { ...draft, reportUrl: v } }))
                        }
                        placeholder="Report PDF URL"
                        style={[inputStyle, { flex: 1.3, backgroundColor: THEME.surface, paddingVertical: 7 }]}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {(['PENDING', 'READY', 'SENT'] as const).map((rStatus) => {
                          const active = draft.reportStatus === rStatus;
                          return (
                            <TouchableOpacity
                              key={rStatus}
                              onPress={() => handleSaveBookingTracking(b, rStatus)}
                              style={{
                                paddingHorizontal: 9,
                                paddingVertical: 5,
                                borderRadius: 6,
                                backgroundColor: active ? THEME.greenPrimary : THEME.surface,
                                borderWidth: 1,
                                borderColor: active ? THEME.greenPrimary : THEME.border,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.muted }}>
                                Report: {rStatus}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const digits = (b.patient_phone || '').replace(/[^\d]/g, '');
                            const msg = encodeURIComponent(
                              `Hello ${b.patient_name}, your lab report from ${centre.name} (Ref #${b.booking_ref}) is ready.${draft.reportUrl ? ` View here: ${draft.reportUrl}` : ''}`
                            );
                            Linking.openURL(`https://wa.me/${digits}?text=${msg}`).catch(() => {});
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 7,
                            backgroundColor: THEME.creamSoft,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.ink }}>WhatsApp Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={savingBookingId === b.id}
                          onPress={() => handleSaveBookingTracking(b)}
                          style={{
                            paddingHorizontal: 11,
                            paddingVertical: 6,
                            borderRadius: 7,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenPrimary,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenPrimary }}>
                            {savingBookingId === b.id ? 'Saving...' : 'Save Tracking'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* Add New Test / Scan Modal */}
      <Modal
        visible={showAddItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <Pressable
          onPress={() => setShowAddItemModal(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 14,
                backgroundColor: THEME.creamBg,
                borderBottomWidth: 1,
                borderBottomColor: THEME.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Add Test / Scan / Package
              </Text>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18, gap: 12 }}>
              <SelectDropdown
                label="Type"
                value={newItemSegment}
                options={[
                  { value: 'lab', label: 'Pathology / Blood Lab Test' },
                  { value: 'scan', label: 'Scan / Imaging (MRI, CT, X-Ray)' },
                  { value: 'package', label: 'Full Body Checkup Package' },
                ]}
                onChange={(v) => setNewItemSegment(v as 'lab' | 'scan' | 'package')}
              />

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Test / Scan Name *
                </Text>
                <TextInput
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="e.g. MRI Brain Plain / CBC Complete"
                  style={inputStyle}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Category
                </Text>
                <TextInput
                  value={newItemCategory}
                  onChangeText={setNewItemCategory}
                  placeholder="Pathology / MRI / X-Ray / Cardiac"
                  style={inputStyle}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Price (₹)
                  </Text>
                  <TextInput
                    value={newItemBasePrice}
                    onChangeText={setNewItemBasePrice}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Report Time (hrs)
                  </Text>
                  <TextInput
                    value={newItemReportHrs}
                    onChangeText={setNewItemReportHrs}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
              </View>

              <TouchableOpacity
                disabled={creatingItem}
                onPress={handleCreateLabItem}
                style={{
                  backgroundColor: THEME.greenPrimary,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {creatingItem ? 'Adding...' : 'Add & Enable for This Centre'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
