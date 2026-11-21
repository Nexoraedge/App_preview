import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileImage,
  HelpCircle,
  MessageCircle,
  Phone,
  Search,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, BookingStatus, ServiceType } from '@adityam/types';
import { AdminListSkeleton } from '../AdminSkeleton';
import { getSourcePanelForRole, useAdminAuth } from '../AdminAuthGate';
import { logAdminAudit } from '../../../src/services/adminAudit';
import { CrmActivityModal } from '../CrmActivityModal';
import { SelectDropdown } from '../SelectDropdown';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2EA',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  amberText: '#9A5B13',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  redText: '#991B1B',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
};

interface LiveBookingsSectionProps {
  bookings: Booking[];
  isLoading: boolean;
  lastSyncedAt?: string;
  initialServiceFilter?: 'ALL' | ServiceType;
  onRefresh: () => void;
  onInspectBooking: (booking: Booking) => void;
}

function formatInr(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function formatTimeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getStatusBadge(status: BookingStatus) {
  switch (status) {
    case 'NEW':
      return { bg: THEME.amberBg, border: THEME.amberBorder, text: THEME.amberText };
    case 'CALLING':
      return { bg: '#EEF4FF', border: '#C7D9FA', text: '#1D4ED8' };
    case 'CONFIRMED':
    case 'PAID':
    case 'COMPLETED':
      return { bg: THEME.greenSoft, border: THEME.greenBorder, text: THEME.greenDark };
    case 'CANCELLED':
      return { bg: THEME.redBg, border: THEME.redBorder, text: THEME.redText };
    default:
      return { bg: THEME.surfaceAlt, border: THEME.border, text: THEME.muted };
  }
}

export function LiveBookingsSection({
  bookings,
  isLoading,
  lastSyncedAt,
  initialServiceFilter = 'ALL',
  onRefresh,
  onInspectBooking,
}: LiveBookingsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { adminUser } = useAdminAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | ServiceType>(initialServiceFilter);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | BookingStatus>('ACTIVE');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('7D');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | 'MISSED' | 'UPCOMING' | 'NONE'>('ALL');
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [crmTarget, setCrmTarget] = useState<Booking | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50>(25);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [partnerPhoneMap, setPartnerPhoneMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const [hospRes, docRes, labRes, pharmRes] = await Promise.all([
          supabase.from('hospitals').select('id, name, contact_number, secondary_contact_number'),
          supabase.from('doctors').select('id, name, phone'),
          supabase.from('lab_centres').select('id, name, phone'),
          supabase.from('pharmacies').select('id, name, phone'),
        ]);
        if (!active) return;
        const map: Record<string, string> = {};
        const addEntry = (id?: string | null, name?: string | null, phone?: string | null) => {
          const clean = (phone || '').trim();
          if (!clean) return;
          if (id) map[id] = clean;
          if (name) map[name.trim().toLowerCase()] = clean;
        };
        (hospRes.data || []).forEach((h: any) =>
          addEntry(h.id, h.name, h.contact_number || h.secondary_contact_number)
        );
        (docRes.data || []).forEach((d: any) => addEntry(d.id, d.name, d.phone));
        (labRes.data || []).forEach((l: any) => addEntry(l.id, l.name, l.phone));
        (pharmRes.data || []).forEach((p: any) => addEntry(p.id, p.name, p.phone));
        setPartnerPhoneMap(map);
      } catch {
        // Non-blocking lookup
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const nowMs = Date.now();
    const SLA_MS = 15 * 60 * 1000;
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    let newCount = 0;
    let slaBreachCount = 0;
    let callingCount = 0;
    let confirmedCount = 0;
    let completedThisWeek = 0;

    bookings.forEach((b) => {
      if (b.status === 'NEW') {
        newCount += 1;
        const createdMs = new Date(b.created_at).getTime();
        if (!Number.isNaN(createdMs) && nowMs - createdMs > SLA_MS) {
          slaBreachCount += 1;
        }
      }
      else if (b.status === 'CALLING') callingCount += 1;
      else if (b.status === 'CONFIRMED' || b.status === 'PAID') confirmedCount += 1;
      if (b.status === 'COMPLETED') {
        const createdMs = new Date(b.created_at).getTime();
        if (!Number.isNaN(createdMs) && nowMs - createdMs <= WEEK_MS) {
          completedThisWeek += 1;
        }
      }
    });
    return { newCount, slaBreachCount, callingCount, confirmedCount, completedThisWeek };
  }, [bookings]);

  const followUpCounts = useMemo(() => {
    const nowMs = Date.now();
    let missed = 0;
    let upcoming = 0;
    bookings.forEach((b) => {
      if (b.status === 'COMPLETED' || b.status === 'CANCELLED') return;
      const fu = (b as any).follow_up_at;
      if (!fu) return;
      const ms = new Date(fu).getTime();
      if (!Number.isNaN(ms)) {
        if (ms < nowMs) missed += 1;
        else upcoming += 1;
      }
    });
    return { missed, upcoming };
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const nowMs = now.getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const cutoff =
      dateFilter === 'TODAY'
        ? todayStart
        : dateFilter === '7D'
        ? Date.now() - 7 * 86400000
        : dateFilter === '30D'
        ? Date.now() - 30 * 86400000
        : 0;

    return bookings.filter((b) => {
      if (cutoff > 0 && new Date(b.created_at).getTime() < cutoff) return false;
      if (serviceFilter !== 'ALL' && b.service_type !== serviceFilter) return false;
      if (statusFilter === 'ACTIVE') {
        if (b.status === 'COMPLETED' || b.status === 'CANCELLED') return false;
      } else if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }
      if (followUpFilter !== 'ALL') {
        const fu = (b as any).follow_up_at;
        const fuMs = fu ? new Date(fu).getTime() : NaN;
        if (followUpFilter === 'MISSED') {
          if (!fu || Number.isNaN(fuMs) || fuMs >= nowMs || b.status === 'COMPLETED' || b.status === 'CANCELLED') return false;
        } else if (followUpFilter === 'UPCOMING') {
          if (!fu || Number.isNaN(fuMs) || fuMs < nowMs || b.status === 'COMPLETED' || b.status === 'CANCELLED') return false;
        } else if (followUpFilter === 'NONE') {
          if (fu) return false;
        }
      }
      if (!q) return true;
      return (
        (b.booking_ref || '').toLowerCase().includes(q) ||
        (b.patient_name || '').toLowerCase().includes(q) ||
        (b.patient_phone || '').toLowerCase().includes(q) ||
        (b.hospital_name || '').toLowerCase().includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, dateFilter, serviceFilter, statusFilter, followUpFilter, searchQuery]);

  const handleExportCsv = () => {
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Booking Ref', 'Patient', 'Phone', 'Service', 'Partner', 'Slot', 'Amount', 'Status', 'Created At'];
    const rows = filtered.map((b) => [
      b.booking_ref || '',
      b.patient_name || '',
      b.patient_phone || '',
      b.service_type || '',
      b.hospital_name || b.doctor_name || 'Adityam Concierge',
      b.slot_time || '',
      Number(b.final_payable ?? b.bill_amount ?? b.doctor_fee ?? 0),
      b.status,
      new Date(b.created_at).toLocaleString('en-IN'),
    ]);
    const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const filename = `adityam-live-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('CSV Ready', `${filename} (${rows.length} rows) is available on Web Admin.`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  const handleQuickStatus = async (b: Booking, nextStatus: BookingStatus) => {
    setUpdatingId(b.id);
    try {
      const supabase = getSupabaseClient();
      const nextAgent =
        nextStatus === 'CALLING' && !b.assigned_agent && adminUser?.fullName
          ? adminUser.fullName
          : b.assigned_agent || null;
      const { error } = await supabase
        .from('bookings')
        .update({
          status: nextStatus,
          assigned_agent: nextAgent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', b.id);
      if (!error) {
        if (adminUser) {
          logAdminAudit({
            actorId: adminUser.id,
            actorName: adminUser.fullName,
            actorRole: adminUser.role,
            sourcePanel: getSourcePanelForRole(adminUser.role),
            action: 'BOOKING_STATUS_UPDATED',
            entityType: 'booking',
            entityId: b.booking_ref || b.id,
            details: { prevStatus: b.status, nextStatus, assignedAgent: nextAgent },
          });
        }
        onRefresh();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* 4 Live Operations KPIs */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setStatusFilter(statusFilter === 'NEW' ? 'ALL' : 'NEW');
            setPage(1);
          }}
          style={{
            flex: 1,
            backgroundColor: statusFilter === 'NEW' ? THEME.amberBg : THEME.greenDark,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: statusFilter === 'NEW' ? THEME.amberBorder : THEME.greenDark,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: statusFilter === 'NEW' ? THEME.amberText : '#A7D7C0',
              letterSpacing: 0.6,
            }}
          >
            NEW REQUESTS
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: statusFilter === 'NEW' ? THEME.amberText : '#FFFFFF',
              marginTop: 6,
            }}
          >
            {stats.newCount}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: statusFilter === 'NEW' ? THEME.amberText : '#C6E2D4',
              marginTop: 4,
            }}
          >
            {stats.slaBreachCount > 0
              ? `${stats.slaBreachCount} SLA breach (>15m)`
              : 'Waiting for first callback'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setStatusFilter(statusFilter === 'CALLING' ? 'ALL' : 'CALLING');
            setPage(1);
          }}
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: statusFilter === 'CALLING' ? '#1D4ED8' : THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
              CALLING / IN TRIAGE
            </Text>
            <Clock size={15} color="#1D4ED8" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 6 }}>
            {stats.callingCount}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Coordinator assigned
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setStatusFilter(statusFilter === 'CONFIRMED' ? 'ALL' : 'CONFIRMED');
            setPage(1);
          }}
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: statusFilter === 'CONFIRMED' ? THEME.green : THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
              CONFIRMED / PAID
            </Text>
            <CalendarCheck size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.green, marginTop: 6 }}>
            {stats.confirmedCount}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Scheduled or ready
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setStatusFilter(statusFilter === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED');
            setPage(1);
          }}
          style={{
            flex: 1,
            backgroundColor: statusFilter === 'COMPLETED' ? THEME.greenSoft : THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: statusFilter === 'COMPLETED' ? THEME.green : THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
              COMPLETED THIS WEEK
            </Text>
            <CheckCircle2 size={15} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 6 }}>
            {stats.completedThisWeek}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            {lastSyncedAt ? `Last 7 days · Synced ${lastSyncedAt}` : 'Last 7 days'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Toolbar */}
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
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 10,
            alignItems: isDesktop ? 'center' : 'stretch',
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Search size={15} color={THEME.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={(v) => {
                setSearchQuery(v);
                setPage(1);
              }}
              placeholder="Search booking ref, patient, phone, hospital, or doctor..."
              placeholderTextColor={THEME.muted}
              style={{ flex: 1, fontSize: 13, color: THEME.ink, outlineStyle: 'none' } as any}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={THEME.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowStatusGuide((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: showStatusGuide ? THEME.greenSoft : THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: showStatusGuide ? THEME.green : THEME.border,
              }}
            >
              <HelpCircle size={13} color={showStatusGuide ? THEME.green : THEME.ink} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: showStatusGuide ? THEME.greenDark : THEME.ink }}>
                Status Guide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCsv}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Download size={13} color={THEME.ink} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStatusGuide && (
          <View
            style={{
              backgroundColor: THEME.bg,
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.ink }}>
              BOOKING STATUS MEANING (FOR TEAM & CLIENTS)
            </Text>
            <Text style={{ fontSize: 11.5, color: THEME.muted, lineHeight: 18 }}>
              <Text style={{ fontWeight: '800', color: THEME.amberText }}>NEW</Text> = Request received, needs first call ·{' '}
              <Text style={{ fontWeight: '800', color: '#1D4ED8' }}>CALLING</Text> = Coordinator coordinating ·{' '}
              <Text style={{ fontWeight: '800', color: THEME.greenDark }}>CONFIRMED</Text> = Slot/order booked, payment pending ·{' '}
              <Text style={{ fontWeight: '800', color: THEME.green }}>PAID</Text> = Paid online, awaiting visit/delivery ·{' '}
              <Text style={{ fontWeight: '800', color: THEME.greenDark }}>COMPLETED</Text> = Visit/delivery done, ready for partner payout
            </Text>
          </View>
        )}

        {/* Clean 4-Dropdown Filter Row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <SelectDropdown
              label="Service"
              value={serviceFilter}
              options={[
                { value: 'ALL', label: 'All Services' },
                { value: 'OPD_CONCIERGE', label: 'OPD Consultations' },
                { value: 'INVESTIGATION', label: 'Labs & Scans' },
                { value: 'PHARMACY_SCAN_PAY', label: 'Pharmacy' },
                { value: 'IPD_ENQUIRY', label: 'IPD Admissions' },
              ]}
              onChange={(v) => {
                setServiceFilter(v as any);
                setPage(1);
              }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <SelectDropdown
              label="Date Range"
              value={dateFilter}
              options={[
                { value: '7D', label: 'Last 7 Days' },
                { value: 'TODAY', label: 'Today' },
                { value: '30D', label: 'Last 30 Days' },
                { value: 'ALL', label: 'All Dates' },
              ]}
              onChange={(v) => {
                setDateFilter(v as any);
                setPage(1);
              }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <SelectDropdown
              label="Status"
              value={statusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'NEW', label: 'NEW' },
                { value: 'CALLING', label: 'CALLING' },
                { value: 'CONFIRMED', label: 'CONFIRMED' },
                { value: 'PAID', label: 'PAID' },
                { value: 'COMPLETED', label: 'COMPLETED' },
                { value: 'CANCELLED', label: 'CANCELLED' },
              ]}
              onChange={(v) => {
                setStatusFilter(v as any);
                setPage(1);
              }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <SelectDropdown
              label="Follow-Up"
              value={followUpFilter}
              options={[
                { value: 'ALL', label: 'All Follow-ups' },
                { value: 'MISSED', label: `Missed Follow-Up (${followUpCounts.missed})` },
                { value: 'UPCOMING', label: `Upcoming Follow-Up (${followUpCounts.upcoming})` },
                { value: 'NONE', label: 'No Follow-Up' },
              ]}
              onChange={(v) => {
                setFollowUpFilter(v as any);
                setPage(1);
              }}
            />
          </View>
        </View>
      </View>

      {/* Bookings List */}
      {isLoading ? (
        <AdminListSkeleton rows={6} />
      ) : paged.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 36,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.ink }}>
            No matching bookings
          </Text>
          <Text style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
            Try adjusting your service or status filters.
          </Text>
        </View>
      ) : isDesktop ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: 'hidden',
          }}
        >
          {/* Spreadsheet Table Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: THEME.surfaceAlt,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
              gap: 10,
            }}
          >
            <Text style={{ flex: 1.15, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              REF & SERVICE
            </Text>
            <Text style={{ flex: 1.15, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              PATIENT
            </Text>
            <Text style={{ flex: 1.35, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              PARTNER / DOCTOR
            </Text>
            <Text style={{ flex: 1.25, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              SLOT / PURPOSE
            </Text>
            <Text style={{ flex: 0.85, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
              STATUS
            </Text>
            <Text style={{ flex: 0.6, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5, textAlign: 'right' }}>
              FEE
            </Text>
            <Text style={{ width: 170, fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5, textAlign: 'right' }}>
              ACTIONS
            </Text>
          </View>

          {/* Spreadsheet Rows (Click row to open /admin/bookings/[ref]) */}
          {paged.map((b, idx) => {
            const badge = getStatusBadge(b.status);
            const waPhone = normalizePhone(b.patient_phone);
            const payable = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
            const cleanPurpose = b.notes
              ? String(b.notes)
                  .replace(/Counter OTP:\s*\d+\.?/gi, '')
                  .replace(/Paid online via [^.]+\.?/gi, '')
                  .replace(/Direct OPD consult booked for [^.]+\.?/gi, '')
                  .replace(/Priority QR pass issued\.?/gi, '')
                  .replace(/^Reason\s*\/\s*Symptoms:\s*/i, '')
                  .trim()
                  .replace(/\.$/, '')
              : '';
            const serviceShort = String(b.service_type || '').includes('OPD')
              ? 'OPD'
              : String(b.service_type || '').includes('PHARMACY')
                ? 'PHARMACY'
                : String(b.service_type || '').includes('INVESTIGATION') || String(b.service_type || '').includes('LAB')
                  ? 'LABS'
                  : String(b.service_type || '').includes('IPD')
                    ? 'IPD'
                    : b.service_type;

            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => onInspectBooking(b)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  gap: 10,
                  backgroundColor: idx % 2 === 1 ? '#FCFBF8' : THEME.surface,
                  borderBottomWidth: idx === paged.length - 1 ? 0 : 1,
                  borderBottomColor: '#EFECE3',
                }}
              >
                {/* Ref & Service */}
                <View style={{ flex: 1.15, gap: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                    {b.booking_ref}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: THEME.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted }}>{serviceShort}</Text>
                    </View>
                    {b.bill_image_url ? (
                      <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.amberText }}>Rx</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Patient */}
                <View style={{ flex: 1.15, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                    {b.patient_name}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted }} numberOfLines={1}>
                    {b.patient_phone || 'N/A'}
                  </Text>
                </View>

                {/* Partner / Doctor */}
                <View style={{ flex: 1.35, gap: 2 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                    {b.hospital_name || 'Adityam Concierge'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.green, fontWeight: '600' }} numberOfLines={1}>
                    {b.doctor_name || formatTimeAgo(b.created_at)}
                  </Text>
                </View>

                {/* Slot / Purpose */}
                <View style={{ flex: 1.25, gap: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                    {b.slot_time || formatTimeAgo(b.created_at)}
                  </Text>
                  <Text style={{ fontSize: 11, color: cleanPurpose ? THEME.amberText : THEME.muted }} numberOfLines={1}>
                    {cleanPurpose || formatTimeAgo(b.created_at)}
                  </Text>
                </View>

                {/* Status */}
                <View style={{ flex: 0.85, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      backgroundColor: badge.bg,
                      borderWidth: 1,
                      borderColor: badge.border,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 99,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: badge.text }}>
                      {b.status === 'PAID' ? 'PAID ONLINE' : b.status}
                    </Text>
                  </View>
                </View>

                {/* Fee */}
                <View style={{ flex: 0.6, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: payable > 0 ? THEME.greenDark : THEME.muted }}>
                    {payable > 0 ? formatInr(payable) : '—'}
                  </Text>
                </View>

                {/* Quick Actions */}
                <View style={{ width: 170, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
                  {b.patient_phone ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        Linking.openURL(`tel:${b.patient_phone}`);
                      }}
                      style={{
                        padding: 6,
                        borderRadius: 7,
                        backgroundColor: THEME.surfaceAlt,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <Phone size={13} color={THEME.ink} />
                    </TouchableOpacity>
                  ) : null}
                  {waPhone ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        Linking.openURL(`https://wa.me/${waPhone}`);
                      }}
                      style={{
                        padding: 6,
                        borderRadius: 7,
                        backgroundColor: THEME.greenSoft,
                        borderWidth: 1,
                        borderColor: THEME.greenBorder,
                      }}
                    >
                      <MessageCircle size={13} color={THEME.greenDark} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setCrmTarget(b);
                    }}
                    style={{
                      padding: 6,
                      borderRadius: 7,
                      backgroundColor: THEME.amberBg,
                      borderWidth: 1,
                      borderColor: THEME.amberBorder,
                    }}
                  >
                    <CalendarClock size={13} color={THEME.amberText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onInspectBooking(b)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 6,
                      borderRadius: 7,
                      backgroundColor: THEME.greenDark,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Open →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {paged.map((b) => {
            const badge = getStatusBadge(b.status);
            const payable = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => onInspectBooking(b)}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 12,
                  padding: 13,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>{b.booking_ref}</Text>
                  <View style={{ backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: badge.text }}>{b.status === 'PAID' ? 'PAID ONLINE' : b.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                  {b.patient_name} · {b.patient_phone}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }} numberOfLines={1}>
                  {b.hospital_name || b.doctor_name || 'Adityam Concierge'} {b.slot_time ? `· ${b.slot_time}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>
                    {payable > 0 ? formatInr(payable) : 'Unpriced'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Open Details →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: THEME.border,
            flexDirection: isDesktop ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 12.5, color: THEME.muted, fontWeight: '600' }}>
            Showing {startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of{' '}
            {filtered.length} bookings
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {([25, 50] as const).map((sz) => (
                <TouchableOpacity
                  key={sz}
                  onPress={() => {
                    setPageSize(sz);
                    setPage(1);
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 7,
                    backgroundColor: pageSize === sz ? THEME.greenDark : THEME.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: pageSize === sz ? '#FFFFFF' : THEME.ink,
                    }}
                  >
                    {sz}/pg
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                disabled={safePage <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: THEME.surfaceAlt,
                  opacity: safePage <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={16} color={THEME.ink} />
              </TouchableOpacity>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                Page {safePage} / {totalPages}
              </Text>
              <TouchableOpacity
                disabled={safePage >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: THEME.surfaceAlt,
                  opacity: safePage >= totalPages ? 0.4 : 1,
                }}
              >
                <ChevronRight size={16} color={THEME.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <CrmActivityModal
        visible={Boolean(crmTarget)}
        entityType="BOOKING"
        entityId={crmTarget?.booking_ref || crmTarget?.id || ''}
        title={crmTarget ? `${crmTarget.booking_ref} · ${crmTarget.patient_name}` : ''}
        subtitle={crmTarget ? `${crmTarget.patient_phone} · ${crmTarget.hospital_name || crmTarget.doctor_name || 'Concierge'}` : undefined}
        currentFollowUpAt={(crmTarget as any)?.follow_up_at || null}
        onClose={() => setCrmTarget(null)}
        onSaved={() => {
          onRefresh();
        }}
      />
    </View>
  );
}
