import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { useAdminAuth } from '../AdminAuthGate';
import { isMissingColumnError } from '../hospitals/hospitalTheme';

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
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  amberText: '#92400E',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
  redText: '#991B1B',
};

interface VerificationRequestRow {
  id: string;
  entity_type: 'DOCTOR' | 'HOSPITAL';
  action_type: 'CREATE' | 'UPDATE';
  target_entity_id: string | null;
  hospital_id: string | null;
  submitted_by_user_id: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  entity_name: string;
  entity_slug: string | null;
  payload: Record<string, any>;
  verification_docs: Record<string, any>;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewer_notes: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function VerificationRequestsSection({
  onCountChange,
}: {
  onCountChange?: (pendingCount: number) => void;
}) {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequestRow[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('partner_verification_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        const rows = data as VerificationRequestRow[];
        setRequests(rows);
        onCountChange?.(rows.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length);
      }
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((r) => (filter === 'ALL' ? true : r.status === filter));

  const handleApproveAndDeploy = async (req: VerificationRequestRow) => {
    setBusyId(req.id);
    try {
      const supabase = getSupabaseClient();
      const note = (notesById[req.id] || '').trim() || 'Verified credentials & hospital affiliation';

      if (req.entity_type === 'DOCTOR') {
        const fullData = req.payload?.fullData || {};
        const baseData = req.payload?.baseData || fullData;

        if (req.action_type === 'UPDATE' && req.target_entity_id) {
          const res = await supabase.from('doctors').update(fullData).eq('id', req.target_entity_id);
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase.from('doctors').update(baseData).eq('id', req.target_entity_id);
            if (fb.error) {
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
        } else {
          const cleanSlug = (req.entity_slug || req.entity_name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          const docId = `doc-${cleanSlug.slice(0, 14)}-${Date.now().toString(36)}`;
          const res = await supabase.from('doctors').insert({ id: docId, ...fullData });
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase.from('doctors').insert({ id: docId, ...baseData });
            if (fb.error) {
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
        }
      } else {
        const fullInsert = req.payload?.fullInsert || {};
        const baseInsert = req.payload?.baseInsert || fullInsert;
        let deployedHospitalId: string | null = req.target_entity_id;

        if (req.action_type === 'UPDATE' && req.target_entity_id) {
          const res = await supabase
            .from('hospitals')
            .update({ ...fullInsert, updated_at: new Date().toISOString() })
            .eq('id', req.target_entity_id);
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase
              .from('hospitals')
              .update({ ...baseInsert, updated_at: new Date().toISOString() })
              .eq('id', req.target_entity_id);
            if (fb.error) {
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
        } else {
          const res = await supabase.from('hospitals').insert(fullInsert).select('id').single();
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase.from('hospitals').insert(baseInsert).select('id').single();
            if (fb.error) {
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
            deployedHospitalId = fb.data?.id ?? null;
          } else if (res.error) {
            Alert.alert('Deploy Failed', res.error.message);
            return;
          } else {
            deployedHospitalId = res.data?.id ?? null;
          }

          if (deployedHospitalId) {
            const cleanSlug = (req.entity_slug || req.entity_name)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            const brId = `br-${cleanSlug.slice(0, 12)}-main-${Date.now().toString(36)}`;
            await supabase.from('hospital_branches').insert({
              id: brId,
              hospital_id: deployedHospitalId,
              name: req.payload?.mainBranchName || `${req.entity_name} Main Campus`,
              area: req.payload?.mainBranchArea || fullInsert.city || 'Jaipur',
              address: fullInsert.address,
              city: fullInsert.city || 'Jaipur',
              location: fullInsert.location,
              distance_km: 1.5,
              contact_number: fullInsert.contact_number,
              virtual_exotel_number: fullInsert.virtual_exotel_number,
              is_main_branch: true,
            });

            if (req.submitted_by_user_id) {
              await supabase
                .from('users')
                .update({ partner_hospital_id: deployedHospitalId })
                .eq('id', req.submitted_by_user_id);
            }
          }
        }
      }

      await supabase
        .from('partner_verification_requests')
        .update({
          status: 'APPROVED',
          reviewer_notes: note,
          reviewed_by_user_id: adminUser?.id || null,
          reviewed_by_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);

      Alert.alert('Approved & Deployed', `${req.entity_name} has been verified and deployed live.`);
      await loadRequests();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkUnderReview = async (req: VerificationRequestRow) => {
    setBusyId(req.id);
    try {
      const supabase = getSupabaseClient();
      const note = (notesById[req.id] || '').trim() || 'In review by Adityam Staff';
      const { error } = await supabase
        .from('partner_verification_requests')
        .update({
          status: 'UNDER_REVIEW',
          reviewer_notes: note,
          reviewed_by_user_id: adminUser?.id || null,
          reviewed_by_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      await loadRequests();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (req: VerificationRequestRow) => {
    const reason = (notesById[req.id] || '').trim();
    if (!reason) {
      Alert.alert('Reason Required', 'Please enter rejection notes explaining what needs to be fixed.');
      return;
    }
    setBusyId(req.id);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('partner_verification_requests')
        .update({
          status: 'REJECTED',
          reviewer_notes: reason,
          reviewed_by_user_id: adminUser?.id || null,
          reviewed_by_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      await loadRequests();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Header & Filter */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.ink }}>
            Partner Doctor & Hospital Verifications
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            Verify degrees, licenses, hospital presence & terms before deploying live
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const active = filter === tab;
            const tabCount =
              tab === 'ALL' ? requests.length : requests.filter((r) => r.status === tab).length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? THEME.green : THEME.bg,
                  borderWidth: 1,
                  borderColor: active ? THEME.green : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : THEME.muted }}>
                  {tab.replace('_', ' ')} ({tabCount})
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => void loadRequests()}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 9,
              backgroundColor: THEME.bg,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <RefreshCw size={15} color={THEME.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="large" color={THEME.green} />
          <Text style={{ fontSize: 13, color: THEME.muted }}>Loading verification queue...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 32,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck size={32} color={THEME.green} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            No {filter === 'ALL' ? '' : filter.toLowerCase()} verification requests
          </Text>
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            New doctor and hospital submissions from Partner Portal will appear here for staff review.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((req) => {
            const isDoc = req.entity_type === 'DOCTOR';
            const p = isDoc ? req.payload?.fullData || {} : req.payload?.fullInsert || {};
            const docs = req.verification_docs || {};
            const statusBg =
              req.status === 'APPROVED'
                ? THEME.greenSoft
                : req.status === 'REJECTED'
                  ? THEME.redBg
                  : THEME.amberBg;
            const statusText =
              req.status === 'APPROVED'
                ? THEME.green
                : req.status === 'REJECTED'
                  ? THEME.redText
                  : THEME.amberText;

            return (
              <TouchableOpacity
                key={req.id}
                onPress={() => router.push(`/admin/verifications/${req.id}` as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  padding: 14,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: THEME.greenSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isDoc ? (
                      <Stethoscope size={18} color={THEME.green} />
                    ) : (
                      <Building2 size={18} color={THEME.green} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }} numberOfLines={1}>
                      {req.entity_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.muted }} numberOfLines={1}>
                      {req.action_type} {req.entity_type} • {p.city || '—'} •{' '}
                      {isDoc
                        ? `NMC: ${docs.registrationNumber || '—'}`
                        : `Reg: ${docs.clinicalEstablishmentNo || '—'}`}{' '}
                      • By {req.submitted_by_name || req.submitted_by_email || 'Partner'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ backgroundColor: statusBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: statusText }}>
                      {req.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Review & Verify</Text>
                    <ExternalLink size={12} color={THEME.green} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
