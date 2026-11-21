import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Building2,
  Clock,
  Edit3,
  Eye,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Doctor, HospitalBranch } from '@adityam/types';
import { getDoctorSlug } from '../../admin/doctors/doctorTheme';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
  redText: '#991B1B',
};

interface PartnerDoctorsListProps {
  hospitalId: string | null;
  onAddNew: () => void;
  onViewDoctor?: (slug: string) => void;
  onEditDoctor: (slug: string) => void;
  onSetupHospital: () => void;
}

type PartnerDoctorRow = Doctor & { is_available?: boolean; opd_hours?: string; available_timings?: string };

export function PartnerDoctorsList({
  hospitalId,
  onAddNew,
  onViewDoctor,
  onEditDoctor,
  onSetupHospital,
}: PartnerDoctorsListProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<PartnerDoctorRow[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [pendingReqs, setPendingReqs] = useState<
    Array<{ id: string; entity_name: string; action_type: string; status: string; reviewer_notes?: string | null }>
  >([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<PartnerDoctorRow | null>(null);

  const loadData = useCallback(async () => {
    if (!hospitalId) {
      setDoctors([]);
      setBranches([]);
      setPendingReqs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [docsRes, branchRes, reqRes] = await Promise.all([
        supabase
          .from('doctors')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('name', { ascending: true }),
        supabase
          .from('hospital_branches')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('is_main_branch', { ascending: false }),
        supabase
          .from('partner_verification_requests')
          .select('id, entity_name, action_type, status, reviewer_notes')
          .eq('hospital_id', hospitalId)
          .eq('entity_type', 'DOCTOR')
          .in('status', ['PENDING', 'UNDER_REVIEW', 'REJECTED'])
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setDoctors((docsRes.data || []) as PartnerDoctorRow[]);
      setBranches((branchRes.data || []) as HospitalBranch[]);
      setPendingReqs((reqRes.data || []) as any[]);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    void loadData();
    if (!hospitalId) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`partner-doctors-sync-${hospitalId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_verification_requests' },
        () => {
          void loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        () => {
          void loadData();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData, hospitalId]);

  const branchNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const br of branches) {
      map[br.id] = br.area || br.name;
    }
    return map;
  }, [branches]);

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (selectedBranchId !== 'ALL' && d.branch_id !== selectedBranchId) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.specialty || '').toLowerCase().includes(q) ||
        (d.qualification || '').toLowerCase().includes(q)
      );
    });
  }, [doctors, search, selectedBranchId]);

  const toggleAvailability = async (doc: PartnerDoctorRow) => {
    setBusyId(doc.id);
    const nextVal = !doc.is_available;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('doctors')
        .update({ is_available: nextVal })
        .eq('id', doc.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setDoctors((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_available: nextVal } : d)));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (doc: Doctor) => {
    const performDelete = async () => {
      setBusyId(doc.id);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('doctors').delete().eq('id', doc.id);
        if (error) {
          Alert.alert('Delete Failed', error.message);
          return;
        }
        setDoctors((prev) => prev.filter((d) => d.id !== doc.id));
      } finally {
        setBusyId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove Dr. ${doc.name} from your OPD roster?`)) {
        void performDelete();
      }
      return;
    }

    Alert.alert('Remove Doctor', `Remove ${doc.name} from your OPD roster?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void performDelete() },
    ]);
  };

  if (!hospitalId) {
    return (
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 28,
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Building2 size={36} color={THEME.green} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.ink }}>
          Add Your Hospital First
        </Text>
        <Text style={{ fontSize: 13, color: THEME.muted, textAlign: 'center', maxWidth: 420 }}>
          Before adding doctors and sitting timings, register your hospital profile and main branch.
        </Text>
        <TouchableOpacity
          onPress={onSetupHospital}
          style={{
            marginTop: 4,
            backgroundColor: THEME.green,
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
            Add Your Hospital
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {/* Top Action Bar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 14,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 220,
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
          <Search size={16} color={THEME.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search doctor name, specialty, degree..."
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, fontSize: 13, color: THEME.ink }}
          />
        </View>

        <TouchableOpacity
          onPress={onAddNew}
          style={{
            backgroundColor: THEME.green,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
            Add New Doctor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Branch-Wise Filter Bar */}
      {branches.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSelectedBranchId('ALL')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 99,
              backgroundColor: selectedBranchId === 'ALL' ? THEME.green : THEME.surface,
              borderWidth: 1,
              borderColor: selectedBranchId === 'ALL' ? THEME.green : THEME.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: selectedBranchId === 'ALL' ? '#FFFFFF' : THEME.ink }}>
              All Branches ({doctors.length})
            </Text>
          </TouchableOpacity>
          {branches.map((br) => {
            const count = doctors.filter((d) => d.branch_id === br.id).length;
            const active = selectedBranchId === br.id;
            return (
              <TouchableOpacity
                key={br.id}
                onPress={() => setSelectedBranchId(br.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? THEME.green : THEME.surface,
                  borderWidth: 1,
                  borderColor: active ? THEME.green : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                  {br.area || br.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Pending / Under Review / Rejected Verification Cards */}
      {pendingReqs.length > 0 && (
        <View style={{ gap: 10 }}>
          {pendingReqs.map((r) => {
            const isRejected = r.status === 'REJECTED';
            const isUnderReview = r.status === 'UNDER_REVIEW';
            return (
              <View
                key={r.id}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isRejected ? THEME.redBorder : isUnderReview ? '#93C5FD' : '#F3DBA8',
                  padding: 14,
                  gap: 8,
                }}
              >
                {r.reviewer_notes ? (
                  <View
                    style={{
                      backgroundColor: isRejected ? THEME.redBg : isUnderReview ? '#EFF6FF' : THEME.greenSoft,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isRejected ? THEME.redText : isUnderReview ? '#1E40AF' : THEME.green,
                      }}
                    >
                      Staff Update: {r.reviewer_notes}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>{r.entity_name}</Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                      {r.action_type} DOCTOR •{' '}
                      {isUnderReview
                        ? 'Currently under review by Adityam Staff'
                        : isRejected
                          ? 'Please fix & re-submit doctor details'
                          : 'Awaiting Adityam Admin verification'}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: isRejected ? THEME.redBg : isUnderReview ? '#EFF6FF' : '#FEF7E6',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 99,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: '800',
                        color: isRejected ? THEME.redText : isUnderReview ? '#1D4ED8' : '#92400E',
                      }}
                    >
                      {isRejected ? 'REJECTED' : isUnderReview ? 'UNDER REVIEW' : 'SUBMITTED FOR REVIEW'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {loading ? (
        <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={{ fontSize: 13, color: THEME.muted }}>Loading OPD doctors...</Text>
        </View>
      ) : filteredDoctors.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 32,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Stethoscope size={32} color={THEME.muted} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            {search.trim() ? 'No matching doctors found' : 'No doctors added yet'}
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted, textAlign: 'center' }}>
            Add doctors with their sitting timings, specialty, and branch so patients can book OPD slots.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {(() => {
            const groups = new Map<string, { label: string; docs: PartnerDoctorRow[] }>();
            for (const doc of filteredDoctors) {
              const bId = doc.branch_id || 'main';
              const bLabel = doc.branch_id ? branchNameById[doc.branch_id] || 'Main Campus' : 'Main Campus';
              if (!groups.has(bId)) groups.set(bId, { label: bLabel, docs: [] });
              groups.get(bId)!.docs.push(doc);
            }
            return Array.from(groups.entries()).map(([bId, group]) => (
              <View key={bId} style={{ gap: 10 }}>
                {/* Branch Section Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Building2 size={15} color={THEME.green} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>
                      {group.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 99,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>
                      {group.docs.length} {group.docs.length === 1 ? 'Doctor' : 'Doctors'}
                    </Text>
                  </View>
                </View>

                {/* Responsive 2-Column Doctor Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {group.docs.map((doc) => {
                    const docSlug = getDoctorSlug(doc as any);
                    return (
                      <View
                        key={doc.id}
                        style={{
                          width: isDesktop ? '49%' : '100%',
                          backgroundColor: THEME.surface,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          padding: 14,
                          gap: 12,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          {doc.avatar_url ? (
                            <Image
                              source={{ uri: doc.avatar_url }}
                              resizeMode="cover"
                              style={{
                                width: 60,
                                height: 80,
                                borderRadius: 10,
                                backgroundColor: THEME.bg,
                                borderWidth: 1,
                                borderColor: THEME.border,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 60,
                                height: 80,
                                borderRadius: 10,
                                backgroundColor: THEME.bg,
                                borderWidth: 1,
                                borderColor: THEME.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 3,
                              }}
                            >
                              <Stethoscope size={18} color={THEME.muted} />
                              <Text style={{ fontSize: 9, fontWeight: '700', color: THEME.muted }}>No Photo</Text>
                            </View>
                          )}

                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                              {doc.name}
                            </Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }} numberOfLines={1}>
                              {doc.specialty} • {doc.qualification}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '600' }} numberOfLines={1}>
                              {doc.experience_years ? `${doc.experience_years} yrs exp` : 'Specialist'}
                              {(doc as any).registration_number ? ` · Reg: ${(doc as any).registration_number}` : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <View
                                style={{
                                  backgroundColor: THEME.greenSoft,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11.5, color: THEME.greenDark, fontWeight: '800' }}>
                                  ₹{doc.consultation_fee}
                                  {doc.discounted_fee && doc.discounted_fee < doc.consultation_fee
                                    ? ` → ₹${doc.discounted_fee}`
                                    : ''}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} color={THEME.muted} />
                                <Text style={{ fontSize: 11.5, color: THEME.muted }} numberOfLines={1}>
                                  {doc.opd_hours || doc.available_timings || '9:00 AM - 5:00 PM'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 8,
                            borderTopWidth: 1,
                            borderTopColor: THEME.border,
                            paddingTop: 10,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => (onViewDoctor ? onViewDoctor(docSlug) : setViewDoc(doc))}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 11,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: THEME.bg,
                              borderWidth: 1,
                              borderColor: THEME.border,
                            }}
                          >
                            <Eye size={14} color={THEME.ink} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                              View
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => onEditDoctor(docSlug)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: THEME.greenSoft,
                              borderWidth: 1,
                              borderColor: THEME.greenBorder,
                            }}
                          >
                            <Edit3 size={14} color={THEME.green} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                              Edit Doctor & Timings
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDelete(doc)}
                            disabled={busyId === doc.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 11,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: THEME.redBg,
                              borderWidth: 1,
                              borderColor: THEME.redBorder,
                            }}
                          >
                            <Trash2 size={14} color={THEME.redText} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      {/* View Doctor Profile & Payout Modal */}
      <Modal
        visible={Boolean(viewDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewDoc(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '90%',
              backgroundColor: THEME.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                backgroundColor: THEME.greenDark,
                paddingHorizontal: 18,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF' }}>
                Doctor Profile & Payout Summary
              </Text>
              <TouchableOpacity
                onPress={() => setViewDoc(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {viewDoc ? (() => {
              const mrp = Number(viewDoc.consultation_fee || 0);
              const payable = Number(viewDoc.discounted_fee || mrp);
              const discAmt = Math.max(0, mrp - payable);
              const discPct = mrp > 0 ? Math.round((discAmt / mrp) * 100) : 0;
              const commPct = Number((viewDoc as any).commission_percentage ?? 10);
              const commAmt = Math.round((payable * commPct) / 100);
              const netPayout = Math.max(0, payable - commAmt);
              const branchLabel = viewDoc.branch_id ? branchNameById[viewDoc.branch_id] || 'Main Campus' : 'Main Campus';
              const slug = getDoctorSlug(viewDoc as any);

              return (
                <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    {viewDoc.avatar_url ? (
                      <Image
                        source={{ uri: viewDoc.avatar_url }}
                        resizeMode="cover"
                        style={{ width: 72, height: 96, borderRadius: 12, borderWidth: 1, borderColor: THEME.border }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 72,
                          height: 96,
                          borderRadius: 12,
                          backgroundColor: THEME.bg,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Stethoscope size={24} color={THEME.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: THEME.ink }}>{viewDoc.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.green }}>
                        {viewDoc.specialty} · {viewDoc.qualification}
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>
                        {branchLabel} · {viewDoc.experience_years || 0} yrs exp
                      </Text>
                      {(viewDoc as any).registration_number ? (
                        <Text style={{ fontSize: 11.5, color: THEME.muted, fontWeight: '700' }}>
                          Reg No: {(viewDoc as any).registration_number}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME.bg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      padding: 13,
                      gap: 7,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                      OFFER, COMMISSION & PARTNER PAYOUT PER CONSULT
                    </Text>
                    {[
                      { label: 'Hospital Consultation MRP', value: `₹${mrp.toLocaleString('en-IN')}` },
                      { label: `Patient In-App Offer (${discPct}% off)`, value: `−₹${discAmt.toLocaleString('en-IN')}` },
                      { label: 'Patient Pays Online', value: `₹${payable.toLocaleString('en-IN')}`, bold: true },
                      { label: `Platform Commission (${commPct}%)`, value: `−₹${commAmt.toLocaleString('en-IN')}` },
                      { label: 'Your Net Partner Payout', value: `₹${netPayout.toLocaleString('en-IN')}`, highlight: THEME.greenDark, bold: true },
                    ].map((row: any) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingBottom: 6,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: THEME.muted, fontWeight: '600' }}>{row.label}</Text>
                        <Text style={{ fontSize: row.bold ? 13.5 : 12.5, fontWeight: row.bold ? '900' : '700', color: row.highlight || THEME.ink }}>
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ backgroundColor: THEME.bg, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, padding: 13, gap: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                      SITTING TIMINGS & SERVICES
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                      {viewDoc.opd_hours || viewDoc.available_timings || '9:00 AM - 5:00 PM'}
                    </Text>
                    {(viewDoc as any).about ? (
                      <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{(viewDoc as any).about}</Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setViewDoc(null)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 9,
                        backgroundColor: THEME.bg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setViewDoc(null);
                        onEditDoctor(slug);
                      }}
                      style={{
                        paddingHorizontal: 15,
                        paddingVertical: 9,
                        borderRadius: 9,
                        backgroundColor: THEME.greenDark,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Edit3 size={14} color="#FFFFFF" />
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        Edit Doctor & Timings
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })() : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
