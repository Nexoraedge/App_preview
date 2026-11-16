import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileImage,
  LayoutDashboard,
  LogOut,
  Maximize2,
  MessageCircle,
  Minimize2,
  PackageCheck,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Store,
  Truck,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { usePartnerAuth } from './PartnerAuthGate';
import { logAdminAudit } from '../../src/services/adminAudit';
import {
  playAdminAlertChime,
  playPartnerOrderAlarm,
  requestDesktopNotificationPermission,
} from '../../src/services/adminAlerts';

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

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
interface DayScheduleRow {
  open: boolean;
  start: string;
  end: string;
  hasBreak?: boolean;
  start2?: string;
  end2?: string;
}
const WEEK_DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];
const DEFAULT_WEEK_SCHEDULE: Record<DayKey, DayScheduleRow> = {
  mon: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  tue: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  wed: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  thu: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  fri: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  sat: { open: true, start: '08:00', end: '14:00', hasBreak: true, start2: '16:30', end2: '22:00' },
  sun: { open: true, start: '09:00', end: '21:00', hasBreak: false, start2: '17:00', end2: '21:00' },
};
type PartnerTab = 'dashboard' | 'orders' | 'scanner' | 'payouts' | 'settings';
type OrderFilter = 'ALL' | 'NEEDS_QUOTE' | 'READY' | 'UNPAID' | 'COMPLETED' | 'LOST';
type OrderDateFilter = 'ALL' | 'TODAY' | '7D' | 'THIS_MONTH' | 'LAST_MONTH';

interface PharmacyInfo {
  id: string;
  name: string;
  area?: string | null;
  shop_address?: string | null;
  shop_phone?: string | null;
  secondary_phone?: string | null;
  drug_license_number?: string | null;
  gst_number?: string | null;
  about?: string | null;
  delivery?: boolean | null;
  pickup?: boolean | null;
  is_active?: boolean | null;
  is_24x7?: boolean | null;
  weekly_schedule?: Record<string, { open?: boolean; start?: string; end?: string }> | null;
  delivery_radius_km?: number | null;
  delivery_time_mins?: number | null;
  app_discount_pct?: number | null;
  commission_percentage?: number | null;
}

interface PharmacyPayoutRow {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_payout_amount: number;
  status: string;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

interface BookingWithPartner extends Booking {
  verification_code?: string | null;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  partner_notes?: string | null;
  payment_status?: string | null;
}

function formatInr(val: number | string | null | undefined): string {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function extractRefOrCodeFromScan(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const ref = url.searchParams.get('ref') || url.searchParams.get('code');
      if (ref) return ref.trim();
    }
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.booking_ref) return String(parsed.booking_ref).trim();
      if (parsed.ref) return String(parsed.ref).trim();
      if (parsed.code) return String(parsed.code).trim();
    }
  } catch {
    // Fallback to raw trimmed code
  }
  return trimmed;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function PharmacyPartnerPortal({ initialOrderRef }: { initialOrderRef?: string } = {}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isTablet = width >= 640 && width < 960;
  const { partnerUser, signOutPartner } = usePartnerAuth();

  const [activeTab, setActiveTab] = useState<PartnerTab>('dashboard');
  const [pharmacies, setPharmacies] = useState<PharmacyInfo[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(
    partnerUser?.partnerEntityId || null
  );
  const [orders, setOrders] = useState<BookingWithPartner[]>([]);
  const [payouts, setPayouts] = useState<PharmacyPayoutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [orderDateFilter, setOrderDateFilter] = useState<OrderDateFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const ORDER_PAGE_SIZE = 20;
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  // PWA Install Prompt
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  // QR Scanner & Code Verification State
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [verifiedBooking, setVerifiedBooking] = useState<BookingWithPartner | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCompletingCheckIn, setIsCompletingCheckIn] = useState(false);
  const [collectCounterPay, setCollectCounterPay] = useState(false);
  const [partnerCheckInNote, setPartnerCheckInNote] = useState('');
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState<string | null>(null);

  // Quote Modal State (supports itemized medicines + discount)
  const [quoteTarget, setQuoteTarget] = useState<BookingWithPartner | null>(null);
  const [quoteItems, setQuoteItems] = useState<{ name: string; qty: string; price: string }[]>([
    { name: '', qty: '1', price: '' },
  ]);
  const [quoteGrossInput, setQuoteGrossInput] = useState('');
  const [quoteDiscountPct, setQuoteDiscountPct] = useState('15');
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [quoteSavedMsg, setQuoteSavedMsg] = useState<string | null>(null);
  const [quoteConfirmOpen, setQuoteConfirmOpen] = useState(false);
  const [isEditingSentQuote, setIsEditingSentQuote] = useState(false);
  const [deliveryEtaInput, setDeliveryEtaInput] = useState('');

  // Reject / Out-of-Stock Modal State
  const [rejectTarget, setRejectTarget] = useState<BookingWithPartner | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Store Settings & Live Status Modal State
  const [editIsActive, setEditIsActive] = useState(true);
  const [edit24x7, setEdit24x7] = useState(false);
  const [weekSchedule, setWeekSchedule] = useState<Record<DayKey, DayScheduleRow>>(DEFAULT_WEEK_SCHEDULE);
  const [editDelivery, setEditDelivery] = useState(true);
  const [editDeliveryMins, setEditDeliveryMins] = useState('35');
  const [editDiscountPct, setEditDiscountPct] = useState('15');
  const [editPhone, setEditPhone] = useState('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const [storeConfirmOpen, setStoreConfirmOpen] = useState(false);
  const [pendingStoreOpen, setPendingStoreOpen] = useState(true);
  const [reopenTimeNote, setReopenTimeNote] = useState('In 1 hour');
  const [togglingStore, setTogglingStore] = useState(false);
  const [storeGreetingMsg, setStoreGreetingMsg] = useState<string | null>(null);

  // Order Sound Alarm synced directly to Store Open / Closed status
  const soundAlertsRef = useRef(true);
  useEffect(() => {
    soundAlertsRef.current = editIsActive;
  }, [editIsActive]);
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{
    ref: string;
    patient: string;
  } | null>(null);

  // Rx Image Preview Modal + Order Detail Inspector Modal
  const [rxPreviewUrl, setRxPreviewUrl] = useState<string | null>(null);
  const [rxFullScreen, setRxFullScreen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BookingWithPartner | null>(null);

  // Register PWA Manifest + Service Worker on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/partner-manifest.json';
        document.head.appendChild(link);
      } else {
        existingManifest.setAttribute('href', '/partner-manifest.json');
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/partner-sw.js').catch(() => {});
      }

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setInstallPromptEvent(e);
      };
      const handleInstalled = () => {
        setPwaInstalled(true);
        setInstallPromptEvent(null);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleInstalled);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleInstalled);
      };
    } catch {}
  }, []);

  const currentPharmacy = useMemo(
    () => pharmacies.find((p) => p.id === selectedPharmacyId) || pharmacies[0] || null,
    [pharmacies, selectedPharmacyId]
  );

  useEffect(() => {
    if (!currentPharmacy) return;
    setEditIsActive(currentPharmacy.is_active !== false);
    setEdit24x7(Boolean(currentPharmacy.is_24x7));
    if (currentPharmacy.weekly_schedule) {
      const merged: Record<DayKey, DayScheduleRow> = { ...DEFAULT_WEEK_SCHEDULE };
      WEEK_DAYS.forEach(({ key }) => {
        const s = (currentPharmacy.weekly_schedule as any)?.[key];
        if (s) {
          merged[key] = {
            open: s.open !== false,
            start: s.start || '08:00',
            end: s.end || '14:00',
            hasBreak: Boolean(s.hasBreak ?? s.start2),
            start2: s.start2 || '16:30',
            end2: s.end2 || '22:00',
          };
        }
      });
      setWeekSchedule(merged);
    }
    setEditDelivery(currentPharmacy.delivery !== false);
    setEditDeliveryMins(String(currentPharmacy.delivery_time_mins ?? 35));
    setEditDiscountPct(String(currentPharmacy.app_discount_pct ?? 15));
    setEditPhone(currentPharmacy.shop_phone || '');
    setEditSecondaryPhone(currentPharmacy.secondary_phone || '');
    setEditAbout(currentPharmacy.about || '');
    setSettingsMsg(null);
  }, [currentPharmacy]);

  const loadPartnerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: pharmRows } = await supabase
        .from('pharmacies')
        .select(
          'id, name, area, shop_address, shop_phone, secondary_phone, drug_license_number, gst_number, about, delivery, pickup, is_active, is_24x7, weekly_schedule, delivery_radius_km, delivery_time_mins, app_discount_pct, commission_percentage'
        )
        .order('name');

      const list = (pharmRows || []) as PharmacyInfo[];
      setPharmacies(list);

      const targetId =
        partnerUser?.partnerEntityId || selectedPharmacyId || list[0]?.id || null;
      if (targetId && targetId !== selectedPharmacyId) {
        setSelectedPharmacyId(targetId);
      }

      const targetPharmacy = list.find((p) => p.id === targetId) || list[0] || null;

      const [bookingsRes, payoutsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('service_type', 'PHARMACY_SCAN_PAY')
          .order('created_at', { ascending: false })
          .limit(250),
        targetPharmacy
          ? supabase
              .from('pharmacy_payouts')
              .select('*')
              .eq('pharmacy_id', targetPharmacy.id)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const allRx = (bookingsRes.data || []) as BookingWithPartner[];
      const scopedOrders = targetPharmacy
        ? allRx.filter((b) => {
            if (b.hospital_id === targetPharmacy.id) return true;
            const hn = (b.hospital_name || '').toLowerCase();
            const pn = targetPharmacy.name.toLowerCase();
            return hn && (hn === pn || hn.includes(pn) || pn.includes(hn));
          })
        : allRx;

      setOrders(scopedOrders);
      setPayouts((payoutsRes.data || []) as PharmacyPayoutRow[]);
    } catch (err) {
      console.warn('[PharmacyPartnerPortal] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [partnerUser?.partnerEntityId, selectedPharmacyId]);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  // Realtime subscription for incoming pharmacy orders
  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      const ch = supabase
        .channel('partner-pharmacy-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload: any) => {
            if (payload?.eventType === 'INSERT') {
              const row = payload?.new || {};
              if (row.service_type === 'PHARMACY_SCAN_PAY') {
                setIncomingOrderAlert({
                  ref: row.booking_ref || 'NEW',
                  patient: row.patient_name || 'Patient',
                });
                if (soundAlertsRef.current) {
                  playPartnerOrderAlarm(
                    'New Medicine Order!',
                    `${row.patient_name || 'Patient'} sent a prescription (#${row.booking_ref || 'NEW'})`
                  );
                }
              }
            }
            loadPartnerData();
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
    } catch {
      return undefined;
    }
  }, [loadPartnerData]);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    let needsQuoteCount = 0;
    let readyCount = 0;
    let dispensedToday = 0;
    let totalGross = 0;

    orders.forEach((o) => {
      const payable = Number(o.final_payable ?? o.bill_amount ?? 0);
      if (o.status === 'NEW' || o.status === 'CALLING' || (o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && payable <= 0)) {
        needsQuoteCount += 1;
      } else if (o.status === 'CONFIRMED' || o.status === 'PAID') {
        readyCount += 1;
      }

      if (o.status === 'COMPLETED') {
        const dt = o.checked_in_at || o.updated_at || o.created_at;
        if (new Date(dt).toDateString() === todayStr) dispensedToday += 1;
        totalGross += payable;
      }
    });

    const paidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
    const commPct = Number(currentPharmacy?.commission_percentage ?? 10);
    const netEarned = Math.round(totalGross * ((100 - commPct) / 100));
    const pendingPayout = Math.max(0, netEarned - paidOut);

    return {
      needsQuoteCount,
      readyCount,
      activeCount: needsQuoteCount + readyCount,
      dispensedToday,
      totalGross,
      netEarned,
      paidOut,
      pendingPayout,
      commPct,
    };
  }, [orders, payouts, currentPharmacy]);

  const urgentQueue = useMemo(
    () =>
      orders
        .filter((o) => {
          if (o.status === 'COMPLETED' || o.status === 'CANCELLED') return false;
          const payable = Number(o.final_payable ?? o.bill_amount ?? 0);
          return o.status === 'NEW' || o.status === 'CALLING' || payable <= 0;
        })
        .slice(0, 5),
    [orders]
  );

  useEffect(() => {
    setOrderPage(1);
  }, [orderFilter, orderDateFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toDateString();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    return orders.filter((o) => {
      const createdMs = new Date(o.created_at).getTime();
      if (orderDateFilter === 'TODAY' && new Date(o.created_at).toDateString() !== todayStr) return false;
      if (orderDateFilter === '7D' && createdMs < sevenDaysAgo) return false;
      if (orderDateFilter === 'THIS_MONTH' && createdMs < thisMonthStart) return false;
      if (orderDateFilter === 'LAST_MONTH' && (createdMs < lastMonthStart || createdMs >= thisMonthStart)) {
        return false;
      }

      const payable = Number(o.final_payable ?? o.bill_amount ?? 0);
      if (orderFilter === 'NEEDS_QUOTE') {
        if (o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'MISSED') return false;
        if (o.status !== 'NEW' && o.status !== 'CALLING' && payable > 0) return false;
      } else if (orderFilter === 'READY') {
        if (o.status !== 'CONFIRMED' && o.status !== 'PAID') return false;
      } else if (orderFilter === 'UNPAID') {
        if (o.status === 'CANCELLED' || o.status === 'MISSED') return false;
        if (o.payment_status === 'PAID') return false;
      } else if (orderFilter === 'COMPLETED') {
        if (o.status !== 'COMPLETED') return false;
      } else if (orderFilter === 'LOST') {
        if (o.status !== 'CANCELLED' && o.status !== 'MISSED') return false;
      }
      if (!q) return true;
      return (
        (o.booking_ref || '').toLowerCase().includes(q) ||
        (o.verification_code || '').toLowerCase().includes(q) ||
        (o.patient_name || '').toLowerCase().includes(q) ||
        (o.patient_phone || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderFilter, orderDateFilter, searchQuery]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));
  const safeOrderPage = Math.min(orderPage, totalOrderPages);
  const pagedOrders = useMemo(
    () =>
      filteredOrders.slice(
        (safeOrderPage - 1) * ORDER_PAGE_SIZE,
        safeOrderPage * ORDER_PAGE_SIZE
      ),
    [filteredOrders, safeOrderPage]
  );

  const lookupBookingByCode = async (rawInput: string) => {
    const token = extractRefOrCodeFromScan(rawInput);
    if (!token) {
      setLookupError('Scan a QR code or enter a Booking Ref / 6-character Verification Code.');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setCheckInSuccessMsg(null);
    setVerifiedBooking(null);
    setCollectCounterPay(false);
    setPartnerCheckInNote('');

    try {
      const supabase = getSupabaseClient();
      const upper = token.toUpperCase();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`booking_ref.ilike.${token},verification_code.eq.${upper}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLookupError(
          `No booking found matching "${token}". Double-check the QR pass or verification code.`
        );
        return;
      }

      setVerifiedBooking(data as BookingWithPartner);
      setCameraOpen(false);
    } catch (err: any) {
      setLookupError(err?.message || 'Lookup failed. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmDispensed = async () => {
    if (!verifiedBooking) return;
    setIsCompletingCheckIn(true);
    setLookupError(null);
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const actorName = partnerUser?.fullName || currentPharmacy?.name || 'Pharmacy Desk';

      const updates: Record<string, any> = {
        status: 'COMPLETED',
        checked_in_at: nowIso,
        checked_in_by: actorName,
        partner_notes: partnerCheckInNote.trim() || verifiedBooking.partner_notes || null,
        updated_at: nowIso,
      };
      if (collectCounterPay && verifiedBooking.payment_status !== 'PAID') {
        updates.payment_status = 'PAID';
        updates.payment_method = 'PAY_AT_CENTRE';
        updates.paid_at = nowIso;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('booking_ref', verifiedBooking.booking_ref);

      if (error) throw error;

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'PARTNER_QR_CHECKIN',
          entityType: 'booking',
          entityId: verifiedBooking.booking_ref,
          details: {
            pharmacyId: currentPharmacy?.id,
            pharmacyName: currentPharmacy?.name,
            verificationCode: verifiedBooking.verification_code || null,
            collectedAtCounter: collectCounterPay,
          },
        });
      }

      playAdminAlertChime('Medicine Dispensed', `Order #${verifiedBooking.booking_ref} marked completed.`);
      setCheckInSuccessMsg(
        `Verified & Marked Dispensed! #${verifiedBooking.booking_ref} for ${verifiedBooking.patient_name} is now COMPLETED.`
      );
      setVerifiedBooking({
        ...verifiedBooking,
        ...updates,
      });
      await loadPartnerData();
    } catch (err: any) {
      setLookupError(err?.message || 'Could not mark order as dispensed.');
    } finally {
      setIsCompletingCheckIn(false);
    }
  };

  const parseItemizedMedicines = (text?: string | null): { name: string; qty: string; price: string }[] => {
    if (!text) return [];
    const cleaned = text.replace(/^Quote:\s*/i, '').split('|')[0]?.trim() || '';
    if (!cleaned || cleaned === 'Adityam Partner Pharmacy') return [];
    const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
    const parsed: { name: string; qty: string; price: string }[] = [];
    for (const p of parts) {
      const m = p.match(/^(.+?)\s*\(([^)]+)\)\s*₹\s*([0-9.]+)$/);
      if (m) {
        parsed.push({ name: m[1].trim(), qty: m[2].trim(), price: m[3].trim() });
      }
    }
    return parsed;
  };

  const restoreQuoteStateForOrder = (o: BookingWithPartner) => {
    const fromDoc = parseItemizedMedicines(o.doctor_name);
    const restored = fromDoc.length > 0 ? fromDoc : parseItemizedMedicines(o.partner_notes);
    setQuoteItems(restored.length > 0 ? restored : [{ name: '', qty: '1', price: '' }]);
    setQuoteGrossInput(o.bill_amount && Number(o.bill_amount) > 0 ? String(o.bill_amount) : '');
    setQuoteDiscountPct(String(currentPharmacy?.app_discount_pct ?? 20));
    setQuoteSavedMsg(null);
    setIsEditingSentQuote(false);
    setQuoteConfirmOpen(false);
    setDeliveryEtaInput('');
  };

  const openOrderWorkspace = (o: BookingWithPartner) => {
    setSelectedOrder(o);
    restoreQuoteStateForOrder(o);
    if (o.booking_ref && initialOrderRef !== o.booking_ref) {
      router.push(`/partner/orders/${encodeURIComponent(o.booking_ref)}` as any);
    }
  };

  useEffect(() => {
    if (!initialOrderRef || orders.length === 0) return;
    if (selectedOrder?.booking_ref === initialOrderRef) return;
    const match = orders.find((o) => o.booking_ref === initialOrderRef);
    if (match) {
      setSelectedOrder(match);
      restoreQuoteStateForOrder(match);
    }
  }, [initialOrderRef, orders, selectedOrder?.booking_ref, currentPharmacy?.app_discount_pct]);

  const handleNavTabPress = (tabId: PartnerTab) => {
    setSelectedOrder(null);
    setActiveTab(tabId);
    if (initialOrderRef) {
      router.replace('/partner' as any);
    }
  };

  const handleSaveQuote = async (overrideTarget?: BookingWithPartner) => {
    const target = overrideTarget || quoteTarget || selectedOrder;
    if (!target) return;
    const validItems = quoteItems.filter((it) => it.name.trim() && Number(it.price) > 0);
    const itemsSum = validItems.reduce((sum, it) => sum + Number(it.price || 0), 0);
    const gross = itemsSum > 0 ? itemsSum : Number(quoteGrossInput);
    const discPct = Math.min(80, Math.max(0, Number(currentPharmacy?.app_discount_pct ?? quoteDiscountPct ?? 0)));
    if (!Number.isFinite(gross) || gross <= 0) return;

    const discountAmount = Math.round((gross * discPct) / 100);
    const finalPayable = Math.max(0, Math.round(gross - discountAmount));
    const itemSummary =
      validItems.length > 0
        ? validItems.map((it) => `${it.name.trim()} (${it.qty || '1'}) ₹${it.price}`).join(', ')
        : target.doctor_name;
    const nextStatus =
      target.status === 'NEW' || target.status === 'CALLING' ? 'CONFIRMED' : target.status;
    const nextNotes =
      validItems.length > 0
        ? `Quote: ${itemSummary} | Net ₹${finalPayable}`
        : target.partner_notes || null;

    setIsSavingQuote(true);
    setQuoteSavedMsg(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          bill_amount: gross,
          discount_amount: discountAmount,
          final_payable: finalPayable,
          doctor_name: itemSummary,
          partner_notes: nextNotes,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', target.booking_ref);

      if (error) throw error;

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'PARTNER_QUOTE_SUBMITTED',
          entityType: 'booking',
          entityId: target.booking_ref,
          details: { gross, discountAmount, finalPayable, itemSummary },
        });
      }

      setQuoteTarget(null);
      setQuoteConfirmOpen(false);
      setIsEditingSentQuote(false);
      if (selectedOrder && selectedOrder.booking_ref === target.booking_ref) {
        setSelectedOrder({
          ...selectedOrder,
          bill_amount: gross,
          discount_amount: discountAmount,
          final_payable: finalPayable,
          doctor_name: itemSummary,
          partner_notes: nextNotes,
          status: nextStatus,
        });
        setQuoteSavedMsg(`Quote sent! Patient payable is ${formatInr(finalPayable)} (${discPct}% off).`);
      }
      await loadPartnerData();
    } catch {
      // handled silently
    } finally {
      setIsSavingQuote(false);
    }
  };

  const handleUnlockCounterPay = async (o: BookingWithPartner) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'PAID',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', o.booking_ref);
      if (error) throw error;
      if (selectedOrder && selectedOrder.booking_ref === o.booking_ref) {
        setSelectedOrder({ ...selectedOrder, status: 'PAID' });
      }
      await loadPartnerData();
    } catch {}
  };

  const handleDeliveryStage = async (o: BookingWithPartner, stageLabel: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          slot_time: stageLabel,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', o.booking_ref);
      if (selectedOrder && selectedOrder.booking_ref === o.booking_ref) {
        setSelectedOrder({ ...selectedOrder, slot_time: stageLabel });
      }
      await loadPartnerData();
    } catch {}
  };

  const handleRejectOrder = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || 'Medicine out of stock at store';
    setIsRejecting(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          partner_notes: `Store Declined: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', rejectTarget.booking_ref);
      if (error) throw error;

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'PARTNER_ORDER_DECLINED',
          entityType: 'booking',
          entityId: rejectTarget.booking_ref,
          details: { reason },
        });
      }
      setRejectTarget(null);
      setRejectReason('');
      await loadPartnerData();
    } catch {
      // ignore
    } finally {
      setIsRejecting(false);
    }
  };

  const requestToggleStore = (nextOpen: boolean) => {
    setPendingStoreOpen(nextOpen);
    setStoreConfirmOpen(true);
  };

  const confirmToggleStore = async () => {
    if (!currentPharmacy) return;
    setTogglingStore(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('pharmacies')
        .update({ is_active: pendingStoreOpen })
        .eq('id', currentPharmacy.id);
      if (error) throw error;

      setEditIsActive(pendingStoreOpen);
      setStoreConfirmOpen(false);
      if (pendingStoreOpen) {
        await requestDesktopNotificationPermission();
        setStoreGreetingMsg(
          `Welcome back! ${currentPharmacy.name} is now OPEN and ready to receive patient orders.`
        );
      } else {
        setStoreGreetingMsg(
          `Store paused (${reopenTimeNote}). Hidden from patient recommendations until you reopen.`
        );
      }

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: pendingStoreOpen ? 'PARTNER_STORE_OPENED' : 'PARTNER_STORE_CLOSED',
          entityType: 'pharmacy',
          entityId: currentPharmacy.id,
          details: { reopenTimeNote: pendingStoreOpen ? null : reopenTimeNote },
        });
      }
      await loadPartnerData();
    } catch {
      setStoreConfirmOpen(false);
    } finally {
      setTogglingStore(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    if (!currentPharmacy) return;
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const supabase = getSupabaseClient();
      const mins = Math.max(10, Number(editDeliveryMins || 35));
      const disc = Math.min(50, Math.max(0, Number(editDiscountPct || 15)));
      const { error } = await supabase
        .from('pharmacies')
        .update({
          is_active: editIsActive,
          is_24x7: edit24x7,
          delivery: editDelivery,
          secondary_phone: editSecondaryPhone.trim() || null,
          about: editAbout.trim() || null,
          weekly_schedule: weekSchedule,
        })
        .eq('id', currentPharmacy.id);
      if (error) throw error;

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'PARTNER_SETTINGS_UPDATED',
          entityType: 'pharmacy',
          entityId: currentPharmacy.id,
          details: { is_24x7: edit24x7, delivery: editDelivery, delivery_time_mins: mins, app_discount_pct: disc },
        });
      }
      setSettingsMsg('Store settings saved and synced live.');
      await loadPartnerData();
    } catch (err: any) {
      setSettingsMsg(err?.message || 'Could not update store settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInstallPwa = async () => {
    if (!installPromptEvent) return;
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice?.outcome === 'accepted') {
        setPwaInstalled(true);
      }
      setInstallPromptEvent(null);
    } catch {}
  };

  const navItems: { id: PartnerTab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: stats.activeCount },
    { id: 'scanner', label: 'Scan QR', icon: QrCode },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'settings', label: 'Store', icon: Settings },
  ];

  const pageTitleMap: Record<PartnerTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Pharmacy Dashboard',
      subtitle: 'Live prescription triage, today’s dispenses & net earnings',
    },
    orders: {
      title: 'Prescription & Medicine Orders',
      subtitle: 'Quote bills, call patients, inspect Rx slips & verify pickup',
    },
    scanner: {
      title: 'QR & Code Verification Desk',
      subtitle: 'Scan patient QR pass or enter 6-character verification code',
    },
    payouts: {
      title: 'Payouts & Settlements',
      subtitle: 'Gross sales, platform fee & weekly UTR settlement ledger',
    },
    settings: {
      title: 'Store Hours & Delivery Rules',
      subtitle: 'Manage 24x7 availability, delivery timing & app discount',
    },
  };

  const quoteItemsTotal = quoteItems.reduce((s, it) => s + Number(it.price || 0), 0);
  const quotePreviewGross = quoteItemsTotal > 0 ? quoteItemsTotal : Number(quoteGrossInput || 0);
  const quotePreviewDisc = Math.round(
    (quotePreviewGross * Math.min(80, Math.max(0, Number(quoteDiscountPct || 0)))) / 100
  );
  const quotePreviewNet = Math.max(0, Math.round(quotePreviewGross - quotePreviewDisc));

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: THEME.bg }}>
      {/* Desktop Left Sidebar */}
      {isDesktop && (
        <View
          style={{
            width: 248,
            backgroundColor: THEME.greenDark,
            padding: 18,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 20 }}>
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
                <Store size={19} color="#A7D7C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                  {currentPharmacy?.name || 'Partner Desk'}
                </Text>
                <Text style={{ fontSize: 11, color: '#A7D7C0' }}>
                  Adityam Partner Portal
                </Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              {navItems.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleNavTabPress(tab.id)}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Icon size={17} color={active ? '#FFFFFF' : '#9DC0B1'} />
                      <Text style={{ fontSize: 13.5, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : '#C6E2D4' }}>
                        {tab.label}
                      </Text>
                    </View>
                    {tab.badge ? (
                      <View
                        style={{
                          backgroundColor: '#F3DBA8',
                          paddingHorizontal: 7,
                          paddingVertical: 1,
                          borderRadius: 99,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.greenDark }}>
                          {tab.badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {installPromptEvent && !pwaInstalled && (
              <TouchableOpacity
                onPress={handleInstallPwa}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#F3DBA8',
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Download size={14} color={THEME.greenDark} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
                  Install Partner App
                </Text>
              </TouchableOpacity>
            )}

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.12)',
                paddingTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                  {partnerUser?.fullName}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#9DC0B1' }}>
                  {partnerUser?.role === 'admin' || partnerUser?.role === 'super_admin' ? 'ADMIN PREVIEW' : 'PHARMACY PARTNER'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={signOutPartner}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Header Bar */}
        <View
          style={{
            backgroundColor: isDesktop ? THEME.surface : THEME.greenDark,
            borderBottomWidth: 1,
            borderBottomColor: isDesktop ? THEME.border : 'transparent',
            paddingHorizontal: isDesktop ? 28 : 16,
            paddingTop: isDesktop ? 14 : Platform.OS === 'web' ? 14 : 48,
            paddingBottom: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              {!isDesktop && (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Store size={18} color="#A7D7C0" />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: isDesktop ? 18 : 15,
                    fontWeight: '800',
                    color: isDesktop ? THEME.ink : '#FFFFFF',
                  }}
                  numberOfLines={1}
                >
                  {isDesktop ? pageTitleMap[activeTab].title : currentPharmacy?.name || 'Partner Desk'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 99,
                      backgroundColor: editIsActive ? '#22C55E' : '#EF4444',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '600',
                      color: isDesktop ? THEME.muted : '#A7D7C0',
                    }}
                    numberOfLines={1}
                  >
                    {isDesktop
                      ? pageTitleMap[activeTab].subtitle
                      : `${editIsActive ? 'OPEN' : 'CLOSED'} · ${pageTitleMap[activeTab].title}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity
                onPress={loadPartnerData}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: isDesktop ? 11 : 9,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: isDesktop ? THEME.greenSoft : 'rgba(255,255,255,0.12)',
                  borderWidth: isDesktop ? 1 : 0,
                  borderColor: THEME.greenBorder,
                }}
              >
                <RefreshCw size={14} color={isDesktop ? THEME.green : '#FFFFFF'} />
                {isDesktop && (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>Refresh</Text>
                )}
              </TouchableOpacity>

              {!isDesktop && (
                <TouchableOpacity
                  onPress={signOutPartner}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LogOut size={15} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Admin Pharmacy Switcher */}
          {(partnerUser?.role === 'admin' || partnerUser?.role === 'super_admin') && pharmacies.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {pharmacies.map((p) => {
                const active = p.id === currentPharmacy?.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPharmacyId(p.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 99,
                      backgroundColor: active
                        ? isDesktop
                          ? THEME.greenDark
                          : '#FFFFFF'
                        : isDesktop
                        ? THEME.surfaceAlt
                        : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: active
                          ? isDesktop
                            ? '#FFFFFF'
                            : THEME.greenDark
                          : isDesktop
                          ? THEME.ink
                          : '#E5E7EB',
                      }}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: isDesktop ? 24 : 14,
            paddingBottom: isDesktop ? 32 : 96,
            maxWidth: 1120,
            width: '100%',
            alignSelf: 'center',
            gap: 16,
          }}
        >
          {incomingOrderAlert && (
            <View
              style={{
                backgroundColor: THEME.amberBg,
                borderWidth: 1.5,
                borderColor: '#D97706',
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.amberText }}>
                  New Medicine Order Arrived! #{incomingOrderAlert.ref}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.ink, marginTop: 2 }}>
                  From {incomingOrderAlert.patient} — Tap to inspect prescription & send quote.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIncomingOrderAlert(null);
                  setOrderFilter('NEEDS_QUOTE');
                  setActiveTab('orders');
                }}
                style={{
                  backgroundColor: THEME.green,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>View Order →</Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={THEME.green} />
            </View>
          ) : selectedOrder ? (
            /* Full-Page Order Slug Workspace (Side-by-Side Rx + Easy Quotation + Progress Stepper) */
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedOrder(null);
                    if (initialOrderRef) {
                      router.replace('/partner' as any);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 9,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>← Back to Orders</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                    #{selectedOrder.booking_ref}
                  </Text>
                  <View
                    style={{
                      backgroundColor: selectedOrder.status === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 99,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: selectedOrder.status === 'COMPLETED' ? THEME.green : THEME.amberText,
                      }}
                    >
                      {selectedOrder.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Side-by-Side on Desktop, Stacked on Mobile */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
                {/* Left Column: Embedded Rx Image + Customer Details & Note */}
                <View style={{ flex: 1, width: '100%', gap: 12 }}>
                  {selectedOrder.bill_image_url ? (
                    <View
                      style={{
                        backgroundColor: THEME.surface,
                        borderRadius: 14,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                          Uploaded Prescription
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setRxFullScreen(true);
                            setRxPreviewUrl(selectedOrder.bill_image_url || null);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 7,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                          }}
                        >
                          <Maximize2 size={12} color={THEME.greenDark} />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>
                            Full Screen
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          setRxFullScreen(true);
                          setRxPreviewUrl(selectedOrder.bill_image_url || null);
                        }}
                      >
                        <Image
                          source={{ uri: selectedOrder.bill_image_url }}
                          style={{ width: '100%', height: 290, borderRadius: 10, backgroundColor: '#F3F4F6' }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      {selectedOrder.patient_name} · {selectedOrder.patient_phone || 'N/A'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      {selectedOrder.slot_time || 'Pickup / Delivery'}
                      {selectedOrder.verification_code ? ` · PIN: ${selectedOrder.verification_code}` : ''}
                    </Text>

                    {selectedOrder.notes ? (
                      <View
                        style={{
                          backgroundColor: THEME.amberBg,
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: THEME.amberBorder,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.amberText }}>
                          CUSTOMER NOTE & DELIVERY DETAILS
                        </Text>
                        <Text style={{ fontSize: 12, color: THEME.ink, marginTop: 2, lineHeight: 17 }}>
                          {selectedOrder.notes}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
                      {selectedOrder.patient_phone ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${selectedOrder.patient_phone}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: THEME.surfaceAlt,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Phone size={13} color={THEME.ink} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call Patient</Text>
                        </TouchableOpacity>
                      ) : null}
                      {normalizePhone(selectedOrder.patient_phone) ? (
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(
                              `https://wa.me/${normalizePhone(selectedOrder.patient_phone)}?text=${encodeURIComponent(
                                `Namaste ${selectedOrder.patient_name}, ${currentPharmacy?.name || 'Pharmacy'} here regarding your Adityam order #${selectedOrder.booking_ref}.`
                              )}`
                            )
                          }
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                          }}
                        >
                          <MessageCircle size={13} color={THEME.greenDark} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>
                            WhatsApp Chat
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Right Column: 2-Stage Order Flow (Step 1 Quote -> Payment -> Step 2 Fulfillment) */}
                {(() => {
                  const hasSentQuote =
                    Number(selectedOrder.bill_amount || 0) > 0 &&
                    selectedOrder.status !== 'NEW' &&
                    selectedOrder.status !== 'CALLING';
                  const showStep1Form =
                    selectedOrder.status !== 'COMPLETED' &&
                    selectedOrder.status !== 'CANCELLED' &&
                    (!hasSentQuote || isEditingSentQuote);
                  const isPaid = selectedOrder.status === 'PAID';
                  const isPickupOrder =
                    (selectedOrder.slot_time || '').toLowerCase().includes('pickup') ||
                    (selectedOrder.notes || '').toLowerCase().includes('mode: pickup');
                  const savedMeds = parseItemizedMedicines(selectedOrder.doctor_name);
                  const etaOptions = isPickupOrder
                    ? ['Pickup Ready Now', 'Pickup Ready (10 mins)', 'Pickup Ready (15 mins)', 'Pickup Ready (30 mins)']
                    : ['Home Delivery (15 mins)', 'Home Delivery (30 mins)', 'Home Delivery (45 mins)', 'Home Delivery (1 hr)'];

                  return (
                    <View style={{ flex: 1, width: '100%', gap: 12 }}>
                      {showStep1Form ? (
                        <View
                          style={{
                            backgroundColor: THEME.surface,
                            borderRadius: 14,
                            padding: 15,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            gap: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                              Step 1 · Medicine Quotation
                            </Text>
                            <View
                              style={{
                                backgroundColor: THEME.greenSoft,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 99,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.greenDark }}>
                                {currentPharmacy?.app_discount_pct ?? 20}% OFF (Locked)
                              </Text>
                            </View>
                          </View>

                          <View style={{ gap: 6 }}>
                            {quoteItems.map((item, idx) => (
                              <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TextInput
                                  value={item.name}
                                  onChangeText={(txt) =>
                                    setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, name: txt } : r)))
                                  }
                                  placeholder="Medicine name"
                                  placeholderTextColor="#9CA3AF"
                                  style={{
                                    flex: 2,
                                    backgroundColor: THEME.bg,
                                    borderWidth: 1,
                                    borderColor: THEME.border,
                                    borderRadius: 8,
                                    paddingHorizontal: 9,
                                    paddingVertical: 8,
                                    fontSize: 12.5,
                                    color: THEME.ink,
                                  }}
                                />
                                <TextInput
                                  value={item.qty}
                                  onChangeText={(txt) =>
                                    setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: txt } : r)))
                                  }
                                  placeholder="Qty"
                                  placeholderTextColor="#9CA3AF"
                                  style={{
                                    width: 52,
                                    backgroundColor: THEME.bg,
                                    borderWidth: 1,
                                    borderColor: THEME.border,
                                    borderRadius: 8,
                                    paddingHorizontal: 8,
                                    paddingVertical: 8,
                                    fontSize: 12.5,
                                    color: THEME.ink,
                                  }}
                                />
                                <TextInput
                                  value={item.price}
                                  onChangeText={(txt) =>
                                    setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, price: txt } : r)))
                                  }
                                  keyboardType="numeric"
                                  placeholder="₹ MRP"
                                  placeholderTextColor="#9CA3AF"
                                  style={{
                                    width: 76,
                                    backgroundColor: THEME.bg,
                                    borderWidth: 1,
                                    borderColor: THEME.border,
                                    borderRadius: 8,
                                    paddingHorizontal: 8,
                                    paddingVertical: 8,
                                    fontSize: 12.5,
                                    color: THEME.ink,
                                  }}
                                />
                              </View>
                            ))}
                          </View>

                          <TouchableOpacity
                            onPress={() => setQuoteItems((prev) => [...prev, { name: '', qty: '1', price: '' }])}
                            style={{ alignSelf: 'flex-start' }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                              + Add Another Medicine
                            </Text>
                          </TouchableOpacity>

                          <View style={{ gap: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                              {quoteItemsTotal > 0 ? 'Auto-Summed Gross MRP (₹)' : 'Or Enter Total Gross MRP (₹)'}
                            </Text>
                            <TextInput
                              value={quoteItemsTotal > 0 ? String(quoteItemsTotal) : quoteGrossInput}
                              onChangeText={setQuoteGrossInput}
                              editable={quoteItemsTotal <= 0}
                              keyboardType="numeric"
                              placeholder="e.g. 650"
                              style={{
                                backgroundColor: quoteItemsTotal > 0 ? THEME.surfaceAlt : THEME.bg,
                                borderWidth: 1,
                                borderColor: THEME.border,
                                borderRadius: 9,
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                                fontSize: 14,
                                color: THEME.ink,
                              }}
                            />
                          </View>

                          {quotePreviewGross > 0 && (
                            <View
                              style={{
                                backgroundColor: THEME.greenSoft,
                                borderRadius: 10,
                                padding: 10,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Text style={{ fontSize: 12, color: THEME.greenDark, fontWeight: '700' }}>
                                Patient Payable ({formatInr(quotePreviewDisc)} off):
                              </Text>
                              <Text style={{ fontSize: 14, color: THEME.greenDark, fontWeight: '900' }}>
                                {formatInr(quotePreviewNet)}
                              </Text>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {isEditingSentQuote && (
                              <TouchableOpacity
                                onPress={() => setIsEditingSentQuote(false)}
                                style={{
                                  flex: 1,
                                  backgroundColor: THEME.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: THEME.border,
                                  borderRadius: 10,
                                  paddingVertical: 12,
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                                  Cancel
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => {
                                if (quotePreviewGross > 0) {
                                  setQuoteConfirmOpen(true);
                                }
                              }}
                              disabled={isSavingQuote || quotePreviewGross <= 0}
                              style={{
                                flex: 2,
                                backgroundColor: quotePreviewGross > 0 ? THEME.green : '#9CA3AF',
                                borderRadius: 10,
                                paddingVertical: 12,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                                {isSavingQuote ? 'Sending Quote...' : 'Send Quote & Confirm Order'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : hasSentQuote ? (
                        <View
                          style={{
                            backgroundColor: THEME.surface,
                            borderRadius: 14,
                            padding: 15,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                            gap: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.greenDark }}>
                              ✓ Step 1 Complete · Quote Sent
                            </Text>
                            {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                              <TouchableOpacity
                                onPress={() => {
                                  restoreQuoteStateForOrder(selectedOrder);
                                  setIsEditingSentQuote(true);
                                }}
                                style={{
                                  backgroundColor: THEME.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: THEME.border,
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                }}
                              >
                                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                                  Edit Quote
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {savedMeds.length > 0 && (
                            <View
                              style={{
                                backgroundColor: THEME.bg,
                                borderRadius: 10,
                                padding: 10,
                                gap: 5,
                                borderWidth: 1,
                                borderColor: THEME.border,
                              }}
                            >
                              {savedMeds.map((m, i) => (
                                <View
                                  key={i}
                                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                                    {m.name} × {m.qty}
                                  </Text>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                                    ₹{m.price}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View
                            style={{
                              backgroundColor: THEME.greenSoft,
                              borderRadius: 10,
                              padding: 10,
                              gap: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, color: THEME.muted }}>Gross MRP</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                                {formatInr(Number(selectedOrder.bill_amount || 0))}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, color: THEME.greenDark }}>Discount</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>
                                - {formatInr(Number(selectedOrder.discount_amount || 0))}
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                borderTopWidth: 1,
                                borderTopColor: THEME.greenBorder,
                                paddingTop: 5,
                                marginTop: 2,
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>
                                {isPaid || selectedOrder.status === 'COMPLETED' ? 'Total Paid' : 'Patient Payable'}
                              </Text>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.greenDark }}>
                                {formatInr(Number(selectedOrder.final_payable || 0))}
                              </Text>
                            </View>
                          </View>

                          {selectedOrder.status === 'CONFIRMED' && (
                            <View
                              style={{
                                backgroundColor: THEME.amberBg,
                                borderWidth: 1,
                                borderColor: THEME.amberBorder,
                                borderRadius: 10,
                                padding: 11,
                                gap: 8,
                              }}
                            >
                              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amberText }}>
                                Awaiting Patient Payment
                              </Text>
                              <Text style={{ fontSize: 11.5, color: THEME.amberText, lineHeight: 16 }}>
                                Step 2 (Packing, Delivery Time & Dispense) will unlock automatically once the patient completes payment in the app.
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleUnlockCounterPay(selectedOrder)}
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: THEME.amberBorder,
                                  borderRadius: 8,
                                  paddingVertical: 8,
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.amberText }}>
                                  Paying at Counter / COD → Unlock Step 2
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ) : null}

                      {/* Step 2: Shown ONLY after patient pays (PAID) AND quote was sent (hasSentQuote), or when COMPLETED/CANCELLED */}
                      {((isPaid && hasSentQuote) || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED') && (
                        <View
                          style={{
                            backgroundColor: THEME.surface,
                            borderRadius: 14,
                            padding: 15,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            gap: 10,
                          }}
                        >
                          <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                            Step 2 · Packing, {isPickupOrder ? 'Pickup Ready Time' : 'Delivery ETA'} & Dispense
                          </Text>

                          {isPaid ? (
                            <View style={{ gap: 10 }}>
                              <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>
                                  {isPickupOrder ? 'Set Counter Pickup Ready Time' : 'Set Home Delivery ETA'}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                  {etaOptions.map((opt) => {
                                    const active = selectedOrder.slot_time === opt;
                                    return (
                                      <TouchableOpacity
                                        key={opt}
                                        onPress={() => handleDeliveryStage(selectedOrder, opt)}
                                        style={{
                                          paddingHorizontal: 10,
                                          paddingVertical: 7,
                                          borderRadius: 8,
                                          backgroundColor: active ? THEME.greenSoft : THEME.surfaceAlt,
                                          borderWidth: 1,
                                          borderColor: active ? THEME.green : THEME.border,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 11.5,
                                            fontWeight: '700',
                                            color: active ? THEME.greenDark : THEME.ink,
                                          }}
                                        >
                                          {active ? `✓ ${opt}` : opt}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                                  <TextInput
                                    value={deliveryEtaInput}
                                    onChangeText={setDeliveryEtaInput}
                                    placeholder={isPickupOrder ? 'Custom ready time (e.g. Ready at 5:30 PM)' : 'Custom ETA (e.g. Delivery in 2 hrs)'}
                                    placeholderTextColor="#9CA3AF"
                                    style={{
                                      flex: 1,
                                      backgroundColor: THEME.bg,
                                      borderWidth: 1,
                                      borderColor: THEME.border,
                                      borderRadius: 8,
                                      paddingHorizontal: 10,
                                      paddingVertical: 7,
                                      fontSize: 12,
                                      color: THEME.ink,
                                    }}
                                  />
                                  <TouchableOpacity
                                    onPress={() => {
                                      if (deliveryEtaInput.trim()) {
                                        handleDeliveryStage(selectedOrder, deliveryEtaInput.trim());
                                        setDeliveryEtaInput('');
                                      }
                                    }}
                                    style={{
                                      backgroundColor: THEME.greenSoft,
                                      borderWidth: 1,
                                      borderColor: THEME.greenBorder,
                                      borderRadius: 8,
                                      paddingHorizontal: 12,
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                                      Set
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>

                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => handleDeliveryStage(selectedOrder, 'Packing Medicines')}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 9,
                                    backgroundColor:
                                      selectedOrder.slot_time === 'Packing Medicines' ? THEME.greenSoft : THEME.surfaceAlt,
                                    borderWidth: 1,
                                    borderColor:
                                      selectedOrder.slot_time === 'Packing Medicines' ? THEME.green : THEME.border,
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                                    {selectedOrder.slot_time === 'Packing Medicines' ? '✓ Packing' : 'Mark Packing'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() =>
                                    handleDeliveryStage(
                                      selectedOrder,
                                      isPickupOrder ? 'Ready for Pickup' : 'Out for Delivery'
                                    )
                                  }
                                  style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 9,
                                    backgroundColor:
                                      selectedOrder.slot_time === 'Out for Delivery' ||
                                      selectedOrder.slot_time === 'Ready for Pickup'
                                        ? THEME.amberBg
                                        : THEME.surfaceAlt,
                                    borderWidth: 1,
                                    borderColor:
                                      selectedOrder.slot_time === 'Out for Delivery' ||
                                      selectedOrder.slot_time === 'Ready for Pickup'
                                        ? '#D97706'
                                        : THEME.border,
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.amberText }}>
                                    {selectedOrder.slot_time === 'Out for Delivery' ||
                                    selectedOrder.slot_time === 'Ready for Pickup'
                                      ? `✓ ${selectedOrder.slot_time}`
                                      : isPickupOrder
                                        ? 'Ready for Pickup'
                                        : 'Out for Delivery'}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              <TouchableOpacity
                                onPress={() => {
                                  const target = selectedOrder;
                                  setSelectedOrder(null);
                                  setActiveTab('scanner');
                                  setManualCodeInput(target.verification_code || target.booking_ref);
                                  setVerifiedBooking(target);
                                  setLookupError(null);
                                  setCheckInSuccessMsg(null);
                                }}
                                style={{
                                  backgroundColor: THEME.greenDark,
                                  borderRadius: 10,
                                  paddingVertical: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                              >
                                <PackageCheck size={16} color="#FFFFFF" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                                  Verify QR / Code & Mark Dispensed
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  const target = selectedOrder;
                                  setSelectedOrder(null);
                                  setRejectTarget(target);
                                  setRejectReason('');
                                }}
                                style={{
                                  paddingVertical: 10,
                                  borderRadius: 9,
                                  backgroundColor: THEME.redBg,
                                  borderWidth: 1,
                                  borderColor: THEME.redBorder,
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.redText }}>
                                  Out of Stock / Cancel Order
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                              Order is {selectedOrder.status}
                              {selectedOrder.checked_in_at
                                ? ` (${new Date(selectedOrder.checked_in_at).toLocaleString('en-IN')})`
                                : ''}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            </View>
          ) : activeTab === 'dashboard' ? (
            <View style={{ gap: 16 }}>
              {/* Store Welcome / Status Greeting Banner */}
              {storeGreetingMsg && (
                <View
                  style={{
                    backgroundColor: editIsActive ? THEME.greenSoft : THEME.amberBg,
                    borderWidth: 1,
                    borderColor: editIsActive ? THEME.greenBorder : THEME.amberBorder,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      fontWeight: '700',
                      color: editIsActive ? THEME.greenDark : THEME.amberText,
                    }}
                  >
                    {storeGreetingMsg}
                  </Text>
                  <TouchableOpacity onPress={() => setStoreGreetingMsg(null)}>
                    <X size={15} color={THEME.muted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Quick Store Open / Closed Switch Card */}
              <View
                style={{
                  backgroundColor: editIsActive ? THEME.surface : THEME.redBg,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: editIsActive ? THEME.greenBorder : THEME.redBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: editIsActive ? THEME.greenSoft : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Store size={18} color={editIsActive ? THEME.green : THEME.redText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      {editIsActive ? 'Store is OPEN on Patient App' : 'Store is CLOSED (Paused)'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                      {editIsActive
                        ? 'Receiving live prescriptions & delivery orders'
                        : `Hidden from patient recommendations · ${reopenTimeNote}`}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={editIsActive}
                  onValueChange={(val) => requestToggleStore(val)}
                  trackColor={{ false: '#FCA5A5', true: '#86EFAC' }}
                  thumbColor={editIsActive ? THEME.green : THEME.redText}
                />
              </View>

              {/* 4 Responsive KPI Cards */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setOrderFilter('NEEDS_QUOTE');
                    setActiveTab('orders');
                  }}
                  style={{
                    flex: 1,
                    minWidth: isDesktop ? 200 : '47%',
                    backgroundColor: stats.needsQuoteCount > 0 ? THEME.amberBg : THEME.surface,
                    borderRadius: 14,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: stats.needsQuoteCount > 0 ? THEME.amberBorder : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: stats.needsQuoteCount > 0 ? THEME.amberText : THEME.muted }}>
                    NEEDS QUOTE / NEW
                  </Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: stats.needsQuoteCount > 0 ? THEME.amberText : THEME.ink, marginTop: 4 }}>
                    {stats.needsQuoteCount}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    Tap to send medicine bill
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setOrderFilter('READY');
                    setActiveTab('orders');
                  }}
                  style={{
                    flex: 1,
                    minWidth: isDesktop ? 200 : '47%',
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                    READY / PICKUP
                  </Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 4 }}>
                    {stats.readyCount}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    Awaiting QR scan / dispatch
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    flex: 1,
                    minWidth: isDesktop ? 200 : '47%',
                    backgroundColor: THEME.greenDark,
                    borderRadius: 14,
                    padding: 15,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#A7D7C0' }}>
                    DISPENSED TODAY
                  </Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginTop: 4 }}>
                    {stats.dispensedToday}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#C6E2D4', marginTop: 2 }}>
                    Verified via QR / Code
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setActiveTab('payouts')}
                  style={{
                    flex: 1,
                    minWidth: isDesktop ? 200 : '47%',
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                    NET BALANCE DUE
                  </Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.green, marginTop: 4 }}>
                    {formatInr(stats.pendingPayout)}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    After {stats.commPct}% platform fee
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 2-Column Responsive Workspace */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
                {/* Urgent Quote Queue */}
                <View
                  style={{
                    flex: 1.4,
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
                        Urgent Rx & Quote Queue
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        Orders waiting for medicine quote or confirmation
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveTab('orders')}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                        View All →
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {urgentQueue.length === 0 ? (
                    <View
                      style={{
                        backgroundColor: THEME.bg,
                        borderRadius: 12,
                        padding: 24,
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircle2 size={24} color={THEME.green} />
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink, marginTop: 6 }}>
                        All orders quoted!
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                        No pending prescriptions waiting right now.
                      </Text>
                    </View>
                  ) : (
                    urgentQueue.map((o) => (
                      <View
                        key={o.id}
                        style={{
                          backgroundColor: THEME.bg,
                          borderRadius: 12,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          flexDirection: isTablet || isDesktop ? 'row' : 'column',
                          justifyContent: 'space-between',
                          alignItems: isTablet || isDesktop ? 'center' : 'flex-start',
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                            #{o.booking_ref} · {o.patient_name}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                            {o.patient_phone} · {o.slot_time || 'Store Pickup / Delivery'}
                          </Text>
                          {o.notes ? (
                            <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.amberText, marginTop: 3 }} numberOfLines={2}>
                              {o.notes.split('Prescription request sent')[0]?.trim() || o.notes}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 7 }}>
                          {o.bill_image_url && (
                            <TouchableOpacity
                              onPress={() => setRxPreviewUrl(o.bill_image_url || null)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                borderRadius: 8,
                                backgroundColor: THEME.amberBg,
                                borderWidth: 1,
                                borderColor: THEME.amberBorder,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amberText }}>
                                View Rx
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => openOrderWorkspace(o)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: THEME.green,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                              View Order
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Quick Actions & Store Snapshot */}
                <View style={{ flex: 1, gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setActiveTab('scanner')}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderRadius: 16,
                      padding: 18,
                      borderWidth: 1.5,
                      borderColor: THEME.greenBorder,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: THEME.green,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <QrCode size={22} color="#FFFFFF" />
                      </View>
                      <ArrowUpRight size={18} color={THEME.greenDark} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.greenDark, marginTop: 4 }}>
                      Scan Patient QR / Code
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.ink, lineHeight: 17 }}>
                      Instant counter verification when patient picks up or receives medicine.
                    </Text>
                  </TouchableOpacity>

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
                      <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                        Store Snapshot
                      </Text>
                      <TouchableOpacity onPress={() => setActiveTab('settings')}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>Edit →</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        Hours:{' '}
                        <Text style={{ fontWeight: '700', color: THEME.ink }}>
                          {currentPharmacy?.is_24x7 ? 'Open 24x7' : 'Standard Store Hours'}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        Home Delivery:{' '}
                        <Text style={{ fontWeight: '700', color: THEME.ink }}>
                          {currentPharmacy?.delivery !== false
                            ? `Enabled (${currentPharmacy?.delivery_time_mins ?? 35} mins)`
                            : 'Pickup Only'}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        Patient App Discount:{' '}
                        <Text style={{ fontWeight: '800', color: THEME.green }}>
                          {currentPharmacy?.app_discount_pct ?? 15}% OFF
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : activeTab === 'orders' ? (
            <View style={{ gap: 12 }}>
              {/* Search + Filter */}
              <View
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 12,
                  padding: 12,
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
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    paddingHorizontal: 11,
                    paddingVertical: 8,
                  }}
                >
                  <Search size={15} color={THEME.muted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search patient, phone, booking ref, or 6-char code..."
                    placeholderTextColor="#9CA3AF"
                    style={{ flex: 1, fontSize: 13, color: THEME.ink }}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={14} color={THEME.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Date Filters (Today / 7D / This Month / Last Month / All Time) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {(
                    [
                      { id: 'ALL', label: 'All Dates' },
                      { id: 'TODAY', label: 'Today' },
                      { id: '7D', label: 'Last 7 Days' },
                      { id: 'THIS_MONTH', label: 'This Month' },
                      { id: 'LAST_MONTH', label: 'Last Month' },
                    ] as const
                  ).map((df) => {
                    const active = orderDateFilter === df.id;
                    return (
                      <TouchableOpacity
                        key={df.id}
                        onPress={() => setOrderDateFilter(df.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 99,
                          backgroundColor: active ? THEME.greenSoft : THEME.bg,
                          borderWidth: 1,
                          borderColor: active ? THEME.green : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? THEME.greenDark : THEME.muted }}>
                          {df.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {(
                    [
                      { id: 'ALL', label: `All (${orders.length})` },
                      { id: 'NEEDS_QUOTE', label: `Needs Quote (${stats.needsQuoteCount})` },
                      { id: 'READY', label: `Ready / Paid (${stats.readyCount})` },
                      { id: 'UNPAID', label: 'Unpaid' },
                      { id: 'COMPLETED', label: 'Dispensed' },
                      { id: 'LOST', label: 'Lost / Cancelled' },
                    ] as const
                  ).map((f) => {
                    const active = orderFilter === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => setOrderFilter(f.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 99,
                          backgroundColor: active ? THEME.greenDark : THEME.surfaceAlt,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {filteredOrders.length === 0 ? (
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 32,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                    No orders match this filter
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4, textAlign: 'center' }}>
                    Use Scan QR / Code when a patient arrives at your counter.
                  </Text>
                </View>
              ) : (
                <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {pagedOrders.map((o) => {
                  const payable = Number(o.final_payable ?? o.bill_amount ?? 0);
                  const waPhone = normalizePhone(o.patient_phone);
                  const isDone = o.status === 'COMPLETED';
                  const isCancelled = o.status === 'CANCELLED';
                  const customNote = o.notes?.includes('Customer Note:')
                    ? o.notes.split('Prescription request sent')[0]?.replace('Customer Note:', '').trim()
                    : null;
                  return (
                    <View
                      key={o.id}
                      style={{
                        width: isDesktop ? '48.8%' : '100%',
                        backgroundColor: THEME.surface,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: isDone ? THEME.greenBorder : THEME.border,
                        gap: 10,
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                              #{o.booking_ref}
                            </Text>
                            <View
                              style={{
                                backgroundColor: isDone
                                  ? THEME.greenSoft
                                  : isCancelled
                                  ? THEME.redBg
                                  : THEME.amberBg,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 99,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: '800',
                                  color: isDone
                                    ? THEME.green
                                    : isCancelled
                                    ? THEME.redText
                                    : THEME.amberText,
                                }}
                              >
                                {o.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: payable > 0 ? THEME.greenDark : THEME.amberText }}>
                            {payable > 0 ? formatInr(payable) : 'Needs Quote'}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                          {o.patient_name} · {o.patient_phone}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                          {o.slot_time || 'Store Pickup / Delivery'}
                          {o.verification_code ? ` · PIN: ${o.verification_code}` : ''}
                        </Text>

                        {customNote ? (
                          <View
                            style={{
                              backgroundColor: THEME.amberBg,
                              borderRadius: 8,
                              paddingHorizontal: 9,
                              paddingVertical: 6,
                              borderWidth: 1,
                              borderColor: THEME.amberBorder,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.amberText }} numberOfLines={2}>
                              Note: {customNote}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 2 }}>
                        <TouchableOpacity
                          onPress={() => openOrderWorkspace(o)}
                          style={{
                            flex: 1,
                            minWidth: 96,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: THEME.greenDark,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                            Open Order
                          </Text>
                        </TouchableOpacity>

                        {o.bill_image_url ? (
                          <TouchableOpacity
                            onPress={() => {
                              setRxFullScreen(false);
                              setRxPreviewUrl(o.bill_image_url || null);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: THEME.amberBg,
                              borderWidth: 1,
                              borderColor: THEME.amberBorder,
                            }}
                          >
                            <FileImage size={12} color={THEME.amberText} />
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amberText }}>View Rx</Text>
                          </TouchableOpacity>
                        ) : null}

                        {!isDone && !isCancelled && (
                          <TouchableOpacity
                            onPress={() => openOrderWorkspace(o)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: THEME.greenSoft,
                              borderWidth: 1,
                              borderColor: THEME.greenBorder,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>
                              {payable > 0 ? 'Edit Quote' : 'Send Quote'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {waPhone ? (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(
                                `https://wa.me/${waPhone}?text=${encodeURIComponent(
                                  `Namaste ${o.patient_name}, ${currentPharmacy?.name || 'Pharmacy'} here regarding your Adityam order #${o.booking_ref}.`
                                )}`
                              )
                            }
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: THEME.surfaceAlt,
                              borderWidth: 1,
                              borderColor: THEME.border,
                            }}
                          >
                            <MessageCircle size={13} color={THEME.green} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                </View>
                {/* Pagination Controls */}
                {filteredOrders.length > ORDER_PAGE_SIZE && (
                  <View
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.muted }}>
                      Page {safeOrderPage} of {totalOrderPages} ({filteredOrders.length} orders)
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        disabled={safeOrderPage <= 1}
                        onPress={() => setOrderPage((p) => Math.max(1, p - 1))}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: safeOrderPage <= 1 ? THEME.bg : THEME.surfaceAlt,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          opacity: safeOrderPage <= 1 ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Prev</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={safeOrderPage >= totalOrderPages}
                        onPress={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: safeOrderPage >= totalOrderPages ? THEME.bg : THEME.greenDark,
                          opacity: safeOrderPage >= totalOrderPages ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: safeOrderPage >= totalOrderPages ? THEME.muted : '#FFFFFF' }}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                </>
              )}
            </View>
          ) : activeTab === 'scanner' ? (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                      Scan Patient QR or Enter Code
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Verify medicine pickup or delivery using the patient’s QR pass or random 6-char code
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!cameraOpen) {
                        if (!permission?.granted) {
                          const res = await requestPermission();
                          if (!res.granted) {
                            setLookupError('Camera permission denied. Enter the booking ref or code below.');
                            return;
                          }
                        }
                        setCameraOpen(true);
                      } else {
                        setCameraOpen(false);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: cameraOpen ? THEME.redBg : THEME.greenDark,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                  >
                    <Camera size={15} color={cameraOpen ? THEME.redText : '#FFFFFF'} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: cameraOpen ? THEME.redText : '#FFFFFF' }}>
                      {cameraOpen ? 'Close Camera' : 'Open QR Camera'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {cameraOpen && (
                  <View
                    style={{
                      height: 260,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: '#000000',
                      borderWidth: 2,
                      borderColor: THEME.green,
                    }}
                  >
                    <CameraView
                      style={{ flex: 1 }}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={({ data }) => {
                        if (!isLookingUp && data) {
                          setManualCodeInput(extractRefOrCodeFromScan(data));
                          lookupBookingByCode(data);
                        }
                      }}
                    />
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={manualCodeInput}
                    onChangeText={setManualCodeInput}
                    autoCapitalize="characters"
                    placeholder="Enter Booking Ref (AN-RX-...) or 6-char Code"
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={() => lookupBookingByCode(manualCodeInput)}
                    style={{
                      flex: 1,
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 11,
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: THEME.ink,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => lookupBookingByCode(manualCodeInput)}
                    disabled={isLookingUp}
                    style={{
                      backgroundColor: THEME.green,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {isLookingUp ? 'Checking...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {lookupError && (
                  <View
                    style={{
                      backgroundColor: THEME.redBg,
                      borderWidth: 1,
                      borderColor: THEME.redBorder,
                      borderRadius: 10,
                      padding: 11,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                      {lookupError}
                    </Text>
                  </View>
                )}

                {checkInSuccessMsg && (
                  <View
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      borderRadius: 10,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={18} color={THEME.green} />
                    <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
                      {checkInSuccessMsg}
                    </Text>
                  </View>
                )}
              </View>

              {verifiedBooking && (
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: verifiedBooking.status === 'COMPLETED' ? THEME.greenBorder : THEME.green,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.green }}>
                        VERIFIED ORDER PASS
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.ink, marginTop: 2 }}>
                        #{verifiedBooking.booking_ref}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: verifiedBooking.status === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 99,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: verifiedBooking.status === 'COMPLETED' ? THEME.green : THEME.amberText,
                        }}
                      >
                        {verifiedBooking.status}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 10,
                      padding: 12,
                      gap: 6,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      Patient: {verifiedBooking.patient_name} ({verifiedBooking.patient_phone})
                    </Text>
                    <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                      Payable:{' '}
                      <Text style={{ fontWeight: '800', color: THEME.ink }}>
                        {formatInr(verifiedBooking.final_payable ?? verifiedBooking.bill_amount ?? 0)}
                      </Text>{' '}
                      · Payment:{' '}
                      <Text
                        style={{
                          fontWeight: '800',
                          color: verifiedBooking.payment_status === 'PAID' ? THEME.green : THEME.amberText,
                        }}
                      >
                        {verifiedBooking.payment_status || 'PENDING'}
                      </Text>
                    </Text>
                    {verifiedBooking.checked_in_at && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                        Already dispensed on {new Date(verifiedBooking.checked_in_at).toLocaleString('en-IN')} by{' '}
                        {verifiedBooking.checked_in_by || 'Pharmacy'}
                      </Text>
                    )}
                  </View>

                  {verifiedBooking.bill_image_url && (
                    <TouchableOpacity
                      onPress={() => setRxPreviewUrl(verifiedBooking.bill_image_url || null)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: THEME.amberBg,
                        borderWidth: 1,
                        borderColor: THEME.amberBorder,
                      }}
                    >
                      <FileImage size={15} color={THEME.amberText} />
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amberText }}>
                        Inspect Uploaded Prescription
                      </Text>
                    </TouchableOpacity>
                  )}

                  {verifiedBooking.status !== 'COMPLETED' && (
                    <>
                      {verifiedBooking.payment_status !== 'PAID' && (
                        <TouchableOpacity
                          onPress={() => setCollectCounterPay((v) => !v)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: collectCounterPay ? THEME.greenSoft : THEME.surfaceAlt,
                            padding: 11,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: collectCounterPay ? THEME.greenBorder : THEME.border,
                          }}
                        >
                          <CheckCircle2 size={16} color={collectCounterPay ? THEME.green : THEME.muted} />
                          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink, flex: 1 }}>
                            Payment collected at counter (Cash / Store UPI)
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TextInput
                        value={partnerCheckInNote}
                        onChangeText={setPartnerCheckInNote}
                        placeholder="Optional note (e.g. Handed over full strip, batch verified)"
                        placeholderTextColor="#9CA3AF"
                        style={{
                          backgroundColor: THEME.bg,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 12.5,
                          color: THEME.ink,
                        }}
                      />

                      <TouchableOpacity
                        onPress={handleConfirmDispensed}
                        disabled={isCompletingCheckIn}
                        style={{
                          backgroundColor: THEME.green,
                          borderRadius: 12,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <PackageCheck size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                          {isCompletingCheckIn ? 'Saving Check-In...' : 'Confirm Medicine Dispensed / Received'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ) : activeTab === 'payouts' ? (
            <View style={{ gap: 14 }}>
              {/* Weekend Settlement Policy Banner */}
              <View
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderRadius: 12,
                  padding: 13,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Wallet size={18} color={THEME.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>
                    Weekend Settlement Schedule
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.ink, marginTop: 1 }}>
                    All payouts for the week will be done on weekends (Saturday / Sunday) via NEFT or UPI after deducting {stats.commPct}% platform fee.
                  </Text>
                </View>
              </View>

              {/* 5 Clean Payout KPI Cards */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'TOTAL SALES', value: formatInr(stats.totalGross), color: THEME.ink, bg: THEME.surface, border: THEME.border },
                  { label: `PLATFORM FEE (${stats.commPct}%)`, value: formatInr(Math.max(0, stats.totalGross - stats.netEarned)), color: THEME.muted, bg: THEME.surface, border: THEME.border },
                  { label: 'YOUR NET EARNINGS', value: formatInr(stats.netEarned), color: THEME.green, bg: THEME.surface, border: THEME.border },
                  { label: 'ALREADY RECEIVED', value: formatInr(stats.paidOut), color: THEME.ink, bg: THEME.surface, border: THEME.border },
                  { label: 'PENDING PAYOUT', value: formatInr(stats.pendingPayout), color: '#FFFFFF', bg: THEME.greenDark, border: THEME.greenDark, dark: true },
                ].map((c) => (
                  <View
                    key={c.label}
                    style={{
                      flex: 1,
                      minWidth: isDesktop ? 170 : '47%',
                      backgroundColor: c.bg,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: (c as any).dark ? '#A7D7C0' : THEME.muted }}>
                      {c.label}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: c.color, marginTop: 5 }}>
                      {c.value}
                    </Text>
                  </View>
                ))}
              </View>

              {payouts.length === 0 ? (
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 28,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                    No payout settlements recorded yet
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                    Adityam Finance settles completed pharmacy orders weekly via NEFT/UPI.
                  </Text>
                </View>
              ) : (
                payouts.map((p) => (
                  <View
                    key={p.id}
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                        {p.period_start} → {p.period_end}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        Gross {formatInr(p.gross_amount)} · Fee {formatInr(p.commission_amount)}
                        {p.payment_ref ? ` · UTR: ${p.payment_ref}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.greenDark }}>
                        {formatInr(p.net_payout_amount)}
                      </Text>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: p.status === 'PAID' ? THEME.green : THEME.amberText }}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            /* Store Profile & Delivery Settings Tab */
            <View
              style={{
                backgroundColor: THEME.surface,
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 14,
                maxWidth: 620,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                {currentPharmacy?.name || 'Pharmacy Store Settings'}
              </Text>
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                {currentPharmacy?.shop_address || currentPharmacy?.area || 'Jaipur Partner Store'}
              </Text>

              {/* Clean Toggle Switch Rows */}
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 13,
                    borderRadius: 12,
                    backgroundColor: editIsActive ? THEME.greenSoft : THEME.redBg,
                    borderWidth: 1,
                    borderColor: editIsActive ? THEME.greenBorder : THEME.redBorder,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      {editIsActive ? 'Store is OPEN' : 'Store is CLOSED'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                      {editIsActive
                        ? 'Live on Adityam App & receiving orders'
                        : 'Hidden from patient app until reopened'}
                    </Text>
                  </View>
                  <Switch
                    value={editIsActive}
                    onValueChange={(val) => requestToggleStore(val)}
                    trackColor={{ false: '#FCA5A5', true: '#86EFAC' }}
                    thumbColor={editIsActive ? THEME.green : THEME.redText}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 13,
                    borderRadius: 12,
                    backgroundColor: edit24x7 ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: edit24x7 ? THEME.greenBorder : THEME.border,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      Open 24x7 (Round-the-Clock)
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                      {edit24x7 ? 'Open 24 hours every day' : 'Turn off to set daily & lunch-break timings'}
                    </Text>
                  </View>
                  <Switch
                    value={edit24x7}
                    onValueChange={setEdit24x7}
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor={edit24x7 ? THEME.green : '#64748B'}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 13,
                    borderRadius: 12,
                    backgroundColor: editDelivery ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: editDelivery ? THEME.greenBorder : THEME.border,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      Home Delivery Available
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                      {editDelivery ? 'Patients can order doorstep delivery' : 'Counter pickup only'}
                    </Text>
                  </View>
                  <Switch
                    value={editDelivery}
                    onValueChange={setEditDelivery}
                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                    thumbColor={editDelivery ? THEME.green : '#64748B'}
                  />
                </View>
              </View>

              {/* Collapsible Weekly Store Timings & Split Shifts Dropdown */}
              {!edit24x7 && (
                <View
                  style={{
                    backgroundColor: THEME.bg,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setScheduleExpanded((v) => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                        Weekly Store Timings & Split Shifts
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                        {scheduleExpanded
                          ? 'Set morning & evening shifts if you close mid-day'
                          : 'Tap to configure Monday–Sunday hours & lunch breaks'}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: THEME.surface,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>
                        {scheduleExpanded ? 'Hide ▲' : 'Edit Week ▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {scheduleExpanded && WEEK_DAYS.map(({ key, label }) => {
                    const row = weekSchedule[key];
                    const updateDay = (patch: Partial<DayScheduleRow>) =>
                      setWeekSchedule((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], ...patch },
                      }));
                    return (
                      <View
                        key={key}
                        style={{
                          backgroundColor: THEME.surface,
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: row.open ? THEME.ink : THEME.muted }}>
                            {label}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {row.open && (
                              <TouchableOpacity
                                onPress={() => updateDay({ hasBreak: !row.hasBreak })}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 99,
                                  backgroundColor: row.hasBreak ? THEME.amberBg : THEME.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: row.hasBreak ? THEME.amberBorder : THEME.border,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: row.hasBreak ? THEME.amberText : THEME.muted }}>
                                  {row.hasBreak ? '2 Shifts (Break)' : '+ Add Break'}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <Switch
                              value={row.open}
                              onValueChange={(v) => updateDay({ open: v })}
                              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                              thumbColor={row.open ? THEME.green : '#64748B'}
                            />
                          </View>
                        </View>

                        {row.open && (
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, width: 52 }}>
                                {row.hasBreak ? 'Shift 1:' : 'Hours:'}
                              </Text>
                              <TextInput
                                value={row.start}
                                onChangeText={(t) => updateDay({ start: t })}
                                placeholder="08:00"
                                style={{
                                  flex: 1,
                                  backgroundColor: THEME.bg,
                                  borderWidth: 1,
                                  borderColor: THEME.border,
                                  borderRadius: 7,
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  fontSize: 12.5,
                                  color: THEME.ink,
                                }}
                              />
                              <Text style={{ fontSize: 11, color: THEME.muted }}>to</Text>
                              <TextInput
                                value={row.end}
                                onChangeText={(t) => updateDay({ end: t })}
                                placeholder={row.hasBreak ? '14:00' : '22:00'}
                                style={{
                                  flex: 1,
                                  backgroundColor: THEME.bg,
                                  borderWidth: 1,
                                  borderColor: THEME.border,
                                  borderRadius: 7,
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  fontSize: 12.5,
                                  color: THEME.ink,
                                }}
                              />
                            </View>

                            {row.hasBreak && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.amberText, width: 52 }}>
                                  Shift 2:
                                </Text>
                                <TextInput
                                  value={row.start2 || '16:30'}
                                  onChangeText={(t) => updateDay({ start2: t })}
                                  placeholder="16:30"
                                  style={{
                                    flex: 1,
                                    backgroundColor: THEME.bg,
                                    borderWidth: 1,
                                    borderColor: THEME.border,
                                    borderRadius: 7,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    fontSize: 12.5,
                                    color: THEME.ink,
                                  }}
                                />
                                <Text style={{ fontSize: 11, color: THEME.muted }}>to</Text>
                                <TextInput
                                  value={row.end2 || '22:00'}
                                  onChangeText={(t) => updateDay({ end2: t })}
                                  placeholder="22:00"
                                  style={{
                                    flex: 1,
                                    backgroundColor: THEME.bg,
                                    borderWidth: 1,
                                    borderColor: THEME.border,
                                    borderRadius: 7,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                    fontSize: 12.5,
                                    color: THEME.ink,
                                  }}
                                />
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Locked Patient App Discount (Admin-controlled only) */}
              <View
                style={{
                  backgroundColor: THEME.surfaceAlt,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                    Patient App Discount: {editDiscountPct}% OFF (Locked)
                  </Text>
                  <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                    Managed by Adityam Admin · Contact Care Desk below to request a discount change
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 99,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>LOCKED</Text>
                </View>
              </View>

              {/* Locked Primary Desk Phone (Admin-controlled) */}
              <View
                style={{
                  backgroundColor: THEME.surfaceAlt,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                    Verified Store KYC & Primary Phone
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 99,
                      backgroundColor: THEME.surface,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.muted }}>LOCKED</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: THEME.ink }}>
                  Primary Desk Phone: <Text style={{ fontWeight: '800' }}>{editPhone || 'Not set'}</Text>
                </Text>
                {currentPharmacy?.drug_license_number ? (
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                    Drug License: {currentPharmacy.drug_license_number}
                    {currentPharmacy?.gst_number ? ` · GST: ${currentPharmacy.gst_number}` : ''}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11, color: THEME.muted }}>
                  Name, address, license & primary phone can only be changed via Adityam Care Desk.
                </Text>
              </View>

              {/* Editable Secondary / Staff Phone */}
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                  Secondary / Alternate Contact Number
                </Text>
                <TextInput
                  value={editSecondaryPhone}
                  onChangeText={setEditSecondaryPhone}
                  keyboardType="phone-pad"
                  placeholder="+91-XXXXXXXXXX (Pharmacist / Dispatch Desk)"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>

              {/* Editable Store Description & Notes */}
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                  Store Description & Patient Notes
                </Text>
                <TextInput
                  value={editAbout}
                  onChangeText={setEditAbout}
                  multiline
                  numberOfLines={3}
                  placeholder="Describe your pharmacy specialties, generic/ethical availability, or pickup instructions..."
                  placeholderTextColor="#9CA3AF"
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: THEME.ink,
                    minHeight: 72,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {settingsMsg && (
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }}>
                  {settingsMsg}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSaveStoreSettings}
                disabled={savingSettings}
                style={{
                  backgroundColor: THEME.green,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                  {savingSettings ? 'Saving...' : 'Save Store Settings'}
                </Text>
              </TouchableOpacity>

              {/* Contact Adityam Care & Partner Support */}
              <View
                style={{
                  marginTop: 6,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: THEME.border,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                  Need Help? Contact Adityam Partner Support
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  Reach our Call Center or Finance Desk directly for payout queries, delivery riders, or order escalations.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('tel:+918271310911')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Phone size={14} color={THEME.ink} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                      Call Care Desk
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://wa.me/918271310911?text=${encodeURIComponent(
                          `Namaste Adityam Support, ${currentPharmacy?.name || 'Pharmacy Partner'} here.`
                        )}`
                      )
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                    }}
                  >
                    <MessageCircle size={14} color={THEME.greenDark} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenDark }}>
                      WhatsApp Support
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Mobile / Tablet Bottom Tab Bar */}
      {!isDesktop && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: THEME.surface,
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            flexDirection: 'row',
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
          }}
        >
          {navItems.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleNavTabPress(tab.id)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <Icon size={19} color={active ? THEME.green : THEME.muted} />
                <Text style={{ fontSize: 10.5, fontWeight: active ? '800' : '600', color: active ? THEME.green : THEME.muted }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Send / Edit Quote Modal */}
      <Modal visible={Boolean(quoteTarget)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 18,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Quote Order #{quoteTarget?.booking_ref}
              </Text>
              <TouchableOpacity onPress={() => setQuoteTarget(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
              Itemized Medicines (or enter total MRP below)
            </Text>
            <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={{ gap: 6 }}>
              {quoteItems.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <TextInput
                    value={item.name}
                    onChangeText={(txt) =>
                      setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, name: txt } : r)))
                    }
                    placeholder="Medicine name"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 2,
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 7,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                  <TextInput
                    value={item.qty}
                    onChangeText={(txt) =>
                      setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: txt } : r)))
                    }
                    placeholder="Qty"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      width: 52,
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 7,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                  <TextInput
                    value={item.price}
                    onChangeText={(txt) =>
                      setQuoteItems((prev) => prev.map((r, i) => (i === idx ? { ...r, price: txt } : r)))
                    }
                    keyboardType="numeric"
                    placeholder="₹ MRP"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      width: 72,
                      backgroundColor: THEME.bg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 7,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setQuoteItems((prev) => [...prev, { name: '', qty: '1', price: '' }])}
              style={{ alignSelf: 'flex-start', paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                + Add Another Medicine
              </Text>
            </TouchableOpacity>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                {quoteItemsTotal > 0 ? 'Auto-Summed Gross MRP (₹)' : 'Or Enter Total Gross MRP (₹)'}
              </Text>
              <TextInput
                value={quoteItemsTotal > 0 ? String(quoteItemsTotal) : quoteGrossInput}
                onChangeText={setQuoteGrossInput}
                editable={quoteItemsTotal <= 0}
                keyboardType="numeric"
                placeholder="e.g. 650"
                style={{
                  backgroundColor: quoteItemsTotal > 0 ? THEME.surfaceAlt : THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: THEME.ink,
                }}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Partner Discount (%)</Text>
              <TextInput
                value={quoteDiscountPct}
                onChangeText={setQuoteDiscountPct}
                keyboardType="numeric"
                placeholder="15"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: THEME.ink,
                }}
              />
            </View>
            {quotePreviewGross > 0 && (
              <View
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 12, color: THEME.greenDark, fontWeight: '700' }}>
                  Patient Payable ({formatInr(quotePreviewDisc)} off):
                </Text>
                <Text style={{ fontSize: 13.5, color: THEME.greenDark, fontWeight: '900' }}>
                  {formatInr(quotePreviewNet)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => handleSaveQuote()}
              disabled={isSavingQuote}
              style={{
                backgroundColor: THEME.green,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                {isSavingQuote ? 'Saving...' : 'Send Quote & Confirm Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Out-of-Stock / Decline Modal */}
      <Modal visible={Boolean(rejectTarget)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 18,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={17} color={THEME.redText} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Decline Order #{rejectTarget?.booking_ref}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRejectTarget(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: THEME.muted }}>
              Let Adityam Call Center know why this prescription cannot be fulfilled so they can re-route it.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Scheduled medicine out of stock"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 9,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                color: THEME.ink,
              }}
            />
            <TouchableOpacity
              onPress={handleRejectOrder}
              disabled={isRejecting}
              style={{
                backgroundColor: THEME.redText,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                {isRejecting ? 'Updating...' : 'Mark Out of Stock'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Prescription Image Preview Modal with Full-Screen Zoom */}
      <Modal visible={Boolean(rxPreviewUrl)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: rxFullScreen ? 8 : 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: rxFullScreen ? '98%' : 580,
              height: rxFullScreen ? '94%' : undefined,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                Uploaded Prescription
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setRxFullScreen((v) => !v)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  {rxFullScreen ? (
                    <Minimize2 size={14} color={THEME.greenDark} />
                  ) : (
                    <Maximize2 size={14} color={THEME.greenDark} />
                  )}
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>
                    {rxFullScreen ? 'Normal Size' : 'Full Screen'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRxPreviewUrl(null);
                    setRxFullScreen(false);
                  }}
                >
                  <X size={20} color={THEME.ink} />
                </TouchableOpacity>
              </View>
            </View>
            {rxPreviewUrl && (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => setRxFullScreen((v) => !v)}
                style={{ flex: rxFullScreen ? 1 : undefined }}
              >
                <Image
                  source={{ uri: rxPreviewUrl }}
                  style={{
                    width: '100%',
                    height: rxFullScreen ? '100%' : 420,
                    borderRadius: 10,
                    backgroundColor: '#F3F4F6',
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      {/* Store Open / Close Confirmation Modal */}
      <Modal visible={storeConfirmOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,54,43,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: THEME.surface,
              borderRadius: 18,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: pendingStoreOpen ? THEME.greenSoft : THEME.redBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={19} color={pendingStoreOpen ? THEME.green : THEME.redText} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink, flex: 1 }}>
                {pendingStoreOpen ? 'Open Your Store Now?' : 'Close Your Store Temporarily?'}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: THEME.muted, lineHeight: 19 }}>
              {pendingStoreOpen
                ? 'Are you sure you want to go live? Patients on the Adityam App will immediately see your store and be able to send prescriptions.'
                : 'Are you sure you want to close your store? Our app will stop recommending your pharmacy for new orders until you turn it back ON.'}
            </Text>

            {!pendingStoreOpen && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                  When will you reopen?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['In 30 mins', 'In 1 hour (Lunch)', '04:30 PM', 'Tomorrow 08:00 AM'].map((opt) => {
                    const active = reopenTimeNote === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setReopenTimeNote(opt)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 99,
                          backgroundColor: active ? THEME.greenDark : THEME.surfaceAlt,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setStoreConfirmOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmToggleStore}
                disabled={togglingStore}
                style={{
                  flex: 1.3,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: pendingStoreOpen ? THEME.green : THEME.redText,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {togglingStore
                    ? 'Updating...'
                    : pendingStoreOpen
                    ? 'Yes, Open Store'
                    : 'Yes, Close Store'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quote Send Confirmation Modal */}
      <Modal
        visible={quoteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQuoteConfirmOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.52)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
              Are you sure you want to send this quote?
            </Text>
            <Text style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 18 }}>
              Once sent, the patient will receive the itemized bill on their app to complete payment.
            </Text>
            <View
              style={{
                backgroundColor: THEME.greenSoft,
                borderRadius: 10,
                padding: 12,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: THEME.muted }}>Gross MRP</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                  {formatInr(quotePreviewGross)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: THEME.greenDark }}>Partner Discount</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenDark }}>
                  - {formatInr(quotePreviewDisc)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: THEME.greenBorder,
                  paddingTop: 6,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenDark }}>
                  Patient Payable
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: THEME.greenDark }}>
                  {formatInr(quotePreviewNet)}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setQuoteConfirmOpen(false)}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: THEME.surfaceAlt,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (selectedOrder) {
                    handleSaveQuote(selectedOrder);
                  }
                }}
                disabled={isSavingQuote}
                style={{
                  flex: 1.3,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: THEME.green,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {isSavingQuote ? 'Sending...' : 'Yes, Send Quote'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
