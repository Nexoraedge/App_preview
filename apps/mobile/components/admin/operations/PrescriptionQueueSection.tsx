import React, { useEffect, useMemo, useState } from 'react';
import {
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
import {
  CheckCircle2,
  ExternalLink,
  FileImage,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, BookingStatus } from '@adityam/types';
import { AdminListSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';

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
};

interface PrescriptionQueueSectionProps {
  bookings: Booking[];
  isLoading: boolean;
  onRefresh: () => void;
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

export function PrescriptionQueueSection({
  bookings,
  isLoading,
  onRefresh,
}: PrescriptionQueueSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [rxFilter, setRxFilter] = useState<'PENDING' | 'QUOTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Triage form state
  const [agentName, setAgentName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [grossBill, setGrossBill] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const rxBookings = useMemo(
    () =>
      bookings.filter(
        (b) => Boolean(b.bill_image_url) || b.service_type === 'PHARMACY_SCAN_PAY'
      ),
    [bookings]
  );

  const counts = useMemo(() => {
    let pending = 0;
    let quoted = 0;
    rxBookings.forEach((b) => {
      if (b.status === 'NEW' || b.status === 'CALLING') pending += 1;
      else if (b.status === 'CONFIRMED' || b.status === 'PAID' || b.status === 'COMPLETED')
        quoted += 1;
    });
    return { pending, quoted, total: rxBookings.length };
  }, [rxBookings]);

  const filteredRx = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rxBookings.filter((b) => {
      if (rxFilter === 'PENDING' && b.status !== 'NEW' && b.status !== 'CALLING') return false;
      if (
        rxFilter === 'QUOTED' &&
        b.status !== 'CONFIRMED' &&
        b.status !== 'PAID' &&
        b.status !== 'COMPLETED'
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (b.booking_ref || '').toLowerCase().includes(q) ||
        (b.patient_name || '').toLowerCase().includes(q) ||
        (b.patient_phone || '').toLowerCase().includes(q) ||
        (b.hospital_name || '').toLowerCase().includes(q)
      );
    });
  }, [rxBookings, rxFilter, searchQuery]);

  const [page, setPage] = useState(1);
  const pageSize = 15;
  useEffect(() => {
    setPage(1);
  }, [rxFilter, searchQuery]);
  const pagedRx = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRx.slice(start, start + pageSize);
  }, [filteredRx, page]);

  const selectedBooking = useMemo(
    () => filteredRx.find((b) => b.id === selectedId) || filteredRx[0] || null,
    [filteredRx, selectedId]
  );

  useEffect(() => {
    if (!selectedBooking) return;
    setAgentName(selectedBooking.assigned_agent || '');
    setPartnerName(selectedBooking.hospital_name || '');
    setGrossBill(selectedBooking.bill_amount ? String(selectedBooking.bill_amount) : '');
    setDiscountAmt(selectedBooking.discount_amount ? String(selectedBooking.discount_amount) : '');
    setNotes(selectedBooking.notes || '');
  }, [selectedBooking?.id]);

  const computedFinal = Math.max(
    0,
    Number(grossBill || 0) - Number(discountAmt || 0)
  );

  const handleSaveTriage = async (nextStatus: BookingStatus) => {
    if (!selectedBooking) return;
    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const gross = Number(grossBill || 0);
      const disc = Number(discountAmt || 0);
      const finalPay = Math.max(0, gross - disc);

      const { error } = await supabase
        .from('bookings')
        .update({
          status: nextStatus,
          assigned_agent: agentName.trim() || null,
          hospital_name: partnerName.trim() || selectedBooking.hospital_name || null,
          bill_amount: gross > 0 ? gross : null,
          discount_amount: disc > 0 ? disc : null,
          final_payable: gross > 0 ? finalPay : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save prescription triage.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Top 3 KPIs */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: counts.pending > 0 ? THEME.amberBg : THEME.greenDark,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: counts.pending > 0 ? THEME.amberBorder : THEME.greenDark,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: counts.pending > 0 ? THEME.amberText : '#A7D7C0',
              letterSpacing: 0.6,
            }}
          >
            PENDING RX TRIAGE
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: counts.pending > 0 ? THEME.amberText : '#FFFFFF',
              marginTop: 6,
            }}
          >
            {counts.pending}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: counts.pending > 0 ? THEME.amberText : '#C6E2D4',
              marginTop: 4,
            }}
          >
            Uploaded slips awaiting quote
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
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
            QUOTED / CONFIRMED
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.green, marginTop: 6 }}>
            {counts.quoted}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Priced & sent to patient
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
          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, letterSpacing: 0.6 }}>
            TOTAL RX ORDERS
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: THEME.ink, marginTop: 6 }}>
            {counts.total}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            All uploaded prescriptions & pharmacy slips
          </Text>
        </View>
      </View>

      {/* Filter & Search Bar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 10,
          alignItems: isDesktop ? 'center' : 'stretch',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              { id: 'PENDING', label: `Pending (${counts.pending})` },
              { id: 'QUOTED', label: `Quoted (${counts.quoted})` },
              { id: 'ALL', label: `All Rx (${counts.total})` },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setRxFilter(f.id)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: rxFilter === f.id ? THEME.greenDark : THEME.surfaceAlt,
                borderWidth: 1,
                borderColor: rxFilter === f.id ? THEME.greenDark : THEME.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: rxFilter === f.id ? '#FFFFFF' : THEME.ink,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flex: isDesktop ? 0.6 : undefined }}>
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
              paddingVertical: 7,
            }}
          >
            <Search size={15} color={THEME.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search ref, patient, phone..."
              placeholderTextColor={THEME.muted}
              style={{ flex: 1, fontSize: 13, color: THEME.ink, outlineStyle: 'none' } as any}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={THEME.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: THEME.surfaceAlt,
              borderWidth: 1,
              borderColor: THEME.border,
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={14} color={THEME.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Master-Detail Split */}
      {isLoading ? (
        <AdminListSkeleton rows={5} />
      ) : filteredRx.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 40,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <CheckCircle2 size={28} color={THEME.green} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink, marginTop: 8 }}>
            Prescription Queue Clear
          </Text>
          <Text style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
            No prescriptions match this filter right now.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
          {/* Left Queue */}
          <View
            style={{
              width: isDesktop ? 340 : '100%',
              backgroundColor: THEME.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: 'hidden',
            }}
          >
            <ScrollView style={{ maxHeight: isDesktop ? 580 : 280 }}>
              {pagedRx.map((b) => {
                const active = selectedBooking?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setSelectedId(b.id)}
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: THEME.border,
                      backgroundColor: active ? THEME.greenSoft : THEME.surface,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                        {b.booking_ref}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                        {formatTimeAgo(b.created_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                        {b.patient_name} · {b.patient_phone}
                      </Text>
                      {(b.service_type === 'INVESTIGATION' || String(b.booking_ref || '').includes('LAB-RX')) && (
                        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#1D4ED8' }}>
                            LAB RX PACKAGE
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                        {b.hospital_name || b.service_type}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color:
                            b.status === 'NEW' || b.status === 'CALLING'
                              ? THEME.amberText
                              : THEME.greenDark,
                        }}
                      >
                        {b.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <AdminPagination
              totalCount={filteredRx.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              itemLabel="slips"
              compact
            />
          </View>

          {/* Right Inspector: Slip Preview + Quote Builder */}
          {selectedBooking && (
            <View
              style={{
                flex: 1,
                width: '100%',
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
                  alignItems: isDesktop ? 'center' : 'flex-start',
                  gap: 10,
                }}
              >
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.ink }}>
                    {selectedBooking.patient_name} ({selectedBooking.booking_ref})
                  </Text>
                  <Text style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                    {selectedBooking.patient_phone} · {selectedBooking.service_type}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${selectedBooking.patient_phone}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                      borderRadius: 9,
                      backgroundColor: THEME.surfaceAlt,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Phone size={13} color={THEME.ink} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const p = normalizePhone(selectedBooking.patient_phone);
                      if (!p) return;
                      const quoteText =
                        computedFinal > 0
                          ? ` Your Adityam discounted total is ${formatInr(computedFinal)}.`
                          : '';
                      Linking.openURL(
                        `https://wa.me/${p}?text=${encodeURIComponent(
                          `Namaste ${selectedBooking.patient_name}, we have reviewed your prescription (${selectedBooking.booking_ref}).${quoteText}`
                        )}`
                      );
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                      borderRadius: 9,
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                    }}
                  >
                    <MessageCircle size={13} color={THEME.greenDark} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenDark }}>
                      Send Quote on WhatsApp
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Prescription Image Preview */}
              {selectedBooking.bill_image_url ? (
                <View
                  style={{
                    backgroundColor: THEME.bg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    padding: 10,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FileImage size={14} color={THEME.greenDark} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                        Uploaded Prescription / Slip
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(selectedBooking.bill_image_url!)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <ExternalLink size={13} color={THEME.green} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                        Open Full Size
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Image
                    source={{ uri: selectedBooking.bill_image_url }}
                    style={{ width: '100%', height: 240, borderRadius: 8, backgroundColor: '#EAE5D9' }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: THEME.surfaceAlt,
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                    No slip image attached — Pharmacy / Scan & Pay order.
                  </Text>
                </View>
              )}

              {/* Triage & Pricing Form */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Partner Pharmacy / Lab
                  </Text>
                  <TextInput
                    value={partnerName}
                    onChangeText={setPartnerName}
                    placeholder="e.g. MedPlus Malviya Nagar"
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
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Assigned Coordinator
                  </Text>
                  <TextInput
                    value={agentName}
                    onChangeText={setAgentName}
                    placeholder="Coordinator name"
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
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Gross MRP / Bill (₹)
                  </Text>
                  <TextInput
                    value={grossBill}
                    onChangeText={setGrossBill}
                    keyboardType="numeric"
                    placeholder="1200"
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
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                    Adityam Discount (₹)
                  </Text>
                  <TextInput
                    value={discountAmt}
                    onChangeText={setDiscountAmt}
                    keyboardType="numeric"
                    placeholder="180"
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
                <View
                  style={{
                    flex: 1,
                    backgroundColor: THEME.greenSoft,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.greenDark }}>
                    FINAL PAYABLE
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.greenDark }}>
                    {formatInr(computedFinal)}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                  Triage / Medicine Notes
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Available items, substitute notes, delivery ETA..."
                  style={{
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                    backgroundColor: THEME.bg,
                    minHeight: 58,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  disabled={isSaving}
                  onPress={() => handleSaveTriage('CALLING')}
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: THEME.surfaceAlt,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                    Mark Calling
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isSaving}
                  onPress={() => handleSaveTriage('CONFIRMED')}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: THEME.green,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                    {isSaving ? 'Saving...' : 'Save & Confirm Quote'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isSaving}
                  onPress={() => handleSaveTriage('COMPLETED')}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: THEME.greenDark,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                    Mark Completed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
