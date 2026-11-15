import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  FlaskConical,
  Pill,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import type { Booking, ServiceType } from '@adityam/types';
import type { AdminNavSection } from '../AdminSidebar';
import { AdminPageSkeleton } from '../AdminSkeleton';

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
  redText: '#B91C1C',
  redBg: '#FEF2F2',
};

type DashboardPeriod = 'TODAY' | '7D' | '1M' | '3M' | '1Y' | 'ALL';

const PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: '7D', label: 'Last 7 days (1 Week)' },
  { key: '1M', label: 'Past 1 month (30 days)' },
  { key: '3M', label: 'Past 3 months (90 days)' },
  { key: '1Y', label: 'This Year (12 months)' },
  { key: 'ALL', label: 'All time' },
];

export interface DashboardAnalyticsData {
  userCreatedDates: string[];
  partnerPayouts: {
    partnerType?: 'HOSPITAL' | 'DOCTOR' | 'LAB' | 'PHARMACY';
    amount: number;
    date: string;
    status: string;
  }[];
  refundRequests: { amount: number; status: string; created_at: string }[];
}

interface DashboardOverviewSectionProps {
  bookings: Booking[];
  isLoading: boolean;
  networkCounts: {
    hospitals: number;
    enquiries: number;
    labs: number;
    pharmacies: number;
    patients: number;
  };
  analyticsData?: DashboardAnalyticsData;
  onNavigate: (section: AdminNavSection, serviceFilter?: 'ALL' | ServiceType) => void;
  onInspectBooking: (booking: Booking) => void;
}

function formatInr(value: number): string {
  return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
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

function getCutoffMs(period: DashboardPeriod): number {
  const now = new Date();
  if (period === 'TODAY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === '7D') return Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (period === '1M') return Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (period === '3M') return Date.now() - 90 * 24 * 60 * 60 * 1000;
  if (period === '1Y') return new Date(now.getFullYear(), 0, 1).getTime();
  return 0;
}

export function DashboardOverviewSection({
  bookings,
  isLoading,
  networkCounts,
  analyticsData,
  onNavigate,
  onInspectBooking,
}: DashboardOverviewSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [period, setPeriod] = useState<DashboardPeriod>('3M');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);

  const activePeriodLabel =
    PERIOD_OPTIONS.find((p) => p.key === period)?.label || 'Past 3 months (90 days)';

  const metrics = useMemo(() => {
    const cutoffMs = getCutoffMs(period);
    const todayStr = new Date().toDateString();

    const periodBookings = bookings.filter((b) => {
      if (cutoffMs === 0) return true;
      return new Date(b.created_at).getTime() >= cutoffMs;
    });

    let todayBookings = 0;
    let newRequests = 0;
    let pendingRx = 0;

    bookings.forEach((b) => {
      if (new Date(b.created_at).toDateString() === todayStr) todayBookings += 1;
      if (b.status === 'NEW') newRequests += 1;
      if (b.bill_image_url && (b.status === 'NEW' || b.status === 'CALLING')) pendingRx += 1;
    });

    let grossVolume = 0;
    let collectedVolume = 0;
    let pendingCollection = 0;
    let totalSavings = 0;

    let confirmedCount = 0;
    let pendingActionCount = 0;
    let missedCancelledCount = 0;

    const svcStats = {
      OPD_CONCIERGE: { count: 0, volume: 0 },
      INVESTIGATION: { count: 0, volume: 0 },
      PHARMACY_SCAN_PAY: { count: 0, volume: 0 },
      IPD_ENQUIRY: { count: 0, volume: 0 },
    };

    const partnerMap = new Map<string, { name: string; count: number; volume: number }>();

    periodBookings.forEach((b) => {
      const st = String(b.status || '').toUpperCase();
      const paySt = String((b as any).payment_status || '').toUpperCase();
      const gross = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
      const payable = Number(b.final_payable ?? b.bill_amount ?? b.doctor_fee ?? 0);
      const disc = Number(b.discount_amount || 0);

      const isCancelledOrRefunded =
        st === 'CANCELLED' || st === 'MISSED' || paySt === 'REFUNDED' || paySt === 'CANCELLED';
      const isConfirmed =
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(st) || paySt === 'PAID';
      const isPaid = st === 'PAID' || st === 'COMPLETED' || paySt === 'PAID';

      if (isCancelledOrRefunded) {
        missedCancelledCount += 1;
      } else if (isConfirmed) {
        confirmedCount += 1;
      } else {
        pendingActionCount += 1;
      }

      if (!isCancelledOrRefunded) {
        grossVolume += gross;
        totalSavings += disc;
        if (isPaid) {
          collectedVolume += payable;
        } else {
          pendingCollection += payable;
        }
      }

      if (b.service_type === 'OPD_CONCIERGE') {
        svcStats.OPD_CONCIERGE.count += 1;
        if (!isCancelledOrRefunded) svcStats.OPD_CONCIERGE.volume += gross;
      } else if (b.service_type === 'INVESTIGATION') {
        svcStats.INVESTIGATION.count += 1;
        if (!isCancelledOrRefunded) svcStats.INVESTIGATION.volume += gross;
      } else if (b.service_type === 'PHARMACY_SCAN_PAY') {
        svcStats.PHARMACY_SCAN_PAY.count += 1;
        if (!isCancelledOrRefunded) svcStats.PHARMACY_SCAN_PAY.volume += gross;
      } else if (b.service_type === 'IPD_ENQUIRY') {
        svcStats.IPD_ENQUIRY.count += 1;
        if (!isCancelledOrRefunded) svcStats.IPD_ENQUIRY.volume += gross;
      }

      const partnerName = b.hospital_name || b.doctor_name || 'Adityam Concierge';
      const prev = partnerMap.get(partnerName) || { name: partnerName, count: 0, volume: 0 };
      prev.count += 1;
      if (!isCancelledOrRefunded) prev.volume += gross;
      partnerMap.set(partnerName, prev);
    });

    const adityamCommission = Math.round(grossVolume * 0.1);
    const partnerNetShare = Math.max(0, Math.round(grossVolume) - adityamCommission);

    const periodPayouts = (analyticsData?.partnerPayouts || []).filter((p) => {
      if (cutoffMs === 0) return true;
      return new Date(p.date).getTime() >= cutoffMs;
    });
    const paidToPartners = Math.round(
      periodPayouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    );
    const partnerPayableDue = Math.max(0, partnerNetShare - paidToPartners);

    // Category-wise breakdown: Hospitals, Solo Doctors, Labs & Scans, Pharmacies
    const hospGross = periodBookings
      .filter((b) => {
        const st = String(b.status || '').toUpperCase();
        const paySt = String((b as any).payment_status || '').toUpperCase();
        if (st === 'CANCELLED' || st === 'MISSED' || paySt === 'REFUNDED' || paySt === 'CANCELLED') return false;
        return (b.service_type === 'OPD_CONCIERGE' && Boolean(b.hospital_id || b.hospital_name)) || b.service_type === 'IPD_ENQUIRY';
      })
      .reduce((s, b) => s + Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0), 0);

    const docGross = periodBookings
      .filter((b) => {
        const st = String(b.status || '').toUpperCase();
        const paySt = String((b as any).payment_status || '').toUpperCase();
        if (st === 'CANCELLED' || st === 'MISSED' || paySt === 'REFUNDED' || paySt === 'CANCELLED') return false;
        return b.service_type === 'OPD_CONCIERGE' && !b.hospital_id && !b.hospital_name;
      })
      .reduce((s, b) => s + Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0), 0);

    const buildPayableRow = (
      key: 'HOSPITAL' | 'DOCTOR' | 'LAB' | 'PHARMACY',
      label: string,
      gross: number,
      section: AdminNavSection
    ) => {
      const roundedGross = Math.round(gross);
      const commission = Math.round(roundedGross * 0.1);
      const netShare = Math.max(0, roundedGross - commission);
      const paid = Math.round(
        periodPayouts
          .filter((p) => p.status === 'PAID' && p.partnerType === key)
          .reduce((s, p) => s + Number(p.amount || 0), 0)
      );
      return {
        key,
        label,
        section,
        gross: roundedGross,
        commission,
        netShare,
        paid,
        due: Math.max(0, netShare - paid),
      };
    };

    const categoryPayables = [
      buildPayableRow('HOSPITAL', 'Hospitals (OPD + IPD)', hospGross, 'hospitals'),
      buildPayableRow('DOCTOR', 'Solo Doctors', docGross, 'solo-doctors'),
      buildPayableRow('LAB', 'Labs & Scans', svcStats.INVESTIGATION.volume, 'labs'),
      buildPayableRow('PHARMACY', 'Pharmacies', svcStats.PHARMACY_SCAN_PAY.volume, 'pharmacies'),
    ];

    const openRefunds = (analyticsData?.refundRequests || []).filter(
      (r) =>
        (r.status === 'PENDING' || r.status === 'APPROVED') &&
        (cutoffMs === 0 || new Date(r.created_at).getTime() >= cutoffMs)
    );
    const openRefundAmount = openRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const newCustomers = (analyticsData?.userCreatedDates || []).filter((d) => {
      if (cutoffMs === 0) return true;
      return new Date(d).getTime() >= cutoffMs;
    }).length;

    const totalInPeriod = periodBookings.length;
    const conversionRate =
      totalInPeriod > 0 ? Math.round((confirmedCount / totalInPeriod) * 100) : 0;
    const pricedCount = periodBookings.filter(
      (b) => Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0) > 0
    ).length;
    const avgTicket = pricedCount > 0 ? Math.round(grossVolume / pricedCount) : 0;

    const topPartners = Array.from(partnerMap.values())
      .sort((a, b) => b.volume - a.volume || b.count - a.count)
      .slice(0, 5);

    const urgentQueue = bookings
      .filter((b) => b.status === 'NEW' || b.status === 'CALLING')
      .slice(0, 6);

    return {
      totalAllTime: bookings.length,
      totalInPeriod,
      todayBookings,
      newRequests,
      pendingRx,
      grossVolume,
      collectedVolume,
      pendingCollection,
      adityamCommission,
      partnerNetShare,
      paidToPartners,
      partnerPayableDue,
      openRefundCount: openRefunds.length,
      openRefundAmount,
      totalSavings,
      newCustomers,
      confirmedCount,
      pendingActionCount,
      missedCancelledCount,
      conversionRate,
      avgTicket,
      svcStats,
      categoryPayables,
      topPartners,
      urgentQueue,
    };
  }, [bookings, period, analyticsData]);

  if (isLoading) {
    return <AdminPageSkeleton />;
  }

  return (
    <View style={{ gap: 18 }}>
      {/* 0. Executive Filter Bar with YouTube-style Period Dropdown */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isDesktop ? 'center' : 'flex-start',
          gap: 10,
          zIndex: 30,
        }}
      >
        <View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.ink }}>
            Company Analytics & Operations Pulse
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
            Real-time earnings, partner payables, customer growth & conversion funnel
          </Text>
        </View>

        <View style={{ position: 'relative', zIndex: 40 }}>
          <TouchableOpacity
            onPress={() => setIsPeriodMenuOpen((prev) => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: THEME.surface,
              borderWidth: 1,
              borderColor: isPeriodMenuOpen ? THEME.green : THEME.border,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
            }}
          >
            <TrendingUp size={14} color={THEME.green} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
              {activePeriodLabel}
            </Text>
            <ChevronDown size={14} color={THEME.muted} />
          </TouchableOpacity>

          {isPeriodMenuOpen && (
            <View
              style={{
                position: 'absolute',
                top: 42,
                right: 0,
                minWidth: 230,
                backgroundColor: THEME.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingVertical: 5,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
                zIndex: 50,
              }}
            >
              {PERIOD_OPTIONS.map((opt) => {
                const active = opt.key === period;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => {
                      setPeriod(opt.key);
                      setIsPeriodMenuOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9.5,
                      backgroundColor: active ? THEME.greenSoft : 'transparent',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: active ? '800' : '600',
                        color: active ? THEME.green : THEME.ink,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {active && <CheckCircle2 size={14} color={THEME.green} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* 1. Executive Financial & Growth KPIs */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigate('finance')}
          style={{
            flex: 1,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#A7D7C0', letterSpacing: 0.5 }}>
            GROSS VOLUME & EARNINGS
          </Text>
          <Text style={{ fontSize: 27, fontWeight: '900', color: '#FFFFFF', marginTop: 6 }}>
            {formatInr(metrics.grossVolume)}
          </Text>
          <Text style={{ fontSize: 12, color: '#86EFAC', fontWeight: '700', marginTop: 4 }}>
            {formatInr(metrics.adityamCommission)} Adityam Commission (10%)
          </Text>
          <Text style={{ fontSize: 11.5, color: '#C6E2D4', marginTop: 2 }}>
            {formatInr(metrics.collectedVolume)} paid · {formatInr(metrics.pendingCollection)} pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigate('finance')}
          style={{
            flex: 1,
            backgroundColor: metrics.partnerPayableDue > 0 ? THEME.amberBg : THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: metrics.partnerPayableDue > 0 ? THEME.amberBorder : THEME.border,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: metrics.partnerPayableDue > 0 ? THEME.amberText : THEME.muted,
              letterSpacing: 0.5,
            }}
          >
            PARTNER PAYABLES
          </Text>
          <Text
            style={{
              fontSize: 27,
              fontWeight: '900',
              color: metrics.partnerPayableDue > 0 ? THEME.amberText : THEME.green,
              marginTop: 6,
            }}
          >
            {formatInr(metrics.partnerPayableDue)}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.ink, fontWeight: '700', marginTop: 4 }}>
            {formatInr(metrics.paidToPartners)} paid to partners
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
            {metrics.openRefundCount} open refunds ({formatInr(metrics.openRefundAmount)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigate('bookings')}
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.5 }}>
            BOOKINGS & CONVERSION
          </Text>
          <Text style={{ fontSize: 27, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {metrics.totalInPeriod}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.green, fontWeight: '700', marginTop: 4 }}>
            {metrics.conversionRate}% confirmed · Avg {formatInr(metrics.avgTicket)}
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
            {metrics.todayBookings} booked today · {metrics.totalAllTime} all-time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigate('patients')}
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.5 }}>
            CUSTOMERS & NETWORK
          </Text>
          <Text style={{ fontSize: 27, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            +{metrics.newCustomers}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.green, fontWeight: '700', marginTop: 4 }}>
            {networkCounts.patients} total patients · {formatInr(metrics.totalSavings)} saved
          </Text>
          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
            {networkCounts.hospitals} Hosp · {networkCounts.labs} Labs · {networkCounts.pharmacies} Pharm
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Service-Wise Revenue & Booking Mix */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(
          [
            {
              id: 'OPD_CONCIERGE' as ServiceType,
              title: 'OPD Consults',
              count: metrics.svcStats.OPD_CONCIERGE.count,
              volume: metrics.svcStats.OPD_CONCIERGE.volume,
            },
            {
              id: 'INVESTIGATION' as ServiceType,
              title: 'Labs & Scans',
              count: metrics.svcStats.INVESTIGATION.count,
              volume: metrics.svcStats.INVESTIGATION.volume,
            },
            {
              id: 'PHARMACY_SCAN_PAY' as ServiceType,
              title: 'Pharmacy Orders',
              count: metrics.svcStats.PHARMACY_SCAN_PAY.count,
              volume: metrics.svcStats.PHARMACY_SCAN_PAY.volume,
            },
            {
              id: 'IPD_ENQUIRY' as ServiceType,
              title: 'IPD Admissions',
              count: metrics.svcStats.IPD_ENQUIRY.count,
              volume: metrics.svcStats.IPD_ENQUIRY.volume,
            },
          ]
        ).map((p) => {
          const sharePct =
            metrics.grossVolume > 0 ? Math.round((p.volume / metrics.grossVolume) * 100) : 0;
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => onNavigate('bookings', p.id)}
              style={{
                flexGrow: 1,
                flexBasis: isDesktop ? '23%' : '47%',
                minWidth: 150,
                backgroundColor: THEME.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>{p.title}</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: THEME.green }}>{p.count}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                  {formatInr(p.volume)}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                  {sharePct}% share
                </Text>
              </View>
              <View
                style={{
                  height: 4,
                  borderRadius: 99,
                  backgroundColor: THEME.surfaceAlt,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, sharePct)}%`,
                    backgroundColor: THEME.green,
                    borderRadius: 99,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2B. Partner Payables & Earnings Breakdown (Hospitals, Doctors, Labs, Pharmacies) */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Earnings vs Partner Payables Breakdown
            </Text>
            <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
              What Adityam earned (10% fee) vs what we owe Hospitals, Doctors, Labs & Pharmacies ({activePeriodLabel.toLowerCase()})
            </Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('finance')}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
              Open Settlements →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
          {metrics.categoryPayables.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => onNavigate(item.section)}
              style={{
                flex: 1,
                backgroundColor: THEME.bg,
                borderRadius: 12,
                padding: 13,
                borderWidth: 1,
                borderColor: item.due > 0 ? THEME.amberBorder : THEME.border,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                {item.label}
              </Text>
              <View style={{ gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Gross</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>{formatInr(item.gross)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Our Fee (10%)</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.green }}>{formatInr(item.commission)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Paid</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>{formatInr(item.paid)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderTopColor: THEME.border }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: item.due > 0 ? THEME.amberText : THEME.greenDark }}>
                    Owed / Due
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '900', color: item.due > 0 ? THEME.amberText : THEME.greenDark }}>
                    {item.due === 0 && item.paid > 0 ? 'PAID ✓' : formatInr(item.due)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 3. Company Health: Conversion Funnel & Top Partners */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
        {/* Left: Booking Funnel & Ops Alerts */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Booking Funnel & Operations Health
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                Outcome split for {activePeriodLabel.toLowerCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('prescriptions')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.amberText }}>
                {metrics.pendingRx} Rx · {networkCounts.enquiries} Enquiries →
              </Text>
            </TouchableOpacity>
          </View>

          {[
            {
              label: 'Confirmed / Paid / Completed',
              count: metrics.confirmedCount,
              color: THEME.green,
            },
            {
              label: 'Awaiting Action (NEW / CALLING)',
              count: metrics.pendingActionCount,
              color: THEME.amberText,
            },
            {
              label: 'Missed / Cancelled / Refunded',
              count: metrics.missedCancelledCount,
              color: THEME.redText,
            },
          ].map((row) => {
            const pct =
              metrics.totalInPeriod > 0
                ? Math.round((row.count / metrics.totalInPeriod) * 100)
                : 0;
            return (
              <View key={row.label} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>{row.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: row.color }}>
                    {row.count} ({pct}%)
                  </Text>
                </View>
                <View
                  style={{
                    height: 7,
                    borderRadius: 99,
                    backgroundColor: THEME.surfaceAlt,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: row.color,
                      borderRadius: 99,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Right: Top Partners by Volume */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Top Performing Partners
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                Ranked by gross volume ({activePeriodLabel.toLowerCase()})
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('hospitals')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>View Network →</Text>
            </TouchableOpacity>
          </View>

          {metrics.topPartners.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 16, textAlign: 'center' }}>
              No partner bookings in this period yet.
            </Text>
          ) : (
            metrics.topPartners.map((partner, idx) => (
              <View
                key={partner.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 7,
                  borderBottomWidth: idx < metrics.topPartners.length - 1 ? 1 : 0,
                  borderBottomColor: THEME.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: idx === 0 ? THEME.greenDark : THEME.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: idx === 0 ? '#FFFFFF' : THEME.ink,
                      }}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }} numberOfLines={1}>
                      {partner.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: THEME.muted }}>
                      {partner.count} booking{partner.count === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.green }}>
                  {formatInr(partner.volume)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* 4. Two-Column Action Board */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
        {/* Left: Urgent Triage Queue */}
        <View
          style={{
            flex: 1.35,
            width: '100%',
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: THEME.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Urgent Triage Queue
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Newest patient requests waiting for callback or quote
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onNavigate('bookings')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }}>View All</Text>
              <ArrowRight size={14} color={THEME.green} />
            </TouchableOpacity>
          </View>

          {metrics.urgentQueue.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                All caught up!
              </Text>
              <Text style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4 }}>
                No pending NEW or CALLING requests right now.
              </Text>
            </View>
          ) : (
            metrics.urgentQueue.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => onInspectBooking(b)}
                style={{
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: THEME.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                      {b.booking_ref}
                    </Text>
                    <View
                      style={{
                        backgroundColor: b.status === 'NEW' ? THEME.amberBg : '#EEF4FF',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: b.status === 'NEW' ? THEME.amberText : '#1D4ED8',
                        }}
                      >
                        {b.status}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: THEME.muted }}>
                      {formatTimeAgo(b.created_at)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.ink }}>
                    {b.patient_name} · {b.patient_phone}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                    {b.service_type} · {b.hospital_name || b.doctor_name || 'Concierge'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>Inspect →</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Right: Quick Module Navigation */}
        <View
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            Command Center Modules
          </Text>
          {[
            {
              id: 'bookings' as AdminNavSection,
              label: 'Live Bookings',
              sub: `${metrics.totalAllTime} total requests`,
              icon: CalendarCheck,
            },
            {
              id: 'prescriptions' as AdminNavSection,
              label: 'Prescription Queue',
              sub: `${metrics.pendingRx} slips awaiting quote`,
              icon: FileText,
            },
            {
              id: 'hospitals' as AdminNavSection,
              label: 'Hospitals',
              sub: `${networkCounts.hospitals} partner hospitals`,
              icon: Building2,
            },
            {
              id: 'solo-doctors' as AdminNavSection,
              label: 'Solo Doctors',
              sub: 'Independent specialists & clinics',
              icon: Stethoscope,
            },
            {
              id: 'labs' as AdminNavSection,
              label: 'Labs & Scans',
              sub: `${networkCounts.labs} diagnostic centres`,
              icon: FlaskConical,
            },
            {
              id: 'pharmacies' as AdminNavSection,
              label: 'Pharmacies',
              sub: `${networkCounts.pharmacies} partner stores`,
              icon: Pill,
            },
            {
              id: 'patients' as AdminNavSection,
              label: 'Patients & Families',
              sub: `${networkCounts.patients} registered accounts`,
              icon: Users,
            },
            {
              id: 'finance' as AdminNavSection,
              label: 'Payments & Refunds',
              sub: 'Transactions, refunds & partner payouts',
              icon: CreditCard,
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => onNavigate(m.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 11,
                  borderRadius: 11,
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: THEME.greenSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={THEME.greenDark} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>{m.label}</Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>{m.sub}</Text>
                  </View>
                </View>
                <ArrowRight size={15} color={THEME.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
