import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BedDouble,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';

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
  ink: '#1A2421',
  muted: '#5C6B64',
};

type IpdFilter = 'ACTIVE' | 'ADMITTED' | 'COMPLETED' | 'ALL';

interface IpdBookingRow {
  id: string;
  booking_ref: string;
  patient_name: string | null;
  patient_phone: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  branch_name: string | null;
  status: string;
  bill_amount: number | null;
  final_payable: number | null;
  notes: string | null;
  created_at: string;
}

function normalizePhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function PartnerIpdDesk({ hospitalId }: { hospitalId?: string | null }) {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<IpdBookingRow[]>([]);
  const [capacity, setCapacity] = useState({ beds: 0, icu: 0, ots: 0, branches: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IpdFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [estimateInput, setEstimateInput] = useState('');
  const [tpaNoteInput, setTpaNoteInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadIpdData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      let q = supabase
        .from('bookings')
        .select(
          'id, booking_ref, patient_name, patient_phone, hospital_id, hospital_name, branch_name, status, bill_amount, final_payable, notes, created_at'
        )
        .eq('service_type', 'IPD_ENQUIRY')
        .order('created_at', { ascending: false })
        .limit(150);
      if (hospitalId) {
        q = q.eq('hospital_id', hospitalId);
      }
      const { data } = await q;
      setEnquiries((data as IpdBookingRow[]) || []);

      let bq = supabase
        .from('hospital_branches')
        .select('total_beds, icu_beds, operation_theaters');
      if (hospitalId) {
        bq = bq.eq('hospital_id', hospitalId);
      }
      const { data: brData } = await bq;
      const brRows = (brData as any[]) || [];
      setCapacity({
        branches: brRows.length,
        beds: brRows.reduce((s, r) => s + Number(r.total_beds || 0), 0),
        icu: brRows.reduce((s, r) => s + Number(r.icu_beds || 0), 0),
        ots: brRows.reduce((s, r) => s + Number(r.operation_theaters || 0), 0),
      });
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    void loadIpdData();
    const supabase = getSupabaseClient();
    const ch = supabase
      .channel('partner-ipd-desk-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void loadIpdData();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadIpdData]);

  const stats = useMemo(() => {
    let pending = 0;
    let admitted = 0;
    let completed = 0;
    let estValue = 0;
    for (const r of enquiries) {
      const st = String(r.status || '').toUpperCase();
      if (st === 'COMPLETED' || st === 'DISCHARGED') {
        completed += 1;
        estValue += Number(r.final_payable || r.bill_amount || 0);
      } else if (st === 'IN_PROGRESS' || st === 'ADMITTED') {
        admitted += 1;
        estValue += Number(r.final_payable || r.bill_amount || 0);
      } else if (st !== 'CANCELLED' && st !== 'REJECTED') {
        pending += 1;
      }
    }
    return { pending, admitted, completed, estValue };
  }, [enquiries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((r) => {
      const st = String(r.status || '').toUpperCase();
      if (filter === 'ACTIVE' && ['COMPLETED', 'DISCHARGED', 'CANCELLED', 'REJECTED', 'IN_PROGRESS', 'ADMITTED'].includes(st)) {
        return false;
      }
      if (filter === 'ADMITTED' && !['IN_PROGRESS', 'ADMITTED'].includes(st)) {
        return false;
      }
      if (filter === 'COMPLETED' && !['COMPLETED', 'DISCHARGED'].includes(st)) {
        return false;
      }
      if (!q) return true;
      return (
        String(r.patient_name || '').toLowerCase().includes(q) ||
        String(r.patient_phone || '').toLowerCase().includes(q) ||
        String(r.booking_ref || '').toLowerCase().includes(q) ||
        String(r.notes || '').toLowerCase().includes(q) ||
        String(r.hospital_name || '').toLowerCase().includes(q)
      );
    });
  }, [enquiries, filter, search]);

  const updateStatus = async (row: IpdBookingRow, nextStatus: string, extraNotes?: string, billAmt?: number) => {
    setSavingId(row.id);
    try {
      const supabase = getSupabaseClient();
      const patch: Record<string, any> = { status: nextStatus };
      if (typeof billAmt === 'number' && billAmt > 0) {
        patch.bill_amount = billAmt;
        patch.final_payable = billAmt;
      }
      if (extraNotes) {
        patch.notes = [row.notes, extraNotes].filter(Boolean).join(' · ');
      }
      await supabase.from('bookings').update(patch).eq('id', row.id);
      const gross = Number(billAmt || row.final_payable || row.bill_amount || 0);
      if (nextStatus === 'COMPLETED' && row.hospital_id && gross > 0) {
        const comm = Math.round(gross * 0.05);
        await supabase.from('hospital_payouts').insert({
          hospital_id: row.hospital_id,
          gross_amount: gross,
          commission_amount: comm,
          amount: Math.max(0, gross - comm),
          period_label: `IPD Case #${row.booking_ref}`,
          notes: `Discharged patient: ${row.patient_name || 'Patient'}`,
          status: 'PENDING',
        });
      }
      setEditingRef(null);
      setEstimateInput('');
      setTpaNoteInput('');
      await loadIpdData();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Capacity & Cashless Banner */}
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
            <BedDouble size={20} color={THEME.green} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              IPD Capacity & Cashless TPA Desk
            </Text>
            <Text style={{ fontSize: 12.5, color: THEME.muted }}>
              {capacity.branches} Branches · {capacity.beds} Ward Beds · {capacity.icu} ICU · {capacity.ots} OTs
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => router.replace('/partner/opd/hospital' as any)}
            style={{
              backgroundColor: THEME.surface,
              borderWidth: 1,
              borderColor: THEME.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
              Manage Beds & IPD Services →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={loadIpdData}
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

      {/* KPI Strip */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'PENDING ENQUIRIES', value: String(stats.pending), sub: 'Awaiting estimate / call', dark: false },
          { label: 'ADMITTED / IN CARE', value: String(stats.admitted), sub: 'Active inpatient cases', dark: true },
          { label: 'DISCHARGED', value: String(stats.completed), sub: 'Completed admissions', dark: false },
          { label: 'EST. IPD VALUE', value: `₹${stats.estValue.toLocaleString('en-IN')}`, sub: 'Quoted & active cases', dark: false },
        ].map((kpi) => (
          <View
            key={kpi.label}
            style={{
              flex: 1,
              minWidth: 170,
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

      {/* Search & Filter Tabs */}
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
            placeholder="Search patient, phone, surgery or #AN ref..."
            placeholderTextColor="#8B9690"
            style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              { id: 'ACTIVE', label: 'Pending / Quoted' },
              { id: 'ADMITTED', label: 'Admitted' },
              { id: 'COMPLETED', label: 'Discharged' },
              { id: 'ALL', label: 'All Enquiries' },
            ] as { id: IpdFilter; label: string }[]
          ).map((t) => {
            const active = filter === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setFilter(t.id)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? THEME.greenDark : THEME.bg,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Enquiry List */}
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
          <BedDouble size={28} color={THEME.muted} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            No IPD enquiries in this view
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center' }}>
            New cashless surgery & hospital admission enquiries from patients will appear here in real time.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((row) => {
            const st = String(row.status || 'PENDING').toUpperCase();
            const phone = normalizePhone(row.patient_phone);
            const isEditing = editingRef === row.id;
            return (
              <View
                key={row.id}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                        #{row.booking_ref}
                      </Text>
                      <View
                        style={{
                          backgroundColor: st === 'COMPLETED' ? THEME.greenSoft : THEME.amberBg,
                          borderWidth: 1,
                          borderColor: st === 'COMPLETED' ? THEME.greenBorder : THEME.amberBorder,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: st === 'COMPLETED' ? THEME.green : THEME.amberText,
                          }}
                        >
                          {st}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                      {row.patient_name || 'Patient'} · {row.patient_phone || 'No phone'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }}>
                      {row.hospital_name || 'Hospital'} {row.branch_name ? `· ${row.branch_name}` : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {Number(row.final_payable || row.bill_amount || 0) > 0 ? (
                      <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.greenDark }}>
                        ₹{Number(row.final_payable || row.bill_amount).toLocaleString('en-IN')}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.amberText }}>
                        Quote Pending
                      </Text>
                    )}
                  </View>
                </View>

                {row.notes ? (
                  <View
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, color: THEME.ink }}>{row.notes}</Text>
                  </View>
                ) : null}

                {isEditing && (
                  <View
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                      Send Package Estimate & TPA Confirmation
                    </Text>
                    <TextInput
                      value={estimateInput}
                      onChangeText={setEstimateInput}
                      keyboardType="numeric"
                      placeholder="Estimated package amount (₹)"
                      placeholderTextColor="#7A8A82"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: THEME.ink,
                      }}
                    />
                    <TextInput
                      value={tpaNoteInput}
                      onChangeText={setTpaNoteInput}
                      placeholder="TPA / Room / Surgeon note (optional)"
                      placeholderTextColor="#7A8A82"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: THEME.ink,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        disabled={savingId === row.id}
                        onPress={() =>
                          updateStatus(
                            row,
                            'CONFIRMED',
                            tpaNoteInput.trim() ? `TPA/Desk: ${tpaNoteInput.trim()}` : undefined,
                            Number(estimateInput || 0)
                          )
                        }
                        style={{
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                          {savingId === row.id ? 'Saving...' : 'Confirm & Send Estimate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingRef(null)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: THEME.border,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {phone ? (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:+${phone}`)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: THEME.bg,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                        >
                          <Phone size={13} color={THEME.ink} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(
                              `https://wa.me/${phone}?text=${encodeURIComponent(
                                `Hello ${row.patient_name || ''}, regarding your Adityam IPD enquiry #${row.booking_ref}.`
                              )}`
                            )
                          }
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: THEME.greenSoft,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                        >
                          <MessageCircle size={13} color={THEME.green} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>WhatsApp</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {!['COMPLETED', 'DISCHARGED', 'CANCELLED'].includes(st) && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingRef(row.id);
                          setEstimateInput(row.bill_amount ? String(row.bill_amount) : '');
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.amberBg,
                          borderWidth: 1,
                          borderColor: THEME.amberBorder,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <ShieldCheck size={13} color={THEME.amberText} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.amberText }}>
                          Send Estimate / TPA
                        </Text>
                      </TouchableOpacity>
                    )}

                    {st !== 'IN_PROGRESS' && st !== 'ADMITTED' && st !== 'COMPLETED' && (
                      <TouchableOpacity
                        disabled={savingId === row.id}
                        onPress={() => updateStatus(row, 'IN_PROGRESS')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.green,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Clock size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Admit Patient</Text>
                      </TouchableOpacity>
                    )}

                    {st !== 'COMPLETED' && st !== 'DISCHARGED' && (
                      <TouchableOpacity
                        disabled={savingId === row.id}
                        onPress={() => updateStatus(row, 'COMPLETED')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <CheckCircle2 size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Mark Discharged</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
