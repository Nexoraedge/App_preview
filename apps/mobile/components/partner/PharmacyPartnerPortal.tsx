import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  BadgeIndianRupee,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileImage,
  LogOut,
  MessageCircle,
  PackageCheck,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Store,
  Wallet,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { usePartnerAuth } from './PartnerAuthGate';
import { logAdminAudit } from '../../src/services/adminAudit';
import { playAdminAlertChime } from '../../src/services/adminAlerts';

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

interface PharmacyInfo {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  commission_percentage?: number | null;
  discount_percentage?: number | null;
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

export function PharmacyPartnerPortal() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { partnerUser, signOutPartner } = usePartnerAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'scanner' | 'payouts'>('orders');
  const [pharmacies, setPharmacies] = useState<PharmacyInfo[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(
    partnerUser?.partnerEntityId || null
  );
  const [orders, setOrders] = useState<BookingWithPartner[]>([]);
  const [payouts, setPayouts] = useState<PharmacyPayoutRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Quote Modal State
  const [quoteTarget, setQuoteTarget] = useState<BookingWithPartner | null>(null);
  const [quoteGrossInput, setQuoteGrossInput] = useState('');
  const [quoteDiscountPct, setQuoteDiscountPct] = useState('15');
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Rx Image Preview Modal
  const [rxPreviewUrl, setRxPreviewUrl] = useState<string | null>(null);

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

  const loadPartnerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: pharmRows } = await supabase
        .from('pharmacies')
        .select('id, name, address, phone, commission_percentage, discount_percentage')
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
          .or('service_type.eq.PHARMACY_SCAN_PAY,booking_ref.ilike.%-RX-%')
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
              playAdminAlertChime('New Pharmacy Order', 'A new prescription order arrived.');
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
    let activeCount = 0;
    let dispensedToday = 0;
    let totalGross = 0;

    orders.forEach((o) => {
      if (o.status !== 'COMPLETED' && o.status !== 'CANCELLED') activeCount += 1;
      if (o.status === 'COMPLETED') {
        const dt = o.checked_in_at || o.updated_at || o.created_at;
        if (new Date(dt).toDateString() === todayStr) dispensedToday += 1;
        totalGross += Number(o.final_payable ?? o.bill_amount ?? 0);
      }
    });

    const paidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.net_payout_amount || 0), 0);
    const commPct = Number(currentPharmacy?.commission_percentage ?? 10);
    const netEarned = Math.round(totalGross * ((100 - commPct) / 100));
    const pendingPayout = Math.max(0, netEarned - paidOut);

    return { activeCount, dispensedToday, totalGross, netEarned, paidOut, pendingPayout, commPct };
  }, [orders, payouts, currentPharmacy]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter === 'ACTIVE' && (o.status === 'COMPLETED' || o.status === 'CANCELLED')) {
        return false;
      }
      if (orderFilter === 'COMPLETED' && o.status !== 'COMPLETED') return false;
      if (!q) return true;
      return (
        (o.booking_ref || '').toLowerCase().includes(q) ||
        (o.verification_code || '').toLowerCase().includes(q) ||
        (o.patient_name || '').toLowerCase().includes(q) ||
        (o.patient_phone || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderFilter, searchQuery]);

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

  const handleSaveQuote = async () => {
    if (!quoteTarget) return;
    const gross = Number(quoteGrossInput);
    const discPct = Math.min(80, Math.max(0, Number(quoteDiscountPct || 0)));
    if (!Number.isFinite(gross) || gross <= 0) return;

    const discountAmount = Math.round((gross * discPct) / 100);
    const finalPayable = Math.max(0, Math.round(gross - discountAmount));
    setIsSavingQuote(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('bookings')
        .update({
          bill_amount: gross,
          discount_amount: discountAmount,
          final_payable: finalPayable,
          status: quoteTarget.status === 'NEW' || quoteTarget.status === 'CALLING' ? 'CONFIRMED' : quoteTarget.status,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_ref', quoteTarget.booking_ref);

      if (error) throw error;

      if (partnerUser) {
        logAdminAudit({
          actorId: partnerUser.id,
          actorName: partnerUser.fullName,
          actorRole: partnerUser.role,
          sourcePanel: 'PARTNER_PORTAL',
          action: 'PARTNER_QUOTE_SUBMITTED',
          entityType: 'booking',
          entityId: quoteTarget.booking_ref,
          details: { gross, discountAmount, finalPayable },
        });
      }

      setQuoteTarget(null);
      await loadPartnerData();
    } catch {
      // handled silently
    } finally {
      setIsSavingQuote(false);
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

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Mobile-First Top Bar */}
      <View
        style={{
          backgroundColor: THEME.greenDark,
          paddingHorizontal: isDesktop ? 28 : 16,
          paddingTop: Platform.OS === 'web' ? 14 : 48,
          paddingBottom: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
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
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={1}>
                {currentPharmacy?.name || 'Pharmacy Partner Desk'}
              </Text>
              <Text style={{ fontSize: 11.5, color: '#A7D7C0' }} numberOfLines={1}>
                {partnerUser?.fullName} · {partnerUser?.role === 'admin' || partnerUser?.role === 'super_admin' ? 'Admin Preview' : 'Pharmacy Partner'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {installPromptEvent && !pwaInstalled && (
              <TouchableOpacity
                onPress={handleInstallPwa}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: '#F3DBA8',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 8,
                }}
              >
                <Download size={13} color={THEME.greenDark} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>
                  Install App
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={loadPartnerData}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={15} color="#FFFFFF" />
            </TouchableOpacity>

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
          </View>
        </View>

        {/* Admin Pharmacy Switcher (only when an admin previews /partner) */}
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
                    backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: active ? THEME.greenDark : '#E5E7EB' }}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: isDesktop ? 24 : 14,
          paddingBottom: 92,
          maxWidth: 980,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        {/* Top KPI Strip */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: THEME.surface,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ACTIVE ORDERS</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: THEME.ink, marginTop: 3 }}>
              {stats.activeCount}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: THEME.greenSoft,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.green }}>DISPENSED TODAY</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: THEME.greenDark, marginTop: 3 }}>
              {stats.dispensedToday}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: THEME.surface,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>NET PAYABLE DUE</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: THEME.amberText, marginTop: 3 }}>
              {formatInr(stats.pendingPayout)}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={THEME.green} />
          </View>
        ) : activeTab === 'orders' ? (
          <View style={{ gap: 12 }}>
            {/* Search + Filter */}
            <View
              style={{
                backgroundColor: THEME.surface,
                borderRadius: 12,
                padding: 10,
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
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['ACTIVE', 'COMPLETED', 'ALL'] as const).map((f) => {
                  const active = orderFilter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setOrderFilter(f)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 99,
                        backgroundColor: active ? THEME.greenDark : THEME.surfaceAlt,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {filteredOrders.length === 0 ? (
              <View
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  padding: 30,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                  No {orderFilter.toLowerCase()} orders found
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4, textAlign: 'center' }}>
                  Use the Scan QR / Code tab when a patient arrives at your counter.
                </Text>
              </View>
            ) : (
              filteredOrders.map((o) => {
                const payable = Number(o.final_payable ?? o.bill_amount ?? 0);
                const waPhone = normalizePhone(o.patient_phone);
                const isDone = o.status === 'COMPLETED';
                return (
                  <View
                    key={o.id}
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isDone ? THEME.greenBorder : THEME.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                            #{o.booking_ref}
                          </Text>
                          {o.verification_code && (
                            <View
                              style={{
                                backgroundColor: THEME.surfaceAlt,
                                borderWidth: 1,
                                borderColor: THEME.border,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.ink }}>
                                CODE: {o.verification_code}
                              </Text>
                            </View>
                          )}
                          <View
                            style={{
                              backgroundColor: isDone ? THEME.greenSoft : THEME.amberBg,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 99,
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDone ? THEME.green : THEME.amberText }}>
                              {o.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink, marginTop: 4 }}>
                          {o.patient_name} · {o.patient_phone}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                          {o.slot_time || 'Store Pickup / Delivery'}
                          {o.checked_in_at ? ` · Dispensed ${new Date(o.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: payable > 0 ? THEME.greenDark : THEME.muted }}>
                        {payable > 0 ? formatInr(payable) : 'Needs Quote'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {o.patient_phone ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${o.patient_phone}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: THEME.surfaceAlt,
                            borderWidth: 1,
                            borderColor: THEME.border,
                          }}
                        >
                          <Phone size={12} color={THEME.ink} />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Call</Text>
                        </TouchableOpacity>
                      ) : null}

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
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                          }}
                        >
                          <MessageCircle size={12} color={THEME.greenDark} />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenDark }}>WhatsApp</Text>
                        </TouchableOpacity>
                      ) : null}

                      {o.bill_image_url ? (
                        <TouchableOpacity
                          onPress={() => setRxPreviewUrl(o.bill_image_url || null)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: THEME.amberBg,
                            borderWidth: 1,
                            borderColor: THEME.amberBorder,
                          }}
                        >
                          <FileImage size={12} color={THEME.amberText} />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.amberText }}>View Rx</Text>
                        </TouchableOpacity>
                      ) : null}

                      {!isDone && (
                        <>
                          <TouchableOpacity
                            onPress={() => {
                              setQuoteTarget(o);
                              setQuoteGrossInput(String(o.bill_amount || ''));
                              setQuoteDiscountPct(String(currentPharmacy?.discount_percentage ?? 15));
                            }}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: '#EEF4FF',
                              borderWidth: 1,
                              borderColor: '#C7D9FA',
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1D4ED8' }}>
                              {payable > 0 ? 'Edit Quote' : 'Send Quote'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setActiveTab('scanner');
                              setManualCodeInput(o.verification_code || o.booking_ref);
                              setVerifiedBooking(o);
                              setLookupError(null);
                              setCheckInSuccessMsg(null);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 11,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: THEME.green,
                            }}
                          >
                            <PackageCheck size={12} color="#FFFFFF" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>
                              Verify & Dispense
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : activeTab === 'scanner' ? (
          <View style={{ gap: 14 }}>
            {/* QR Camera & Manual Verification Code Card */}
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
                    Verify medicine pickup or delivery using the patient’s QR pass or random code
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!cameraOpen) {
                      if (!permission?.granted) {
                        const res = await requestPermission();
                        if (!res.granted) {
                          setLookupError('Camera permission denied. You can still enter the code manually below.');
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

            {/* Verified Booking Action Card */}
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
                    Payable: <Text style={{ fontWeight: '800', color: THEME.ink }}>{formatInr(verifiedBooking.final_payable ?? verifiedBooking.bill_amount ?? 0)}</Text> · Payment: <Text style={{ fontWeight: '800', color: verifiedBooking.payment_status === 'PAID' ? THEME.green : THEME.amberText }}>{verifiedBooking.payment_status || 'PENDING'}</Text>
                  </Text>
                  {verifiedBooking.checked_in_at && (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                      Already dispensed on {new Date(verifiedBooking.checked_in_at).toLocaleString('en-IN')} by {verifiedBooking.checked_in_by || 'Pharmacy'}
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
        ) : (
          /* Payouts Tab */
          <View style={{ gap: 12 }}>
            <View
              style={{
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Settlement Summary ({stats.commPct}% Platform Fee)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Completed Gross</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>{formatInr(stats.totalGross)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Your Net Share</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.green }}>{formatInr(stats.netEarned)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Settled Paid</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>{formatInr(stats.paidOut)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: THEME.muted }}>Balance Due</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.amberText }}>{formatInr(stats.pendingPayout)}</Text>
                </View>
              </View>
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
        )}
      </ScrollView>

      {/* Bottom Tab Bar (Mobile-First PWA Navigation) */}
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
        {[
          { id: 'orders' as const, label: 'Orders', icon: ClipboardList },
          { id: 'scanner' as const, label: 'Scan QR / Code', icon: QrCode },
          { id: 'payouts' as const, label: 'Payouts', icon: Wallet },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <Icon size={20} color={active ? THEME.green : THEME.muted} />
              <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? THEME.green : THEME.muted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Gross MRP Bill (₹)</Text>
              <TextInput
                value={quoteGrossInput}
                onChangeText={setQuoteGrossInput}
                keyboardType="numeric"
                placeholder="e.g. 650"
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
            <TouchableOpacity
              onPress={handleSaveQuote}
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

      {/* Prescription Image Preview Modal */}
      <Modal visible={Boolean(rxPreviewUrl)} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 540,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>Uploaded Prescription</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {rxPreviewUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(rxPreviewUrl)}>
                    <ExternalLink size={16} color={THEME.green} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setRxPreviewUrl(null)}>
                  <X size={18} color={THEME.ink} />
                </TouchableOpacity>
              </View>
            </View>
            {rxPreviewUrl && (
              <Image
                source={{ uri: rxPreviewUrl }}
                style={{ width: '100%', height: 380, borderRadius: 10, backgroundColor: '#F3F4F6' }}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
