import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  Phone,
  MessageCircle,
  FlaskConical,
  Edit3,
  X,
  CheckCircle2,
  UserCheck,
  IndianRupee,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { THEME, formatInr } from './labTheme';
import { AdminPagination } from '../AdminPagination';
import { useAdminAuth } from '../AdminAuthGate';

interface AdityamNiramayaaLeadsViewProps {
  bookings: Booking[];
  onBack: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

type RoleTab = 'ALL' | 'CALL_OPS' | 'FINANCE';
type StatusFilter =
  | 'ALL'
  | 'NEEDS_QUOTE'
  | 'CONFIRMED'
  | 'SAMPLE_COLLECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'LOST';
type DateRange = '7D' | '30D' | 'TODAY' | 'ALL';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  'PENDING_QUOTE',
  'CONFIRMED',
  'SAMPLE_COLLECTED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'MISSED',
] as const;

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function extractAddress(b: Booking): string {
  const notes = String(b.notes || '');
  const m = notes.match(/Home Sample Collection at\s+([^.]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  const m2 = notes.match(/Address:\s*([^.]+)/i);
  if (m2?.[1]?.trim()) return m2[1].trim();
  return b.branch_name || 'Home Collection';
}

function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'SERVED') {
    return { bg: THEME.greenSoft, text: THEME.greenPrimary, label: s };
  }
  if (s === 'CANCELLED' || s === 'MISSED') {
    return { bg: THEME.redBg, text: THEME.redText, label: s };
  }
  if (s === 'PROCESSING' || s === 'SAMPLE_COLLECTED') {
    return { bg: THEME.blueBg, text: THEME.blueText, label: s.replace('_', ' ') };
  }
  if (s === 'PENDING_QUOTE' || s === 'RX_PENDING' || s === 'PENDING') {
    return { bg: THEME.amberBg, text: THEME.amberText, label: 'NEEDS QUOTE' };
  }
  return { bg: THEME.greenSoft, text: THEME.greenDark, label: s || 'CONFIRMED' };
}

export function AdityamNiramayaaLeadsView({
  bookings,
  onBack,
  onRefresh,
  refreshing = false,
}: AdityamNiramayaaLeadsViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { adminUser } = useAdminAuth();
  const staffRole = String(adminUser?.role || '').toLowerCase();

  const [roleTab, setRoleTab] = useState<RoleTab>(() =>
    staffRole === 'call_center_agent'
      ? 'CALL_OPS'
      : staffRole === 'finance'
        ? 'FINANCE'
        : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('30D');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Edit / Manage Lead Modal state
  const [editingLead, setEditingLead] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState('CONFIRMED');
  const [editAgent, setEditAgent] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editNet, setEditNet] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const adityamLeads = useMemo(() => {
    return bookings.filter(
      (b) =>
        (b.service_type === 'INVESTIGATION' || (b.service_type as string) === 'LAB_TEST') &&
        (String(b.hospital_name || '').toLowerCase().includes('adityam') ||
          String(b.booking_ref || '').toUpperCase().includes('LAB-RX'))
    );
  }, [bookings]);

  const stats = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();

    let totalGross = 0;
    let totalDiscounts = 0;
    let totalNetRevenue = 0;
    let completedRevenue = 0;
    let pendingPipelineValue = 0;
    let lostValue = 0;
    let weeklySales = 0;
    let weeklyCount = 0;
    let todaySales = 0;
    let completedCount = 0;
    let activeCount = 0;
    let rxQuoteCount = 0;
    let pickupCount = 0;
    let cancelledOrMissedCount = 0;
    let unassignedCount = 0;

    for (const b of adityamLeads) {
      const st = (b.status || '').toUpperCase();
      const net = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
      const mrp = Number(b.bill_amount || net || 0);
      const disc = Number(b.discount_amount || Math.max(0, mrp - net));
      const createdTs = new Date(b.created_at).getTime();

      if (st === 'CANCELLED' || st === 'MISSED') {
        cancelledOrMissedCount += 1;
        lostValue += net;
        continue;
      }

      totalGross += mrp;
      totalDiscounts += disc;
      totalNetRevenue += net;

      if (createdTs >= sevenDaysAgo) {
        weeklySales += net;
        weeklyCount += 1;
      }
      if (createdTs >= todayTs) {
        todaySales += net;
      }

      if (st === 'COMPLETED' || st === 'SERVED') {
        completedCount += 1;
        completedRevenue += net;
      } else {
        activeCount += 1;
        pendingPipelineValue += net;
        if (!b.assigned_agent?.trim()) unassignedCount += 1;
        if (st === 'PENDING_QUOTE' || st === 'RX_PENDING' || st === 'PENDING') {
          rxQuoteCount += 1;
        } else {
          pickupCount += 1;
        }
      }
    }

    const validTotal = adityamLeads.length;
    const completionRate = validTotal > 0 ? Math.round((completedCount / validTotal) * 100) : 0;
    const avgOrderValue =
      completedCount + activeCount > 0
        ? Math.round(totalNetRevenue / (completedCount + activeCount))
        : 0;

    return {
      totalLeads: adityamLeads.length,
      totalGross,
      totalDiscounts,
      totalNetRevenue,
      completedRevenue,
      pendingPipelineValue,
      lostValue,
      weeklySales,
      weeklyCount,
      todaySales,
      completedCount,
      activeCount,
      rxQuoteCount,
      pickupCount,
      cancelledOrMissedCount,
      unassignedCount,
      completionRate,
      avgOrderValue,
    };
  }, [adityamLeads]);

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cutoff =
      dateRange === 'TODAY'
        ? todayStart.getTime()
        : dateRange === '7D'
          ? now - 7 * 24 * 60 * 60 * 1000
          : dateRange === '30D'
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0;

    const q = searchQuery.trim().toLowerCase();

    return adityamLeads.filter((b) => {
      if (cutoff > 0 && new Date(b.created_at).getTime() < cutoff) return false;

      const st = (b.status || '').toUpperCase();
      if (roleTab === 'CALL_OPS' && (st === 'COMPLETED' || st === 'CANCELLED' || st === 'MISSED')) {
        return false;
      }

      if (statusFilter === 'NEEDS_QUOTE' && !['PENDING_QUOTE', 'RX_PENDING', 'PENDING'].includes(st)) {
        return false;
      }
      if (statusFilter === 'CONFIRMED' && st !== 'CONFIRMED' && st !== 'PAID') return false;
      if (statusFilter === 'SAMPLE_COLLECTED' && st !== 'SAMPLE_COLLECTED') return false;
      if (statusFilter === 'PROCESSING' && st !== 'PROCESSING') return false;
      if (statusFilter === 'COMPLETED' && st !== 'COMPLETED' && st !== 'SERVED') return false;
      if (statusFilter === 'LOST' && st !== 'CANCELLED' && st !== 'MISSED') return false;

      if (!q) return true;
      return (
        (b.booking_ref || '').toLowerCase().includes(q) ||
        (b.patient_name || '').toLowerCase().includes(q) ||
        (b.patient_phone || '').toLowerCase().includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.assigned_agent || '').toLowerCase().includes(q) ||
        (b.notes || '').toLowerCase().includes(q)
      );
    });
  }, [adityamLeads, dateRange, roleTab, statusFilter, searchQuery]);

  const pagedLeads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, page]);

  const openManageModal = (lead: Booking) => {
    setEditingLead(lead);
    setEditStatus((lead.status || 'CONFIRMED').toUpperCase());
    setEditAgent(lead.assigned_agent || '');
    const net = Number(lead.final_payable || lead.bill_amount || lead.doctor_fee || 0);
    const mrp = Number(lead.bill_amount || net || 0);
    const disc = Number(lead.discount_amount || Math.max(0, mrp - net));
    setEditMrp(String(mrp));
    setEditDiscount(String(disc));
    setEditNet(String(net));
    setEditNotes(lead.notes || '');
  };

  const handleSaveLead = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const mrpVal = Number(editMrp) || 0;
      const discVal = Number(editDiscount) || 0;
      const netVal = Number(editNet) || Math.max(0, mrpVal - discVal);

      const { error } = await supabase
        .from('bookings')
        .update({
          status: editStatus,
          assigned_agent: editAgent.trim() || null,
          bill_amount: mrpVal,
          discount_amount: discVal,
          final_payable: netVal,
          notes: editNotes.trim() || null,
        })
        .eq('id', editingLead.id);

      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setEditingLead(null);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Booking Ref',
      'Created At',
      'Patient Name',
      'Patient Phone',
      'Tests / Package',
      'Collection Address',
      'Slot',
      'Status',
      'Assigned Agent',
      'MRP (INR)',
      'Discount (INR)',
      'Net Payable (INR)',
    ];

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredLeads.map((b) => {
      const net = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
      const mrp = Number(b.bill_amount || net || 0);
      const disc = Number(b.discount_amount || Math.max(0, mrp - net));
      return [
        b.booking_ref,
        new Date(b.created_at).toLocaleString('en-IN'),
        b.patient_name || 'Patient',
        b.patient_phone || '',
        b.doctor_name || 'Home Lab Panel',
        extractAddress(b),
        b.slot_time || '',
        b.status,
        b.assigned_agent || 'Unassigned',
        mrp,
        disc,
        net,
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adityam-niramayaa-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('CSV Ready', `Prepared ${filteredLeads.length} leads for export on web.`);
    }
  };

  const handleCall = (phone?: string | null) => {
    const clean = normalizePhone(phone);
    if (!clean) return;
    Linking.openURL(`tel:+${clean}`);
  };

  const handleWhatsApp = (b: Booking) => {
    const clean = normalizePhone(b.patient_phone);
    if (!clean) return;
    const msg = encodeURIComponent(
      `Namaste ${b.patient_name || ''}, this is Adityam Niramayaa Diagnostics regarding your booking #${b.booking_ref} (${b.doctor_name || 'Lab Tests'}).`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  };

  return (
    <View style={{ gap: 18 }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ gap: 6 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} color={THEME.greenPrimary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.greenPrimary }}>
              Back to Labs & Scans
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: THEME.greenSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical size={20} color={THEME.greenPrimary} />
            </View>
            <View>
              <Text style={{ fontSize: 21, fontWeight: '900', color: THEME.ink }}>
                Adityam Niramayaa · Leads & Stats
              </Text>
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                Dedicated Call Desk, Operations & Finance view for Adityam own home collection & diagnostics
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={handleExportCsv}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: THEME.surface,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 9,
            }}
          >
            <Download size={15} color={THEME.greenPrimary} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenPrimary }}>
              Export CSV
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 9,
            }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={14} color="#FFFFFF" />
            )}
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top 4 KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 165,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
            Total Net Revenue
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {formatInr(stats.totalNetRevenue)}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            {stats.completedCount} completed · {stats.activeCount} active · AOV {formatInr(stats.avgOrderValue)}
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 165,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            7-Day Sales & Today
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(stats.weeklySales)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.weeklyCount} leads (7d) · Today {formatInr(stats.todaySales)}
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 165,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Active Call & Ops Queue
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {stats.activeCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.rxQuoteCount} needs quote · {stats.unassignedCount} unassigned
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 165,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Discounts & Conversion
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {stats.completionRate}%
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {formatInr(stats.totalDiscounts)} discount · {stats.cancelledOrMissedCount} cancelled/missed
          </Text>
        </View>
      </View>

      {/* Role Switcher + Finance Strip */}
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
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: isDesktop ? 'center' : 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(
              [
                { id: 'ALL', label: `All Leads (${adityamLeads.length})` },
                { id: 'CALL_OPS', label: `Call & Ops Queue (${stats.activeCount})` },
                { id: 'FINANCE', label: 'Finance & Ledger' },
              ] as { id: RoleTab; label: string }[]
            ).map((tab) => {
              const active = roleTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    setRoleTab(tab.id);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: active ? THEME.greenDark : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenDark : THEME.border,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: active ? '#FFFFFF' : THEME.ink,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date range selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: '7D', label: 'Last 7d' },
                { id: '30D', label: 'Last 30d' },
                { id: 'ALL', label: 'All Time' },
              ] as { id: DateRange; label: string }[]
            ).map((d) => {
              const active = dateRange === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => {
                    setDateRange(d.id);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenPrimary : THEME.border,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: active ? THEME.greenPrimary : THEME.muted,
                    }}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {roleTab === 'FINANCE' && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              backgroundColor: THEME.creamBg,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ minWidth: 140, flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>GROSS MRP</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.ink, marginTop: 2 }}>
                {formatInr(stats.totalGross)}
              </Text>
            </View>
            <View style={{ minWidth: 140, flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>DISCOUNTS GIVEN</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.amberText, marginTop: 2 }}>
                -{formatInr(stats.totalDiscounts)}
              </Text>
            </View>
            <View style={{ minWidth: 140, flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>SETTLED / COMPLETED</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.greenPrimary, marginTop: 2 }}>
                {formatInr(stats.completedRevenue)}
              </Text>
            </View>
            <View style={{ minWidth: 140, flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ACTIVE PIPELINE</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.blueText, marginTop: 2 }}>
                {formatInr(stats.pendingPipelineValue)}
              </Text>
            </View>
            <View style={{ minWidth: 140, flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>LOST (CANCEL/MISSED)</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.redText, marginTop: 2 }}>
                {formatInr(stats.lostValue)}
              </Text>
            </View>
          </View>
        )}

        {/* Search & Status Filter */}
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: isDesktop ? 'center' : 'stretch',
            gap: 10,
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
              onChangeText={(t) => {
                setSearchQuery(t);
                setPage(1);
              }}
              placeholder="Search client, phone, #AN-LAB ref, test, address, or agent..."
              placeholderTextColor={THEME.muted}
              style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: THEME.ink }}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {(
              [
                { id: 'ALL', label: 'All Statuses' },
                { id: 'NEEDS_QUOTE', label: 'Needs Quote' },
                { id: 'CONFIRMED', label: 'Confirmed' },
                { id: 'SAMPLE_COLLECTED', label: 'Collected' },
                { id: 'PROCESSING', label: 'Processing' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'LOST', label: 'Cancelled / Missed' },
              ] as { id: StatusFilter; label: string }[]
            ).map((s) => {
              const active = statusFilter === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    setStatusFilter(s.id);
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenPrimary : THEME.border,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: active ? THEME.greenPrimary : THEME.muted,
                    }}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Excel-Style Leads Table */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          overflow: 'hidden',
        }}
      >
        <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator>
          <View style={{ minWidth: isDesktop ? '100%' : 900, flex: 1 }}>
            {/* Table Header */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: THEME.creamBg,
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: THEME.border,
              }}
            >
              <Text style={{ flex: 1.1, fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                REF & DATE
              </Text>
              <Text style={{ flex: 1.3, fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                CLIENT & PHONE
              </Text>
              <Text style={{ flex: 2.0, fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                TESTS / ADDRESS & SLOT
              </Text>
              <Text style={{ flex: 1.2, fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                STATUS & AGENT
              </Text>
              <Text style={{ flex: 1.1, fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                MRP / DISC / NET
              </Text>
              <Text
                style={{
                  flex: 1.3,
                  fontSize: 10.5,
                  fontWeight: '800',
                  color: THEME.muted,
                  textAlign: 'right',
                }}
              >
                CALL / MANAGE
              </Text>
            </View>

            {pagedLeads.length === 0 ? (
              <View style={{ padding: 36, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                  No Adityam Niramayaa leads match these filters
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  Try switching the date range to All Time or clearing your search query.
                </Text>
              </View>
            ) : (
              pagedLeads.map((b, idx) => {
                const badge = getStatusBadge(b.status);
                const net = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
                const mrp = Number(b.bill_amount || net || 0);
                const disc = Number(b.discount_amount || Math.max(0, mrp - net));

                return (
                  <View
                    key={b.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: idx === pagedLeads.length - 1 ? 0 : 1,
                      borderBottomColor: THEME.border,
                      backgroundColor: idx % 2 === 1 ? '#FCFBF8' : THEME.surface,
                    }}
                  >
                    {/* REF & DATE */}
                    <View style={{ flex: 1.1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                        #{b.booking_ref}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        {new Date(b.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        ·{' '}
                        {new Date(b.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {/* CLIENT & PHONE */}
                    <View style={{ flex: 1.3, paddingRight: 8 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                        {b.patient_name || 'Patient'}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        {b.patient_phone || 'No phone'}
                      </Text>
                    </View>

                    {/* TESTS / ADDRESS & SLOT */}
                    <View style={{ flex: 2.0, paddingRight: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }} numberOfLines={1}>
                        {b.doctor_name || 'Home Collection / Rx Tests'}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }} numberOfLines={1}>
                        {extractAddress(b)} {b.slot_time ? `· ${b.slot_time}` : ''}
                      </Text>
                    </View>

                    {/* STATUS & AGENT */}
                    <View style={{ flex: 1.2, paddingRight: 8, gap: 4 }}>
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: badge.bg,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: badge.text }}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: b.assigned_agent ? THEME.ink : THEME.amberText }} numberOfLines={1}>
                        {b.assigned_agent ? `Agent: ${b.assigned_agent}` : 'Unassigned'}
                      </Text>
                    </View>

                    {/* MRP / DISC / NET */}
                    <View style={{ flex: 1.1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: THEME.ink }}>
                        {formatInr(net)}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                        MRP {formatInr(mrp)} {disc > 0 ? `· -${formatInr(disc)}` : ''}
                      </Text>
                    </View>

                    {/* CALL / MANAGE */}
                    <View
                      style={{
                        flex: 1.3,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 6,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleCall(b.patient_phone)}
                        style={{
                          padding: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.creamBg,
                          borderWidth: 1,
                          borderColor: THEME.border,
                        }}
                      >
                        <Phone size={13} color={THEME.ink} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleWhatsApp(b)}
                        style={{
                          padding: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                        }}
                      >
                        <MessageCircle size={13} color={THEME.greenPrimary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openManageModal(b)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.greenDark,
                        }}
                      >
                        <Edit3 size={12} color="#FFFFFF" />
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                          Manage
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: THEME.border }}>
          <AdminPagination
            totalCount={filteredLeads.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="leads"
          />
        </View>
      </View>

      {/* Manage Lead Modal (Call Desk + Finance Update) */}
      <Modal
        visible={Boolean(editingLead)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingLead(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(14, 34, 27, 0.48)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 540,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.ink }}>
                  Manage Lead #{editingLead?.booking_ref}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  {editingLead?.patient_name || 'Patient'} · {editingLead?.patient_phone || 'No phone'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingLead(null)}>
                <X size={20} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            {/* Status Pills */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted }}>LEAD STATUS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {STATUS_OPTIONS.map((st) => {
                  const active = editStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setEditStatus(st)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: active ? THEME.greenDark : THEME.creamBg,
                        borderWidth: 1,
                        borderColor: active ? THEME.greenDark : THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                        {st.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Assigned Agent */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UserCheck size={13} color={THEME.muted} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted }}>
                  ASSIGNED CALL / PHLEBOTOMY AGENT
                </Text>
              </View>
              <TextInput
                value={editAgent}
                onChangeText={setEditAgent}
                placeholder="e.g. Rahul (Phlebotomist) or Priya (Call Desk)"
                placeholderTextColor={THEME.muted}
                style={{
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 13,
                  color: THEME.ink,
                }}
              />
            </View>

            {/* Finance Amounts */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <IndianRupee size={13} color={THEME.muted} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted }}>
                  FINANCE & QUOTE AMOUNTS (INR)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10.5, color: THEME.muted, marginBottom: 4 }}>MRP</Text>
                  <TextInput
                    value={editMrp}
                    onChangeText={setEditMrp}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 9,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10.5, color: THEME.muted, marginBottom: 4 }}>Discount</Text>
                  <TextInput
                    value={editDiscount}
                    onChangeText={setEditDiscount}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 9,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10.5, color: THEME.muted, marginBottom: 4 }}>Net Payable</Text>
                  <TextInput
                    value={editNet}
                    onChangeText={setEditNet}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 9,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      fontWeight: '800',
                      color: THEME.greenPrimary,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Call / Finance Notes */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted }}>
                CALL / FINANCE NOTES & ADDRESS
              </Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
                placeholder="Call outcome, sample pickup notes, or payment verification..."
                placeholderTextColor={THEME.muted}
                style={{
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 12.5,
                  color: THEME.ink,
                  minHeight: 72,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setEditingLead(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveLead}
                disabled={saving}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: THEME.greenDark,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CheckCircle2 size={15} color="#FFFFFF" />
                )}
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
