import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Stethoscope,
  X,
  XCircle,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import { useAdminAuth } from '../AdminAuthGate';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { translateEnToHi } from '../../../src/utils/autoTranslateHi';

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

export interface VerificationRequestRow {
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

function ChipSection({ title, items }: { title: string; items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.muted }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {items.map((item) => (
          <View
            key={item}
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function VerificationDetailView({
  requestId,
  onBack,
  onStatusChanged,
}: {
  requestId: string;
  onBack: () => void;
  onStatusChanged?: () => void;
}) {
  const { adminUser } = useAdminAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<VerificationRequestRow | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [discountInput, setDiscountInput] = useState('20');
  const [commissionInput, setCommissionInput] = useState('5');
  const [showDocSchedule, setShowDocSchedule] = useState(false);
  const [nameHi, setNameHi] = useState('');
  const [addressHi, setAddressHi] = useState('');
  const [extraHi, setExtraHi] = useState('');
  const [branchNameHi, setBranchNameHi] = useState('');
  const [translatingHi, setTranslatingHi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const runAutoTranslate = useCallback(async (row: VerificationRequestRow) => {
    setTranslatingHi(true);
    try {
      const isDoc = row.entity_type === 'DOCTOR';
      const p = isDoc ? row.payload?.fullData || {} : row.payload?.fullInsert || {};
      const [nHi, aHi, eHi, bHi] = await Promise.all([
        translateEnToHi(String(p.name || row.entity_name || '')),
        translateEnToHi(String(isDoc ? p.clinic_address || p.city || '' : p.address || p.city || '')),
        translateEnToHi(String(isDoc ? p.specialty || '' : p.tag || '')),
        !isDoc && row.payload?.mainBranchName
          ? translateEnToHi(String(row.payload.mainBranchName))
          : Promise.resolve(''),
      ]);
      setNameHi(nHi);
      setAddressHi(aHi);
      setExtraHi(eHi);
      setBranchNameHi(bHi);
    } finally {
      setTranslatingHi(false);
    }
  }, []);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('partner_verification_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();
      if (error) {
        setActionError(error.message);
      } else if (data) {
        const row = data as VerificationRequestRow;
        setReq(row);
        setNotes(row.reviewer_notes || '');
        const p = row.entity_type === 'DOCTOR' ? row.payload?.fullData || {} : row.payload?.fullInsert || {};
        setDiscountInput(String(p.discount_percentage ?? 20));
        setCommissionInput(String(p.commission_percentage ?? 10));
        if (row.status === 'PENDING' || row.status === 'UNDER_REVIEW') {
          void runAutoTranslate(row);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [requestId, runAutoTranslate]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const handleMarkUnderReview = async () => {
    if (!req) return;
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('partner_verification_requests')
        .update({
          status: 'UNDER_REVIEW',
          reviewer_notes: notes.trim() || 'In review by Adityam Staff',
          reviewed_by_user_id: adminUser?.id || null,
          reviewed_by_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) {
        setActionError(error.message);
        Alert.alert('Update Failed', error.message);
        return;
      }
      setActionSuccess('Marked as Under Review.');
      onStatusChanged?.();
      await loadRequest();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!req) return;
    if (!notes.trim()) {
      setActionError('Please enter rejection notes explaining what needs to be fixed.');
      Alert.alert('Reason Required', 'Please enter rejection notes explaining what needs to be fixed.');
      return;
    }
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('partner_verification_requests')
        .update({
          status: 'REJECTED',
          reviewer_notes: notes.trim(),
          reviewed_by_user_id: adminUser?.id || null,
          reviewed_by_name: adminUser?.fullName || adminUser?.email || 'Admin Staff',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) {
        setActionError(error.message);
        Alert.alert('Update Failed', error.message);
        return;
      }
      setActionSuccess('Request rejected with staff notes.');
      onStatusChanged?.();
      await loadRequest();
    } finally {
      setBusy(false);
    }
  };

  const handleApproveAndDeploy = async () => {
    if (!req) return;
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const supabase = getSupabaseClient();
      const note = notes.trim() || 'Verified credentials & hospital affiliation';

      if (req.entity_type === 'DOCTOR') {
        const discNum = Math.max(0, Math.min(80, Number(discountInput) || 0));
        const commNum = Math.max(0, Math.min(50, Number(commissionInput) || 0));
        const feeNum = Number(req.payload?.fullData?.consultation_fee) || 600;
        const discountedFee = Math.max(50, Math.round(feeNum * (1 - discNum / 100)));
        const fullData = {
          ...(req.payload?.fullData || {}),
          discount_percentage: discNum,
          commission_percentage: commNum,
          discounted_fee: discountedFee,
          ...(nameHi.trim() ? { name_hi: nameHi.trim() } : {}),
          ...(addressHi.trim() ? { clinic_address_hi: addressHi.trim() } : {}),
          ...(extraHi.trim() ? { specialty_hi: extraHi.trim() } : {}),
        };
        const baseData = {
          ...(req.payload?.baseData || fullData),
          discounted_fee: discountedFee,
        };

        if (req.action_type === 'UPDATE' && req.target_entity_id) {
          const res = await supabase.from('doctors').update(fullData).eq('id', req.target_entity_id);
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase.from('doctors').update(baseData).eq('id', req.target_entity_id);
            if (fb.error) {
              setActionError(fb.error.message);
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            setActionError(res.error.message);
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
              setActionError(fb.error.message);
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            setActionError(res.error.message);
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
        }
      } else {
        const discNum = Math.max(0, Math.min(80, Number(discountInput) || 0));
        const commNum = Math.max(0, Math.min(50, Number(commissionInput) || 0));
        const fullInsert = {
          ...(req.payload?.fullInsert || {}),
          discount_percentage: discNum,
          commission_percentage: commNum,
          ...(nameHi.trim() ? { name_hi: nameHi.trim() } : {}),
          ...(addressHi.trim() ? { address_hi: addressHi.trim() } : {}),
          ...(extraHi.trim() ? { tagline_hi: extraHi.trim() } : {}),
        };
        const baseInsert = {
          ...(req.payload?.baseInsert || fullInsert),
          discount_percentage: discNum,
        };
        let deployedHospitalId: string | null = req.target_entity_id;

        if (req.payload?.branchData) {
          const br = req.payload.branchData;
          const { latitude: brLat, longitude: brLng, ...brWithoutGenerated } = br;
          const locationPoint =
            brLat && brLng && !Number.isNaN(Number(brLat)) && !Number.isNaN(Number(brLng))
              ? `SRID=4326;POINT(${Number(brLng)} ${Number(brLat)})`
              : undefined;
          const branchInsertPayload = {
            ...brWithoutGenerated,
            ...(locationPoint ? { location: locationPoint } : {}),
          };
          const res = await supabase.from('hospital_branches').insert(branchInsertPayload);
          if (res.error && isMissingColumnError(res.error)) {
            const safeBr = {
              id: br.id,
              hospital_id: br.hospital_id,
              name: br.name,
              area: br.area,
              address: br.address,
              city: br.city,
              contact_number: br.contact_number,
              virtual_exotel_number: br.virtual_exotel_number ?? null,
              ...(locationPoint ? { location: locationPoint } : {}),
              is_main_branch: Boolean(br.is_main_branch),
            };
            const fb = await supabase.from('hospital_branches').insert(safeBr);
            if (fb.error) {
              setActionError(fb.error.message);
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            setActionError(res.error.message);
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
          deployedHospitalId = br.hospital_id || req.target_entity_id;
        } else if (req.action_type === 'UPDATE' && req.target_entity_id) {
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
              setActionError(fb.error.message);
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
          } else if (res.error) {
            setActionError(res.error.message);
            Alert.alert('Deploy Failed', res.error.message);
            return;
          }
        } else {
          let res = await supabase.from('hospitals').insert(fullInsert).select('id').single();
          if (res.error && res.error.message?.includes('null value in column "id"')) {
            const genId = `hosp-${Date.now().toString(36)}`;
            fullInsert.id = genId;
            baseInsert.id = genId;
            res = await supabase.from('hospitals').insert(fullInsert).select('id').single();
          }
          if (res.error && isMissingColumnError(res.error)) {
            const fb = await supabase.from('hospitals').insert(baseInsert).select('id').single();
            if (fb.error) {
              setActionError(fb.error.message);
              Alert.alert('Deploy Failed', fb.error.message);
              return;
            }
            deployedHospitalId = fb.data?.id ?? null;
          } else if (res.error) {
            setActionError(res.error.message);
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
            const brRes = await supabase.from('hospital_branches').insert({
              id: brId,
              hospital_id: deployedHospitalId,
              name: req.payload?.mainBranchName || `${req.entity_name} Main Campus`,
              ...(branchNameHi.trim() ? { name_hi: branchNameHi.trim() } : {}),
              area: req.payload?.mainBranchArea || fullInsert.city || 'Jaipur',
              address: fullInsert.address,
              ...(addressHi.trim() ? { address_hi: addressHi.trim() } : {}),
              city: fullInsert.city || 'Jaipur',
              location: fullInsert.location,
              distance_km: 1.5,
              contact_number: fullInsert.contact_number,
              virtual_exotel_number: fullInsert.virtual_exotel_number,
              is_main_branch: true,
            });
            if (brRes.error) {
              setActionError(`Hospital created, but branch insert failed: ${brRes.error.message}`);
            }

            if (req.submitted_by_user_id) {
              await supabase
                .from('users')
                .update({ partner_hospital_id: deployedHospitalId })
                .eq('id', req.submitted_by_user_id);
            }
          }
        }
      }

      const { error: updErr } = await supabase
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

      if (updErr) {
        setActionError(updErr.message);
        return;
      }

      setActionSuccess(`${req.entity_name} has been verified and deployed live!`);
      onStatusChanged?.();
      Alert.alert('Approved & Deployed', `${req.entity_name} is now live.`);
      await loadRequest();
    } catch (e: any) {
      setActionError(e?.message || 'Unexpected error while deploying.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, color: THEME.muted }}>Loading verification details...</Text>
      </View>
    );
  }

  if (!req) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Verification Request Not Found</Text>
        <TouchableOpacity
          onPress={onBack}
          style={{ backgroundColor: THEME.green, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>← Back to Verifications</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDoc = req.entity_type === 'DOCTOR';
  const p = isDoc ? req.payload?.fullData || {} : req.payload?.fullInsert || {};
  const docs = req.verification_docs || {};
  const mapLat = isDoc ? p.latitude : req.payload?.latNum;
  const mapLng = isDoc ? p.longitude : req.payload?.lngNum;

  const statusBg =
    req.status === 'APPROVED' ? THEME.greenSoft : req.status === 'REJECTED' ? THEME.redBg : THEME.amberBg;
  const statusText =
    req.status === 'APPROVED' ? THEME.green : req.status === 'REJECTED' ? THEME.redText : THEME.amberText;

  return (
    <View style={{ gap: 18 }}>
      {/* Top Hero Header */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={16} color={THEME.ink} />
            </TouchableOpacity>

            {(isDoc ? p.avatar_url : p.image_url) ? (
              <TouchableOpacity
                onPress={() =>
                  setPreviewDoc({
                    label: `${req.entity_name} — Profile Photo`,
                    url: String(isDoc ? p.avatar_url : p.image_url),
                  })
                }
              >
                <Image
                  source={{ uri: isDoc ? p.avatar_url : p.image_url }}
                  resizeMode="cover"
                  style={{
                    width: isDoc ? 60 : 72,
                    height: isDoc ? 80 : 54,
                    borderRadius: 10,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                />
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: THEME.greenSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDoc ? <Stethoscope size={24} color={THEME.green} /> : <Building2 size={24} color={THEME.green} />}
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: THEME.ink }}>
                {req.entity_name}
              </Text>
              <Text style={{ fontSize: 12.5, color: THEME.muted }}>
                {req.action_type} {req.entity_type} • /{req.entity_slug || '—'} • Submitted by{' '}
                {req.submitted_by_name || req.submitted_by_email || 'Partner'} on{' '}
                {new Date(req.created_at).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: statusBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: statusText }}>{req.status}</Text>
          </View>
        </View>
      </View>

      {/* Two-column Details on Desktop */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        {/* Left: Profile & Contacts */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 18,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            1. {isDoc ? 'Doctor Profile & Fee Details' : req.payload?.branchData ? 'New Branch Linking Details' : 'Hospital Profile & Infrastructure'}
          </Text>

          {!isDoc && req.payload?.branchData ? (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: THEME.greenSoft, borderRadius: 10, borderWidth: 1, borderColor: THEME.greenBorder, padding: 12, gap: 3 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.green, letterSpacing: 0.4 }}>
                  EXISTING VERIFIED HOSPITAL (PARENT)
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: THEME.greenDark }}>
                  {req.payload?.parentHospital?.name || req.entity_name}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  {req.payload?.parentHospital?.address || '—'} · {req.payload?.parentHospital?.city || ''}
                </Text>
              </View>

              <View style={{ backgroundColor: THEME.bg, borderRadius: 10, borderWidth: 1, borderColor: THEME.border, padding: 12, gap: 5 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted, letterSpacing: 0.4 }}>
                  NEW BRANCH BEING LINKED
                </Text>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                  {req.payload.branchData.name}
                </Text>
                <Text style={{ fontSize: 12.5, color: THEME.ink }}>
                  {req.payload.branchData.area}, {req.payload.branchData.city}, {req.payload.branchData.state || ''} {req.payload.branchData.pincode || ''}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  Address: {req.payload.branchData.address}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.green, fontWeight: '700' }}>
                  Phone: {req.payload.branchData.contact_number} · Timings: {req.payload.branchData.timings || '8:00 AM - 9:00 PM'}
                </Text>
                {req.payload.branchData.latitude && req.payload.branchData.longitude ? (
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                    GPS Pin: {req.payload.branchData.latitude}, {req.payload.branchData.longitude}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {isDoc ? (
            <>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Specialty: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.specialty || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Qualifications: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.qualification || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Experience: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.experience_years ?? '—'} years</Text> •{' '}
                Languages: <Text style={{ fontWeight: '800', color: THEME.ink }}>{(p.languages || []).join(', ') || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                OPD Fee: <Text style={{ fontWeight: '800', color: THEME.ink }}>₹{p.consultation_fee ?? '—'}</Text> •{' '}
                Discount: <Text style={{ fontWeight: '800', color: THEME.green }}>{p.discount_percentage ?? 0}% (Patient Pays ₹{p.discounted_fee ?? '—'})</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Clients / Hour Slot: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.slot_capacity || 6}</Text>
              </Text>
              <View style={{ gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setShowDocSchedule((v) => !v)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                    OPD Schedule: {p.opd_timing || '7-Day Schedule'}
                  </Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.green }}>
                    {showDocSchedule ? 'Hide 7 Days ▲' : 'View 7 Days ▼'}
                  </Text>
                </TouchableOpacity>
                {showDocSchedule && p.weekly_schedule ? (
                  <View style={{ backgroundColor: THEME.bg, borderRadius: 9, borderWidth: 1, borderColor: THEME.border, padding: 10, gap: 4 }}>
                    {[
                      { k: 'mon', l: 'Monday' },
                      { k: 'tue', l: 'Tuesday' },
                      { k: 'wed', l: 'Wednesday' },
                      { k: 'thu', l: 'Thursday' },
                      { k: 'fri', l: 'Friday' },
                      { k: 'sat', l: 'Saturday' },
                      { k: 'sun', l: 'Sunday' },
                    ].map((d) => {
                      const row = p.weekly_schedule?.[d.k];
                      const isOpen = row ? Boolean(row.open) : d.k !== 'sun';
                      const txt = !isOpen
                        ? 'Closed'
                        : row
                          ? `${row.start || '09:00'} – ${row.end || '13:00'}${row.hasBreak && row.start2 ? `, ${row.start2} – ${row.end2 || '20:00'}` : ''}`
                          : p.opd_timing || '9:00 AM – 5:00 PM';
                      return (
                        <View key={d.k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>{d.l}</Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: isOpen ? THEME.green : THEME.redText }}>{txt}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
              {p.about ? (
                <Text style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4 }}>{p.about}</Text>
              ) : null}
            </>
          ) : req.payload?.branchData ? (
            <>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Branch Capacity: <Text style={{ fontWeight: '800', color: THEME.ink }}>{req.payload.branchData.total_beds ?? 0} Beds</Text> •{' '}
                <Text style={{ fontWeight: '800', color: THEME.ink }}>{req.payload.branchData.icu_beds ?? 0} ICU</Text> •{' '}
                <Text style={{ fontWeight: '800', color: THEME.ink }}>{req.payload.branchData.ot_count ?? 0} OTs</Text> •{' '}
                24x7: <Text style={{ fontWeight: '800', color: THEME.ink }}>{req.payload.branchData.is_24x7 ? 'Yes' : 'No'}</Text>
              </Text>
              {Array.isArray(req.payload.branchData.facilities) && req.payload.branchData.facilities.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {req.payload.branchData.facilities.map((fac: string) => (
                    <View key={fac} style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenDark }}>{fac}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Tagline: <Text style={{ fontWeight: '700', color: THEME.ink }}>{p.tag || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Capacity: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.total_beds ?? 0} Beds</Text> •{' '}
                <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.icu_beds ?? 0} ICU</Text> •{' '}
                <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.ot_count ?? 0} OTs</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                24x7 Open: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.is_24x7 ? 'Yes' : 'No'}</Text> •{' '}
                NABH: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.nabh_accredited ? 'Yes' : 'No'}</Text> •{' '}
                JCI: <Text style={{ fontWeight: '800', color: THEME.ink }}>{p.jci_accredited ? 'Yes' : 'No'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                OPD Hours: <Text style={{ fontWeight: '700', color: THEME.ink }}>{p.opd_hours || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Main Branch: <Text style={{ fontWeight: '800', color: THEME.ink }}>{req.payload?.mainBranchName || 'Main Campus'}</Text>{' '}
                ({req.payload?.mainBranchArea || p.city || '—'})
              </Text>
            </>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 10, gap: 6, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Phone size={14} color={THEME.green} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                {isDoc ? p.phone || '—' : req.payload?.branchData?.contact_number || p.contact_number || '—'}
                {!isDoc && p.virtual_exotel_number ? ` • Helpline: ${p.virtual_exotel_number}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <MapPin size={14} color={THEME.green} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 13, color: THEME.ink, flex: 1 }}>
                {isDoc
                  ? p.clinic_address || '—'
                  : req.payload?.branchData?.address || p.address || '—'},{' '}
                {req.payload?.branchData?.city || p.city || ''} {req.payload?.branchData?.state || p.state || ''}{' '}
                {req.payload?.branchData?.pincode || p.pincode || ''}
              </Text>
            </View>
            {mapLat && mapLng ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${mapLat},${mapLng}`)}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MapPin size={13} color={THEME.green} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                  Open Pinned Location in Google Maps ({Number(mapLat).toFixed(4)}, {Number(mapLng).toFixed(4)})
                </Text>
                <ExternalLink size={12} color={THEME.green} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Right: Verification Credentials & Documents */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 18,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            2. Verification Credentials & Legal Docs
          </Text>

          {isDoc ? (
            <>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                NMC / Medical Reg. No: <Text style={{ fontWeight: '800', color: THEME.ink }}>{docs.registrationNumber || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Hospital ID: <Text style={{ fontWeight: '800', color: THEME.ink }}>{docs.hospitalId || req.hospital_id || '—'}</Text>
                {docs.branchId ? ` • Branch: ${docs.branchId}` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Clinical Est. / Reg. No: <Text style={{ fontWeight: '800', color: THEME.ink }}>{docs.clinicalEstablishmentNo || '—'}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: THEME.muted }}>
                Authorized Signatory: <Text style={{ fontWeight: '800', color: THEME.ink }}>{docs.authorizedSignatory || '—'}</Text>
              </Text>
            </>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: req.terms_accepted ? THEME.greenSoft : THEME.redBg,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <ShieldCheck size={14} color={req.terms_accepted ? THEME.green : THEME.redText} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: req.terms_accepted ? THEME.green : THEME.redText }}>
                {req.terms_accepted ? 'Partner T&C Accepted' : 'T&C Missing'}
              </Text>
            </View>
          </View>

          {/* Document Links & Previews */}
          {[
            { label: 'License / Registration Proof', url: docs.licenseProofUrl },
            { label: 'Doctor Degree Certificate', url: docs.degreeProofUrl },
            { label: 'ID / Affiliation Letter', url: docs.idProofUrl },
          ]
            .filter((d) => Boolean(d.url))
            .map((doc) => (
              <View
                key={doc.label}
                style={{
                  backgroundColor: THEME.bg,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  padding: 10,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>{doc.label}</Text>
                  <TouchableOpacity
                    onPress={() => setPreviewDoc({ label: doc.label, url: String(doc.url) })}
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
                    <Maximize2 size={12} color={THEME.greenDark} />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenDark }}>View Fullscreen</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPreviewDoc({ label: doc.label, url: String(doc.url) })}
                >
                  <Image
                    source={{ uri: String(doc.url) }}
                    resizeMode="contain"
                    style={{ width: '100%', height: 220, borderRadius: 8, backgroundColor: '#F4F1E8' }}
                  />
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </View>

      {/* Services & Offerings Selected */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 18,
          gap: 14,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
          3. Selected Services, Labs & Departments
        </Text>
        {isDoc ? (
          <ChipSection title="Services Offered" items={p.services_offered} />
        ) : (
          <View style={{ gap: 14 }}>
            <ChipSection title="Specialties" items={p.specialties} />
            <ChipSection title="Facilities" items={p.facilities} />
            <ChipSection title="Labs & Diagnostic Scans" items={p.labs_offered} />
            <ChipSection title="IPD & Surgeries" items={p.ipd_services_offered} />
            <ChipSection title="Insurance / TPA Empanelment" items={p.insurance_partners} />
          </View>
        )}
      </View>

      {/* Staff Decision Panel */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          padding: 18,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
          4. Staff Review & Deployment Decision
        </Text>

        {actionError ? (
          <View
            style={{
              backgroundColor: THEME.redBg,
              borderWidth: 1,
              borderColor: THEME.redBorder,
              borderRadius: 9,
              padding: 10,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.redText }}>
              Error: {actionError}
            </Text>
          </View>
        ) : null}

        {actionSuccess ? (
          <View
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              borderRadius: 9,
              padding: 10,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.green }}>{actionSuccess}</Text>
          </View>
        ) : null}

        {(req.status === 'PENDING' || req.status === 'UNDER_REVIEW') && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              backgroundColor: THEME.bg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted, marginBottom: 4 }}>
                Platform App Discount (%)
              </Text>
              <TextInput
                value={discountInput}
                onChangeText={(t) => setDiscountInput(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="numeric"
                placeholder="e.g. 20"
                style={{
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  fontWeight: '700',
                  color: THEME.ink,
                }}
              />
            </View>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted, marginBottom: 4 }}>
                Platform Commission (%)
              </Text>
              <TextInput
                value={commissionInput}
                onChangeText={(t) => setCommissionInput(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="numeric"
                placeholder="e.g. 10"
                style={{
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  fontWeight: '700',
                  color: THEME.ink,
                }}
              />
            </View>
          </View>
        )}

        {(req.status === 'PENDING' || req.status === 'UNDER_REVIEW') && (
          <View
            style={{
              backgroundColor: THEME.bg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 12,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                Hindi Display Translation (Auto-filled Free · Editable)
              </Text>
              <TouchableOpacity
                onPress={() => void runAutoTranslate(req)}
                disabled={translatingHi}
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 7,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.green }}>
                  {translatingHi ? 'Translating...' : 'Auto-Translate Hindi'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 3 }}>
                  Name in Hindi (नाम)
                </Text>
                <TextInput
                  value={nameHi}
                  onChangeText={setNameHi}
                  placeholder="अस्पताल / डॉक्टर का नाम"
                  style={{
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
              </View>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 3 }}>
                  {isDoc ? 'Specialty in Hindi (विशेषज्ञता)' : 'Tagline in Hindi (टैगलाइन)'}
                </Text>
                <TextInput
                  value={extraHi}
                  onChangeText={setExtraHi}
                  placeholder={isDoc ? 'विशेषज्ञता' : 'टैगलाइन'}
                  style={{
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 3 }}>
                Address in Hindi (पता)
              </Text>
              <TextInput
                value={addressHi}
                onChangeText={setAddressHi}
                placeholder="पता हिंदी में"
                style={{
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  fontSize: 12.5,
                  color: THEME.ink,
                }}
              />
            </View>
          </View>
        )}

        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Enter verification notes (e.g. Verified CEA reg, called hospital desk, checked Google Maps pin)..."
          style={{
            backgroundColor: THEME.bg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            color: THEME.ink,
            minHeight: 68,
          }}
        />

        {req.status === 'PENDING' || req.status === 'UNDER_REVIEW' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 }}>
            {req.status === 'PENDING' && (
              <TouchableOpacity
                onPress={() => void handleMarkUnderReview()}
                disabled={busy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: THEME.amberBg,
                  borderWidth: 1,
                  borderColor: THEME.amberBorder,
                }}
              >
                <Clock size={15} color={THEME.amberText} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.amberText }}>
                  Mark Under Review
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => void handleReject()}
              disabled={busy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor: THEME.redBg,
                borderWidth: 1,
                borderColor: THEME.redBorder,
              }}
            >
              <XCircle size={15} color={THEME.redText} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.redText }}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleApproveAndDeploy()}
              disabled={busy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor: THEME.green,
              }}
            >
              <CheckCircle2 size={15} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {busy ? 'Deploying...' : 'Approve & Deploy Live'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>
            Reviewed by {req.reviewed_by_name || 'Staff'} • Status: {req.status}
          </Text>
        )}
      </View>

      {/* In-App Fullscreen Document / Photo Viewer Modal */}
      <Modal
        visible={Boolean(previewDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 820,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: THEME.greenDark,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                {previewDoc?.label || 'Document Preview'}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewDoc(null)}
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
            <View style={{ backgroundColor: '#111827', padding: 12, alignItems: 'center', justifyContent: 'center' }}>
              {previewDoc?.url ? (
                <Image
                  source={{ uri: previewDoc.url }}
                  resizeMode="contain"
                  style={{ width: '100%', height: 520 }}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
