import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Settings,
  Upload,
} from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { playPartnerOrderAlarm } from '../../../src/services/adminAlerts';
import { triggerBrowserNotification } from '../../../src/services/notificationService';
import { LocationPickerInput } from '../../admin/LocationPickerInput';

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

type LabDeskTab = 'queue' | 'services';
type LabFilter = 'ALL_ACTIVE' | 'ACTIVE' | 'COLLECTED' | 'PROCESSING' | 'READY' | 'ALL';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface LabBookingRow {
  id: string;
  booking_ref: string;
  patient_name: string | null;
  patient_phone: string | null;
  hospital_name: string | null;
  branch_name: string | null;
  doctor_name: string | null;
  hospital_id: string | null;
  slot_time: string | null;
  status: string;
  verification_code: string | null;
  doctor_fee: number | null;
  final_payable: number | null;
  notes: string | null;
  bill_image_url: string | null;
  created_at: string;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function PartnerLabsDesk({
  initialTab = 'queue',
  labCentreId,
  hospitalId,
}: {
  initialTab?: LabDeskTab;
  labCentreId?: string | null;
  hospitalId?: string | null;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [deskTab, setDeskTab] = useState<LabDeskTab>(initialTab);
  useEffect(() => {
    setDeskTab(initialTab);
  }, [initialTab]);
  const [bookings, setBookings] = useState<LabBookingRow[]>([]);
  const [centre, setCentre] = useState<any | null>(null);
  const [labItems, setLabItems] = useState<any[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, { price: string; available: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LabFilter>('ALL_ACTIVE');
  const [dateFilter, setDateFilter] = useState<'7D' | 'TODAY' | 'MONTH' | 'ALL'>('7D');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [etaPickerId, setEtaPickerId] = useState<string | null>(null);
  const [otpTargetId, setOtpTargetId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Centre Services & Timings form state
  const [hospitalBranches, setHospitalBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [offers, setOffers] = useState<string[]>(['lab', 'scan']);
  const [is24x7, setIs24x7] = useState(false);
  const [nextSlot, setNextSlot] = useState('08:00 AM - 08:00 PM');
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, d === 'Sunday' ? 'Closed' : '08:00 AM - 08:00 PM']))
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [newCentreName, setNewCentreName] = useState('');
  const [newCentreArea, setNewCentreArea] = useState('');
  const [labAddress, setLabAddress] = useState('');
  const [labCity, setLabCity] = useState('Jaipur');
  const [labPincode, setLabPincode] = useState('');
  const [labPhone, setLabPhone] = useState('');
  const [labLicense, setLabLicense] = useState('');
  const [labLat, setLabLat] = useState('');
  const [labLng, setLabLng] = useState('');

  const loadLabData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      // Load linked lab_centre strictly for this partner (never global/Adityam)
      let cRow: any = null;
      if (labCentreId) {
        const { data } = await supabase.from('lab_centres').select('*').eq('id', labCentreId).maybeSingle();
        cRow = data;
      } else if (hospitalId) {
        const { data } = await supabase.from('lab_centres').select('*').eq('hospital_id', hospitalId).limit(1).maybeSingle();
        cRow = data;
      }
      setCentre(cRow);

      // Strict partner tenant isolation: only fetch bookings belonging to this partner's hospital_id or lab centre name
      const targetHospId = hospitalId || cRow?.hospital_id || null;
      const targetCentreName = String(cRow?.name || '').trim().toLowerCase();
      if (!targetHospId && !targetCentreName) {
        setBookings([]);
      } else {
        let q = supabase
          .from('bookings')
          .select(
            'id, booking_ref, patient_name, patient_phone, hospital_name, branch_name, doctor_name, hospital_id, slot_time, status, verification_code, doctor_fee, final_payable, notes, bill_image_url, created_at'
          )
          .in('service_type', ['INVESTIGATION', 'LAB_TEST'])
          .order('created_at', { ascending: false })
          .limit(150);
        if (targetHospId) {
          q = q.eq('hospital_id', targetHospId);
        } else if (targetCentreName) {
          q = q.ilike('hospital_name', cRow.name);
        }
        const { data: bData } = await q;
        const partnerOnly = ((bData as LabBookingRow[]) || []).filter((b) => {
          const hosp = String(b.hospital_name || '').toLowerCase();
          const ref = String(b.booking_ref || '').toUpperCase();
          return !hosp.includes('adityam') && !ref.includes('LAB-RX');
        });
        setBookings(partnerOnly);
      }

      if (hospitalId) {
        const { data: brData } = await supabase
          .from('hospital_branches')
          .select('*')
          .eq('hospital_id', hospitalId);
        setHospitalBranches((brData as any[]) || []);
      }

      if (cRow) {
        setOffers(Array.isArray(cRow.offers) && cRow.offers.length > 0 ? cRow.offers : ['lab']);
        setIs24x7(Boolean(cRow.is_24x7));
        setNextSlot(cRow.next_slot || '08:00 AM - 08:00 PM');
        setNewCentreName(cRow.name || '');
        setNewCentreArea(cRow.area || '');
        setLabAddress(cRow.address || '');
        setLabCity(cRow.city || 'Jaipur');
        setLabPincode(cRow.pincode || '');
        setLabPhone(cRow.phone || '');
        setLabLicense(cRow.license_number || '');
        setLabLat(typeof cRow.latitude === 'number' ? String(cRow.latitude) : '');
        setLabLng(typeof cRow.longitude === 'number' ? String(cRow.longitude) : '');
        if (cRow.weekly_schedule && typeof cRow.weekly_schedule === 'object') {
          setWeeklySchedule((prev) => ({ ...prev, ...cRow.weekly_schedule }));
        }
      }

      const [{ data: itemsData }, { data: pricesData }] = await Promise.all([
        supabase.from('lab_items').select('*').eq('is_active', true).order('name'),
        cRow
          ? supabase.from('lab_centre_prices').select('*').eq('centre_id', cRow.id)
          : Promise.resolve({ data: [] }),
      ]);
      setLabItems((itemsData as any[]) || []);

      const nextMap: Record<string, { price: string; available: boolean }> = {};
      for (const p of (pricesData as any[]) || []) {
        nextMap[p.item_id] = {
          price: String(p.price ?? ''),
          available: p.is_available !== false,
        };
      }
      setPriceMap(nextMap);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [labCentreId, hospitalId]);

  useEffect(() => {
    void loadLabData();
    const supabase = getSupabaseClient();
    const ch = supabase
      .channel('partner-labs-desk-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          void loadLabData();
          if (payload?.eventType === 'INSERT') {
            const row = payload?.new || {};
            const svc = String(row.service_type || '').toUpperCase();
            const hosp = String(row.hospital_name || '').toLowerCase();
            if ((svc === 'INVESTIGATION' || svc === 'LAB_TEST') && !hosp.includes('adityam')) {
              const msg = `${row.patient_name || 'Patient'} · ${row.doctor_name || 'Lab / Scan'} (#${row.booking_ref || ''})`;
              playPartnerOrderAlarm('New In-Hospital Lab Booking!', msg);
              triggerBrowserNotification('New Lab / Scan Booking', msg);
            }
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadLabData]);

  const stats = useMemo(() => {
    let scheduled = 0;
    let collected = 0;
    let processing = 0;
    let ready = 0;
    let gross = 0;
    for (const b of bookings) {
      const st = String(b.status || '').toUpperCase();
      if (st === 'CANCELLED' || st === 'REJECTED') continue;
      gross += Number(b.final_payable || b.doctor_fee || 0);
      if (st === 'COMPLETED') ready += 1;
      else if (st === 'PROCESSING') processing += 1;
      else if (st === 'SAMPLE_COLLECTED' || st === 'IN_PROGRESS') collected += 1;
      else scheduled += 1;
    }
    return { scheduled, collected, processing, ready, gross };
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const todayStr = new Date().toDateString();
    return bookings.filter((b) => {
      const st = String(b.status || 'PAID').toUpperCase();
      if (filter === 'ALL_ACTIVE' && ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(st)) return false;
      if (filter === 'ACTIVE' && ['COMPLETED', 'CANCELLED', 'REJECTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'PROCESSING'].includes(st)) return false;
      if (filter === 'COLLECTED' && !['SAMPLE_COLLECTED', 'IN_PROGRESS'].includes(st)) return false;
      if (filter === 'PROCESSING' && st !== 'PROCESSING') return false;
      if (filter === 'READY' && st !== 'COMPLETED') return false;

      const ms = new Date(b.created_at).getTime();
      if (dateFilter === '7D' && !Number.isNaN(ms) && ms < sevenDaysAgo) return false;
      if (dateFilter === 'MONTH' && !Number.isNaN(ms) && ms < thirtyDaysAgo) return false;
      if (dateFilter === 'TODAY' && !Number.isNaN(ms) && new Date(ms).toDateString() !== todayStr) return false;

      if (!q) return true;
      return (
        String(b.patient_name || '').toLowerCase().includes(q) ||
        String(b.patient_phone || '').toLowerCase().includes(q) ||
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.doctor_name || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, filter, dateFilter, search]);

  const updateStage = async (b: LabBookingRow, nextStatus: string, etaText?: string) => {
    setBusyId(b.id);
    try {
      const supabase = getSupabaseClient();
      const cleanedNotes = String(b.notes || '').replace(/\s*\|\s*Report ETA:[^|]*/gi, '').trim();
      const nextNotes = etaText ? `${cleanedNotes} | Report ETA: ${etaText}` : cleanedNotes;
      await supabase.from('bookings').update({ status: nextStatus, notes: nextNotes }).eq('id', b.id);
      setEtaPickerId(null);
      await loadLabData();
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadReport = async (b: LabBookingRow) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow photo access to upload the lab report.');
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
      await supabase.from('bookings').update({ bill_image_url: url, status: 'COMPLETED' }).eq('id', b.id);

      const gross = Number(b.final_payable || b.doctor_fee || 0);
      if (centre?.id && gross > 0) {
        const comm = Math.round(gross * 0.1);
        await supabase.from('lab_payouts').insert({
          centre_id: centre.id,
          gross_amount: gross,
          commission_amount: comm,
          net_amount: Math.max(0, gross - comm),
          period_label: `Lab #${b.booking_ref}`,
          status: 'PENDING',
        });
      }

      await loadLabData();
      Alert.alert('Report Uploaded', `Report for #${b.booking_ref} is now live in the patient app.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload report.');
    } finally {
      setBusyId(null);
    }
  };

  const applyBranchToLab = (br: any) => {
    setSelectedBranchId(br.id);
    if (!newCentreName.trim()) {
      setNewCentreName(`${br.name} Diagnostics & Lab`);
    }
    setNewCentreArea(br.area || br.city || '');
    setLabAddress(br.address || '');
    setLabCity(br.city || 'Jaipur');
    setLabPincode(br.pincode || '');
    setLabPhone(br.phone || '');
    if (typeof br.latitude === 'number') setLabLat(String(br.latitude));
    if (typeof br.longitude === 'number') setLabLng(String(br.longitude));
  };

  const handleSaveCentreServices = async () => {
    if (!centre) return;
    setSavingSettings(true);
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('lab_centres')
        .update({
          name: newCentreName.trim() || centre.name,
          area: newCentreArea.trim() || centre.area,
          address: labAddress.trim() || null,
          city: labCity.trim() || 'Jaipur',
          pincode: labPincode.trim() || '302001',
          phone: labPhone.trim() || null,
          license_number: labLicense.trim() || null,
          latitude: labLat ? Number(labLat) : null,
          longitude: labLng ? Number(labLng) : null,
          offers,
          is_24x7: is24x7,
          next_slot: nextSlot.trim() || '08:00 AM - 08:00 PM',
          weekly_schedule: weeklySchedule,
          home_collection: false,
        })
        .eq('id', centre.id);

      // Save configured item availability & prices
      const upserts = Object.entries(priceMap)
        .filter(([, v]) => Number(v.price) > 0)
        .map(([itemId, v]) => ({
          centre_id: centre.id,
          item_id: itemId,
          price: Number(v.price),
          is_available: v.available,
        }));
      if (upserts.length > 0) {
        await supabase.from('lab_centre_prices').upsert(upserts, { onConflict: 'item_id,centre_id' });
      }
      await loadLabData();
      Alert.alert('Saved', 'In-Hospital Lab services, timings & prices updated.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRegisterHospitalLab = async () => {
    if (!newCentreName.trim() || !newCentreArea.trim()) {
      Alert.alert('Required', 'Enter Lab / Hospital Diagnostic Wing Name and Area.');
      return;
    }
    setSavingSettings(true);
    try {
      const supabase = getSupabaseClient();
      const id = `hosp-lab-${Date.now()}`;
      const { error } = await supabase.from('lab_centres').insert({
        id,
        name: newCentreName.trim(),
        area: newCentreArea.trim(),
        address: labAddress.trim() || null,
        city: labCity.trim() || 'Jaipur',
        pincode: labPincode.trim() || '302001',
        phone: labPhone.trim() || null,
        license_number: labLicense.trim() || null,
        latitude: labLat ? Number(labLat) : null,
        longitude: labLng ? Number(labLng) : null,
        hospital_id: hospitalId || null,
        home_collection: false,
        offers,
        is_24x7: is24x7,
        next_slot: nextSlot.trim() || '08:00 AM - 08:00 PM',
        weekly_schedule: weeklySchedule,
        rating: 0,
        reviews: 0,
        is_active: true,
        price_factor: 1,
      });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      await loadLabData();
      Alert.alert('Registered', 'Hospital Lab & Diagnostics Wing created! Now enable your tests & prices below.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Header Banner + Sub-Tab Switcher */}
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
              In-Hospital Labs & Scans Desk
            </Text>
            <Text style={{ fontSize: 12.5, color: THEME.muted }}>
              Manage walk-in hospital lab & scan bookings, 4-digit OTP check-ins, timings & test catalog
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => setDeskTab('queue')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: deskTab === 'queue' ? THEME.greenDark : THEME.bg,
              borderWidth: 1,
              borderColor: deskTab === 'queue' ? THEME.greenDark : THEME.border,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: deskTab === 'queue' ? '#FFFFFF' : THEME.ink }}>
              Walk-in Queue ({stats.scheduled + stats.collected + stats.processing})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDeskTab('services')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: deskTab === 'services' ? THEME.greenDark : THEME.bg,
              borderWidth: 1,
              borderColor: deskTab === 'services' ? THEME.greenDark : THEME.border,
            }}
          >
            <Settings size={13} color={deskTab === 'services' ? '#FFFFFF' : THEME.ink} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: deskTab === 'services' ? '#FFFFFF' : THEME.ink }}>
              Services, Timings & Pricing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={loadLabData}
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
      </View>

      {loading ? (
        <View style={{ padding: 48, alignItems: 'center' }}>
          <ActivityIndicator color={THEME.green} />
        </View>
      ) : !centre ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 16,
            padding: 32,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: THEME.greenSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FlaskConical size={28} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: THEME.ink, textAlign: 'center' }}>
            No Lab or Diagnostics Wing Linked Yet
          </Text>
          <Text style={{ fontSize: 13, color: THEME.muted, textAlign: 'center', maxWidth: 480, lineHeight: 19 }}>
            Link an existing hospital branch or register your standalone diagnostic centre with physical address, GPS coordinates, 7-day timings, and test pricing before receiving walk-in bookings.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/partner/labs/add-new' as any)}
            style={{
              marginTop: 4,
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
              + Register Lab & Diagnostics Wing →
            </Text>
          </TouchableOpacity>
        </View>
      ) : deskTab === 'queue' ? (
        <>
          {/* KPI Strip */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'SCHEDULED VISITS', value: String(stats.scheduled), sub: 'Awaiting walk-in OTP', dark: false },
              { label: 'COLLECTED / PROCESSING', value: String(stats.collected + stats.processing), sub: `${stats.collected} collected · ${stats.processing} in lab`, dark: false },
              { label: 'REPORTS READY', value: String(stats.ready), sub: 'Published online', dark: true },
              { label: 'IN-HOSPITAL GROSS', value: `₹${stats.gross.toLocaleString('en-IN')}`, sub: 'Total walk-in diagnostics', dark: false },
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
                placeholder="Search patient, phone, test/scan name, or #AN-LAB ref..."
                placeholderTextColor="#8B9690"
                style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(
                  [
                    { id: 'ALL_ACTIVE', label: `Active (${stats.scheduled + stats.collected + stats.processing})` },
                    { id: 'ACTIVE', label: `Scheduled (${stats.scheduled})` },
                    { id: 'COLLECTED', label: `Collected (${stats.collected})` },
                    { id: 'PROCESSING', label: `Processing (${stats.processing})` },
                    { id: 'READY', label: `Reports Ready (${stats.ready})` },
                    { id: 'ALL', label: `All (${bookings.length})` },
                  ] as { id: LabFilter; label: string }[]
                ).map((t) => {
                  const active = filter === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => { setFilter(t.id); setPage(1); }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                        backgroundColor: active ? THEME.greenDark : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.greenDark : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ position: 'relative', zIndex: 40 }}>
                <TouchableOpacity
                  onPress={() => setDateDropdownOpen((v) => !v)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 9,
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>
                    {dateFilter === '7D'
                      ? 'Last 7 Days ▾'
                      : dateFilter === 'TODAY'
                        ? 'Today ▾'
                        : dateFilter === 'MONTH'
                          ? 'Last 30 Days ▾'
                          : 'All Dates ▾'}
                  </Text>
                </TouchableOpacity>
                {dateDropdownOpen && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 38,
                      right: 0,
                      width: 160,
                      backgroundColor: THEME.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 6,
                      gap: 3,
                      zIndex: 50,
                      elevation: 8,
                    }}
                  >
                    {(
                      [
                        { id: '7D', label: 'Last 7 Days' },
                        { id: 'TODAY', label: 'Today' },
                        { id: 'MONTH', label: 'Last 30 Days' },
                        { id: 'ALL', label: 'All Dates' },
                      ] as const
                    ).map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => {
                          setDateFilter(d.id);
                          setPage(1);
                          setDateDropdownOpen(false);
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 7,
                          backgroundColor: dateFilter === d.id ? THEME.greenSoft : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: dateFilter === d.id ? THEME.green : THEME.ink }}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Excel-Style Bookings Table */}
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
                No in-hospital lab or scan bookings in this view
              </Text>
            </View>
          ) : (
            (() => {
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const safePage = Math.min(page, totalPages);
              const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
              return (
                <View style={{ backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' }}>
                  <ScrollView horizontal={width < 960} showsHorizontalScrollIndicator={width < 960}>
                    <View style={{ minWidth: width < 960 ? 840 : undefined, width: '100%' }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: THEME.greenDark,
                          paddingVertical: 11,
                          paddingHorizontal: 14,
                          gap: 8,
                        }}
                      >
                        <Text style={{ flex: 1.15, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>BOOKING REF</Text>
                        <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>CLIENT & PHONE</Text>
                        <Text style={{ flex: 2.0, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>TESTS / SCANS & SLOT</Text>
                        <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>STATUS</Text>
                        <Text style={{ flex: 0.9, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>FEE</Text>
                        <Text style={{ flex: 1.0, fontSize: 11, fontWeight: '800', color: '#FFFFFF', textAlign: 'right' }}>ACTION</Text>
                      </View>

                      {pageRows.map((b, idx) => {
                        const st = String(b.status || 'PAID').toUpperCase();
                        return (
                          <TouchableOpacity
                            key={b.id}
                            activeOpacity={0.75}
                            onPress={() => router.push(`/partner/labs/bookings/${encodeURIComponent(b.booking_ref)}` as any)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 11,
                              paddingHorizontal: 14,
                              gap: 8,
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F2',
                              borderBottomWidth: 1,
                              borderBottomColor: THEME.border,
                            }}
                          >
                            <Text style={{ flex: 1.15, fontSize: 12.5, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                              #{b.booking_ref}
                            </Text>
                            <View style={{ flex: 1.5 }}>
                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                                {b.patient_name || 'Patient'}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.muted }} numberOfLines={1}>
                                {b.patient_phone || '—'}
                              </Text>
                            </View>
                            <View style={{ flex: 2.0 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }} numberOfLines={1}>
                                {b.doctor_name || 'Diagnostic Panel'}
                              </Text>
                              <Text style={{ fontSize: 11, color: THEME.muted }} numberOfLines={1}>
                                {b.slot_time || 'Scheduled'}
                              </Text>
                            </View>
                            <View style={{ flex: 1.1 }}>
                              <View style={{ alignSelf: 'flex-start', backgroundColor: st === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: st === 'COMPLETED' ? THEME.green : THEME.amberText }}>
                                  {st}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ flex: 0.9, fontSize: 13, fontWeight: '900', color: THEME.greenDark }}>
                              ₹{Number(b.final_payable || b.doctor_fee || 0).toLocaleString('en-IN')}
                            </Text>
                            <View style={{ flex: 1.0, alignItems: 'flex-end' }}>
                              <View style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>Manage →</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      backgroundColor: THEME.bg,
                      borderTopWidth: 1,
                      borderTopColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        disabled={safePage <= 1}
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: safePage <= 1 ? '#E2E8F0' : THEME.surface, borderWidth: 1, borderColor: THEME.border }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: safePage <= 1 ? '#94A3B8' : THEME.ink }}>← Prev</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Page {safePage} / {totalPages}</Text>
                      <TouchableOpacity
                        disabled={safePage >= totalPages}
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: safePage >= totalPages ? '#E2E8F0' : THEME.surface, borderWidth: 1, borderColor: THEME.border }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: safePage >= totalPages ? '#94A3B8' : THEME.ink }}>Next →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })()
          )}
        </>
      ) : (
        /* TAB 2: IN-HOSPITAL SERVICES, TIMINGS & PRICING */
        <View style={{ gap: 16 }}>
          {centre ? (
            <>
              {/* Capabilities & Timings */}
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>{centre.name}</Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>{centre.area} · In-Hospital Walk-in Only</Text>
                  </View>
                  <TouchableOpacity
                    disabled={savingSettings}
                    onPress={handleSaveCentreServices}
                    style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>
                      {savingSettings ? 'Saving...' : 'Save Services & Timings'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                    Physical Address, Contact & GPS Coordinates:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      value={newCentreName}
                      onChangeText={setNewCentreName}
                      placeholder="Lab Name"
                      style={{ flex: 1.5, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                    />
                    <TextInput
                      value={newCentreArea}
                      onChangeText={setNewCentreArea}
                      placeholder="Area"
                      style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                    />
                  </View>
                  <TextInput
                    value={labAddress}
                    onChangeText={setLabAddress}
                    placeholder="Full Street Address"
                    style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      value={labCity}
                      onChangeText={setLabCity}
                      placeholder="City"
                      style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                    />
                    <TextInput
                      value={labPincode}
                      onChangeText={setLabPincode}
                      placeholder="Pincode"
                      style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                    />
                    <TextInput
                      value={labPhone}
                      onChangeText={setLabPhone}
                      placeholder="Phone"
                      style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                    />
                  </View>
                  <LocationPickerInput
                    address={labAddress}
                    city={labCity}
                    pincode={labPincode}
                    lat={labLat}
                    lng={labLng}
                    onChangeCoords={(la, ln) => { setLabLat(la); setLabLng(ln); }}
                    onFillAddressMeta={(meta) => {
                      if (meta.address) setLabAddress(meta.address);
                      if (meta.city) setLabCity(meta.city);
                      if (meta.pincode) setLabPincode(meta.pincode);
                    }}
                  />
                </View>

                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                  Services Provided at Hospital:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { id: 'lab', label: 'Pathology Lab Tests' },
                    { id: 'scan', label: 'Radiology Scans (X-Ray / CT / MRI / USG)' },
                    { id: 'package', label: 'Health Packages' },
                  ].map((cap) => {
                    const active = offers.includes(cap.id);
                    return (
                      <TouchableOpacity
                        key={cap.id}
                        onPress={() =>
                          setOffers((prev) =>
                            prev.includes(cap.id) ? prev.filter((x) => x !== cap.id) : [...prev, cap.id]
                          )
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 99,
                          backgroundColor: active ? THEME.greenDark : THEME.bg,
                          borderWidth: 1,
                          borderColor: active ? THEME.greenDark : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                          {active ? '✓ ' : ''}{cap.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, padding: 12, borderRadius: 10 }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>24x7 Emergency Lab & Diagnostics</Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>Open round-the-clock for IPD & emergency walk-ins</Text>
                  </View>
                  <Switch value={is24x7} onValueChange={setIs24x7} trackColor={{ true: THEME.green }} />
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Default Walk-in Slot Window:</Text>
                  <TextInput
                    value={nextSlot}
                    onChangeText={setNextSlot}
                    placeholder="e.g. 08:00 AM - 08:00 PM"
                    style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
                  />
                </View>

                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>7-Day Lab & Scan Timings:</Text>
                <View style={{ gap: 8 }}>
                  {DAYS.map((day) => (
                    <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ width: 95, fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>{day}</Text>
                      <TextInput
                        value={weeklySchedule[day] || ''}
                        onChangeText={(val) => setWeeklySchedule((prev) => ({ ...prev, [day]: val }))}
                        placeholder="08:00 AM - 08:00 PM or Closed"
                        style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12.5 }}
                      />
                    </View>
                  ))}
                </View>
              </View>

              {/* Tests & Scans Availability + Pricing */}
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: THEME.border, gap: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Tests & Scans Available at {centre.name} ({labItems.length} catalog items)
                </Text>
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
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    placeholder="Search test, scan or package..."
                    placeholderTextColor="#8B9690"
                    style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
                  />
                </View>
                {labItems
                  .filter((it) => {
                    const q = catalogSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      String(it.name || '').toLowerCase().includes(q) ||
                      String(it.category || '').toLowerCase().includes(q)
                    );
                  })
                  .map((it) => {
                  const cur = priceMap[it.id] || { price: '', available: false };
                  return (
                    <View
                      key={it.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: THEME.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>{it.name}</Text>
                        <Text style={{ fontSize: 11, color: THEME.muted }}>
                          {String(it.segment || 'lab').toUpperCase()} · {it.category}
                        </Text>
                      </View>
                      <TextInput
                        value={cur.price}
                        onChangeText={(v) =>
                          setPriceMap((prev) => ({
                            ...prev,
                            [it.id]: { price: v.replace(/\D/g, ''), available: true },
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="₹ Price"
                        style={{ width: 90, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12.5 }}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setPriceMap((prev) => ({
                            ...prev,
                            [it.id]: { price: cur.price || '500', available: !cur.available },
                          }))
                        }
                        activeOpacity={0.8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: cur.available ? THEME.greenSoft : THEME.bg,
                          borderWidth: 1,
                          borderColor: cur.available ? THEME.green : THEME.border,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 99,
                          minWidth: 96,
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: cur.available ? THEME.greenDark : THEME.muted }}>
                          {cur.available ? 'Enabled' : 'Off'}
                        </Text>
                        <View
                          style={{
                            width: 34,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: cur.available ? THEME.green : '#CBD5E1',
                            padding: 2,
                            alignItems: cur.available ? 'flex-end' : 'flex-start',
                            justifyContent: 'center',
                          }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF' }} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
