import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LocationPickerInput } from '../../admin/LocationPickerInput';
import {
  ArrowRightLeft,
  Building2,
  Clock,
  Edit3,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Doctor, Hospital, HospitalBranch } from '@adityam/types';

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
};

interface PendingHospitalRequest {
  id: string;
  entity_name: string;
  entity_slug: string | null;
  action_type: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  payload: Record<string, any>;
  verification_docs: Record<string, any>;
}

interface PartnerHospitalOverviewProps {
  hospitalId: string | null;
  submittedByUserId?: string | null;
  onAddNewHospital: () => void;
  onEditHospital: (slug: string) => void;
  onEditPendingRequest?: (requestId: string) => void;
  onAddDoctor?: () => void;
  onViewDoctors?: () => void;
}

export function PartnerHospitalOverview({
  hospitalId,
  submittedByUserId,
  onAddNewHospital,
  onEditHospital,
  onEditPendingRequest,
  onAddDoctor,
  onViewDoctors,
}: PartnerHospitalOverviewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<(Hospital & { is_active?: boolean; is_24x7?: boolean }) | null>(null);
  const [branches, setBranches] = useState<(HospitalBranch & { is_active?: boolean })[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingHospitalRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Shift doctor modal state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftDocId, setShiftDocId] = useState('');
  const [shiftBranchId, setShiftBranchId] = useState('');
  const [shiftingDoc, setShiftingDoc] = useState(false);

  // Add branch modal state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchArea, setBranchArea] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchPincode, setBranchPincode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchLat, setBranchLat] = useState('');
  const [branchLng, setBranchLng] = useState('');
  const [branchTimings, setBranchTimings] = useState('8:00 AM - 9:00 PM');
  const [savingBranch, setSavingBranch] = useState(false);

  // Commercial / Offer revision modal state
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  const [reqDiscount, setReqDiscount] = useState('');
  const [reqCommission, setReqCommission] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [commercialError, setCommercialError] = useState<string | null>(null);
  const [savingCommercial, setSavingCommercial] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const pendingQuery = submittedByUserId
        ? supabase
            .from('partner_verification_requests')
            .select('id, entity_name, entity_slug, action_type, status, reviewer_notes, created_at, payload, verification_docs')
            .eq('entity_type', 'HOSPITAL')
            .eq('submitted_by_user_id', submittedByUserId)
            .in('status', ['PENDING', 'UNDER_REVIEW', 'REJECTED'])
            .order('created_at', { ascending: false })
            .limit(10)
        : hospitalId
          ? supabase
              .from('partner_verification_requests')
              .select('id, entity_name, entity_slug, action_type, status, reviewer_notes, created_at, payload, verification_docs')
              .eq('entity_type', 'HOSPITAL')
              .eq('hospital_id', hospitalId)
              .in('status', ['PENDING', 'UNDER_REVIEW', 'REJECTED'])
              .order('created_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] });

      if (!hospitalId) {
        const reqRes = await pendingQuery;
        setHospital(null);
        setBranches([]);
        setDoctors([]);
        setPendingRequests((reqRes.data || []) as PendingHospitalRequest[]);
        return;
      }

      const [hospRes, branchRes, docsRes, reqRes] = await Promise.all([
        supabase.from('hospitals').select('*').eq('id', hospitalId).maybeSingle(),
        supabase
          .from('hospital_branches')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('is_main_branch', { ascending: false }),
        supabase
          .from('doctors')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('name', { ascending: true }),
        pendingQuery,
      ]);
      if (hospRes.data) {
        setHospital(hospRes.data as any);
      }
      setBranches((branchRes.data || []) as any[]);
      setDoctors((docsRes.data || []) as Doctor[]);
      setPendingRequests((reqRes.data || []) as PendingHospitalRequest[]);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, submittedByUserId]);

  useEffect(() => {
    void loadData();
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`partner-hospital-sync-${hospitalId || submittedByUserId || 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_verification_requests' },
        () => {
          void loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hospitals' },
        () => {
          void loadData();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData, hospitalId, submittedByUserId]);

  const toggleHospitalField = async (field: 'is_active' | 'is_24x7', nextVal: boolean) => {
    if (!hospital) return;
    setBusyId(hospital.id);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('hospitals')
        .update({ [field]: nextVal })
        .eq('id', hospital.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setHospital((prev) => (prev ? { ...prev, [field]: nextVal } : prev));
    } finally {
      setBusyId(null);
    }
  };

  const toggleBranchActive = async (br: HospitalBranch & { is_active?: boolean }) => {
    setBusyId(br.id);
    const nextVal = br.is_active === false ? true : false;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('hospital_branches')
        .update({ is_active: nextVal })
        .eq('id', br.id);
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setBranches((prev) => prev.map((b) => (b.id === br.id ? { ...b, is_active: nextVal } : b)));
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateBranch = async () => {
    if (!hospital) return;
    if (!branchName.trim() || !branchArea.trim() || !branchPhone.trim()) {
      Alert.alert('Missing Info', 'Branch Name, Area / Locality, and Branch Phone Number are required.');
      return;
    }
    setSavingBranch(true);
    try {
      const supabase = getSupabaseClient();
      const brId = `br-${hospital.slug.slice(0, 12)}-${Date.now().toString(36)}`;
      const fullPayload: Record<string, any> = {
        id: brId,
        hospital_id: hospital.id,
        name: branchName.trim(),
        area: branchArea.trim(),
        address: branchAddress.trim() || hospital.address,
        city: branchCity.trim() || hospital.city || 'Jaipur',
        pincode: branchPincode.trim() || null,
        contact_number: branchPhone.trim(),
        virtual_exotel_number: hospital.virtual_exotel_number,
        latitude: parseFloat(branchLat) || hospital.latitude || null,
        longitude: parseFloat(branchLng) || hospital.longitude || null,
        timings: branchTimings.trim() || '8:00 AM - 9:00 PM',
        is_main_branch: false,
        is_active: true,
      };
      let { error } = await supabase.from('hospital_branches').insert(fullPayload);
      if (error && /column .* does not exist/i.test(error.message)) {
        const { pincode: _p, timings: _t, ...safePayload } = fullPayload;
        const retry = await supabase.from('hospital_branches').insert(safePayload);
        error = retry.error;
      }
      if (error) {
        Alert.alert('Could Not Add Branch', error.message);
        return;
      }
      setShowBranchModal(false);
      setBranchName('');
      setBranchArea('');
      setBranchCity('');
      setBranchPincode('');
      setBranchAddress('');
      setBranchPhone('');
      setBranchLat('');
      setBranchLng('');
      await loadData();
    } finally {
      setSavingBranch(false);
    }
  };

  const handleShiftDoctor = async () => {
    if (!shiftDocId || !shiftBranchId) {
      Alert.alert('Select Required', 'Please select both a doctor and a target branch.');
      return;
    }
    setShiftingDoc(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('doctors')
        .update({ branch_id: shiftBranchId })
        .eq('id', shiftDocId);
      if (error) {
        Alert.alert('Shift Failed', error.message);
        return;
      }
      setShowShiftModal(false);
      await loadData();
    } finally {
      setShiftingDoc(false);
    }
  };

  const handleSubmitCommercialRequest = async () => {
    if (!hospital) return;
    setCommercialError(null);
    const discNum = Math.max(0, Math.min(80, Number(reqDiscount) || 0));
    const commNum = Math.max(0, Math.min(50, Number(reqCommission) || 0));
    if (!reqNote.trim()) {
      setCommercialError('Please explain the offer or commission revision request.');
      return;
    }
    setSavingCommercial(true);
    try {
      const supabase = getSupabaseClient();
      const reqId = `vr-comm-${hospital.slug.slice(0, 12)}-${Date.now().toString(36)}`;
      const { error } = await supabase.from('partner_verification_requests').insert({
        id: reqId,
        entity_type: 'HOSPITAL',
        action_type: 'UPDATE',
        target_entity_id: hospital.id,
        hospital_id: hospital.id,
        submitted_by_user_id: submittedByUserId || null,
        submitted_by_name: hospital.name,
        entity_name: `${hospital.name} (Offer / Commission Revision)`,
        entity_slug: hospital.slug,
        payload: {
          fullInsert: {
            discount_percentage: discNum,
            commission_percentage: commNum,
            address: hospital.address,
            city: hospital.city,
            contact_number: hospital.contact_number,
          },
          baseInsert: {
            discount_percentage: discNum,
          },
        },
        verification_docs: {
          clinicalEstablishmentNo: (hospital as any).clinical_establishment_no || 'Verified Hospital',
          authorizedSignatory: `Commercial Revision: ${reqNote.trim()}`,
          licenseProofUrl: (hospital as any).license_proof_url || null,
        },
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'PENDING',
      });
      if (error) {
        setCommercialError(error.message);
        return;
      }
      setShowCommercialModal(false);
      setReqNote('');
      await loadData();
    } finally {
      setSavingCommercial(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.green} />
        <Text style={{ fontSize: 13, color: THEME.muted }}>Loading hospital & branches...</Text>
      </View>
    );
  }

  if (!hospitalId || !hospital) {
    if (pendingRequests.length > 0) {
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
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Hospital Onboarding Status
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted }}>
                Your submission is under Adityam Staff verification before going live.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onAddNewHospital}
              style={{
                backgroundColor: THEME.green,
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                Add Hospital / Branch
              </Text>
            </TouchableOpacity>
          </View>

          {pendingRequests.map((req) => {
            const full = req.payload?.fullInsert || {};
            const docs = req.verification_docs || {};
            const isRejected = req.status === 'REJECTED';
            const isUnderReview = req.status === 'UNDER_REVIEW';
            return (
              <View
                key={req.id}
                style={{
                  backgroundColor: THEME.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isRejected ? '#F5C2C2' : isUnderReview ? '#93C5FD' : '#F3DBA8',
                  padding: 18,
                  gap: 12,
                }}
              >
                {/* Prominent Staff Note Callout at TOP so partner sees it first */}
                {req.reviewer_notes ? (
                  <View
                    style={{
                      backgroundColor: isRejected ? '#FDF2F2' : isUnderReview ? '#EFF6FF' : THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: isRejected ? '#F5C2C2' : isUnderReview ? '#BFDBFE' : THEME.greenBorder,
                      borderRadius: 10,
                      paddingHorizontal: 13,
                      paddingVertical: 10,
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: isRejected ? '#991B1B' : isUnderReview ? '#1E40AF' : THEME.green,
                        textTransform: 'uppercase',
                      }}
                    >
                      Staff Update
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isRejected ? '#7F1D1D' : isUnderReview ? '#1E3A8A' : THEME.ink,
                      }}
                    >
                      {req.reviewer_notes}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 11,
                        backgroundColor: isRejected ? '#FDF2F2' : isUnderReview ? '#EFF6FF' : '#FEF7E6',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Clock size={20} color={isRejected ? '#991B1B' : isUnderReview ? '#1D4ED8' : '#92400E'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16.5, fontWeight: '800', color: THEME.ink }}>
                        {req.entity_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        /{req.entity_slug || 'pending-slug'} • Submitted {new Date(req.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: isRejected ? '#FDF2F2' : isUnderReview ? '#EFF6FF' : '#FEF7E6',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 99,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: isRejected ? '#991B1B' : isUnderReview ? '#1D4ED8' : '#92400E',
                      }}
                    >
                      {isRejected ? 'REJECTED' : isUnderReview ? 'UNDER REVIEW' : 'SUBMITTED FOR REVIEW'}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: THEME.bg,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Address: <Text style={{ fontWeight: '700', color: THEME.ink }}>{full.address || '—'}, {full.city || ''}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.muted }}>
                    Reg. No: <Text style={{ fontWeight: '700', color: THEME.ink }}>{docs.clinicalEstablishmentNo || '—'}</Text> •{' '}
                    Signatory: <Text style={{ fontWeight: '700', color: THEME.ink }}>{docs.authorizedSignatory || '—'}</Text>
                  </Text>
                </View>

                {isUnderReview ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
                      Currently under review by Adityam Staff — editing is locked until review completes.
                    </Text>
                  </View>
                ) : onEditPendingRequest ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={() => onEditPendingRequest(req.id)}
                      style={{
                        backgroundColor: THEME.greenSoft,
                        borderWidth: 1,
                        borderColor: THEME.greenBorder,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 9,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Edit3 size={14} color={THEME.green} />
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>
                        Edit Details & Resubmit
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      );
    }

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
        <Building2 size={38} color={THEME.green} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.ink }}>
          Register Your Hospital
        </Text>
        <Text style={{ fontSize: 13, color: THEME.muted, textAlign: 'center', maxWidth: 440 }}>
          Set up your hospital profile, facilities, labs, IPD services, timings, and main branch so patients can discover you and book OPD slots.
        </Text>
        <TouchableOpacity
          onPress={onAddNewHospital}
          style={{
            marginTop: 4,
            backgroundColor: THEME.green,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
            Add Hospital Profile
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 18 }}>
      {/* Pending Hospital Edit / Upgrade Requests Banner */}
      {pendingRequests.length > 0 && (
        <View style={{ gap: 10 }}>
          {pendingRequests.map((req) => {
            const isRejected = req.status === 'REJECTED';
            const isUnderReview = req.status === 'UNDER_REVIEW';
            return (
              <View
                key={req.id}
                style={{
                  backgroundColor: isRejected ? '#FDF2F2' : isUnderReview ? '#EFF6FF' : '#FEF7E6',
                  borderWidth: 1,
                  borderColor: isRejected ? '#F5C2C2' : isUnderReview ? '#BFDBFE' : '#F3DBA8',
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                      {req.payload?.branchData
                        ? `New Branch Request (${req.payload.branchData.name})`
                        : req.action_type === 'UPDATE'
                          ? 'Hospital Update Request'
                          : 'New Hospital Request'}{' '}
                      · {isRejected ? 'Rejected' : isUnderReview ? 'Under Review' : 'Submitted for Review'}
                    </Text>
                    {req.payload?.branchData ? (
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        {req.payload.branchData.area}, {req.payload.branchData.city} · {req.payload.branchData.contact_number} · {req.payload.branchData.timings || '8:00 AM - 9:00 PM'}
                      </Text>
                    ) : null}
                  </View>
                  {!isUnderReview ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (req.payload?.branchData) {
                          router.push(`/partner/opd/hospital/add-branch?requestId=${req.id}` as any);
                        } else if (onEditPendingRequest) {
                          onEditPendingRequest(req.id);
                        }
                      }}
                      style={{
                        backgroundColor: THEME.surface,
                        borderWidth: 1,
                        borderColor: THEME.greenBorder,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>
                        Edit &amp; Resubmit →
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {req.reviewer_notes ? (
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: isRejected ? '#991B1B' : THEME.ink }}>
                    Staff Update: {req.reviewer_notes}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Hospital Hero Card */}
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 14, flex: 1 }}>
            <Image
              source={{
                uri:
                  hospital.image_url ||
                  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
              }}
              style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: THEME.bg }}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.ink }}>{hospital.name}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                /{hospital.slug} • {hospital.discount_percentage}% App Discount (Platform Locked)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <MapPin size={13} color={THEME.muted} />
                <Text style={{ fontSize: 12, color: THEME.muted, flex: 1 }} numberOfLines={2}>
                  {hospital.address}, {hospital.city}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Phone size={13} color={THEME.muted} />
                <Text style={{ fontSize: 12, color: THEME.muted }}>{hospital.contact_number}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onEditHospital(hospital.slug)}
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Edit3 size={14} color={THEME.green} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>
              Edit Hospital
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verified Hospital Quick Actions */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            paddingTop: 12,
          }}
        >
          {onAddDoctor ? (
            <TouchableOpacity
              onPress={onAddDoctor}
              style={{
                backgroundColor: THEME.green,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                Add Doctor (Verification)
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => router.push('/partner/opd/hospital/add-branch' as any)}
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Building2 size={14} color={THEME.green} />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.green }}>
              Create Branch
            </Text>
          </TouchableOpacity>

          {doctors.length > 0 && branches.length > 1 ? (
            <TouchableOpacity
              onPress={() => {
                setShiftDocId(doctors[0]?.id || '');
                setShiftBranchId(branches[0]?.id || '');
                setShowShiftModal(true);
              }}
              style={{
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ArrowRightLeft size={14} color={THEME.ink} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                Shift Doctor Branch
              </Text>
            </TouchableOpacity>
          ) : null}

          {onViewDoctors ? (
            <TouchableOpacity
              onPress={onViewDoctors}
              style={{
                backgroundColor: THEME.bg,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Stethoscope size={14} color={THEME.ink} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                Branch-Wise Doctors ({doctors.length})
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => router.push(`/partner/opd/hospital/${hospital.slug || hospital.id}` as any)}
            style={{
              backgroundColor: THEME.greenDark,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Building2 size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
              View Hospital &amp; Payouts →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setReqDiscount(String(hospital.discount_percentage ?? 20));
              setReqCommission(String((hospital as any).commission_percentage ?? 10));
              setReqNote('');
              setCommercialError(null);
              setShowCommercialModal(true);
            }}
            style={{
              backgroundColor: '#FEF7E6',
              borderWidth: 1,
              borderColor: '#F3DBA8',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#92400E' }}>
              Request Offer / Commission Change
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick ON/OFF Switches */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: THEME.border,
            paddingTop: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 200,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: THEME.bg,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>Hospital Live Status</Text>
              <Text style={{ fontSize: 11, color: THEME.muted }}>
                {hospital.is_active !== false ? 'Visible to patients for OPD' : 'Paused / Unavailable'}
              </Text>
            </View>
            <Switch
              value={hospital.is_active !== false}
              disabled={busyId === hospital.id}
              onValueChange={(v) => void toggleHospitalField('is_active', v)}
              trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
              thumbColor={hospital.is_active !== false ? THEME.green : '#9CA3AF'}
            />
          </View>

          <View
            style={{
              flex: 1,
              minWidth: 200,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: THEME.bg,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>24x7 Open</Text>
              <Text style={{ fontSize: 11, color: THEME.muted }}>Round-the-clock hospital availability</Text>
            </View>
            <Switch
              value={Boolean(hospital.is_24x7)}
              disabled={busyId === hospital.id}
              onValueChange={(v) => void toggleHospitalField('is_24x7', v)}
              trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
              thumbColor={hospital.is_24x7 ? THEME.green : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Facilities Chips */}
        {hospital.facilities?.length ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.muted }}>
              Facilities & Departments
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {hospital.facilities.map((fac) => (
                <View
                  key={fac}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: THEME.greenSoft,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 99,
                  }}
                >
                  <ShieldCheck size={12} color={THEME.green} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.green }}>{fac}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* Branches Section */}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
              Hospital Branches ({branches.length})
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted }}>
              Manage branch locations & turn individual branches ON/OFF
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/partner/opd/hospital/add-branch' as any)}
            style={{
              backgroundColor: THEME.green,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Add Branch</Text>
          </TouchableOpacity>
        </View>

        {branches.length === 0 ? (
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>No branches configured yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {branches.map((br) => {
              const active = br.is_active !== false;
              const docCount = doctors.filter((d) => d.branch_id === br.id || (!d.branch_id && br.is_main_branch)).length;
              return (
                <View
                  key={br.id}
                  style={{
                    width: isDesktop ? '49%' : '100%',
                    backgroundColor: THEME.bg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    padding: 15,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>{br.name}</Text>
                        {br.is_main_branch ? (
                          <View
                            style={{
                              backgroundColor: THEME.greenSoft,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.green }}>MAIN</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.muted }}>
                        {br.area} • {br.city}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: THEME.muted }} numberOfLines={2}>
                        {br.address}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Switch
                        value={active}
                        disabled={busyId === br.id}
                        onValueChange={() => void toggleBranchActive(br)}
                        trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
                        thumbColor={active ? THEME.green : '#9CA3AF'}
                      />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: active ? THEME.green : THEME.muted }}>
                        {active ? 'OPEN' : 'PAUSED'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTopWidth: 1,
                      borderTopColor: THEME.border,
                      paddingTop: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Stethoscope size={13} color={THEME.green} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                        {docCount} {docCount === 1 ? 'Doctor' : 'Doctors'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => router.push(`/partner/opd/hospital/add-branch?editBranchId=${br.id}` as any)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: THEME.surface,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Edit3 size={12} color={THEME.ink} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push(`/partner/opd/hospital/${br.id}` as any)}
                        style={{
                          backgroundColor: THEME.greenDark,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          View Branch &amp; Payouts →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Add Branch Modal */}
      <Modal
        visible={showBranchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBranchModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '90%',
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 16.5, fontWeight: '800', color: THEME.ink }}>Add Hospital Branch</Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>Location, phone, timings &amp; exact GPS pin</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <TextInput
                value={branchName}
                onChangeText={setBranchName}
                placeholder="Branch Name (e.g. Mansarovar Wing) *"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13.5,
                  color: THEME.ink,
                }}
              />
              <TextInput
                value={branchPhone}
                onChangeText={setBranchPhone}
                placeholder="Branch Reception Phone Number (10 digits) *"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13.5,
                  color: THEME.ink,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={branchArea}
                  onChangeText={setBranchArea}
                  placeholder="Area / Locality *"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
                <TextInput
                  value={branchCity}
                  onChangeText={setBranchCity}
                  placeholder={`City (${hospital.city || 'Jaipur'})`}
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={branchPincode}
                  onChangeText={setBranchPincode}
                  placeholder="Pincode (e.g. 302020)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  style={{
                    flex: 1,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
                <TextInput
                  value={branchTimings}
                  onChangeText={setBranchTimings}
                  placeholder="Branch Hours (e.g. 8 AM - 9 PM)"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1.4,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>
              <TextInput
                value={branchAddress}
                onChangeText={setBranchAddress}
                placeholder="Full Street Address & Landmark"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13.5,
                  color: THEME.ink,
                }}
              />
              <LocationPickerInput
                address={branchAddress || branchArea}
                city={branchCity || hospital.city || 'Jaipur'}
                pincode={branchPincode}
                lat={branchLat}
                lng={branchLng}
                onChangeCoords={(la: string, ln: string) => {
                  setBranchLat(la);
                  setBranchLng(ln);
                }}
                onFillAddressMeta={(meta) => {
                  if (meta.city && !branchCity) setBranchCity(meta.city);
                  if (meta.pincode && !branchPincode) setBranchPincode(meta.pincode);
                  if (meta.address && !branchAddress) setBranchAddress(meta.address);
                }}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setShowBranchModal(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleCreateBranch()}
                disabled={savingBranch}
                style={{
                  backgroundColor: THEME.green,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 9,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {savingBranch ? 'Saving...' : 'Save Branch'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shift Doctor Branch Modal */}
      <Modal
        visible={showShiftModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShiftModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>Shift Doctor to Branch</Text>
              <TouchableOpacity onPress={() => setShowShiftModal(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>1. Select Doctor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {doctors.map((d) => {
                const active = shiftDocId === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => setShiftDocId(d.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: active ? THEME.greenSoft : THEME.bg,
                      borderWidth: 1,
                      borderColor: active ? THEME.green : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? THEME.green : THEME.ink }}>
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted, marginTop: 4 }}>
              2. Select Target Branch
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {branches.map((br) => {
                const active = shiftBranchId === br.id;
                return (
                  <TouchableOpacity
                    key={br.id}
                    onPress={() => setShiftBranchId(br.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: active ? THEME.greenSoft : THEME.bg,
                      borderWidth: 1,
                      borderColor: active ? THEME.green : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? THEME.green : THEME.ink }}>
                      {br.area || br.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => setShowShiftModal(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleShiftDoctor()}
                disabled={shiftingDoc}
                style={{
                  backgroundColor: THEME.green,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 9,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {shiftingDoc ? 'Shifting...' : 'Confirm Shift'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Offer / Commission Revision Modal */}
      <Modal
        visible={showCommercialModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCommercialModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Request Offer / Commission Revision
              </Text>
              <TouchableOpacity onPress={() => setShowCommercialModal(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: THEME.muted }}>
              Current App Discount: {hospital.discount_percentage ?? 20}% • Platform Commission:{' '}
              {(hospital as any).commission_percentage ?? 10}%
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Proposed Discount (%)
                </Text>
                <TextInput
                  value={reqDiscount}
                  onChangeText={(t) => setReqDiscount(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="numeric"
                  placeholder="e.g. 25"
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Proposed Commission (%)
                </Text>
                <TextInput
                  value={reqCommission}
                  onChangeText={(t) => setReqCommission(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="numeric"
                  placeholder="e.g. 8"
                  style={{
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 9,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 13.5,
                    color: THEME.ink,
                  }}
                />
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                Reason / Offer Details *
              </Text>
              <TextInput
                value={reqNote}
                onChangeText={setReqNote}
                multiline
                placeholder="e.g. Running 25% OPD health camp offer this month, or requesting lower commission on high volume"
                style={{
                  backgroundColor: THEME.bg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 9,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  fontSize: 13,
                  color: THEME.ink,
                  minHeight: 72,
                }}
              />
            </View>

            {commercialError ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>{commercialError}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setShowCommercialModal(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 9,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSubmitCommercialRequest()}
                disabled={savingCommercial}
                style={{
                  backgroundColor: THEME.green,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 9,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {savingCommercial ? 'Submitting...' : 'Send Request to Admin'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
