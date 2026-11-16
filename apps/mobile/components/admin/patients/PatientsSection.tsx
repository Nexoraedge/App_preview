import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  Search,
  Phone,
  MessageSquare,
  MapPin,
  Users,
  UserCheck,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { AdminListSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';

interface PatientUser {
  id: string;
  phone: string;
  full_name?: string | null;
  age?: number | null;
  gender?: string | null;
  city?: string | null;
  wallet_balance?: number | null;
  is_verified?: boolean;
  role?: string | null;
  abha_id?: string | null;
  created_at?: string;
}

interface PatientDependent {
  id: string;
  user_id: string;
  full_name: string;
  relation: string;
  age: number;
  gender: string;
  consent_given?: boolean;
  created_at?: string;
}

interface PatientAddress {
  id: string;
  user_id?: string | null;
  phone?: string | null;
  type: string;
  label?: string | null;
  house_flat: string;
  landmark_street: string;
  city: string;
  state?: string | null;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
  contact_person?: string | null;
  contact_phone?: string | null;
}

interface PatientsSectionProps {
  bookings: Booking[];
}

const THEME = {
  creamBg: '#FAF8F2',
  creamSoft: '#F3EFE4',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  ink: '#14362B',
  muted: '#6B7D74',
  greenDark: '#14362B',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF4EE',
  greenBorder: '#C7E0D0',
  amberBg: '#FEF7E6',
  amberText: '#9A6300',
  blueBg: '#EEF5FF',
  blueText: '#1D4ED8',
};

function normalizePhone(raw?: string | null): string {
  const digits = (raw || '').replace(/[^\d]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function PatientsSection({ bookings }: PatientsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [users, setUsers] = useState<PatientUser[]>([]);
  const [dependents, setDependents] = useState<PatientDependent[]>([]);
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'FAMILY' | 'BOOKED' | 'VERIFIED'>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'family' | 'addresses' | 'bookings'>('family');

  const fetchPatientsData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [uRes, dRes, aRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, phone, full_name, age, gender, city, wallet_balance, is_verified, role, abha_id, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('dependents')
          .select('id, user_id, full_name, relation, age, gender, consent_given, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_addresses')
          .select('*')
          .order('is_default', { ascending: false }),
      ]);

      const uList = ((uRes.data || []) as PatientUser[]).filter(
        (u) => !u.role || String(u.role).toLowerCase() === 'patient'
      );
      setUsers(uList);
      setDependents((dRes.data || []) as PatientDependent[]);
      setAddresses((aRes.data || []) as PatientAddress[]);
      if (uList.length > 0) {
        setSelectedUserId((prev) => (prev && uList.some((u) => u.id === prev) ? prev : uList[0].id));
      }
    } catch {
      // Ignore load errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientsData();
  }, []);

  const enrichedPatients = useMemo(() => {
    return users.map((u) => {
      const uPhone = normalizePhone(u.phone);
      const userDependents = dependents.filter((d) => d.user_id === u.id);
      const userAddresses = addresses.filter(
        (a) => a.user_id === u.id || (uPhone && normalizePhone(a.phone) === uPhone)
      );
      const userBookings = bookings.filter(
        (b) => b.user_id === u.id || (uPhone && normalizePhone(b.patient_phone) === uPhone)
      );

      let totalSpend = 0;
      let totalSavings = 0;
      for (const b of userBookings) {
        if (b.status !== 'CANCELLED' && b.status !== 'MISSED') {
          totalSpend += b.final_payable || b.bill_amount || 0;
          totalSavings += b.discount_amount || 0;
        }
      }

      return {
        user: u,
        dependents: userDependents,
        addresses: userAddresses,
        bookings: userBookings,
        totalSpend,
        totalSavings,
      };
    });
  }, [users, dependents, addresses, bookings]);

  const kpis = useMemo(() => {
    const totalPatients = enrichedPatients.length;
    const verifiedCount = enrichedPatients.filter((p) => p.user.is_verified !== false).length;
    const totalDependents = dependents.length;
    const totalSpend = enrichedPatients.reduce((acc, p) => acc + p.totalSpend, 0);
    const totalSavings = enrichedPatients.reduce((acc, p) => acc + p.totalSavings, 0);
    return { totalPatients, verifiedCount, totalDependents, totalSpend, totalSavings };
  }, [enrichedPatients, dependents.length]);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedPatients.filter((p) => {
      if (filterMode === 'FAMILY' && p.dependents.length === 0) return false;
      if (filterMode === 'BOOKED' && p.bookings.length === 0) return false;
      if (filterMode === 'VERIFIED' && p.user.is_verified === false) return false;
      if (!q) return true;
      return (
        (p.user.full_name || '').toLowerCase().includes(q) ||
        (p.user.phone || '').toLowerCase().includes(q) ||
        (p.user.city || '').toLowerCase().includes(q) ||
        (p.user.abha_id || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedPatients, searchQuery, filterMode]);

  const [page, setPage] = useState(1);
  const pageSize = 15;
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterMode]);
  const pagedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, page]);

  useEffect(() => {
    if (filteredPatients.length === 0) {
      if (selectedUserId !== null) setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !filteredPatients.some((p) => p.user.id === selectedUserId)) {
      setSelectedUserId(filteredPatients[0].user.id);
    }
  }, [filteredPatients, selectedUserId]);

  const selected = useMemo(
    () => filteredPatients.find((p) => p.user.id === selectedUserId) || null,
    [filteredPatients, selectedUserId]
  );

  return (
    <View style={{ gap: 18 }}>
      {/* Top 4 KPI Cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
            Registered Patients
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {kpis.totalPatients}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            {kpis.verifiedCount} verified accounts
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Family Members
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {kpis.totalDependents}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Linked in Family Vault
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Total Patient Spend
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(kpis.totalSpend)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Across OPD, Labs & Pharmacy
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 155,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Total Patient Savings
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {formatInr(kpis.totalSavings)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Saved via Adityam discounts
          </Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View
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
            onChangeText={setSearchQuery}
            placeholder="Search patient name, phone, city, ABHA ID..."
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, paddingVertical: 9, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {(
            [
              { id: 'ALL', label: 'All Patients' },
              { id: 'FAMILY', label: 'With Family' },
              { id: 'BOOKED', label: 'Has Bookings' },
              { id: 'VERIFIED', label: 'Verified' },
            ] as const
          ).map((f) => {
            const active = filterMode === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterMode(f.id)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 8,
                  backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenPrimary : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? THEME.greenPrimary : THEME.muted }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={fetchPatientsData}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: THEME.creamBg,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <RefreshCw size={15} color={THEME.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Master-Detail Area */}
      {loading ? (
        <AdminListSkeleton rows={5} />
      ) : filteredPatients.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 40,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            No Patients Found
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            Registered patients and their family vaults will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          {/* Left Column: Patient List */}
          <View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '100%', gap: 10 }}>
            {pagedPatients.map((item) => {
              const u = item.user;
              const isSelected = selected?.user.id === u.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedUserId(u.id)}
                  style={{
                    backgroundColor: isSelected ? THEME.greenSoft : THEME.surface,
                    borderRadius: 13,
                    padding: 15,
                    borderWidth: 1.5,
                    borderColor: isSelected ? THEME.greenPrimary : THEME.border,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink, flex: 1 }}>
                      {u.full_name || 'Registered Patient'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {u.is_verified !== false && (
                        <View style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.greenPrimary }}>VERIFIED</Text>
                        </View>
                      )}
                      {Boolean(u.abha_id) && (
                        <View style={{ backgroundColor: THEME.blueBg, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.blueText }}>ABHA</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    {u.phone} · {u.city || 'Jaipur'}
                    {u.age ? ` · ${u.age} yrs` : ''}
                    {u.gender ? ` (${u.gender})` : ''}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>
                        {item.dependents.length} family
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                        {item.bookings.length} bookings
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(item.totalSpend)} spend
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <AdminPagination
              totalCount={filteredPatients.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              itemLabel="patients"
            />
          </View>

          {/* Right Column: Read-Only Patient Inspector */}
          {selected && (
            <View
              style={{
                flex: isDesktop ? 1.3 : undefined,
                width: isDesktop ? undefined : '100%',
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 16,
              }}
            >
              {/* Patient Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: THEME.ink }}>
                      {selected.user.full_name || 'Registered Patient'}
                    </Text>
                    {selected.user.is_verified !== false && (
                      <View
                        style={{
                          backgroundColor: THEME.greenSoft,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <UserCheck size={11} color={THEME.greenPrimary} />
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.greenPrimary }}>VERIFIED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 12.5, color: THEME.muted, marginTop: 3 }}>
                    {selected.user.phone} · {selected.user.city || 'Jaipur'}
                    {selected.user.age ? ` · ${selected.user.age} yrs` : ''}
                    {selected.user.gender ? ` · ${selected.user.gender}` : ''}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>WALLET</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: THEME.greenPrimary }}>
                    {formatInr(selected.user.wallet_balance ?? 0)}
                  </Text>
                </View>
              </View>

              {/* Quick Contact Actions */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${selected.user.phone}`).catch(() => {})}
                  style={{
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Phone size={13} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                    Call {selected.user.phone}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const digits = (selected.user.phone || '').replace(/[^\d]/g, '');
                    Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
                  }}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MessageSquare size={13} color={THEME.ink} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* Patient Summary Strip */}
              <View
                style={{
                  backgroundColor: THEME.creamBg,
                  borderRadius: 12,
                  padding: 13,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 18,
                }}
              >
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>ABHA ID</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {selected.user.abha_id || '—'}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>TOTAL SPEND</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                    {formatInr(selected.totalSpend)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>TOTAL SAVED</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.amberText, marginTop: 2 }}>
                    {formatInr(selected.totalSavings)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>JOINED</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.ink, marginTop: 2 }}>
                    {selected.user.created_at
                      ? new Date(selected.user.created_at).toLocaleDateString('en-IN')
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Inspector Sub-Tabs */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    { id: 'family', label: `Family Vault (${selected.dependents.length})`, icon: Users },
                    { id: 'addresses', label: `Addresses (${selected.addresses.length})`, icon: MapPin },
                    { id: 'bookings', label: `Bookings (${selected.bookings.length})`, icon: CalendarCheck },
                  ] as const
                ).map((t) => {
                  const active = inspectorTab === t.id;
                  const IconComp = t.icon;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setInspectorTab(t.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 9,
                        backgroundColor: active ? THEME.greenDark : THEME.creamBg,
                        borderWidth: 1,
                        borderColor: active ? THEME.greenDark : THEME.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <IconComp size={13} color={active ? '#FAF8F2' : THEME.muted} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FAF8F2' : THEME.ink }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sub-Tab Content */}
              {inspectorTab === 'family' && (
                <View style={{ gap: 8 }}>
                  {selected.dependents.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
                      No family members added to this account yet.
                    </Text>
                  ) : (
                    selected.dependents.map((dep) => (
                      <View
                        key={dep.id}
                        style={{
                          backgroundColor: THEME.creamBg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                            {dep.full_name}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                            {dep.relation} · {dep.age} yrs · {dep.gender}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: dep.consent_given !== false ? THEME.greenSoft : THEME.amberBg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '800',
                              color: dep.consent_given !== false ? THEME.greenPrimary : THEME.amberText,
                            }}
                          >
                            {dep.consent_given !== false ? 'CONSENT OK' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {inspectorTab === 'addresses' && (
                <View style={{ gap: 8 }}>
                  {selected.addresses.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
                      No saved addresses on this account yet.
                    </Text>
                  ) : (
                    selected.addresses.map((addr) => (
                      <View
                        key={addr.id}
                        style={{
                          backgroundColor: THEME.creamBg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          gap: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                              {addr.label || addr.type}
                            </Text>
                            {addr.is_default && (
                              <View style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: THEME.greenPrimary }}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          {addr.latitude && addr.longitude ? (
                            <TouchableOpacity
                              onPress={() =>
                                Linking.openURL(`https://maps.google.com/?q=${addr.latitude},${addr.longitude}`).catch(
                                  () => {}
                                )
                              }
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                                Open Maps
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 12, color: THEME.ink }}>
                          {addr.house_flat}, {addr.landmark_street}, {addr.city} - {addr.pincode}
                        </Text>
                        {Boolean(addr.contact_person || addr.contact_phone) && (
                          <Text style={{ fontSize: 11, color: THEME.muted }}>
                            Contact: {addr.contact_person || ''} {addr.contact_phone || ''}
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {inspectorTab === 'bookings' && (
                <View style={{ gap: 8 }}>
                  {selected.bookings.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
                      No bookings placed by this patient yet.
                    </Text>
                  ) : (
                    selected.bookings.map((b) => (
                      <View
                        key={b.id}
                        style={{
                          backgroundColor: THEME.creamBg,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                            #{b.booking_ref} · {b.hospital_name || b.service_type}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                            {b.service_type} · {new Date(b.created_at).toLocaleDateString('en-IN')}
                            {b.slot_time ? ` · ${b.slot_time}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary }}>
                            {formatInr(b.final_payable || b.bill_amount || 0)}
                          </Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>
                            {b.status}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
