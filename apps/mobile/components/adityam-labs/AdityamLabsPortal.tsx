import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileImage,
  FlaskConical,
  Home as HomeIcon,
  Layers,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Microscope,
  Phone,
  RefreshCw,
  Search,
  Upload,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { playPartnerOrderAlarm } from '../../src/services/adminAlerts';
import { triggerBrowserNotification } from '../../src/services/notificationService';
import { ITEMS, CATEGORIES, fromPrice, type Item } from '../../src/data/labsSample';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  navy: '#14362B',
  brand: '#1B5E43',
  brandSoft: '#EBF5F0',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  amber: '#92400E',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  ink: '#1A2421',
  muted: '#5C6B64',
};

type AdityamLabsTab = 'dashboard' | 'queue' | 'rx' | 'samples' | 'services';

interface LabBookingRow {
  id: string;
  booking_ref: string;
  patient_name: string | null;
  patient_phone: string | null;
  hospital_name: string | null;
  branch_name: string | null;
  doctor_name: string | null;
  slot_time: string | null;
  status: string;
  doctor_fee: number | null;
  bill_amount: number | null;
  discount_amount: number | null;
  final_payable: number | null;
  bill_image_url: string | null;
  prescription_url: string | null;
  assigned_agent: string | null;
  notes: string | null;
  created_at: string;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

const ADITYAM_MACHINES_CATALOG = [
  { id: 'home-phleb', title: 'Home Phlebotomy Fleet', desc: 'Doorstep blood & urine sample collection across city zones', tag: 'ACTIVE', type: 'Home Service' },
  { id: 'nabl-path', title: 'Automated Pathology & Biochemistry', desc: 'CBC, HbA1c, Thyroid, LFT, KFT, Lipid & Vitamin panels', tag: 'ACTIVE', type: 'Pathology' },
  { id: 'xray-dr', title: 'Digital X-Ray (DR System)', desc: 'Attach when Adityam offline imaging wing launches', tag: 'PLANNED', type: 'Offline Machine' },
  { id: 'usg-4d', title: 'Ultrasound & Color Doppler', desc: 'Attach when Adityam offline imaging wing launches', tag: 'PLANNED', type: 'Offline Machine' },
  { id: 'ct-mri', title: 'CT Scan & 1.5T / 3T MRI Unit', desc: 'High-end radiology machine slot integration', tag: 'PLANNED', type: 'Offline Machine' },
];

function extractCollectionAddress(b: LabBookingRow): string {
  const notes = String(b.notes || '');
  const m = notes.match(/Home Sample Collection at\s+([^.]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const m2 = notes.match(/Address:\s*([^.]+)/i);
  if (m2?.[1]?.trim()) return m2[1].trim();
  return b.branch_name || 'Address in notes';
}

function extractTestsSummary(b: LabBookingRow): string {
  const notes = String(b.notes || '');
  const m = notes.match(/Tests:\s*([^.]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  return b.doctor_name || 'Diagnostic Panel';
}

export function AdityamLabsPortal({ initialTab = 'dashboard' }: { initialTab?: AdityamLabsTab }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [activeTab, setActiveTab] = useState<AdityamLabsTab>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: AdityamLabsTab) => {
    setActiveTab(tab);
    const slugMap: Record<AdityamLabsTab, string> = {
      dashboard: '/adityam-labs',
      queue: '/adityam-labs/queue',
      rx: '/adityam-labs/rx',
      samples: '/adityam-labs/samples',
      services: '/adityam-labs/services',
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', slugMap[tab]);
    }
  };

  const [bookings, setBookings] = useState<LabBookingRow[]>([]);
  const [labItems, setLabItems] = useState<Item[]>(ITEMS);
  const [offlineCentres, setOfflineCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [search, setSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'ACTIVE' | 'COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [queueDateFilter, setQueueDateFilter] = useState<'7D' | 'TODAY' | 'TOMORROW' | 'MONTH' | 'ALL'>('7D');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const QUEUE_PAGE_SIZE = 20;
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [samplesSearch, setSamplesSearch] = useState('');
  const [samplesPage, setSamplesPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [phlebTargetId, setPhlebTargetId] = useState<string | null>(null);
  const [phlebInput, setPhlebInput] = useState('');
  const [etaTargetId, setEtaTargetId] = useState<string | null>(null);

  // Rx Curation state
  const [selectedRxId, setSelectedRxId] = useState<string | null>(null);
  const [pickedItemIds, setPickedItemIds] = useState<string[]>([]);
  const [rxDiscountPct, setRxDiscountPct] = useState('20');
  const [rxCustomNote, setRxCustomNote] = useState('');

  // Future Offline Centre / Machine add state
  const [newLabName, setNewLabName] = useState('');
  const [newLabArea, setNewLabArea] = useState('');
  const [newLabMachines, setNewLabMachines] = useState('Pathology, Digital X-Ray');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ data: bData }, { data: itemData }, { data: cData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .in('service_type', ['INVESTIGATION', 'LAB_TEST'])
          .order('created_at', { ascending: false })
          .limit(250),
        supabase.from('lab_items').select('*').eq('is_active', true),
        supabase.from('lab_centres').select('*').ilike('name', '%Adityam%'),
      ]);

      const rows = (bData as LabBookingRow[]) || [];
      setBookings(rows);
      if (itemData && itemData.length > 0) {
        setLabItems(
          (itemData as any[]).map((d) => ({
            id: d.id,
            name: d.name,
            nameHi: d.name_hi ?? d.name,
            segment: d.segment,
            category: d.category,
            reportHrs: d.report_hrs,
            fastingHrs: d.fasting_hrs ?? null,
            about: d.about ?? '',
            aboutHi: d.about_hi ?? '',
            prep: d.prep ?? '',
            prepHi: d.prep_hi ?? '',
          }))
        );
      }
      setOfflineCentres((cData as any[]) || []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const supabase = getSupabaseClient();
    const ch = supabase
      .channel('adityam-labs-command-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          void loadData();
          if (payload?.eventType === 'INSERT') {
            const r = payload?.new || {};
            const svc = String(r.service_type || '').toUpperCase();
            if (svc === 'INVESTIGATION' || svc === 'LAB_TEST') {
              const msg = `${r.patient_name || 'Patient'} · #${r.booking_ref || ''}`;
              if (soundOn) {
                playPartnerOrderAlarm(
                  r.bill_image_url ? 'New Lab Rx Uploaded!' : 'New Adityam Home Lab Order!',
                  msg
                );
              }
              triggerBrowserNotification('Adityam Labs Desk', msg);
            }
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadData, soundOn]);

  const adityamBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const hosp = String(b.hospital_name || '').toLowerCase();
        const ref = String(b.booking_ref || '').toUpperCase();
        return hosp.includes('adityam') || ref.includes('LAB-RX');
      }),
    [bookings]
  );

  const rxBookings = useMemo(
    () =>
      adityamBookings.filter(
        (b) => Boolean(b.bill_image_url) || String(b.booking_ref || '').includes('LAB-RX')
      ),
    [adityamBookings]
  );

  const collectedSamples = useMemo(
    () =>
      adityamBookings.filter((b) =>
        ['SAMPLE_COLLECTED', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED'].includes(
          String(b.status || '').toUpperCase()
        )
      ),
    [adityamBookings]
  );

  const stats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let pendingHome = 0;
    let underTesting = 0;
    let completed = 0;
    let completedWeek = 0;
    let weekGross = 0;
    let sampleCollectedCount = 0;
    let processingOnlyCount = 0;

    for (const b of adityamBookings) {
      const st = String(b.status || '').toUpperCase();
      const createdMs = new Date(b.created_at).getTime();
      const inWeek = !Number.isNaN(createdMs) && createdMs >= sevenDaysAgo;
      const amt = Number(b.final_payable || b.doctor_fee || 0);
      if (inWeek && st !== 'CANCELLED' && st !== 'REJECTED') {
        weekGross += amt;
      }
      if (st === 'COMPLETED') {
        completed += 1;
        if (inWeek) completedWeek += 1;
      } else if (st === 'SAMPLE_COLLECTED' || st === 'IN_PROGRESS') {
        sampleCollectedCount += 1;
        underTesting += 1;
      } else if (st === 'PROCESSING') {
        processingOnlyCount += 1;
        underTesting += 1;
      } else if (st !== 'CANCELLED' && st !== 'REJECTED') {
        pendingHome += 1;
      }
    }
    const pendingRx = rxBookings.filter((b) => String(b.status || '').toUpperCase() === 'NEW').length;
    const labCount = labItems.filter((i) => i.segment === 'lab').length;
    const scanCount = labItems.filter((i) => i.segment === 'scan').length;
    const pkgCount = labItems.filter((i) => i.segment === 'package').length;
    return {
      pendingHome,
      pendingRx,
      underTesting,
      sampleCollectedCount,
      processingOnlyCount,
      completed,
      completedWeek,
      weekGross,
      totalSamples: collectedSamples.length,
      labCount,
      scanCount,
      pkgCount,
    };
  }, [adityamBookings, rxBookings, collectedSamples, labItems]);

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return adityamBookings.filter((b) => {
      const st = String(b.status || 'PAID').toUpperCase();
      if (queueStatusFilter === 'ACTIVE' && ['COMPLETED', 'CANCELLED', 'REJECTED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'PROCESSING'].includes(st)) return false;
      if (queueStatusFilter === 'COLLECTED' && !['SAMPLE_COLLECTED', 'IN_PROGRESS'].includes(st)) return false;
      if (queueStatusFilter === 'PROCESSING' && st !== 'PROCESSING') return false;
      if (queueStatusFilter === 'COMPLETED' && st !== 'COMPLETED') return false;

      const slotLower = String(b.slot_time || '').toLowerCase();
      if (queueDateFilter === 'TODAY' && !slotLower.includes('today')) return false;
      if (queueDateFilter === 'TOMORROW' && !slotLower.includes('tomorrow')) return false;
      if (queueDateFilter === '7D') {
        const ms = new Date(b.created_at).getTime();
        if (!Number.isNaN(ms) && ms < sevenDaysAgo) return false;
      }
      if (queueDateFilter === 'MONTH') {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const ms = new Date(b.created_at).getTime();
        if (!Number.isNaN(ms) && ms < thirtyDaysAgo) return false;
      }

      if (!q) return true;
      return (
        String(b.patient_name || '').toLowerCase().includes(q) ||
        String(b.patient_phone || '').toLowerCase().includes(q) ||
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.doctor_name || '').toLowerCase().includes(q) ||
        String(b.notes || '').toLowerCase().includes(q) ||
        String(b.assigned_agent || '').toLowerCase().includes(q)
      );
    });
  }, [adityamBookings, search, queueStatusFilter, queueDateFilter]);

  const filteredSamples = useMemo(() => {
    const q = samplesSearch.trim().toLowerCase();
    return collectedSamples.filter((b) => {
      if (categoryFilter !== 'ALL') {
        const text = `${b.doctor_name || ''} ${b.notes || ''}`.toLowerCase();
        if (!text.includes(categoryFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      return (
        String(b.patient_name || '').toLowerCase().includes(q) ||
        String(b.patient_phone || '').toLowerCase().includes(q) ||
        String(b.booking_ref || '').toLowerCase().includes(q) ||
        String(b.doctor_name || '').toLowerCase().includes(q) ||
        String(b.assigned_agent || '').toLowerCase().includes(q)
      );
    });
  }, [collectedSamples, categoryFilter, samplesSearch]);

  const exportSamplesCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Booking Ref',
      'Date',
      'Client Name',
      'Phone',
      'Tests',
      'Collection Address',
      'Slot',
      'Phlebotomist',
      'Status',
      'Report URL',
    ];
    const rows = filteredSamples.map((s) => [
      s.booking_ref,
      s.created_at ? new Date(s.created_at).toLocaleString('en-IN') : '',
      s.patient_name || '',
      s.patient_phone || '',
      extractTestsSummary(s),
      extractCollectionAddress(s),
      s.slot_time || '',
      s.assigned_agent || '',
      s.status || '',
      s.bill_image_url || '',
    ]);
    const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adityam-client-samples-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('CSV Ready', `Prepared ${filteredSamples.length} sample rows.`);
    }
  };

  const selectedRx = useMemo(
    () => rxBookings.find((r) => r.id === selectedRxId) || rxBookings[0] || null,
    [rxBookings, selectedRxId]
  );

  const rxTotals = useMemo(() => {
    const selected = labItems.filter((it) => pickedItemIds.includes(it.id));
    const mrp = selected.reduce((s, it) => s + fromPrice(it), 0);
    const pct = Math.min(80, Math.max(0, Number(rxDiscountPct || 0)));
    const disc = Math.round((mrp * pct) / 100);
    const net = Math.max(0, mrp - disc);
    return { selected, mrp, disc, net };
  }, [labItems, pickedItemIds, rxDiscountPct]);

  const updateBooking = async (id: string, patch: Record<string, any>) => {
    setBusyId(id);
    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').update(patch).eq('id', id);
      setPhlebTargetId(null);
      setEtaTargetId(null);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadReport = async (b: LabBookingRow) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Allow photo access to upload report.');
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
        `adityam-lab-report-${b.booking_ref}-${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );
      await updateBooking(b.id, { bill_image_url: url, status: 'COMPLETED' });
      Alert.alert('Report Published', `Report for #${b.booking_ref} is now live in the patient app.`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload report.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSendRxPackageQuote = async () => {
    if (!selectedRx || rxTotals.selected.length === 0) {
      Alert.alert('Select Tests', 'Pick at least one test from the catalog to build the package quote.');
      return;
    }
    const testNames = rxTotals.selected.map((it) => it.name).join(', ');
    await updateBooking(selectedRx.id, {
      status: 'CONFIRMED',
      doctor_name: `Curated Package (${rxTotals.selected.length} Tests): ${testNames.slice(0, 60)}`,
      bill_amount: rxTotals.mrp,
      discount_amount: rxTotals.disc,
      final_payable: rxTotals.net,
      doctor_fee: rxTotals.net,
      notes: `${selectedRx.notes || ''} | Curated Tests: ${testNames}${rxCustomNote.trim() ? ` | Desk Note: ${rxCustomNote.trim()}` : ''}`,
    });
    setPickedItemIds([]);
    setRxCustomNote('');
    Alert.alert('Quote Sent', `Curated package (₹${rxTotals.net}) sent to ${selectedRx.patient_name || 'Patient'}'s app.`);
  };

  const handleAddOfflineCentre = async () => {
    if (!newLabName.trim() || !newLabArea.trim()) {
      Alert.alert('Required', 'Enter both Centre Name and Area.');
      return;
    }
    const supabase = getSupabaseClient();
    const id = `adityam-lab-${Date.now()}`;
    await supabase.from('lab_centres').insert({
      id,
      name: newLabName.trim(),
      area: newLabArea.trim(),
      city: 'Jaipur',
      distance_km: 0,
      rating: 5.0,
      reviews: 0,
      home_collection: true,
      offers: ['lab', 'scan', 'package'],
      next_slot: 'Today, 07:00 AM',
      is_active: true,
      price_factor: 1,
    });
    setNewLabName('');
    setNewLabArea('');
    await loadData();
    Alert.alert('Added', 'Adityam offline diagnostic centre registered.');
  };

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: THEME.bg }}>
      {/* Sidebar */}
      <View
        style={{
          width: isDesktop ? 250 : '100%',
          backgroundColor: THEME.navy,
          padding: 18,
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Microscope size={20} color="#A7D7C0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Adityam Labs</Text>
              <Text style={{ fontSize: 11, color: '#A7D7C0' }}>Own Diagnostics & Home Ops</Text>
            </View>
          </View>

          <View style={{ gap: 4 }}>
            {(
              [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
                { id: 'queue', label: 'Home Collection Queue', icon: HomeIcon, badge: stats.pendingHome },
                { id: 'rx', label: 'Rx Curation Desk', icon: FileImage, badge: stats.pendingRx },
                { id: 'samples', label: 'Client Samples & Categories', icon: Layers, badge: stats.totalSamples },
                { id: 'services', label: 'Services & Offline Labs', icon: Building2, badge: 0 },
              ] as const
            ).map((nav) => {
              const active = activeTab === nav.id;
              const Icon = nav.icon;
              return (
                <TouchableOpacity
                  key={nav.id}
                  onPress={() => switchTab(nav.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Icon size={17} color={active ? '#FFFFFF' : '#9DC0B1'} />
                    <Text style={{ fontSize: 13.5, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : '#C6E2D4' }}>
                      {nav.label}
                    </Text>
                  </View>
                  {nav.badge > 0 && (
                    <View style={{ backgroundColor: '#F3DBA8', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.navy }}>{nav.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setSoundOn((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 10,
          }}
        >
          {soundOn ? <Volume2 size={15} color="#A7F3D0" /> : <VolumeX size={15} color="#FCA5A5" />}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
            {soundOn ? 'Live Alerts On' : 'Alerts Muted'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: THEME.ink }}>
              {activeTab === 'dashboard'
                ? 'Adityam Labs Command Dashboard'
                : activeTab === 'queue'
                  ? 'Adityam Home Collection Queue'
                  : activeTab === 'rx'
                    ? 'Lab Prescription Curation Desk'
                    : activeTab === 'samples'
                      ? 'Client Samples & Category Log'
                      : 'Adityam Services, Machines & Offline Centres'}
            </Text>
            <Text style={{ fontSize: 12.5, color: THEME.muted }}>
              Independent Adityam Niramayaa Diagnostics Operations (`/adityam-labs`)
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadData}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: THEME.brandSoft,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <RefreshCw size={14} color={THEME.brand} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.brand }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={THEME.brand} />
          </View>
        ) : activeTab === 'dashboard' ? (
          <View style={{ gap: 16 }}>
            {/* 5-Card Executive KPI Strip */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {[
                { label: 'NEW / PENDING PICKUPS', value: String(stats.pendingHome), sub: `${stats.pendingRx} Rx awaiting curation`, dark: false },
                { label: 'UNDER TESTING / REVIEW', value: String(stats.underTesting), sub: `${stats.sampleCollectedCount} collected · ${stats.processingOnlyCount} in lab`, dark: false },
                { label: 'COMPLETED THIS WEEK', value: String(stats.completedWeek), sub: `${stats.completed} total reports online`, dark: true },
                { label: 'THIS WEEK GROSS', value: `₹${stats.weekGross.toLocaleString('en-IN')}`, sub: 'Last 7 days Adityam Labs', dark: false },
                { label: 'ACTIVE LABS & SCANS', value: String(labItems.length), sub: `${stats.labCount} Lab · ${stats.scanCount} Scans · ${stats.pkgCount} Pkg`, dark: false },
              ].map((kpi) => (
                <View
                  key={kpi.label}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    backgroundColor: kpi.dark ? THEME.navy : THEME.surface,
                    borderRadius: 14,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: kpi.dark ? THEME.navy : THEME.border,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: kpi.dark ? '#A7D7C0' : THEME.muted }}>
                    {kpi.label}
                  </Text>
                  <Text style={{ fontSize: 23, fontWeight: '900', color: kpi.dark ? '#FFFFFF' : THEME.ink }}>
                    {kpi.value}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: kpi.dark ? '#C6E2D4' : THEME.muted }}>{kpi.sub}</Text>
                </View>
              ))}
            </View>

            {/* 2-Column Split: Left = New & Active Orders | Right = Weekly Pipeline & Active Catalog */}
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
              {/* Left Column: New / Recent Home Collection & Rx Orders */}
              <View
                style={{
                  flex: 1.3,
                  width: '100%',
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      New & Active Home Orders ({stats.pendingHome})
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      Latest patient pickups & prescription uploads
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveTab('queue')}
                    style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Open Queue →</Text>
                  </TouchableOpacity>
                </View>

                {(() => {
                  const activeList = adityamBookings.filter(
                    (b) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(b.status || '').toUpperCase())
                  );
                  if (activeList.length === 0) {
                    return (
                      <View style={{ padding: 20, alignItems: 'center', backgroundColor: THEME.bg, borderRadius: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>No pending home orders</Text>
                      </View>
                    );
                  }
                  return activeList.slice(0, 5).map((b) => {
                    const st = String(b.status || 'PAID').toUpperCase();
                    const isRx = String(b.booking_ref || '').includes('LAB-RX');
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => (isRx ? switchTab('rx') : router.push(`/adityam-labs/queue/${encodeURIComponent(b.booking_ref)}` as any))}
                        style={{
                          backgroundColor: THEME.bg,
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>#{b.booking_ref}</Text>
                            <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amber }}>{st}</Text>
                            </View>
                            {isRx && (
                              <View style={{ backgroundColor: THEME.navy, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>RX</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                            {b.patient_name || 'Patient'} · {b.doctor_name || 'Diagnostic Panel'}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: THEME.muted }} numberOfLines={1}>
                            {extractCollectionAddress(b)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.green }}>
                          ₹{Number(b.final_payable || b.doctor_fee || 0).toLocaleString('en-IN')}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>

              {/* Right Column: Weekly Pipeline + Active Labs & Scans */}
              <View style={{ flex: 1, width: '100%', gap: 14 }}>
                {/* Pipeline Breakdown */}
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                    Sample & Testing Pipeline
                  </Text>
                  {[
                    { label: 'New / Scheduled Pickups', val: stats.pendingHome, color: '#D97706', bg: THEME.amberBg },
                    { label: 'Sample Collected', val: stats.sampleCollectedCount, color: '#2563EB', bg: '#EFF6FF' },
                    { label: 'Under Lab Testing (Processing)', val: stats.processingOnlyCount, color: '#7C3AED', bg: '#F5F3FF' },
                    { label: 'Completed & Report Online', val: stats.completed, color: THEME.green, bg: THEME.greenSoft },
                  ].map((row) => (
                    <View
                      key={row.label}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: THEME.bg,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>{row.label}</Text>
                      <View style={{ backgroundColor: row.bg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 99 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: row.color }}>{row.val}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Active Labs & Scans Summary */}
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                      Active Tests & Scans Catalog
                    </Text>
                    <TouchableOpacity onPress={() => setActiveTab('services')}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Manage →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                    {stats.labCount} Home-Eligible Lab Tests · {stats.scanCount} In-Lab Scans · {stats.pkgCount} Health Packages
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.lab.slice(0, 8).map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setCategoryFilter(cat.label);
                          setActiveTab('samples');
                        }}
                        style={{
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.green }}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : activeTab === 'queue' ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 10,
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
                  placeholder="Search patient, phone, #AN-LAB ref, test, address, or phlebotomist..."
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(
                    [
                      { id: 'ACTIVE', label: `Pending Pickup (${stats.pendingHome})` },
                      { id: 'COLLECTED', label: `Collected (${stats.sampleCollectedCount})` },
                      { id: 'PROCESSING', label: `Processing (${stats.processingOnlyCount})` },
                      { id: 'COMPLETED', label: `Reports Ready (${stats.completed})` },
                      { id: 'ALL', label: `All (${adityamBookings.length})` },
                    ] as const
                  ).map((f) => {
                    const active = queueStatusFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => setQueueStatusFilter(f.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 99,
                          backgroundColor: active ? THEME.navy : THEME.bg,
                          borderWidth: 1,
                          borderColor: active ? THEME.navy : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                          {f.label}
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
                      {queueDateFilter === '7D'
                        ? 'Last 7 Days ▾'
                        : queueDateFilter === 'TODAY'
                          ? 'Today ▾'
                          : queueDateFilter === 'TOMORROW'
                            ? 'Tomorrow ▾'
                            : queueDateFilter === 'MONTH'
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
                        width: 165,
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
                          { id: 'TOMORROW', label: 'Tomorrow' },
                          { id: 'MONTH', label: 'Last 30 Days' },
                          { id: 'ALL', label: 'All Dates' },
                        ] as const
                      ).map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() => {
                            setQueueDateFilter(d.id);
                            setQueuePage(1);
                            setDateDropdownOpen(false);
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 7,
                            backgroundColor: queueDateFilter === d.id ? THEME.greenSoft : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: queueDateFilter === d.id ? THEME.green : THEME.ink }}>
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {filteredQueue.length === 0 ? (
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: THEME.border }}>
                <FlaskConical size={28} color={THEME.muted} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink, marginTop: 8 }}>
                  No Adityam Home Collection orders match this filter
                </Text>
              </View>
            ) : (
              (() => {
                const totalPages = Math.max(1, Math.ceil(filteredQueue.length / QUEUE_PAGE_SIZE));
                const safePage = Math.min(queuePage, totalPages);
                const pageRows = filteredQueue.slice(
                  (safePage - 1) * QUEUE_PAGE_SIZE,
                  safePage * QUEUE_PAGE_SIZE
                );
                return (
                  <View style={{ backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' }}>
                    <ScrollView horizontal={width < 960} showsHorizontalScrollIndicator={width < 960}>
                      <View style={{ minWidth: width < 960 ? 860 : undefined, width: '100%' }}>
                        {/* Excel Table Header */}
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.navy,
                            paddingVertical: 11,
                            paddingHorizontal: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: THEME.border,
                            gap: 8,
                          }}
                        >
                          <Text style={{ flex: 1.15, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>BOOKING REF</Text>
                          <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>CLIENT & PHONE</Text>
                          <Text style={{ flex: 1.7, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>TESTS & SLOT</Text>
                          <Text style={{ flex: 2.0, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>COLLECTION ADDRESS</Text>
                          <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>PHLEBOTOMIST</Text>
                          <Text style={{ flex: 1.0, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>STATUS</Text>
                          <Text style={{ flex: 0.9, fontSize: 11, fontWeight: '800', color: '#FFFFFF', textAlign: 'right' }}>ACTION</Text>
                        </View>

                        {/* Excel Table Rows */}
                        {pageRows.map((b, idx) => {
                          const st = String(b.status || 'PAID').toUpperCase();
                          const addr = extractCollectionAddress(b);
                          const tests = extractTestsSummary(b);
                          return (
                            <TouchableOpacity
                              key={b.id}
                              activeOpacity={0.75}
                              onPress={() => router.push(`/adityam-labs/queue/${encodeURIComponent(b.booking_ref)}` as any)}
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
                              <View style={{ flex: 1.4 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                                  {b.patient_name || 'Patient'}
                                </Text>
                                <Text style={{ fontSize: 11, color: THEME.muted }} numberOfLines={1}>
                                  {b.patient_phone || '—'}
                                </Text>
                              </View>
                              <View style={{ flex: 1.7 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }} numberOfLines={1}>
                                  {tests}
                                </Text>
                                <Text style={{ fontSize: 11, color: THEME.muted }} numberOfLines={1}>
                                  {b.slot_time || 'Scheduled'}
                                </Text>
                              </View>
                              <Text style={{ flex: 2.0, fontSize: 11.5, color: THEME.ink }} numberOfLines={2}>
                                {addr}
                              </Text>
                              <Text style={{ flex: 1.2, fontSize: 11.5, fontWeight: '600', color: b.assigned_agent ? THEME.ink : THEME.muted }} numberOfLines={1}>
                                {b.assigned_agent || 'Unassigned'}
                              </Text>
                              <View style={{ flex: 1.0 }}>
                                <View
                                  style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: st === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 99,
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: st === 'COMPLETED' ? THEME.green : THEME.amber }}>
                                    {st}
                                  </Text>
                                </View>
                              </View>
                              <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
                                <View style={{ backgroundColor: THEME.navy, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 }}>
                                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>Manage →</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {/* Pagination Bar */}
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
                        Showing {(safePage - 1) * QUEUE_PAGE_SIZE + 1}–{Math.min(safePage * QUEUE_PAGE_SIZE, filteredQueue.length)} of {filteredQueue.length}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          disabled={safePage <= 1}
                          onPress={() => setQueuePage((p) => Math.max(1, p - 1))}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: safePage <= 1 ? '#E2E8F0' : THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: safePage <= 1 ? '#94A3B8' : THEME.ink }}>
                            ← Prev
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                          Page {safePage} / {totalPages}
                        </Text>
                        <TouchableOpacity
                          disabled={safePage >= totalPages}
                          onPress={() => setQueuePage((p) => Math.min(totalPages, p + 1))}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: safePage >= totalPages ? '#E2E8F0' : THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: safePage >= totalPages ? '#94A3B8' : THEME.ink }}>
                            Next →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })()
            )}
          </View>
        ) : activeTab === 'rx' ? (
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            {/* Left Rx List */}
            <View style={{ flex: 1, gap: 10 }}>
              {rxBookings.length === 0 ? (
                <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: THEME.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.muted }}>No uploaded lab prescriptions yet.</Text>
                </View>
              ) : (
                rxBookings.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setSelectedRxId(r.id)}
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: selectedRx?.id === r.id ? 2 : 1,
                      borderColor: selectedRx?.id === r.id ? THEME.brand : THEME.border,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      #{r.booking_ref} · {r.patient_name || 'Patient'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>{r.patient_phone} · {r.status}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Right Rx Reader & Package Builder */}
            {selectedRx && (
              <View style={{ flex: 1.5, backgroundColor: THEME.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: THEME.border, gap: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.ink }}>
                  Rx Curation · #{selectedRx.booking_ref}
                </Text>
                {selectedRx.bill_image_url ? (
                  <Image
                    source={{ uri: selectedRx.bill_image_url }}
                    style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#F1F5F9' }}
                    resizeMode="contain"
                  />
                ) : null}

                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                  Select Matching Tests from Catalog ({pickedItemIds.length} selected):
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {labItems.slice(0, 18).map((it) => {
                    const picked = pickedItemIds.includes(it.id);
                    return (
                      <TouchableOpacity
                        key={it.id}
                        onPress={() =>
                          setPickedItemIds((prev) =>
                            prev.includes(it.id) ? prev.filter((x) => x !== it.id) : [...prev, it.id]
                          )
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 99,
                          backgroundColor: picked ? THEME.brand : THEME.bg,
                          borderWidth: 1,
                          borderColor: picked ? THEME.brand : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: picked ? '#FFFFFF' : THEME.ink }}>
                          {it.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>Discount (%)</Text>
                    <TextInput
                      value={rxDiscountPct}
                      onChangeText={setRxDiscountPct}
                      keyboardType="numeric"
                      style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 8, marginTop: 4 }}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>Note for Call Center / Patient</Text>
                    <TextInput
                      value={rxCustomNote}
                      onChangeText={setRxCustomNote}
                      placeholder="e.g. Fasting 8 hrs required"
                      style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 8, marginTop: 4 }}
                    />
                  </View>
                </View>

                <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                    MRP ₹{rxTotals.mrp} · Discount -₹{rxTotals.disc} · Net Payable: ₹{rxTotals.net}
                  </Text>
                  <TouchableOpacity
                    onPress={handleSendRxPackageQuote}
                    style={{ backgroundColor: THEME.navy, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>Send Quote to Patient App</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : activeTab === 'samples' ? (
          <View style={{ gap: 12 }}>
            {/* Search + Category Pills + CSV Export */}
            <View style={{ backgroundColor: THEME.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: THEME.border, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <View
                  style={{
                    flex: 1,
                    minWidth: 220,
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
                    value={samplesSearch}
                    onChangeText={(v) => {
                      setSamplesSearch(v);
                      setSamplesPage(1);
                    }}
                    placeholder="Search client, phone, #AN-LAB, tests, or phlebotomist..."
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
                  />
                </View>

                <TouchableOpacity
                  onPress={exportSamplesCsv}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: THEME.navy,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 9,
                  }}
                >
                  <Download size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    Download CSV ({filteredSamples.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['ALL', ...CATEGORIES.lab.map((c) => c.label)].map((cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        setCategoryFilter(cat);
                        setSamplesPage(1);
                      }}
                      style={{
                        paddingHorizontal: 13,
                        paddingVertical: 7,
                        borderRadius: 99,
                        backgroundColor: active ? THEME.navy : THEME.bg,
                        borderWidth: 1,
                        borderColor: active ? THEME.navy : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {filteredSamples.length === 0 ? (
              <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: THEME.border }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.muted }}>
                  No collected client samples match this filter yet.
                </Text>
              </View>
            ) : (
              (() => {
                const totalPages = Math.max(1, Math.ceil(filteredSamples.length / QUEUE_PAGE_SIZE));
                const safePage = Math.min(samplesPage, totalPages);
                const pageRows = filteredSamples.slice(
                  (safePage - 1) * QUEUE_PAGE_SIZE,
                  safePage * QUEUE_PAGE_SIZE
                );
                return (
                  <View style={{ backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' }}>
                    <ScrollView horizontal={width < 960} showsHorizontalScrollIndicator={width < 960}>
                      <View style={{ minWidth: width < 960 ? 900 : undefined, width: '100%' }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            backgroundColor: THEME.navy,
                            paddingVertical: 11,
                            paddingHorizontal: 14,
                            gap: 8,
                          }}
                        >
                          <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>REF</Text>
                          <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>CLIENT & PHONE</Text>
                          <Text style={{ flex: 1.8, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>TESTS</Text>
                          <Text style={{ flex: 1.8, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>COLLECTION ADDRESS</Text>
                          <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>PHLEBOTOMIST</Text>
                          <Text style={{ flex: 1.0, fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>STATUS</Text>
                          <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '800', color: '#FFFFFF', textAlign: 'right' }}>REPORT</Text>
                        </View>

                        {pageRows.map((s, idx) => {
                          const st = String(s.status || '').toUpperCase();
                          const hasReport = Boolean(s.bill_image_url) && st === 'COMPLETED';
                          return (
                            <TouchableOpacity
                              key={s.id}
                              activeOpacity={0.75}
                              onPress={() => router.push(`/adityam-labs/queue/${encodeURIComponent(s.booking_ref)}` as any)}
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
                              <Text style={{ flex: 1.1, fontSize: 12.5, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                                #{s.booking_ref}
                              </Text>
                              <View style={{ flex: 1.4 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                                  {s.patient_name || 'Patient'}
                                </Text>
                                <Text style={{ fontSize: 11, color: THEME.muted }} numberOfLines={1}>
                                  {s.patient_phone || '—'}
                                </Text>
                              </View>
                              <View style={{ flex: 1.8 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }} numberOfLines={2}>
                                  {extractTestsSummary(s)}
                                </Text>
                                <Text style={{ fontSize: 10.5, color: THEME.muted }} numberOfLines={1}>
                                  {s.slot_time || (s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '')}
                                </Text>
                              </View>
                              <Text style={{ flex: 1.8, fontSize: 11.5, color: THEME.ink }} numberOfLines={2}>
                                {extractCollectionAddress(s)}
                              </Text>
                              <Text style={{ flex: 1.2, fontSize: 11.5, fontWeight: '600', color: THEME.ink }} numberOfLines={1}>
                                {s.assigned_agent || 'Assigned Desk'}
                              </Text>
                              <View style={{ flex: 1.0 }}>
                                <View style={{ alignSelf: 'flex-start', backgroundColor: st === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: st === 'COMPLETED' ? THEME.green : THEME.amber }}>
                                    {st}
                                  </Text>
                                </View>
                              </View>
                              <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
                                {hasReport ? (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      Linking.openURL(s.bill_image_url!);
                                    }}
                                    style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 }}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.green }}>View Report ↗</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>In Process</Text>
                                )}
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
                        Showing {(safePage - 1) * QUEUE_PAGE_SIZE + 1}–{Math.min(safePage * QUEUE_PAGE_SIZE, filteredSamples.length)} of {filteredSamples.length}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          disabled={safePage <= 1}
                          onPress={() => setSamplesPage((p) => Math.max(1, p - 1))}
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: safePage <= 1 ? '#E2E8F0' : THEME.surface, borderWidth: 1, borderColor: THEME.border }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: safePage <= 1 ? '#94A3B8' : THEME.ink }}>← Prev</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Page {safePage} / {totalPages}</Text>
                        <TouchableOpacity
                          disabled={safePage >= totalPages}
                          onPress={() => setSamplesPage((p) => Math.min(totalPages, p + 1))}
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
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
              Active Services & Future Offline Machine Readiness
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {ADITYAM_MACHINES_CATALOG.map((m) => (
                <View
                  key={m.id}
                  style={{
                    flex: 1,
                    minWidth: 240,
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.brand }}>{m.type}</Text>
                    <View style={{ backgroundColor: m.tag === 'ACTIVE' ? THEME.greenSoft : THEME.amberBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: m.tag === 'ACTIVE' ? THEME.green : THEME.amber }}>{m.tag}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>{m.title}</Text>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>{m.desc}</Text>
                </View>
              ))}
            </View>

            {/* Attach Future Offline Adityam Lab / Machine Wing */}
            <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: THEME.border, gap: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Attach New Adityam Offline Lab / Machine Wing ({offlineCentres.length} attached)
              </Text>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                <TextInput
                  value={newLabName}
                  onChangeText={setNewLabName}
                  placeholder="Centre Name (e.g. Adityam Imaging & MRI - Mansarovar)"
                  style={{ flex: 1.4, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10 }}
                />
                <TextInput
                  value={newLabArea}
                  onChangeText={setNewLabArea}
                  placeholder="Area / Address"
                  style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10 }}
                />
                <TextInput
                  value={newLabMachines}
                  onChangeText={setNewLabMachines}
                  placeholder="Machines (CT, MRI, X-Ray...)"
                  style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10 }}
                />
                <TouchableOpacity
                  onPress={handleAddOfflineCentre}
                  style={{ backgroundColor: THEME.navy, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, justifyContent: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Attach Lab</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
