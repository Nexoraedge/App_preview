import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowDownLeft,
  BadgeIndianRupee,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  HelpCircle,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { AdminListSkeleton } from '../AdminSkeleton';
import { getSourcePanelForRole, useAdminAuth } from '../AdminAuthGate';
import { logAdminAudit } from '../../../src/services/adminAudit';

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

type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
type PaymentMethod = 'UPI' | 'CARD' | 'WALLET' | 'PAY_AT_CENTRE';
type RefundStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
type RefundMode = 'UPI_SOURCE' | 'WALLET' | 'BANK_NEFT';
type DateRangeFilter = 'TODAY' | '7D' | '30D' | '90D' | 'ALL';
type PartnerType = 'HOSPITAL' | 'LAB' | 'PHARMACY';

interface BookingFinanceRow extends Booking {
  payment_status?: PaymentStatus | string | null;
  payment_method?: PaymentMethod | string | null;
  payment_ref?: string | null;
  paid_at?: string | null;
}

interface RefundRequest {
  id: string;
  booking_id: string | null;
  booking_ref: string;
  user_id: string | null;
  patient_name: string;
  patient_phone: string;
  service_type: string | null;
  provider_name: string | null;
  refund_amount: number;
  refund_mode: RefundMode;
  reason: string;
  status: RefundStatus;
  utr_ref: string | null;
  admin_notes: string | null;
  requested_by: string | null;
  processed_at: string | null;
  created_at: string;
}

interface PartnerSettlementRow {
  id: string;
  partnerType: PartnerType;
  partnerId: string;
  partnerName: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  commissionAmount: number;
  netPayoutAmount: number;
  status: 'PENDING' | 'PAID';
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PartnerOption {
  id: string;
  name: string;
  commissionPct?: number;
}

interface PaymentsRefundsSectionProps {
  bookings: Booking[];
  onRefreshBookings?: () => void;
}

function formatInr(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isWithinDateRange(iso: string | null | undefined, range: DateRangeFilter): boolean {
  if (range === 'ALL') return true;
  if (!iso) return false;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return false;
  const now = new Date();
  if (range === 'TODAY') {
    return (
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate()
    );
  }
  const days = range === '7D' ? 7 : range === '90D' ? 90 : 30;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return dt.getTime() >= cutoff;
}

function getEffectivePaymentStatus(b: BookingFinanceRow): PaymentStatus | 'CANCELLED' {
  if (b.payment_status) {
    const up = String(b.payment_status).toUpperCase();
    if (up === 'PAID' || up === 'REFUNDED' || up === 'FAILED' || up === 'PENDING') {
      return up as PaymentStatus;
    }
  }
  if (b.status === 'CANCELLED') return 'CANCELLED';
  if (b.status === 'COMPLETED') return 'PAID';
  return 'PENDING';
}

function getServiceCategory(serviceType: string): 'OPD' | 'LAB' | 'MEDICINE' | 'OTHER' {
  const st = (serviceType || '').toLowerCase();
  if (st.includes('opd') || st.includes('doctor') || st.includes('hospital')) return 'OPD';
  if (st.includes('lab') || st.includes('scan') || st.includes('diag')) return 'LAB';
  if (st.includes('med') || st.includes('pharm') || st.includes('rx')) return 'MEDICINE';
  return 'OTHER';
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    Alert.alert('CSV Export', 'CSV download is available on the web Admin Command Center.');
    return;
  }
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PaymentsRefundsSection({
  bookings,
  onRefreshBookings,
}: PaymentsRefundsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { adminUser } = useAdminAuth();

  const [subTab, setSubTab] = useState<'transactions' | 'refunds' | 'settlements'>('transactions');
  const [showFinanceGuide, setShowFinanceGuide] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [payFilter, setPayFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'OPD' | 'LAB' | 'MEDICINE'>('ALL');
  const [refundFilter, setRefundFilter] = useState<'ALL' | RefundStatus>('ALL');
  const [settlementTypeFilter, setSettlementTypeFilter] = useState<'ALL' | PartnerType>('ALL');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);

  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [settlements, setSettlements] = useState<PartnerSettlementRow[]>([]);
  const [hospitalOptions, setHospitalOptions] = useState<PartnerOption[]>([]);
  const [labOptions, setLabOptions] = useState<PartnerOption[]>([]);
  const [pharmacyOptions, setPharmacyOptions] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Mark Paid Modal (Booking)
  const [payModalBooking, setPayModalBooking] = useState<BookingFinanceRow | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payRefInput, setPayRefInput] = useState('');

  // Create / Initiate Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundBookingId, setRefundBookingId] = useState<string | null>(null);
  const [refundBookingRef, setRefundBookingRef] = useState('');
  const [refundUserId, setRefundUserId] = useState<string | null>(null);
  const [refundPatientName, setRefundPatientName] = useState('');
  const [refundPatientPhone, setRefundPatientPhone] = useState('');
  const [refundServiceType, setRefundServiceType] = useState('');
  const [refundProviderName, setRefundProviderName] = useState('');
  const [refundMaxPayable, setRefundMaxPayable] = useState<number | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundMode, setRefundMode] = useState<RefundMode>('UPI_SOURCE');
  const [refundReason, setRefundReason] = useState('');

  // Process Refund (UTR) Modal
  const [processRefundTarget, setProcessRefundTarget] = useState<RefundRequest | null>(null);
  const [processUtrInput, setProcessUtrInput] = useState('');
  const [processNotesInput, setProcessNotesInput] = useState('');

  // Record Partner Payout Modal
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutPartnerType, setPayoutPartnerType] = useState<PartnerType>('HOSPITAL');
  const [payoutPartnerId, setPayoutPartnerId] = useState('');
  const [payoutPeriodStart, setPayoutPeriodStart] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [payoutGrossInput, setPayoutGrossInput] = useState('');
  const [payoutCommissionInput, setPayoutCommissionInput] = useState('');
  const [payoutStatus, setPayoutStatus] = useState<'PENDING' | 'PAID'>('PAID');
  const [payoutRefInput, setPayoutRefInput] = useState('');

  // Mark Settlement Paid Modal
  const [markSettlementTarget, setMarkSettlementTarget] = useState<PartnerSettlementRow | null>(null);
  const [settlementUtrInput, setSettlementUtrInput] = useState('');
  const [showZeroRows, setShowZeroRows] = useState(false);

  const financeBookings = useMemo(
    () => ((bookings || []) as BookingFinanceRow[]).filter((b) => isWithinDateRange(b.created_at, dateRange)),
    [bookings, dateRange]
  );

  // Reset pagination when filters/tab change
  useEffect(() => {
    setPage(1);
  }, [subTab, dateRange, searchQuery, payFilter, serviceFilter, refundFilter, settlementTypeFilter, settlementStatusFilter, showZeroRows, pageSize]);

  const loadFinanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [
        refundsRes,
        hospPayoutsRes,
        pharmPayoutsRes,
        labPayoutsRes,
        hospsRes,
        pharmsRes,
        labsRes,
      ] = await Promise.all([
        supabase
          .from('refund_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('hospital_payouts')
          .select('*')
          .order('settled_at', { ascending: false })
          .limit(200),
        supabase
          .from('pharmacy_payouts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('lab_payouts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('hospitals').select('id, name, commission_percentage').order('name'),
        supabase.from('pharmacies').select('id, name, commission_percentage').order('name'),
        supabase.from('lab_centres').select('id, name, commission_percentage').order('name'),
      ]);

      if (!refundsRes.error && refundsRes.data) {
        setRefunds(refundsRes.data as RefundRequest[]);
      }

      const hospList = (hospsRes.data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        commissionPct: Number(h.commission_percentage ?? 10),
      })) as PartnerOption[];
      const pharmList = (pharmsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        commissionPct: Number(p.commission_percentage ?? 10),
      })) as PartnerOption[];
      const labList = (labsRes.data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        commissionPct: Number(l.commission_percentage ?? 10),
      })) as PartnerOption[];
      setHospitalOptions(hospList);
      setPharmacyOptions(pharmList);
      setLabOptions(labList);

      const hospMap = new Map<string, string>();
      hospList.forEach((h) => hospMap.set(h.id, h.name));
      const pharmMap = new Map<string, string>();
      pharmList.forEach((p) => pharmMap.set(p.id, p.name));
      const labMap = new Map<string, string>();
      labList.forEach((l) => labMap.set(l.id, l.name));

      const combinedSettlements: PartnerSettlementRow[] = [];

      if (!hospPayoutsRes.error && hospPayoutsRes.data) {
        hospPayoutsRes.data.forEach((h: any) => {
          const settledAt = h.settled_at || h.paid_at || h.created_at;
          const netAmt = Number(h.amount ?? h.net_payout_amount ?? 0);
          const grossAmt = Number(h.gross_amount ?? netAmt);
          const commAmt = Number(h.commission_amount ?? Math.max(0, grossAmt - netAmt));
          const isPending = String(h.status || 'PAID').toUpperCase() === 'PENDING';
          combinedSettlements.push({
            id: h.id,
            partnerType: 'HOSPITAL',
            partnerId: h.hospital_id,
            partnerName: hospMap.get(h.hospital_id) || 'Hospital',
            periodStart: h.period_start || h.period_label || (settledAt ? String(settledAt).slice(0, 10) : 'Weekly'),
            periodEnd: h.period_end || (settledAt ? String(settledAt).slice(0, 10) : ''),
            grossAmount: grossAmt,
            commissionAmount: commAmt,
            netPayoutAmount: netAmt,
            status: isPending ? 'PENDING' : 'PAID',
            paymentRef: h.utr_reference || h.payment_ref || null,
            paidAt: isPending ? null : settledAt || null,
            createdAt: h.created_at || settledAt || new Date().toISOString(),
          });
        });
      }

      (pharmPayoutsRes.data || []).forEach((p: any) => {
        combinedSettlements.push({
          id: p.id,
          partnerType: 'PHARMACY',
          partnerId: p.pharmacy_id,
          partnerName: pharmMap.get(p.pharmacy_id) || p.pharmacy_id || 'Pharmacy',
          periodStart: p.period_start,
          periodEnd: p.period_end,
          grossAmount: Number(p.gross_amount || 0),
          commissionAmount: Number(p.commission_amount || 0),
          netPayoutAmount: Number(p.net_payout_amount || 0),
          status: p.status === 'PAID' ? 'PAID' : 'PENDING',
          paymentRef: p.payment_ref || null,
          paidAt: p.paid_at || null,
          createdAt: p.created_at,
        });
      });

      (labPayoutsRes.data || []).forEach((l: any) => {
        combinedSettlements.push({
          id: l.id,
          partnerType: 'LAB',
          partnerId: l.centre_id || l.lab_centre_id,
          partnerName: labMap.get(l.centre_id || l.lab_centre_id) || l.centre_id || 'Lab Centre',
          periodStart: l.period_start,
          periodEnd: l.period_end,
          grossAmount: Number(l.gross_amount || 0),
          commissionAmount: Number(l.commission_amount || 0),
          netPayoutAmount: Number(l.net_payout_amount || 0),
          status: l.status === 'PAID' ? 'PAID' : 'PENDING',
          paymentRef: l.payment_ref || null,
          paidAt: l.paid_at || null,
          createdAt: l.created_at,
        });
      });

      combinedSettlements.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSettlements(combinedSettlements);
    } catch (err) {
      console.warn('[PaymentsRefunds] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Map of active/processed refunds by booking_ref to prevent double-refunding
  const activeRefundByBookingRef = useMemo(() => {
    const map = new Map<string, RefundRequest>();
    refunds.forEach((r) => {
      if (r.status !== 'REJECTED') {
        const key = (r.booking_ref || '').toUpperCase();
        if (key && !map.has(key)) {
          map.set(key, r);
        }
      }
    });
    return map;
  }, [refunds]);

  const dateFilteredRefunds = useMemo(
    () => refunds.filter((r) => isWithinDateRange(r.created_at, dateRange)),
    [refunds, dateRange]
  );

  const dateFilteredSettlements = useMemo(
    () => settlements.filter((s) => isWithinDateRange(s.createdAt, dateRange)),
    [settlements, dateRange]
  );

  const partnerWeeklyLedger = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const activeBookings = ((bookings || []) as BookingFinanceRow[]).filter((b) =>
      ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
    );

    const buildRows = (opts: PartnerOption[], type: PartnerType) =>
      opts.map((opt) => {
        const nameLow = opt.name.toLowerCase();
        const partnerBookings = activeBookings.filter((b) => {
          if (type === 'HOSPITAL' && b.hospital_id === opt.id) return true;
          const hn = (b.hospital_name || '').toLowerCase();
          return hn && (hn === nameLow || hn.includes(nameLow) || nameLow.includes(hn));
        });

        const weeklyGross = partnerBookings
          .filter((b) => new Date(b.created_at).getTime() >= sevenDaysAgo)
          .reduce((s, b) => s + Number(b.final_payable ?? b.bill_amount ?? b.doctor_fee ?? 0), 0);
        const monthlyGross = partnerBookings
          .filter((b) => new Date(b.created_at).getTime() >= monthStart)
          .reduce((s, b) => s + Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0), 0);

        const commPct = opt.commissionPct ?? 10;
        const netRate = Math.max(0, 100 - commPct) / 100;
        const weeklyNetTotal = Math.round(weeklyGross * netRate);
        const weeklyCommTotal = Math.max(0, Math.round(weeklyGross) - weeklyNetTotal);

        const partnerPayouts = settlements.filter(
          (s) => s.partnerType === type && s.partnerId === opt.id && s.status === 'PAID'
        );
        const paidThisWeek = partnerPayouts
          .filter((s) => new Date(s.paidAt || s.createdAt).getTime() >= sevenDaysAgo)
          .reduce((s, p) => s + Number(p.netPayoutAmount || 0), 0);
        const monthlyPaid = partnerPayouts
          .filter((s) => new Date(s.paidAt || s.createdAt).getTime() >= monthStart)
          .reduce((s, p) => s + Number(p.netPayoutAmount || 0), 0);

        const weeklyDue = Math.max(0, weeklyNetTotal - paidThisWeek);
        const status: 'PAID' | 'DUE' | 'CLEAR' =
          weeklyDue > 0 ? 'DUE' : paidThisWeek > 0 ? 'PAID' : 'CLEAR';

        return {
          partnerType: type,
          partnerId: opt.id,
          partnerName: opt.name,
          commissionPct: commPct,
          weeklyGross: Math.round(weeklyGross),
          weeklyCommTotal,
          weeklyNetTotal,
          paidThisWeek,
          weeklyDue,
          monthlyGross: Math.round(monthlyGross),
          monthlyPaid,
          status,
        };
      });

    return [
      ...buildRows(hospitalOptions, 'HOSPITAL'),
      ...buildRows(labOptions, 'LAB'),
      ...buildRows(pharmacyOptions, 'PHARMACY'),
    ].filter((row) => {
      if (settlementTypeFilter !== 'ALL' && row.partnerType !== settlementTypeFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !row.partnerName.toLowerCase().includes(q)) return false;
      return row.weeklyGross > 0 || row.monthlyGross > 0 || row.paidThisWeek > 0 || row.monthlyPaid > 0;
    });
  }, [bookings, hospitalOptions, labOptions, pharmacyOptions, settlements, settlementTypeFilter, searchQuery]);

  // KPI Metrics
  const kpis = useMemo(() => {
    let gmv = 0;
    let gmvCount = 0;
    let collected = 0;
    let collectedCount = 0;
    let savings = 0;
    let pendingPaymentAmount = 0;
    let pendingPaymentCount = 0;
    const serviceBreakdown = { opd: 0, lab: 0, pharmacy: 0, ipd: 0 };

    financeBookings.forEach((b) => {
      const eff = getEffectivePaymentStatus(b);
      const gross = Number(b.bill_amount || b.final_payable || b.doctor_fee || 0);
      const payable = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
      const disc = Number(b.discount_amount || 0);
      const st = String(b.service_type || '').toUpperCase();

      if (eff !== 'CANCELLED' && eff !== 'REFUNDED') {
        gmv += gross;
        gmvCount += 1;
        savings += disc;
        if (st.includes('IPD')) {
          serviceBreakdown.ipd += gross;
        } else {
          const cat = getServiceCategory(b.service_type);
          if (cat === 'LAB') serviceBreakdown.lab += gross;
          else if (cat === 'MEDICINE') serviceBreakdown.pharmacy += gross;
          else serviceBreakdown.opd += gross;
        }
      }
      if (eff === 'PAID') {
        collected += payable;
        collectedCount += 1;
      } else if (eff === 'PENDING') {
        pendingPaymentAmount += payable;
        pendingPaymentCount += 1;
      }
    });

    const commissionEarned = Math.round(gmv * 0.1);

    const openRefunds = dateFilteredRefunds.filter(
      (r) => r.status === 'PENDING' || r.status === 'APPROVED'
    );
    const openRefundAmount = openRefunds.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

    const paidToPartners = dateFilteredSettlements
      .filter((s) => s.status === 'PAID')
      .reduce((sum, s) => sum + Number(s.netPayoutAmount || 0), 0);
    const pendingSettlements = dateFilteredSettlements.filter((s) => s.status === 'PENDING');
    const pendingSettlementAmount = pendingSettlements.reduce(
      (sum, s) => sum + Number(s.netPayoutAmount || 0),
      0
    );

    return {
      gmv,
      gmvCount,
      collected,
      collectedCount,
      commissionEarned,
      serviceBreakdown,
      savings,
      pendingPaymentAmount,
      pendingPaymentCount,
      openRefundCount: openRefunds.length,
      openRefundAmount,
      paidToPartners,
      pendingSettlementCount: pendingSettlements.length,
      pendingSettlementAmount,
    };
  }, [financeBookings, dateFilteredRefunds, dateFilteredSettlements]);

  const zeroRowsCount = useMemo(
    () =>
      financeBookings.filter(
        (b) => Number(b.final_payable || b.bill_amount || b.doctor_fee || 0) <= 0
      ).length,
    [financeBookings]
  );

  // Filtered Lists
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return financeBookings.filter((b) => {
      const payable = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
      if (!showZeroRows && payable <= 0) return false;
      const eff = getEffectivePaymentStatus(b);
      if (payFilter !== 'ALL' && eff !== payFilter) return false;
      if (serviceFilter !== 'ALL' && getServiceCategory(b.service_type) !== serviceFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (b.booking_ref || '').toLowerCase().includes(q) ||
        (b.patient_name || '').toLowerCase().includes(q) ||
        (b.patient_phone || '').toLowerCase().includes(q) ||
        (b.hospital_name || '').toLowerCase().includes(q) ||
        (b.payment_ref || '').toLowerCase().includes(q)
      );
    });
  }, [financeBookings, payFilter, serviceFilter, searchQuery, showZeroRows]);

  const filteredRefunds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dateFilteredRefunds.filter((r) => {
      if (refundFilter !== 'ALL' && r.status !== refundFilter) return false;
      if (!q) return true;
      return (
        (r.booking_ref || '').toLowerCase().includes(q) ||
        (r.patient_name || '').toLowerCase().includes(q) ||
        (r.patient_phone || '').toLowerCase().includes(q) ||
        (r.utr_ref || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    });
  }, [dateFilteredRefunds, refundFilter, searchQuery]);

  const filteredSettlements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dateFilteredSettlements.filter((s) => {
      if (settlementTypeFilter !== 'ALL' && s.partnerType !== settlementTypeFilter) return false;
      if (settlementStatusFilter !== 'ALL' && s.status !== settlementStatusFilter) return false;
      if (!q) return true;
      return (
        s.partnerName.toLowerCase().includes(q) ||
        (s.paymentRef || '').toLowerCase().includes(q) ||
        s.periodStart.includes(q) ||
        s.periodEnd.includes(q)
      );
    });
  }, [dateFilteredSettlements, settlementTypeFilter, settlementStatusFilter, searchQuery]);

  // Pagination helpers
  const activeTotalCount =
    subTab === 'transactions'
      ? filteredTransactions.length
      : subTab === 'refunds'
      ? filteredRefunds.length
      : filteredSettlements.length;
  const totalPages = Math.max(1, Math.ceil(activeTotalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = startIdx + pageSize;

  const pagedTransactions = filteredTransactions.slice(startIdx, endIdx);
  const pagedRefunds = filteredRefunds.slice(startIdx, endIdx);
  const pagedSettlements = filteredSettlements.slice(startIdx, endIdx);

  const showToast = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (subTab === 'transactions') {
      downloadCsvFile(
        `adityam-transactions-${stamp}.csv`,
        [
          'Booking Ref',
          'Date',
          'Patient Name',
          'Phone',
          'Service',
          'Provider',
          'Gross Bill',
          'Discount',
          'Final Payable',
          'Payment Status',
          'Payment Method',
          'Payment Ref / UTR',
        ],
        filteredTransactions.map((b) => [
          b.booking_ref,
          b.created_at,
          b.patient_name,
          b.patient_phone,
          b.service_type,
          b.hospital_name || b.doctor_name || '',
          b.bill_amount || 0,
          b.discount_amount || 0,
          b.final_payable || b.bill_amount || b.doctor_fee || 0,
          getEffectivePaymentStatus(b),
          b.payment_method || '',
          b.payment_ref || '',
        ])
      );
    } else if (subTab === 'refunds') {
      downloadCsvFile(
        `adityam-refunds-${stamp}.csv`,
        [
          'Booking Ref',
          'Logged At',
          'Patient Name',
          'Phone',
          'Provider',
          'Refund Amount',
          'Mode',
          'Status',
          'UTR Ref',
          'Processed At',
          'Reason',
        ],
        filteredRefunds.map((r) => [
          r.booking_ref,
          r.created_at,
          r.patient_name,
          r.patient_phone,
          r.provider_name || '',
          r.refund_amount,
          r.refund_mode,
          r.status,
          r.utr_ref || '',
          r.processed_at || '',
          r.reason,
        ])
      );
    } else {
      downloadCsvFile(
        `adityam-partner-settlements-${stamp}.csv`,
        [
          'Partner Type',
          'Partner Name',
          'Period Start',
          'Period End',
          'Gross Amount',
          'Commission',
          'Net Payout',
          'Status',
          'UTR / Payment Ref',
          'Paid At',
        ],
        filteredSettlements.map((s) => [
          s.partnerType,
          s.partnerName,
          s.periodStart,
          s.periodEnd,
          s.grossAmount,
          s.commissionAmount,
          s.netPayoutAmount,
          s.status,
          s.paymentRef || '',
          s.paidAt || '',
        ])
      );
    }
  };

  const openMarkPaidModal = (b: BookingFinanceRow) => {
    setPayModalBooking(b);
    const existingMethod = String(b.payment_method || '').toUpperCase();
    setPayMethod(
      existingMethod === 'CARD' || existingMethod === 'WALLET' || existingMethod === 'PAY_AT_CENTRE'
        ? (existingMethod as PaymentMethod)
        : 'UPI'
    );
    setPayRefInput(b.payment_ref || '');
  };

  const handleConfirmMarkPaid = async () => {
    if (!payModalBooking) return;
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const refVal = payRefInput.trim() || `PAY-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'PAID',
          payment_method: payMethod,
          payment_ref: refVal,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payModalBooking.id);

      if (error) throw error;
      setPayModalBooking(null);
      onRefreshBookings?.();
    } catch (err: any) {
      showToast('Update Failed', err?.message || 'Could not update payment status.');
    } finally {
      setIsSaving(false);
    }
  };

  const openInitiateRefundModal = (b?: BookingFinanceRow) => {
    if (b) {
      const existing = activeRefundByBookingRef.get((b.booking_ref || '').toUpperCase());
      if (existing) {
        showToast(
          'Refund Already Exists',
          `A ${existing.status} refund of ${formatInr(existing.refund_amount)} already exists for ${b.booking_ref}.`
        );
        return;
      }
      setRefundBookingId(b.id || null);
      setRefundBookingRef(b.booking_ref || '');
      setRefundUserId((b as any).user_id || null);
      setRefundPatientName(b.patient_name || '');
      setRefundPatientPhone(b.patient_phone || '');
      setRefundServiceType(b.service_type || '');
      setRefundProviderName(b.hospital_name || b.doctor_name || '');
      const amt = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
      setRefundMaxPayable(amt > 0 ? Math.round(amt) : null);
      setRefundAmountInput(amt > 0 ? String(Math.round(amt)) : '');
    } else {
      setRefundBookingId(null);
      setRefundBookingRef('');
      setRefundUserId(null);
      setRefundPatientName('');
      setRefundPatientPhone('');
      setRefundServiceType('OPD');
      setRefundProviderName('');
      setRefundMaxPayable(null);
      setRefundAmountInput('');
    }
    setRefundMode('UPI_SOURCE');
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleCreateRefund = async () => {
    const cleanRef = refundBookingRef.trim().toUpperCase();
    const amount = Number(refundAmountInput);
    if (!cleanRef || !refundPatientName.trim() || !refundPatientPhone.trim()) {
      showToast('Missing Details', 'Booking Ref, Patient Name, and Phone are required.');
      return;
    }
    const existing = activeRefundByBookingRef.get(cleanRef);
    if (existing) {
      showToast(
        'Duplicate Refund Blocked',
        `A ${existing.status} refund of ${formatInr(existing.refund_amount)} is already logged for ${cleanRef}.`
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Invalid Amount', 'Enter a valid refund amount greater than ₹0.');
      return;
    }
    if (refundMaxPayable !== null && amount > refundMaxPayable) {
      showToast(
        'Over-Refund Blocked',
        `Refund amount (${formatInr(amount)}) cannot exceed paid/payable amount (${formatInr(
          refundMaxPayable
        )}).`
      );
      return;
    }
    if (!refundReason.trim()) {
      showToast('Missing Reason', 'Please enter a reason for the refund.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('refund_requests').insert({
        booking_id: refundBookingId,
        booking_ref: cleanRef,
        user_id: refundUserId,
        patient_name: refundPatientName.trim(),
        patient_phone: refundPatientPhone.trim(),
        service_type: refundServiceType || null,
        provider_name: refundProviderName || null,
        refund_amount: amount,
        refund_mode: refundMode,
        reason: refundReason.trim(),
        status: 'PENDING',
      });
      if (error) throw error;
      setRefundModalOpen(false);
      setSubTab('refunds');
      await loadFinanceData();
    } catch (err: any) {
      showToast('Refund Error', err?.message || 'Failed to log refund request.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRefundStatus = async (r: RefundRequest, nextStatus: 'APPROVED' | 'REJECTED') => {
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id);
      if (error) throw error;
      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: `REFUND_${nextStatus}`,
          entityType: 'refund_request',
          entityId: r.booking_ref || r.id,
          details: { refundAmount: r.refund_amount, patientName: r.patient_name },
        });
      }
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to update refund status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmProcessRefund = async () => {
    if (!processRefundTarget) return;
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const utr = processUtrInput.trim() || `RFND-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: 'PROCESSED',
          utr_ref: utr,
          admin_notes: processNotesInput.trim() || null,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', processRefundTarget.id);
      if (error) throw error;
      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'REFUND_PROCESSED',
          entityType: 'refund_request',
          entityId: processRefundTarget.booking_ref || processRefundTarget.id,
          details: { refundAmount: processRefundTarget.refund_amount, utr },
        });
      }

      if (processRefundTarget.booking_id) {
        await supabase
          .from('bookings')
          .update({ payment_status: 'REFUNDED' })
          .eq('id', processRefundTarget.booking_id);
        onRefreshBookings?.();
      }

      setProcessRefundTarget(null);
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not process refund.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentPartnerOptions =
    payoutPartnerType === 'HOSPITAL'
      ? hospitalOptions
      : payoutPartnerType === 'LAB'
      ? labOptions
      : pharmacyOptions;

  const openRecordPayoutModal = () => {
    setPayoutPartnerType('HOSPITAL');
    setPayoutPartnerId(hospitalOptions[0]?.id || '');
    setPayoutGrossInput('');
    setPayoutCommissionInput('0');
    setPayoutStatus('PAID');
    setPayoutRefInput('');
    setPayoutModalOpen(true);
  };

  const handleSavePartnerPayout = async () => {
    const gross = Number(payoutGrossInput || 0);
    const comm = Number(payoutCommissionInput || 0);
    if (!payoutPartnerId) {
      showToast('Select Partner', 'Please choose a Hospital, Lab, or Pharmacy.');
      return;
    }
    if (!Number.isFinite(gross) || gross <= 0) {
      showToast('Invalid Amount', 'Enter a gross amount greater than ₹0.');
      return;
    }
    const net = Math.max(0, gross - (Number.isFinite(comm) ? comm : 0));
    const paidAtIso = payoutStatus === 'PAID' ? new Date().toISOString() : null;
    const refVal =
      payoutStatus === 'PAID'
        ? payoutRefInput.trim() || `UTR-${Date.now().toString().slice(-6)}`
        : null;

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      if (payoutPartnerType === 'HOSPITAL') {
        const { error } = await supabase.from('hospital_payouts').insert({
          hospital_id: payoutPartnerId,
          amount: net,
          utr_reference: refVal,
          period_label: `${payoutPeriodStart} to ${payoutPeriodEnd}`,
          period_start: payoutPeriodStart,
          period_end: payoutPeriodEnd,
          gross_amount: gross,
          commission_amount: comm,
          status: payoutStatus,
          settled_at: paidAtIso || new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const table = payoutPartnerType === 'LAB' ? 'lab_payouts' : 'pharmacy_payouts';
        const fkCol = payoutPartnerType === 'LAB' ? 'centre_id' : 'pharmacy_id';
        const { error } = await supabase.from(table).insert({
          [fkCol]: payoutPartnerId,
          period_start: payoutPeriodStart,
          period_end: payoutPeriodEnd,
          gross_amount: gross,
          commission_amount: comm,
          net_payout_amount: net,
          status: payoutStatus,
          payment_ref: refVal,
          paid_at: paidAtIso,
        });
        if (error) throw error;
      }
      setPayoutModalOpen(false);
      setSubTab('settlements');
      await loadFinanceData();
    } catch (err: any) {
      showToast('Payout Save Error', err?.message || 'Could not record partner payout.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSettlementPaid = async () => {
    if (!markSettlementTarget) return;
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const utr = settlementUtrInput.trim() || `UTR-${Date.now().toString().slice(-6)}`;
      if (markSettlementTarget.partnerType === 'HOSPITAL') {
        const { error } = await supabase
          .from('hospital_payouts')
          .update({
            status: 'PAID',
            utr_reference: utr,
            settled_at: new Date().toISOString(),
          })
          .eq('id', markSettlementTarget.id);
        if (error) throw error;
      } else {
        const table =
          markSettlementTarget.partnerType === 'LAB' ? 'lab_payouts' : 'pharmacy_payouts';
        const { error } = await supabase
          .from(table)
          .update({
            status: 'PAID',
            payment_ref: utr,
            paid_at: new Date().toISOString(),
          })
          .eq('id', markSettlementTarget.id);
        if (error) throw error;
      }
      if (adminUser) {
        logAdminAudit({
          actorId: adminUser.id,
          actorName: adminUser.fullName,
          actorRole: adminUser.role,
          sourcePanel: getSourcePanelForRole(adminUser.role),
          action: 'PARTNER_PAYOUT_SETTLED',
          entityType: markSettlementTarget.partnerType.toLowerCase(),
          entityId: markSettlementTarget.partnerName,
          details: {
            netPayoutAmount: markSettlementTarget.netPayoutAmount,
            utr,
            period: `${markSettlementTarget.periodStart} - ${markSettlementTarget.periodEnd}`,
          },
        });
      }
      setMarkSettlementTarget(null);
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not mark payout as paid.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Top 4 KPI Cards */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#A7D7C0', letterSpacing: 0.6 }}>
              GROSS BOOKING VOLUME
            </Text>
            <BadgeIndianRupee size={16} color="#A7D7C0" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 8 }}>
            {formatInr(kpis.gmv)}
          </Text>
          <Text style={{ fontSize: 12, color: '#C6E2D4', marginTop: 4 }}>
            Across {kpis.gmvCount} active bookings ({dateRange})
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
              ADITYAM COMMISSION (10%)
            </Text>
            <CheckCircle2 size={16} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 8 }}>
            {formatInr(kpis.commissionEarned)}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            {formatInr(kpis.collected)} paid · {formatInr(kpis.pendingPaymentAmount)} pending
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
              PAID TO PARTNERS
            </Text>
            <Wallet size={16} color={THEME.green} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.green, marginTop: 8 }}>
            {formatInr(kpis.paidToPartners)}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            {formatInr(kpis.pendingSettlementAmount)} pending ·{' '}
            {formatInr(
              partnerWeeklyLedger.reduce((sum, r) => sum + Number(r.weeklyDue || 0), 0)
            )}{' '}
            weekly due
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: kpis.openRefundCount > 0 ? THEME.amberBg : THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: kpis.openRefundCount > 0 ? THEME.amberBorder : THEME.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: kpis.openRefundCount > 0 ? THEME.amberText : THEME.muted,
                letterSpacing: 0.6,
              }}
            >
              SAVINGS & REFUNDS
            </Text>
            <ShieldCheck size={16} color={kpis.openRefundCount > 0 ? THEME.amberText : THEME.muted} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 8 }}>
            {formatInr(kpis.savings)}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            {kpis.openRefundCount} open refunds · {formatInr(kpis.openRefundAmount)}
          </Text>
        </View>
      </View>

      {/* Service-Wise Revenue Strip */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted, letterSpacing: 0.5 }}>
          REVENUE BY SERVICE ({dateRange})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'OPD', value: kpis.serviceBreakdown.opd },
            { label: 'Labs & Scans', value: kpis.serviceBreakdown.lab },
            { label: 'Pharmacy', value: kpis.serviceBreakdown.pharmacy },
            { label: 'IPD', value: kpis.serviceBreakdown.ipd },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>{item.label}:</Text>
              <Text style={{ fontSize: 13, color: THEME.ink, fontWeight: '800' }}>
                {formatInr(item.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sub-Tabs, Date Range & Toolbar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 12,
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
          {/* Sub-Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'transactions' as const, label: `Transactions (${financeBookings.length})`, icon: CreditCard },
              {
                id: 'refunds' as const,
                label: `Refunds Queue (${dateFilteredRefunds.length})`,
                badge: kpis.openRefundCount,
                icon: RotateCcw,
              },
              {
                id: 'settlements' as const,
                label: `Partner Payouts (${dateFilteredSettlements.length})`,
                badge: kpis.pendingSettlementCount,
                icon: Wallet,
              },
            ].map((t) => {
              const active = subTab === t.id;
              const Icon = t.icon;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSubTab(t.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 10,
                    backgroundColor: active ? THEME.greenDark : THEME.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Icon size={14} color={active ? '#FFFFFF' : THEME.ink} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: active ? '#FFFFFF' : THEME.ink,
                    }}
                  >
                    {t.label}
                  </Text>
                  {typeof t.badge === 'number' && t.badge > 0 ? (
                    <View
                      style={{
                        backgroundColor: active ? '#FEF7E6' : THEME.amberText,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: active ? THEME.amberText : '#FFFFFF',
                        }}
                      >
                        {t.badge}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Actions: Date Range + CSV + Sync + Primary Add */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: THEME.surfaceAlt,
                borderRadius: 10,
                padding: 3,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              {(['TODAY', '7D', '30D', '90D', 'ALL'] as DateRangeFilter[]).map((dr) => {
                const active = dateRange === dr;
                return (
                  <TouchableOpacity
                    key={dr}
                    onPress={() => setDateRange(dr)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 7,
                      backgroundColor: active ? THEME.greenDark : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: active ? '#FFFFFF' : THEME.muted,
                      }}
                    >
                      {dr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowFinanceGuide((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: showFinanceGuide ? THEME.greenSoft : THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: showFinanceGuide ? THEME.greenBorder : THEME.border,
              }}
            >
              <HelpCircle size={14} color={showFinanceGuide ? THEME.green : THEME.ink} />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: showFinanceGuide ? THEME.greenDark : THEME.ink,
                }}
              >
                Finance Guide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCsv}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Download size={14} color={THEME.ink} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                loadFinanceData();
                onRefreshBookings?.();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <RefreshCw size={14} color={THEME.ink} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Sync</Text>
            </TouchableOpacity>

            {subTab === 'settlements' ? (
              <TouchableOpacity
                onPress={openRecordPayoutModal}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  Record Payout
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => openInitiateRefundModal()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                  Log Refund
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showFinanceGuide && (
          <View
            style={{
              backgroundColor: THEME.greenSoft,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
              Finance & Settlement Workflow Guide
            </Text>
            <Text style={{ fontSize: 12, color: THEME.ink, lineHeight: 18 }}>
              • <Text style={{ fontWeight: '700' }}>Gross Volume (GMV):</Text> Total bill value before partner payout.{' '}
              <Text style={{ fontWeight: '700' }}>Commission (10%):</Text> Adityam platform fee.{' '}
              <Text style={{ fontWeight: '700' }}>Partner Payable:</Text> Net amount owed to Hospitals, Labs & Pharmacies.
            </Text>
            <Text style={{ fontSize: 12, color: THEME.ink, lineHeight: 18 }}>
              • <Text style={{ fontWeight: '700' }}>Refunds Queue:</Text> Call Center raises a PENDING ticket → Finance reviews & clicks Approve → after sending money via UPI/Bank, enter the UTR Reference and click Mark Processed (booking automatically marks REFUNDED).
            </Text>
            <Text style={{ fontSize: 12, color: THEME.ink, lineHeight: 18 }}>
              • <Text style={{ fontWeight: '700' }}>Partner Payouts:</Text> Check Weekly Settlement Ledger for any DUE partners, transfer net payout via NEFT/IMPS, and record the UTR reference so balances clear cleanly.
            </Text>
          </View>
        )}

        {/* Search + Contextual Filters */}
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
              onChangeText={setSearchQuery}
              placeholder={
                subTab === 'transactions'
                  ? 'Search booking ref, patient, phone, provider, or UTR...'
                  : subTab === 'refunds'
                  ? 'Search booking ref, patient, phone, reason, or UTR...'
                  : 'Search hospital, lab, pharmacy name, or UTR...'
              }
              placeholderTextColor={THEME.muted}
              style={{ flex: 1, fontSize: 13, color: THEME.ink, outlineStyle: 'none' } as any}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={THEME.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {subTab === 'transactions' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(['ALL', 'PAID', 'PENDING', 'REFUNDED', 'CANCELLED'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setPayFilter(st)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: payFilter === st ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: payFilter === st ? THEME.green : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: payFilter === st ? THEME.greenDark : THEME.muted,
                    }}
                  >
                    {st === 'ALL' ? 'All Statuses' : st}
                  </Text>
                </TouchableOpacity>
              ))}
              {(['ALL', 'OPD', 'LAB', 'MEDICINE'] as const).map((sv) => (
                <TouchableOpacity
                  key={sv}
                  onPress={() => setServiceFilter(sv)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: serviceFilter === sv ? THEME.greenDark : THEME.bg,
                    borderWidth: 1,
                    borderColor: serviceFilter === sv ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: serviceFilter === sv ? '#FFFFFF' : THEME.muted,
                    }}
                  >
                    {sv === 'ALL' ? 'All Services' : sv}
                  </Text>
                </TouchableOpacity>
              ))}
              {zeroRowsCount > 0 && (
                <TouchableOpacity
                  onPress={() => setShowZeroRows((prev) => !prev)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: showZeroRows ? THEME.amberBg : THEME.bg,
                    borderWidth: 1,
                    borderColor: showZeroRows ? THEME.amberBorder : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: showZeroRows ? THEME.amberText : THEME.muted,
                    }}
                  >
                    {showZeroRows ? `Hide ₹0 Enquiries (${zeroRowsCount})` : `Show ₹0 Enquiries (${zeroRowsCount})`}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : subTab === 'refunds' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(['ALL', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setRefundFilter(st)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: refundFilter === st ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: refundFilter === st ? THEME.green : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: refundFilter === st ? THEME.greenDark : THEME.muted,
                    }}
                  >
                    {st === 'ALL' ? 'All Refunds' : st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {(['ALL', 'HOSPITAL', 'LAB', 'PHARMACY'] as const).map((pt) => (
                <TouchableOpacity
                  key={pt}
                  onPress={() => setSettlementTypeFilter(pt)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: settlementTypeFilter === pt ? THEME.greenDark : THEME.bg,
                    borderWidth: 1,
                    borderColor: settlementTypeFilter === pt ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: settlementTypeFilter === pt ? '#FFFFFF' : THEME.muted,
                    }}
                  >
                    {pt === 'ALL' ? 'All Partners' : pt}
                  </Text>
                </TouchableOpacity>
              ))}
              {(['ALL', 'PENDING', 'PAID'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setSettlementStatusFilter(st)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: 99,
                    backgroundColor: settlementStatusFilter === st ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: settlementStatusFilter === st ? THEME.green : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: settlementStatusFilter === st ? THEME.greenDark : THEME.muted,
                    }}
                  >
                    {st === 'ALL' ? 'All Statuses' : st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Main Content Area with Shadow / Skeleton Loader */}
      {isLoading && subTab !== 'transactions' ? (
        <AdminListSkeleton rows={6} />
      ) : subTab === 'transactions' ? (
        <View style={{ gap: 10 }}>
          {pagedTransactions.length === 0 ? (
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
                No matching transactions
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                Try clearing your search or switching date/status filters.
              </Text>
            </View>
          ) : (
            pagedTransactions.map((b) => {
              const eff = getEffectivePaymentStatus(b);
              const gross = Number(b.bill_amount || b.final_payable || b.doctor_fee || 0);
              const disc = Number(b.discount_amount || 0);
              const payable = Number(b.final_payable || b.bill_amount || b.doctor_fee || 0);
              const existingRefund = activeRefundByBookingRef.get((b.booking_ref || '').toUpperCase());

              const badgeStyle =
                eff === 'PAID'
                  ? { bg: THEME.greenSoft, border: THEME.greenBorder, text: THEME.greenDark }
                  : eff === 'REFUNDED' || eff === 'CANCELLED' || eff === 'FAILED'
                  ? { bg: THEME.redBg, border: THEME.redBorder, text: THEME.redText }
                  : { bg: THEME.amberBg, border: THEME.amberBorder, text: THEME.amberText };

              return (
                <View
                  key={b.id}
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
                  <View style={{ flex: 1.4, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                        {b.booking_ref}
                      </Text>
                      <View
                        style={{
                          backgroundColor: THEME.surfaceAlt,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                          {b.service_type}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: badgeStyle.bg,
                          borderWidth: 1,
                          borderColor: badgeStyle.border,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: badgeStyle.text }}>
                          {eff}
                        </Text>
                      </View>
                      {existingRefund ? (
                        <View
                          style={{
                            backgroundColor: THEME.amberBg,
                            borderWidth: 1,
                            borderColor: THEME.amberBorder,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 99,
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.amberText }}>
                            Refund {existingRefund.status}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                      {b.patient_name} · {b.patient_phone}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      {b.hospital_name || b.doctor_name || 'Adityam Partner'} · {formatDateTime(b.created_at)}
                      {b.payment_method ? ` · ${b.payment_method}` : ''}
                      {b.payment_ref ? ` · Ref: ${b.payment_ref}` : ''}
                      {b.paid_at ? ` · Paid ${formatDateTime(b.paid_at)}` : ''}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 16,
                      justifyContent: isDesktop ? 'flex-end' : 'space-between',
                    }}
                  >
                    <View style={{ alignItems: isDesktop ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                        {formatInr(payable)}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                        Gross {formatInr(gross)} {disc > 0 ? `· Saved ${formatInr(disc)}` : ''}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {payable <= 0 ? (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: THEME.surfaceAlt,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                            Unpriced Enquiry
                          </Text>
                        </View>
                      ) : (
                        <>
                          {eff === 'PENDING' && (
                            <TouchableOpacity
                              onPress={() => openMarkPaidModal(b)}
                              style={{
                                paddingHorizontal: 11,
                                paddingVertical: 8,
                                borderRadius: 9,
                                backgroundColor: THEME.green,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                                Mark Paid
                              </Text>
                            </TouchableOpacity>
                          )}
                          {eff === 'PAID' && !existingRefund && (
                            <TouchableOpacity
                              onPress={() => openInitiateRefundModal(b)}
                              style={{
                                paddingHorizontal: 11,
                                paddingVertical: 8,
                                borderRadius: 9,
                                backgroundColor: THEME.surfaceAlt,
                                borderWidth: 1,
                                borderColor: THEME.border,
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                                Refund
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : subTab === 'refunds' ? (
        <View style={{ gap: 10 }}>
          {pagedRefunds.length === 0 ? (
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
                No refund requests found
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                Use "Log Refund" or click "Refund" on any transaction to create one.
              </Text>
            </View>
          ) : (
            pagedRefunds.map((r) => {
              const badge =
                r.status === 'PROCESSED'
                  ? { bg: THEME.greenSoft, border: THEME.greenBorder, text: THEME.greenDark }
                  : r.status === 'REJECTED'
                  ? { bg: THEME.redBg, border: THEME.redBorder, text: THEME.redText }
                  : { bg: THEME.amberBg, border: THEME.amberBorder, text: THEME.amberText };

              const waPhone = normalizePhone(r.patient_phone);

              return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isDesktop ? 'row' : 'column',
                      justifyContent: 'space-between',
                      alignItems: isDesktop ? 'center' : 'flex-start',
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                        {r.booking_ref}
                      </Text>
                      <View
                        style={{
                          backgroundColor: badge.bg,
                          borderWidth: 1,
                          borderColor: badge.border,
                          paddingHorizontal: 9,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: badge.text }}>
                          {r.status}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: THEME.surfaceAlt,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                          {r.refund_mode}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.ink }}>
                      {formatInr(r.refund_amount)}
                    </Text>
                  </View>

                  <View style={{ gap: 3 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                      {r.patient_name} · {r.patient_phone}
                      {r.provider_name ? ` · ${r.provider_name}` : ''}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                      Reason: {r.reason}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                      Logged {formatDateTime(r.created_at)}
                      {r.utr_ref ? ` · UTR: ${r.utr_ref}` : ''}
                      {r.processed_at ? ` · Processed ${formatDateTime(r.processed_at)}` : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${r.patient_phone}`)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: THEME.surfaceAlt,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <Phone size={13} color={THEME.ink} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call</Text>
                    </TouchableOpacity>

                    {waPhone ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(
                            `https://wa.me/${waPhone}?text=${encodeURIComponent(
                              `Namaste ${r.patient_name}, regarding your Adityam refund of ${formatInr(
                                r.refund_amount
                              )} for booking ${r.booking_ref}.`
                            )}`
                          )
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.greenSoft,
                          borderWidth: 1,
                          borderColor: THEME.greenBorder,
                        }}
                      >
                        <MessageCircle size={13} color={THEME.greenDark} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>
                          WhatsApp
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {r.status === 'PENDING' && (
                      <>
                        <TouchableOpacity
                          onPress={() => handleUpdateRefundStatus(r, 'APPROVED')}
                          disabled={isSaving}
                          style={{
                            paddingHorizontal: 11,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.green,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>
                            Approve
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleUpdateRefundStatus(r, 'REJECTED')}
                          disabled={isSaving}
                          style={{
                            paddingHorizontal: 11,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: THEME.redBg,
                            borderWidth: 1,
                            borderColor: THEME.redBorder,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                            Reject
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                      <TouchableOpacity
                        onPress={() => {
                          setProcessRefundTarget(r);
                          setProcessUtrInput('');
                          setProcessNotesInput(r.admin_notes || '');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: THEME.green,
                        }}
                      >
                        <ArrowDownLeft size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                          Mark Processed (UTR)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        /* Partner Payouts Ledger (Hospitals, Labs & Pharmacies) */
        <View style={{ gap: 14 }}>
          {/* Weekly & Monthly Partner Due Board */}
          {partnerWeeklyLedger.length > 0 && (
            <View
              style={{
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                    Weekly & Monthly Partner Settlement Board
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    Live 7-day due & monthly earnings per Hospital, Lab & Pharmacy
                  </Text>
                </View>
              </View>

              {partnerWeeklyLedger.map((row) => (
                <View
                  key={`due-${row.partnerType}-${row.partnerId}`}
                  style={{
                    backgroundColor: THEME.bg,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: row.status === 'PAID' ? THEME.greenBorder : THEME.border,
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'space-between',
                    alignItems: isDesktop ? 'center' : 'stretch',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                        {row.partnerName}
                      </Text>
                      <View style={{ backgroundColor: THEME.surfaceAlt, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>
                          {row.partnerType}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            row.status === 'PAID'
                              ? THEME.greenSoft
                              : row.status === 'DUE'
                              ? THEME.amberBg
                              : THEME.surfaceAlt,
                          borderWidth: 1,
                          borderColor:
                            row.status === 'PAID'
                              ? THEME.greenBorder
                              : row.status === 'DUE'
                              ? THEME.amberBorder
                              : THEME.border,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color:
                              row.status === 'PAID'
                                ? THEME.greenDark
                                : row.status === 'DUE'
                                ? THEME.amberText
                                : THEME.muted,
                          }}
                        >
                          {row.status === 'PAID' ? 'PAID THIS WEEK ✓' : row.status === 'DUE' ? 'WEEKLY DUE' : 'SETTLED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      7d Gross: {formatInr(row.weeklyGross)} · Comm {row.commissionPct}% · Month Earnings:{' '}
                      {formatInr(row.monthlyGross)} · Paid This Month: {formatInr(row.monthlyPaid)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: isDesktop ? 'flex-end' : 'space-between' }}>
                    <View style={{ alignItems: isDesktop ? 'flex-end' : 'flex-start' }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: row.weeklyDue > 0 ? THEME.amberText : THEME.greenDark,
                        }}
                      >
                        {row.weeklyDue > 0 ? `${formatInr(row.weeklyDue)} due` : `Paid ${formatInr(row.paidThisWeek)}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: THEME.muted }}>Net 7d: {formatInr(row.weeklyNetTotal)}</Text>
                    </View>

                    {row.weeklyDue > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setPayoutPartnerType(row.partnerType);
                          setPayoutPartnerId(row.partnerId);
                          setPayoutPeriodStart(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
                          setPayoutPeriodEnd(new Date().toISOString().slice(0, 10));
                          setPayoutGrossInput(String(row.weeklyGross));
                          setPayoutCommissionInput(String(row.weeklyCommTotal));
                          setPayoutStatus('PAID');
                          setPayoutRefInput('');
                          setPayoutModalOpen(true);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 9,
                          backgroundColor: THEME.green,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                          Pay Weekly Due
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink, marginTop: 4 }}>
            Payout History Ledger ({filteredSettlements.length})
          </Text>

          {pagedSettlements.length === 0 ? (
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
                No partner payouts recorded yet
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                Click "Record Payout" to log a Hospital, Lab, or Pharmacy settlement with exact UTR and date.
              </Text>
            </View>
          ) : (
            pagedSettlements.map((s) => (
              <View
                key={`${s.partnerType}-${s.id}`}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: isDesktop ? 'row' : 'column',
                  justifyContent: 'space-between',
                  alignItems: isDesktop ? 'center' : 'stretch',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      {s.partnerName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: THEME.surfaceAlt,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>
                        {s.partnerType}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: s.status === 'PAID' ? THEME.greenSoft : THEME.amberBg,
                        borderWidth: 1,
                        borderColor: s.status === 'PAID' ? THEME.greenBorder : THEME.amberBorder,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: s.status === 'PAID' ? THEME.greenDark : THEME.amberText,
                        }}
                      >
                        {s.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Period: {s.periodStart} to {s.periodEnd}
                    {s.paymentRef ? ` · UTR: ${s.paymentRef}` : ''}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                    {s.paidAt
                      ? `Paid on ${formatDateTime(s.paidAt)}`
                      : `Logged on ${formatDateTime(s.createdAt)} · Awaiting payout`}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    justifyContent: isDesktop ? 'flex-end' : 'space-between',
                  }}
                >
                  <View style={{ alignItems: isDesktop ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                      Net {formatInr(s.netPayoutAmount)}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                      Gross {formatInr(s.grossAmount)} · Comm {formatInr(s.commissionAmount)}
                    </Text>
                  </View>

                  {s.status === 'PENDING' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setMarkSettlementTarget(s);
                        setSettlementUtrInput('');
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 9,
                        backgroundColor: THEME.green,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                        Mark Paid (UTR)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Clean Pagination Bar */}
      {activeTotalCount > 0 && (
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
            Showing {startIdx + 1}–{Math.min(endIdx, activeTotalCount)} of {activeTotalCount} records
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {([25, 50, 100] as const).map((sz) => (
                <TouchableOpacity
                  key={sz}
                  onPress={() => setPageSize(sz)}
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

      {/* Mark Paid Modal */}
      <Modal visible={Boolean(payModalBooking)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 14,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Mark Booking Paid
              </Text>
              <TouchableOpacity onPress={() => setPayModalBooking(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: THEME.muted }}>
              {payModalBooking?.booking_ref} · {payModalBooking?.patient_name} (
              {formatInr(
                payModalBooking?.final_payable ||
                  payModalBooking?.bill_amount ||
                  payModalBooking?.doctor_fee ||
                  0
              )}
              )
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Payment Method</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['UPI', 'CARD', 'WALLET', 'PAY_AT_CENTRE'] as PaymentMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPayMethod(m)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: payMethod === m ? THEME.greenDark : THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: payMethod === m ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: payMethod === m ? '#FFFFFF' : THEME.ink,
                      }}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                UTR / Transaction Reference (Optional)
              </Text>
              <TextInput
                value={payRefInput}
                onChangeText={setPayRefInput}
                placeholder="e.g. UTR41239876123"
                placeholderTextColor={THEME.muted}
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 13,
                  color: THEME.ink,
                  backgroundColor: THEME.bg,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setPayModalBooking(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmMarkPaid}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isSaving ? 'Saving...' : 'Confirm Paid'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Log / Initiate Refund Modal */}
      <Modal visible={refundModalOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Log Refund Request
              </Text>
              <TouchableOpacity onPress={() => setRefundModalOpen(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Booking Ref *</Text>
                <TextInput
                  value={refundBookingRef}
                  onChangeText={setRefundBookingRef}
                  placeholder="ADT-1024"
                  placeholderTextColor={THEME.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Amount (₹) *</Text>
                  {refundMaxPayable !== null && (
                    <TouchableOpacity onPress={() => setRefundAmountInput(String(refundMaxPayable))}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.green }}>
                        Max {formatInr(refundMaxPayable)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  value={refundAmountInput}
                  onChangeText={setRefundAmountInput}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={THEME.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Patient Name *</Text>
                <TextInput
                  value={refundPatientName}
                  onChangeText={setRefundPatientName}
                  placeholder="Patient full name"
                  placeholderTextColor={THEME.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Phone *</Text>
                <TextInput
                  value={refundPatientPhone}
                  onChangeText={setRefundPatientPhone}
                  placeholder="+91 98..."
                  placeholderTextColor={THEME.muted}
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Refund Mode</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['UPI_SOURCE', 'WALLET', 'BANK_NEFT'] as RefundMode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setRefundMode(m)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: refundMode === m ? THEME.greenDark : THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: refundMode === m ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: refundMode === m ? '#FFFFFF' : THEME.ink,
                      }}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Reason *</Text>
              <TextInput
                value={refundReason}
                onChangeText={setRefundReason}
                multiline
                numberOfLines={3}
                placeholder="e.g. Doctor slot cancelled / duplicate UPI payment"
                placeholderTextColor={THEME.muted}
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                  backgroundColor: THEME.bg,
                  minHeight: 70,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setRefundModalOpen(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateRefund}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isSaving ? 'Submitting...' : 'Submit Refund'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Process Refund UTR Modal */}
      <Modal visible={Boolean(processRefundTarget)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Mark Refund Processed
              </Text>
              <TouchableOpacity onPress={() => setProcessRefundTarget(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: THEME.muted }}>
              {processRefundTarget?.booking_ref} · {processRefundTarget?.patient_name} ·{' '}
              {formatInr(processRefundTarget?.refund_amount)} via {processRefundTarget?.refund_mode}
            </Text>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                Bank / UPI Refund UTR Reference
              </Text>
              <TextInput
                value={processUtrInput}
                onChangeText={setProcessUtrInput}
                placeholder="e.g. UTR9812345601"
                placeholderTextColor={THEME.muted}
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                  backgroundColor: THEME.bg,
                }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                Admin Note (Optional)
              </Text>
              <TextInput
                value={processNotesInput}
                onChangeText={setProcessNotesInput}
                placeholder="Credited to patient UPI..."
                placeholderTextColor={THEME.muted}
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                  backgroundColor: THEME.bg,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setProcessRefundTarget(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmProcessRefund}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isSaving ? 'Saving...' : 'Confirm Processed'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record Partner Payout Modal (Hospital / Lab / Pharmacy) */}
      <Modal visible={payoutModalOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 500,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Record Partner Payout
              </Text>
              <TouchableOpacity onPress={() => setPayoutModalOpen(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Partner Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['HOSPITAL', 'LAB', 'PHARMACY'] as PartnerType[]).map((pt) => (
                  <TouchableOpacity
                    key={pt}
                    onPress={() => {
                      setPayoutPartnerType(pt);
                      const opts =
                        pt === 'HOSPITAL'
                          ? hospitalOptions
                          : pt === 'LAB'
                          ? labOptions
                          : pharmacyOptions;
                      setPayoutPartnerId(opts[0]?.id || '');
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: payoutPartnerType === pt ? THEME.greenDark : THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: payoutPartnerType === pt ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: payoutPartnerType === pt ? '#FFFFFF' : THEME.ink,
                      }}
                    >
                      {pt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Select Partner</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {currentPartnerOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPayoutPartnerId(opt.id)}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: payoutPartnerId === opt.id ? THEME.greenSoft : THEME.bg,
                      borderWidth: 1,
                      borderColor: payoutPartnerId === opt.id ? THEME.green : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: payoutPartnerId === opt.id ? THEME.greenDark : THEME.ink,
                      }}
                    >
                      {opt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Period Start</Text>
                <TextInput
                  value={payoutPeriodStart}
                  onChangeText={setPayoutPeriodStart}
                  placeholder="YYYY-MM-DD"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Period End</Text>
                <TextInput
                  value={payoutPeriodEnd}
                  onChangeText={setPayoutPeriodEnd}
                  placeholder="YYYY-MM-DD"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Gross (₹) *</Text>
                <TextInput
                  value={payoutGrossInput}
                  onChangeText={setPayoutGrossInput}
                  keyboardType="numeric"
                  placeholder="25000"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Commission (₹)</Text>
                <TextInput
                  value={payoutCommissionInput}
                  onChangeText={setPayoutCommissionInput}
                  keyboardType="numeric"
                  placeholder="2500"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
            </View>

            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenDark }}>
              Net Payout:{' '}
              {formatInr(
                Math.max(0, Number(payoutGrossInput || 0) - Number(payoutCommissionInput || 0))
              )}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['PAID', 'PENDING'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setPayoutStatus(st)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: payoutStatus === st ? THEME.greenDark : THEME.surfaceAlt,
                    borderWidth: 1,
                    borderColor: payoutStatus === st ? THEME.greenDark : THEME.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: payoutStatus === st ? '#FFFFFF' : THEME.ink,
                    }}
                  >
                    {st === 'PAID' ? 'Already Paid (Add UTR)' : 'Pending Settlement'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {payoutStatus === 'PAID' && (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                  Bank / UPI UTR Reference
                </Text>
                <TextInput
                  value={payoutRefInput}
                  onChangeText={setPayoutRefInput}
                  placeholder="e.g. UTR5501239876"
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                  }}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setPayoutModalOpen(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePartnerPayout}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isSaving ? 'Saving...' : 'Save Payout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mark Settlement Paid Modal */}
      <Modal visible={Boolean(markSettlementTarget)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Confirm Partner Payout
              </Text>
              <TouchableOpacity onPress={() => setMarkSettlementTarget(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: THEME.muted }}>
              {markSettlementTarget?.partnerName} ({markSettlementTarget?.partnerType}) ·{' '}
              {formatInr(markSettlementTarget?.netPayoutAmount)}
            </Text>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                Bank / UPI UTR Reference
              </Text>
              <TextInput
                value={settlementUtrInput}
                onChangeText={setSettlementUtrInput}
                placeholder="e.g. UTR882104921"
                style={{
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                  backgroundColor: THEME.bg,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setMarkSettlementTarget(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMarkSettlementPaid}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  {isSaving ? 'Saving...' : 'Mark Paid'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
