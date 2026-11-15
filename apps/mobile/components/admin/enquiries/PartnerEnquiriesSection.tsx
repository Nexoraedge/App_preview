import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AdminListSkeleton } from '../AdminSkeleton';
import { AdminPagination } from '../AdminPagination';
import {
  Building2,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Clock,
  Trash2,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { SelectDropdown } from '../SelectDropdown';
import { CrmActivityModal } from '../CrmActivityModal';
import {
  THEME,
  PartnerEnquiry,
  PartnerType,
  EnquiryStatus,
  PARTNER_TYPE_META,
  STATUS_META,
  formatEnquiryDate,
} from './enquiryTheme';

interface PartnerEnquiriesSectionProps {
  onCountChange?: (newCount: number) => void;
}

const ALL_STATUSES: EnquiryStatus[] = ['NEW', 'CONTACTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

function normalizePhone(raw?: string | null): string {
  const digits = (raw || '').replace(/[^\d]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isOverdue24h(item: PartnerEnquiry): boolean {
  if (item.status !== 'NEW') return false;
  const createdMs = new Date(item.created_at).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs > 24 * 60 * 60 * 1000;
}

export function PartnerEnquiriesSection({ onCountChange }: PartnerEnquiriesSectionProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [enquiries, setEnquiries] = useState<PartnerEnquiry[]>([]);
  const [existingPhoneMap, setExistingPhoneMap] = useState<Record<string, { kind: 'Hospital' | 'Doctor'; name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'ALL' | PartnerType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EnquiryStatus>('NEW');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | 'MISSED' | 'UPCOMING' | 'OVERDUE_24H'>('ALL');
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Notes editor for selected enquiry
  const [noteDraft, setNoteDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Manual enquiry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<PartnerType>('HOSPITAL');
  const [newOrg, setNewOrg] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newDiscount, setNewDiscount] = useState('15');
  const [newSource, setNewSource] = useState('WHATSAPP');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEnquiries = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseClient();
      const [enqRes, hospRes, docRes] = await Promise.all([
        supabase.from('partner_enquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('hospitals').select('name, phone, secondary_contact_number'),
        supabase.from('doctors').select('name, phone, secondary_phone'),
      ]);

      const phoneMap: Record<string, { kind: 'Hospital' | 'Doctor'; name: string }> = {};
      if (Array.isArray(hospRes.data)) {
        for (const h of hospRes.data as any[]) {
          const p1 = normalizePhone(h.phone);
          const p2 = normalizePhone(h.secondary_contact_number);
          if (p1) phoneMap[p1] = { kind: 'Hospital', name: h.name };
          if (p2) phoneMap[p2] = { kind: 'Hospital', name: h.name };
        }
      }
      if (Array.isArray(docRes.data)) {
        for (const d of docRes.data as any[]) {
          const p1 = normalizePhone(d.phone);
          const p2 = normalizePhone(d.secondary_phone);
          if (p1) phoneMap[p1] = { kind: 'Doctor', name: d.name };
          if (p2) phoneMap[p2] = { kind: 'Doctor', name: d.name };
        }
      }
      setExistingPhoneMap(phoneMap);

      if (enqRes.error) {
        setLoadError(enqRes.error.message);
        setEnquiries([]);
        setSelectedId(null);
      } else {
        const list = (enqRes.data || []) as PartnerEnquiry[];
        setEnquiries(list);
        setSelectedId((prev) => (prev && list.some((e) => e.id === prev) ? prev : list[0]?.id || null));
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load partner enquiries.');
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    const newCount = enquiries.filter((e) => e.status === 'NEW').length;
    onCountChange?.(newCount);
  }, [enquiries, onCountChange]);

  const selectedEnquiry = useMemo(
    () => enquiries.find((e) => e.id === selectedId) || null,
    [enquiries, selectedId]
  );

  useEffect(() => {
    setNoteDraft(selectedEnquiry?.notes || '');
  }, [selectedEnquiry?.id]);

  const kpis = useMemo(() => {
    const newCount = enquiries.filter((e) => e.status === 'NEW').length;
    const inReviewCount = enquiries.filter(
      (e) => e.status === 'CONTACTED' || e.status === 'UNDER_REVIEW'
    ).length;
    const approvedCount = enquiries.filter((e) => e.status === 'APPROVED').length;
    const hospCount = enquiries.filter((e) => e.partner_type === 'HOSPITAL').length;
    const docCount = enquiries.filter((e) => e.partner_type === 'DOCTOR').length;
    return { newCount, inReviewCount, approvedCount, total: enquiries.length, hospCount, docCount };
  }, [enquiries]);

  const filteredEnquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const nowMs = Date.now();
    return enquiries.filter((e) => {
      if (typeFilter !== 'ALL' && e.partner_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (followUpFilter !== 'ALL') {
        const fu = (e as any).follow_up_at;
        const fuMs = fu ? new Date(fu).getTime() : NaN;
        if (followUpFilter === 'OVERDUE_24H') {
          if (!isOverdue24h(e)) return false;
        } else if (followUpFilter === 'MISSED') {
          if (!fu || Number.isNaN(fuMs) || fuMs >= nowMs || e.status === 'APPROVED' || e.status === 'REJECTED') return false;
        } else if (followUpFilter === 'UPCOMING') {
          if (!fu || Number.isNaN(fuMs) || fuMs < nowMs || e.status === 'APPROVED' || e.status === 'REJECTED') return false;
        }
      }
      if (!q) return true;
      return (
        e.organization_name.toLowerCase().includes(q) ||
        e.contact_person.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        (e.area || '').toLowerCase().includes(q) ||
        (e.specialty_or_services || '').toLowerCase().includes(q)
      );
    });
  }, [enquiries, typeFilter, statusFilter, followUpFilter, searchQuery]);

  const [page, setPage] = useState(1);
  const pageSize = 15;
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, followUpFilter, searchQuery]);
  const pagedEnquiries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEnquiries.slice(start, start + pageSize);
  }, [filteredEnquiries, page]);

  useEffect(() => {
    if (filteredEnquiries.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredEnquiries.some((e) => e.id === selectedId)) {
      setSelectedId(filteredEnquiries[0].id);
    }
  }, [filteredEnquiries, selectedId]);

  const handleUpdateEnquiry = async (
    id: string,
    patch: Partial<Pick<PartnerEnquiry, 'status' | 'notes'>>
  ) => {
    setSavingId(id);
    const updatedAt = new Date().toISOString();

    setEnquiries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, updated_at: updatedAt } : item))
    );

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('partner_enquiries')
        .update({
          ...patch,
          reviewed_at: updatedAt,
          updated_at: updatedAt,
        })
        .eq('id', id);

      if (error) Alert.alert('Update Failed', error.message);
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'Could not save enquiry changes.');
    }
    setSavingId(null);
  };

  const handleDeleteEnquiry = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('partner_enquiries').delete().eq('id', id);
      if (error) {
        Alert.alert('Delete Failed', error.message);
        return;
      }
      setEnquiries((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id || null);
        return next;
      });
    } catch (err: any) {
      Alert.alert('Delete Error', err?.message || 'Could not remove enquiry.');
    }
  };

  const handleCreateManual = async () => {
    if (!newOrg.trim() || !newContact.trim() || !newPhone.trim()) {
      Alert.alert('Missing Fields', 'Please enter Organization/Clinic Name, Contact Person, and Phone.');
      return;
    }

    setCreating(true);
    const payload = {
      partner_type: newType,
      organization_name: newOrg.trim(),
      contact_person: newContact.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || null,
      city: 'Jaipur',
      area: newArea.trim() || null,
      address: newAddress.trim() || null,
      specialty_or_services: newSpecialty.trim() || null,
      proposed_discount_pct: Number(newDiscount) || 15,
      source: newSource,
      status: 'NEW' as EnquiryStatus,
      notes: newNotes.trim() || null,
    };

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('partner_enquiries')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      const created = data as PartnerEnquiry;
      setEnquiries((prev) => [created, ...prev]);
      setSelectedId(created.id);

      setShowAddModal(false);
      setNewOrg('');
      setNewContact('');
      setNewPhone('');
      setNewEmail('');
      setNewArea('');
      setNewAddress('');
      setNewSpecialty('');
      setNewNotes('');
    } catch (err: any) {
      Alert.alert('Failed to Add Enquiry', err?.message || 'Could not save manual enquiry.');
    } finally {
      setCreating(false);
    }
  };

  const handleOnboardPartner = async (enq: PartnerEnquiry) => {
    if (enq.status !== 'APPROVED') {
      await handleUpdateEnquiry(enq.id, { status: 'APPROVED' });
    }

    const params = new URLSearchParams({
      prefillName: enq.partner_type === 'DOCTOR' ? enq.contact_person : enq.organization_name,
      prefillPhone: enq.phone || '',
      prefillAddress: enq.address || enq.area || '',
      prefillCity: enq.city || 'Jaipur',
      prefillArea: enq.area || '',
      prefillDiscount: String(enq.proposed_discount_pct ?? 15),
      prefillSpecialty: enq.specialty_or_services || '',
      prefillClinic: enq.organization_name || '',
    }).toString();

    if (enq.partner_type === 'HOSPITAL') {
      router.push(`/admin/hospitals/add-new?${params}` as any);
    } else if (enq.partner_type === 'DOCTOR') {
      router.push(`/admin/doctors/add-new?${params}` as any);
    } else {
      Alert.alert(
        'Approved!',
        `${enq.organization_name} is marked Approved.`
      );
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const digits = phone.replace(/[^\d]/g, '');
    const msg = encodeURIComponent(
      `Hello ${name}, thank you for your partner enquiry with Adityam Niramayaa Jaipur! We would like to discuss onboarding.`
    );
    Linking.openURL(`https://wa.me/${digits}?text=${msg}`).catch(() => {});
  };

  const inputStyle = {
    backgroundColor: THEME.creamBg,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 13,
    color: THEME.ink,
  } as const;

  return (
    <View style={{ gap: 18 }}>
      {/* KPI Row */}
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
            New Enquiries
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {kpis.newCount}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            Waiting for first callback
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
            In Review / Contacted
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {kpis.inReviewCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Active onboarding talks
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
            Approved Partners
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {kpis.approvedCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Ready / onboarded to catalog
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
            Total Pipeline
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {kpis.total}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {kpis.hospCount} hospitals · {kpis.docCount} solo doctors
          </Text>
        </View>
      </View>

      {/* Clean Single-Row Filter & Action Bar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1.5,
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
            placeholder="Search hospital, doctor, phone, area..."
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <View style={{ width: isDesktop ? 170 : '100%' }}>
          <SelectDropdown
            value={typeFilter}
            placeholder="All Types"
            options={[
              { value: 'ALL', label: 'All Partner Types' },
              { value: 'HOSPITAL', label: 'Hospitals' },
              { value: 'DOCTOR', label: 'Solo Doctors' },
              { value: 'LAB', label: 'Labs & Scans' },
              { value: 'PHARMACY', label: 'Pharmacies' },
            ]}
            onChange={(v) => setTypeFilter(v as 'ALL' | PartnerType)}
          />
        </View>

        <View style={{ width: isDesktop ? 170 : '100%' }}>
          <SelectDropdown
            value={statusFilter}
            placeholder="All Status"
            options={[
              { value: 'ALL', label: 'All Statuses' },
              ...ALL_STATUSES.map((st) => ({ value: st, label: STATUS_META[st].label })),
            ]}
            onChange={(v) => setStatusFilter(v as 'ALL' | EnquiryStatus)}
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{
            backgroundColor: THEME.greenPrimary,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
            Log Enquiry
          </Text>
        </TouchableOpacity>
      </View>

      {/* Follow-Up CRM Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        {(
          [
            { id: 'ALL', label: 'All Follow-ups' },
            { id: 'MISSED', label: 'Missed Follow-Up' },
            { id: 'UPCOMING', label: 'Upcoming Follow-Up' },
            { id: 'OVERDUE_24H', label: 'Overdue > 24h' },
          ] as const
        ).map((fu) => {
          const active = followUpFilter === fu.id;
          return (
            <TouchableOpacity
              key={fu.id}
              onPress={() => setFollowUpFilter(fu.id)}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: active ? THEME.amberBg : THEME.surface,
                borderWidth: 1,
                borderColor: active ? '#F3DBA8' : THEME.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: active ? THEME.amberText : THEME.muted,
                }}
              >
                {fu.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Master-Detail Area */}
      {loading ? (
        <AdminListSkeleton rows={5} />
      ) : loadError ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 32,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            Could Not Load Enquiries
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center', maxWidth: 480 }}>
            {loadError}
          </Text>
          <TouchableOpacity
            onPress={fetchEnquiries}
            style={{
              marginTop: 6,
              backgroundColor: THEME.greenPrimary,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 9,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredEnquiries.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 40,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
            {statusFilter === 'NEW' ? 'All Caught Up — No New Requests' : 'No Matching Enquiries'}
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center', maxWidth: 440 }}>
            {statusFilter === 'NEW'
              ? 'All incoming requests have been reviewed. Switch to All Statuses to view past enquiries.'
              : 'Incoming hospital and solo doctor requests from your website will appear here automatically.'}
          </Text>
          {statusFilter !== 'ALL' && (
            <TouchableOpacity
              onPress={() => setStatusFilter('ALL')}
              style={{
                marginTop: 4,
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9,
              }}
            >
              <Text style={{ color: THEME.greenPrimary, fontSize: 12, fontWeight: '700' }}>
                View All Enquiries ({enquiries.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          {/* Left Column: Enquiry List */}
          <View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '100%', gap: 10 }}>
            {pagedEnquiries.map((item) => {
              const isSelected = selectedEnquiry?.id === item.id;
              const typeMeta = PARTNER_TYPE_META[item.partner_type] || PARTNER_TYPE_META.HOSPITAL;
              const statusMeta = STATUS_META[item.status] || STATUS_META.NEW;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(item.id)}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: typeMeta.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: typeMeta.color }}>
                          {typeMeta.label}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: statusMeta.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: statusMeta.color }}>
                          {statusMeta.label}
                        </Text>
                      </View>
                      {isOverdue24h(item) && (
                        <View style={{ backgroundColor: THEME.redBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.redText }}>
                            Overdue 24h+
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: THEME.muted, fontWeight: '600' }}>
                      {formatEnquiryDate(item.created_at)}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                      {item.organization_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {item.contact_person} · {item.phone}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                      {item.area ? `${item.area}, ${item.city}` : item.city}
                    </Text>
                    {item.proposed_discount_pct ? (
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                        {item.proposed_discount_pct}% Discount Offer
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            <AdminPagination
              totalCount={filteredEnquiries.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              itemLabel="enquiries"
            />
          </View>

          {/* Right Column: Selected Enquiry Detail & Onboarding Actions */}
          {selectedEnquiry && (
            <View
              style={{
                flex: isDesktop ? 1.25 : undefined,
                width: isDesktop ? undefined : '100%',
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 20,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 16,
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        backgroundColor: PARTNER_TYPE_META[selectedEnquiry.partner_type]?.bg || THEME.greenSoft,
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {selectedEnquiry.partner_type === 'HOSPITAL' ? (
                        <Building2 size={12} color={THEME.greenPrimary} />
                      ) : (
                        <Stethoscope size={12} color={THEME.blueText} />
                      )}
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: PARTNER_TYPE_META[selectedEnquiry.partner_type]?.color || THEME.greenPrimary,
                        }}
                      >
                        {PARTNER_TYPE_META[selectedEnquiry.partner_type]?.label || selectedEnquiry.partner_type}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: THEME.muted, fontWeight: '600' }}>
                      Source: {selectedEnquiry.source}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 18, fontWeight: '900', color: THEME.ink, marginTop: 8 }}>
                    {selectedEnquiry.organization_name}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.muted, marginTop: 2 }}>
                    Contact: {selectedEnquiry.contact_person}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isOverdue24h(selectedEnquiry) && (
                    <View
                      style={{
                        backgroundColor: THEME.redBg,
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.redText }}>
                        Overdue 24h+
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      backgroundColor: STATUS_META[selectedEnquiry.status].bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: STATUS_META[selectedEnquiry.status].color }}>
                      {STATUS_META[selectedEnquiry.status].label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteEnquiry(selectedEnquiry.id)}
                    style={{
                      padding: 7,
                      borderRadius: 8,
                      backgroundColor: THEME.redBg,
                    }}
                  >
                    <Trash2 size={14} color={THEME.redText} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duplicate Phone Check Banner */}
              {Boolean(existingPhoneMap[normalizePhone(selectedEnquiry.phone)]) && (
                <View
                  style={{
                    backgroundColor: THEME.amberBg,
                    borderWidth: 1,
                    borderColor: '#F3D693',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} color={THEME.amberText} />
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: THEME.amberText }}>
                    Phone matches existing {existingPhoneMap[normalizePhone(selectedEnquiry.phone)].kind} in catalog:{' '}
                    {existingPhoneMap[normalizePhone(selectedEnquiry.phone)].name}
                  </Text>
                </View>
              )}

              {/* Quick Contact Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${selectedEnquiry.phone}`).catch(() => {})}
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
                  <Phone size={14} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                    Call {selectedEnquiry.phone}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openWhatsApp(selectedEnquiry.phone, selectedEnquiry.contact_person)}
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
                  <MessageSquare size={14} color={THEME.ink} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>WhatsApp</Text>
                </TouchableOpacity>

                {Boolean(selectedEnquiry.email) && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${selectedEnquiry.email}`).catch(() => {})}
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
                    <Mail size={14} color={THEME.ink} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                      {selectedEnquiry.email}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Details Grid */}
              <View
                style={{
                  backgroundColor: THEME.creamBg,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <MapPin size={14} color={THEME.muted} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>LOCATION</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.ink, marginTop: 2 }}>
                      {selectedEnquiry.address || `${selectedEnquiry.area || ''} ${selectedEnquiry.city}`.trim()}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>
                    SPECIALTIES / QUALIFICATIONS / SERVICES
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.ink, marginTop: 2 }}>
                    {selectedEnquiry.specialty_or_services || 'Not specified'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PROPOSED DISCOUNT</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                      {selectedEnquiry.proposed_discount_pct ?? 15}% OFF
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>RECEIVED</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={12} color={THEME.muted} />
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: THEME.ink }}>
                        {new Date(selectedEnquiry.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Status Pipeline & CRM Log */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>UPDATE STATUS</Text>
                  <TouchableOpacity
                    onPress={() => setShowCrmModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: THEME.amberBg,
                      borderWidth: 1,
                      borderColor: '#F3DBA8',
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <CalendarClock size={13} color={THEME.amberText} />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.amberText }}>
                      CRM Call Log & Follow-Up
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {ALL_STATUSES.map((st) => {
                    const active = selectedEnquiry.status === st;
                    const meta = STATUS_META[st];
                    return (
                      <TouchableOpacity
                        key={st}
                        disabled={savingId === selectedEnquiry.id}
                        onPress={() => handleUpdateEnquiry(selectedEnquiry.id, { status: st })}
                        style={{
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: active ? meta.bg : THEME.creamBg,
                          borderWidth: 1,
                          borderColor: active ? meta.color : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? meta.color : THEME.muted }}>
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Follow-up Notes */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
                  FOLLOW-UP NOTES
                </Text>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  multiline
                  numberOfLines={3}
                  placeholder="Add call notes, MOU status, or commission agreement..."
                  placeholderTextColor={THEME.muted}
                  style={[inputStyle, { minHeight: 74, textAlignVertical: 'top' }]}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <TouchableOpacity
                    disabled={savingId === selectedEnquiry.id}
                    onPress={() => handleUpdateEnquiry(selectedEnquiry.id, { notes: noteDraft })}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 9,
                      backgroundColor: THEME.creamSoft,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} color={THEME.ink} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                      {savingId === selectedEnquiry.id ? 'Saving...' : 'Save Notes'}
                    </Text>
                  </TouchableOpacity>

                  {(selectedEnquiry.partner_type === 'HOSPITAL' || selectedEnquiry.partner_type === 'DOCTOR') && (
                    <TouchableOpacity
                      onPress={() => handleOnboardPartner(selectedEnquiry)}
                      style={{
                        backgroundColor: THEME.greenPrimary,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 9,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {selectedEnquiry.partner_type === 'HOSPITAL'
                          ? 'Onboard as Partner Hospital'
                          : 'Onboard as Solo Doctor'}
                      </Text>
                      <ArrowRight size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Manual Enquiry Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable
          onPress={() => setShowAddModal(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '88%',
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 14,
                backgroundColor: THEME.creamBg,
                borderBottomWidth: 1,
                borderBottomColor: THEME.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
                Log Partner Enquiry
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <SelectDropdown
                    label="Partner Type"
                    value={newType}
                    options={[
                      { value: 'HOSPITAL', label: 'Hospital' },
                      { value: 'DOCTOR', label: 'Solo Doctor' },
                      { value: 'LAB', label: 'Lab & Scan' },
                      { value: 'PHARMACY', label: 'Pharmacy' },
                    ]}
                    onChange={(v) => setNewType(v as PartnerType)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectDropdown
                    label="Source"
                    value={newSource}
                    options={[
                      { value: 'WEBSITE', label: 'Website Form' },
                      { value: 'WHATSAPP', label: 'WhatsApp' },
                      { value: 'REFERRAL', label: 'Referral' },
                      { value: 'DIRECT_ADMIN', label: 'Direct Call / Walk-in' },
                    ]}
                    onChange={setNewSource}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Hospital / Clinic Name *
                </Text>
                <TextInput
                  value={newOrg}
                  onChangeText={setNewOrg}
                  placeholder="e.g. Apex Multispeciality Hospital"
                  style={inputStyle}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Contact Person *
                  </Text>
                  <TextInput
                    value={newContact}
                    onChangeText={setNewContact}
                    placeholder="e.g. Dr. Vikram Rathore"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Phone Number *
                  </Text>
                  <TextInput
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="+91 98290..."
                    style={inputStyle}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Email
                  </Text>
                  <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="partner@clinic.in" style={inputStyle} />
                </View>
                <View style={{ flex: 0.7 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Area (Jaipur)
                  </Text>
                  <TextInput value={newArea} onChangeText={setNewArea} placeholder="Malviya Nagar" style={inputStyle} />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Full Address
                </Text>
                <TextInput value={newAddress} onChangeText={setNewAddress} placeholder="Street, Landmark, Jaipur" style={inputStyle} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.4 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Specialties / Services
                  </Text>
                  <TextInput
                    value={newSpecialty}
                    onChangeText={setNewSpecialty}
                    placeholder="Cardiology, Orthopedics..."
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 0.6 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Discount (%)
                  </Text>
                  <TextInput value={newDiscount} onChangeText={setNewDiscount} keyboardType="numeric" style={inputStyle} />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Notes
                </Text>
                <TextInput
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                  numberOfLines={2}
                  placeholder="Initial notes..."
                  style={[inputStyle, { minHeight: 56 }]}
                />
              </View>

              <TouchableOpacity
                disabled={creating}
                onPress={handleCreateManual}
                style={{
                  backgroundColor: THEME.greenPrimary,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {creating ? 'Saving...' : 'Save Partner Enquiry'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <CrmActivityModal
        visible={showCrmModal && Boolean(selectedEnquiry)}
        entityType="PARTNER_ENQUIRY"
        entityId={selectedEnquiry?.id || ''}
        title={selectedEnquiry ? `${selectedEnquiry.organization_name} · ${selectedEnquiry.contact_person}` : ''}
        subtitle={selectedEnquiry ? `${selectedEnquiry.phone} · ${selectedEnquiry.area || 'Jaipur'}` : undefined}
        currentFollowUpAt={(selectedEnquiry as any)?.follow_up_at || null}
        onClose={() => setShowCrmModal(false)}
        onSaved={(patch) => {
          if (selectedEnquiry) {
            setNoteDraft(patch.notesSummary);
            setEnquiries((prev) =>
              prev.map((item) =>
                item.id === selectedEnquiry.id
                  ? ({ ...item, follow_up_at: patch.follow_up_at, notes: patch.notesSummary } as any)
                  : item
              )
            );
          }
        }}
      />
    </View>
  );
}
