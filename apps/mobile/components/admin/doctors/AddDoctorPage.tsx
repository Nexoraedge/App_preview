import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, Upload, CheckCircle2, ChevronDown, ChevronUp, Clock, Stethoscope } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@adityam/supabase';
import type { Hospital, HospitalBranch } from '@adityam/types';
import { CustomChipSelector } from '../CustomChipSelector';
import { FormStepBar } from '../FormStepBar';
import { LocationPickerInput } from '../LocationPickerInput';
import { ImageCropAdjustModal } from '../ImageCropAdjustModal';
import {
  THEME,
  SoloDoctor,
  PRESET_DOCTOR_SERVICES,
  PRESET_SPECIALTIES,
  getDoctorSlug,
} from './doctorTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { SelectDropdown } from '../SelectDropdown';
import {
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../WeeklyScheduleEditor';

export interface DoctorPrefill {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  discount?: string;
  specialty?: string;
  clinicName?: string;
}

interface AddDoctorPageProps {
  editSlug?: string;
  prefill?: DoctorPrefill;
  partnerMode?: boolean;
  lockedHospitalId?: string | null;
  submittedBy?: { id?: string; fullName?: string; email?: string };
  isUploadingPhoto: boolean;
  onPickPhoto: (
    onPicked: (url: string) => void,
    options?: { aspect?: [number, number]; allowsEditing?: boolean }
  ) => Promise<void>;
  onCancel: () => void;
  onSaved: (slug: string) => Promise<void>;
}

export function AddDoctorPage({
  editSlug,
  prefill,
  partnerMode = false,
  lockedHospitalId = null,
  submittedBy,
  isUploadingPhoto,
  onPickPhoto,
  onCancel,
  onSaved,
}: AddDoctorPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Profile & Qualifications
  const [name, setName] = useState(prefill?.name || '');
  const [slug, setSlug] = useState(
    prefill?.name
      ? prefill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : ''
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(editSlug));
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialty, setSpecialty] = useState(prefill?.specialty || (partnerMode ? '' : 'General Medicine'));
  const [qualification, setQualification] = useState(partnerMode ? '' : 'MBBS, MD');
  const [regNumber, setRegNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState(partnerMode ? '' : '10');
  const [languages, setLanguages] = useState(partnerMode ? '' : 'English, Hindi');
  const [about, setAbout] = useState('');
  const [featured, setFeatured] = useState(false);

  // Fee & Commercials
  const [fee, setFee] = useState(partnerMode ? '' : '600');
  const [discountPct, setDiscountPct] = useState(prefill?.discount || (partnerMode ? '' : '15'));
  const [commissionPct, setCommissionPct] = useState('5');
  const [slotCapacity, setSlotCapacity] = useState(partnerMode ? '' : '6');
  const discountInitializedRef = useRef(false);
  const [uploadingTarget, setUploadingTarget] = useState<'avatar' | 'degree' | 'id' | null>(null);

  // Clinic & Contacts
  const [clinicName, setClinicName] = useState(prefill?.clinicName || '');
  const [phone1, setPhone1] = useState(prefill?.phone || '');
  const [phone2, setPhone2] = useState('');
  const [clinicAddress, setClinicAddress] = useState(prefill?.address || '');
  const [city, setCity] = useState(prefill?.city || (partnerMode ? '' : 'Jaipur'));
  const [pincode, setPincode] = useState(partnerMode ? '' : '302001');
  const [lat, setLat] = useState(partnerMode ? '' : '26.9124');
  const [lng, setLng] = useState(partnerMode ? '' : '75.7873');

  // Schedule & Services
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [services, setServices] = useState<string[]>(
    partnerMode ? [] : ['OPD Consultation', 'Follow-up Visit']
  );

  // Optional Hospital & Branch Linking
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [linkedHospitalId, setLinkedHospitalId] = useState<string>(lockedHospitalId || '');
  const [linkedBranchId, setLinkedBranchId] = useState<string>('');

  useEffect(() => {
    if (!lockedHospitalId) return;
    setLinkedHospitalId(lockedHospitalId);
    const matchedHospital = hospitals.find((h) => h.id === lockedHospitalId) as
      | (Hospital & { commission_percentage?: number })
      | undefined;
    if (matchedHospital) {
      if (matchedHospital.commission_percentage != null) {
        setCommissionPct(String(matchedHospital.commission_percentage));
      }
      if (!editSlug && !discountInitializedRef.current && matchedHospital.discount_percentage != null) {
        discountInitializedRef.current = true;
        setDiscountPct(String(matchedHospital.discount_percentage));
      }
    }
    const matching = branches.filter((b) => b.hospital_id === lockedHospitalId);
    if (matching.length > 0 && !linkedBranchId) {
      const br = matching[0];
      setLinkedBranchId(br.id);
      if (partnerMode) {
        setClinicName(br.name || '');
        setClinicAddress(br.address || '');
        setCity(br.city || '');
      }
    }
  }, [lockedHospitalId, hospitals, branches, linkedBranchId, partnerMode, editSlug]);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Partner Compliance & Verification Docs
  const [degreeProofUrl, setDegreeProofUrl] = useState('');
  const [idProofUrl, setIdProofUrl] = useState('');
  const [affiliationConfirmed, setAffiliationConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cropModalUri, setCropModalUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const draftKey = `partner_doctor_draft_${submittedBy?.id || 'anon'}_${editSlug || 'new'}`;

  useEffect(() => {
    if (!partnerMode || editSlug) return;
    let active = true;
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw || !active) return;
        const d = JSON.parse(raw);
        if (d.name) setName(d.name);
        if (d.slug) setSlug(d.slug);
        if (d.avatarUrl) setAvatarUrl(d.avatarUrl);
        if (d.specialty) setSpecialty(d.specialty);
        if (d.qualification) setQualification(d.qualification);
        if (d.regNumber) setRegNumber(d.regNumber);
        if (d.experienceYears) setExperienceYears(d.experienceYears);
        if (d.languages) setLanguages(d.languages);
        if (d.about) setAbout(d.about);
        if (d.fee) setFee(d.fee);
        if (d.discountPct) setDiscountPct(d.discountPct);
        if (d.slotCapacity) setSlotCapacity(d.slotCapacity);
        if (d.clinicName) setClinicName(d.clinicName);
        if (d.phone1) setPhone1(d.phone1);
        if (d.phone2) setPhone2(d.phone2);
        if (d.clinicAddress) setClinicAddress(d.clinicAddress);
        if (d.city) setCity(d.city);
        if (d.pincode) setPincode(d.pincode);
        if (d.lat) setLat(d.lat);
        if (d.lng) setLng(d.lng);
        if (d.linkedBranchId) setLinkedBranchId(d.linkedBranchId);
        if (Array.isArray(d.services)) setServices(d.services);
        if (d.weeklySchedule) setWeeklySchedule(d.weeklySchedule);
        if (d.degreeProofUrl) setDegreeProofUrl(d.degreeProofUrl);
        if (d.idProofUrl) setIdProofUrl(d.idProofUrl);
        if (typeof d.currentStep === 'number') setCurrentStep(d.currentStep);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [partnerMode, editSlug, draftKey]);

  const saveDraft = async (nextStep: number) => {
    if (!partnerMode || editSlug) return;
    try {
      await AsyncStorage.setItem(
        draftKey,
        JSON.stringify({
          name,
          slug,
          avatarUrl,
          specialty,
          qualification,
          regNumber,
          experienceYears,
          languages,
          about,
          fee,
          discountPct,
          slotCapacity,
          clinicName,
          phone1,
          phone2,
          clinicAddress,
          city,
          pincode,
          lat,
          lng,
          linkedBranchId,
          services,
          weeklySchedule,
          degreeProofUrl,
          idProofUrl,
          currentStep: nextStep,
        })
      );
    } catch {
      // noop
    }
  };

  const handleNextStep = async () => {
    setFormError(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setFormError('Doctor Full Name (*) is required.');
        return;
      }
      if (!specialty.trim()) {
        setFormError('Specialty (*) is required.');
        return;
      }
      if (!qualification.trim()) {
        setFormError('Qualifications / Degrees (*) are required.');
        return;
      }
      if (!regNumber.trim()) {
        setFormError('Medical Reg. No. (*) is required.');
        return;
      }
    }
    if (currentStep === 2 && !fee.trim()) {
      setFormError('OPD Consultation Fee (₹ *) is required.');
      return;
    }
    const next = Math.min(4, currentStep + 1);
    await saveDraft(next);
    setCurrentStep(next);
  };

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const [hospRes, branchRes, docRes, vrRes] = await Promise.all([
          supabase.from('hospitals').select('*').order('name', { ascending: true }),
          supabase.from('hospital_branches').select('*').order('is_main_branch', { ascending: false }),
          editSlug ? supabase.from('doctors').select('*') : Promise.resolve({ data: null }),
          editSlug
            ? supabase
                .from('partner_verification_requests')
                .select('verification_docs, payload, entity_slug, target_entity_id')
                .eq('entity_type', 'DOCTOR')
                .order('created_at', { ascending: false })
                .limit(20)
            : Promise.resolve({ data: null }),
        ]);

        if (hospRes.data && active) setHospitals(hospRes.data as Hospital[]);
        if (branchRes.data && active) {
          const allBranches = branchRes.data as HospitalBranch[];
          setBranches(allBranches);
          if (!editSlug && lockedHospitalId) {
            setLinkedHospitalId(lockedHospitalId);
            const firstBr = allBranches.find((b) => b.hospital_id === lockedHospitalId);
            if (firstBr) setLinkedBranchId(firstBr.id);
          }
        }

        if (editSlug && docRes.data && active) {
          const allDocs = docRes.data as SoloDoctor[];
          const found = allDocs.find(
            (d) => getDoctorSlug(d) === editSlug || d.id === editSlug
          );
          if (found) {
            setEditingDocId(found.id);
            setName(found.name || '');
            setSlug(getDoctorSlug(found));
            setAvatarUrl(found.avatar_url || '');
            setSpecialty(found.specialty || 'General Medicine');
            setQualification(found.qualification || 'MBBS, MD');
            setRegNumber(found.registration_number || '');
            setExperienceYears(String(found.experience_years ?? 10));
            setLanguages((found.languages || ['English', 'Hindi']).join(', '));
            setAbout(found.about || '');
            setFeatured(Boolean(found.featured));
            setFee(String(found.consultation_fee ?? 600));
            const derivedDisc =
              found.discount_percentage ??
              (found.consultation_fee > 0 && found.discounted_fee > 0
                ? Math.round(
                    ((found.consultation_fee - found.discounted_fee) / found.consultation_fee) * 100
                  )
                : 15);
            setDiscountPct(String(Math.max(0, derivedDisc)));
            setCommissionPct(String(found.commission_percentage ?? 10));
            setClinicName(found.clinic_name || '');
            setPhone1(found.phone || '');
            setPhone2(found.secondary_phone || '');
            setClinicAddress(found.clinic_address || '');
            setCity(found.city || 'Jaipur');
            setPincode(found.pincode || '302001');
            if (found.latitude) setLat(String(found.latitude));
            if (found.longitude) setLng(String(found.longitude));
            if (found.weekly_schedule) setWeeklySchedule(found.weekly_schedule);
            if (found.services_offered?.length) setServices(found.services_offered);
            setLinkedHospitalId(found.hospital_id || '');
            setLinkedBranchId(found.branch_id || '');
            if ((found as any).slot_capacity) setSlotCapacity(String((found as any).slot_capacity));

            const matchedVr = ((vrRes.data || []) as any[]).find(
              (r) => r.entity_slug === editSlug || r.target_entity_id === found.id
            );
            const vDocs = matchedVr?.verification_docs || {};
            const resolvedReg = found.registration_number || vDocs.registrationNumber || '';
            const resolvedDegree = (found as any).degree_proof_url || vDocs.degreeProofUrl || '';
            const resolvedIdProof = (found as any).id_proof_url || vDocs.idProofUrl || '';

            if (resolvedReg) setRegNumber(resolvedReg);
            if (resolvedDegree) setDegreeProofUrl(resolvedDegree);
            if (resolvedIdProof) setIdProofUrl(resolvedIdProof);
            if (partnerMode) {
              setAffiliationConfirmed(true);
              setTermsAccepted(true);
            }
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, [editSlug]);

  const hospitalBranches = branches.filter((b) => b.hospital_id === linkedHospitalId);

  const toggleService = (svc: string) => {
    setServices(services.includes(svc) ? services.filter((s) => s !== svc) : [...services, svc]);
  };

  const handleSave = async () => {
    if (!name.trim() || !specialty.trim()) {
      Alert.alert('Missing Info', 'Please enter Doctor Name and Specialty.');
      return;
    }

    const cleanSlug = (
      slug.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    ).toLowerCase();

    const feeNum = Number(fee) || 600;
    const discNum = Math.max(0, Math.min(80, Number(discountPct) || 0));
    const discountedFee = Math.max(50, Math.round(feeNum * (1 - discNum / 100)));

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const baseData: Record<string, unknown> = {
        hospital_id: linkedHospitalId || null,
        branch_id: linkedHospitalId ? linkedBranchId || hospitalBranches[0]?.id || null : null,
        name: name.trim(),
        specialty: specialty.trim(),
        qualification: qualification.trim() || 'MBBS, MD',
        experience_years: Number(experienceYears) || 10,
        consultation_fee: feeNum,
        discounted_fee: discountedFee,
        avatar_url: avatarUrl.trim() || null,
        languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        opd_timing: summarizeWeeklySchedule(weeklySchedule),
        featured,
        is_active: true,
        ...(!editingDocId ? { total_reviews: 0 } : {}),
      };

      const fullData: Record<string, unknown> = {
        ...baseData,
        is_solo: partnerMode ? false : true,
        slug: cleanSlug,
        registration_number: regNumber.trim() || null,
        clinic_name: clinicName.trim() || `${name.trim()} Clinic`,
        clinic_address: clinicAddress.trim() || null,
        city: city.trim() || 'Jaipur',
        pincode: pincode.trim() || null,
        phone: phone1.trim() || null,
        secondary_phone: phone2.trim() || null,
        discount_percentage: discNum,
        commission_percentage: Number(commissionPct) || 5,
        about: about.trim() || null,
        services_offered: services,
        latitude: parseFloat(lat) || null,
        longitude: parseFloat(lng) || null,
        weekly_schedule: {
          ...weeklySchedule,
          _slot_capacity: Math.max(1, Math.min(20, Number(slotCapacity) || 6)),
        },
        slot_capacity: Math.max(1, Math.min(20, Number(slotCapacity) || 6)),
        ...(partnerMode
          ? {
              degree_proof_url: degreeProofUrl.trim() || null,
              id_proof_url: idProofUrl.trim() || null,
              verification_status: 'VERIFIED',
            }
          : {}),
      };

      if (partnerMode) {
        setFormError(null);
        if (!regNumber.trim()) {
          setFormError('Medical Registration Number (NMC/SMC *) is required.');
          return;
        }
        if (!qualification.trim()) {
          setFormError('Qualifications / Degrees (*) are required.');
          return;
        }
        if (!editingDocId && !degreeProofUrl.trim()) {
          setFormError('Degree / Medical Council Certificate (*) is required.');
          return;
        }
        if (!affiliationConfirmed) {
          setFormError('Please confirm this doctor actively practices at your hospital & branch.');
          return;
        }
        if (!termsAccepted) {
          setFormError('You must accept the Partner Terms & Conditions before submitting.');
          return;
        }

        const reqId = `vr-doc-${cleanSlug.slice(0, 12)}-${Date.now().toString(36)}`;
        const { error: vrError } = await supabase.from('partner_verification_requests').insert({
          id: reqId,
          entity_type: 'DOCTOR',
          action_type: editingDocId ? 'UPDATE' : 'CREATE',
          target_entity_id: editingDocId || null,
          hospital_id: linkedHospitalId || lockedHospitalId || null,
          submitted_by_user_id: submittedBy?.id || null,
          submitted_by_name: submittedBy?.fullName || null,
          submitted_by_email: submittedBy?.email || null,
          entity_name: name.trim(),
          entity_slug: cleanSlug,
          payload: {
            fullData,
            baseData,
          },
          verification_docs: {
            registrationNumber: regNumber.trim(),
            qualification: qualification.trim(),
            degreeProofUrl: degreeProofUrl.trim(),
            idProofUrl: idProofUrl.trim() || null,
            affiliationConfirmed: true,
            hospitalId: linkedHospitalId || lockedHospitalId || null,
            branchId: linkedBranchId || null,
          },
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          status: 'PENDING',
        });

        if (vrError) {
          Alert.alert('Submission Failed', vrError.message);
          return;
        }

        await AsyncStorage.removeItem(draftKey).catch(() => {});
        Alert.alert(
          'Submitted for Verification',
          'Doctor details and degree proof have been sent to Adityam Admin Staff. Once verified, the doctor will go live automatically.'
        );
        await onSaved(cleanSlug);
        return;
      }

      if (editingDocId) {
        const { error } = await supabase.from('doctors').update(fullData).eq('id', editingDocId);
        if (error && isMissingColumnError(error)) {
          const { error: fb } = await supabase.from('doctors').update(baseData).eq('id', editingDocId);
          if (fb) {
            Alert.alert('Save Failed', fb.message);
            return;
          }
          Alert.alert(
            'Saved Core Fields',
            'Run migration 20261114000002_solo_doctors_support.sql in Supabase to store clinic address, reg no, and weekly schedule.'
          );
        } else if (error) {
          Alert.alert('Save Failed', error.message);
          return;
        }
      } else {
        const docId = `doc-solo-${cleanSlug.slice(0, 14)}-${Date.now().toString(36)}`;
        const { error } = await supabase.from('doctors').insert({ id: docId, ...fullData });
        if (error) {
          Alert.alert(
            'Could Not Add Solo Doctor',
            error.message.includes('null value in column "hospital_id"') || isMissingColumnError(error)
              ? 'Please run migration 20261114000002_solo_doctors_support.sql in Supabase first so Solo Doctors can be saved without a required hospital.'
              : error.message
          );
          return;
        }
      }

      await onSaved(cleanSlug);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.greenPrimary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.muted }}>
          Loading doctor details...
        </Text>
      </View>
    );
  }

  const inputStyle = {
    backgroundColor: THEME.creamBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: THEME.ink,
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onCancel}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: THEME.creamSoft,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={16} color={THEME.ink} />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.ink }}>
            {editingDocId ? `Edit Doctor · ${name}` : partnerMode ? 'Add Hospital Doctor' : 'Add Solo Doctor'}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
            {partnerMode
              ? 'Step-by-step doctor verification — your progress is saved automatically'
              : 'Qualifications, clinic location, OPD timings & optional hospital linking'}
          </Text>
        </View>
      </View>

      {partnerMode && (
        <FormStepBar
          currentStep={currentStep}
          onSelectStep={(s) => setCurrentStep(s)}
          steps={[
            { id: 1, title: 'Doctor Profile', subtitle: 'Degrees & NMC reg' },
            { id: 2, title: 'Fee & Branch', subtitle: 'OPD fee, discount & cabin' },
            { id: 3, title: 'Timings & Services', subtitle: 'Sitting hours & tags' },
            { id: 4, title: 'Degree Proof & T&C', subtitle: 'Verify & submit' },
          ]}
        />
      )}

      {/* Section 1 & 2 */}
      {(!partnerMode || currentStep === 1 || currentStep === 2) && (
      <View style={{ flexDirection: isDesktop && !partnerMode ? 'row' : 'column', gap: 18 }}>
        {/* Card 1: Profile & Qualifications */}
        {(!partnerMode || currentStep === 1) && (
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            1. Doctor Profile & Qualifications
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
              Doctor Profile Photo (Recommended: 3:4 Portrait · 600×800px)
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 12,
                padding: 10,
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  resizeMode="cover"
                  style={{
                    width: 54,
                    height: 72,
                    borderRadius: 10,
                    backgroundColor: THEME.creamSoft,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 54,
                    height: 72,
                    borderRadius: 10,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Stethoscope size={20} color={THEME.muted} />
                </View>
              )}

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: avatarUrl ? THEME.greenPrimary : THEME.ink }}>
                  {avatarUrl ? 'Portrait Photo Uploaded ✓' : 'No Profile Photo Selected'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      setUploadingTarget('avatar');
                      try {
                        await onPickPhoto(
                          (url) => {
                            setAvatarUrl(url);
                            setCropModalUri(url);
                          },
                          { aspect: [3, 4], allowsEditing: true }
                        );
                      } finally {
                        setUploadingTarget(null);
                      }
                    }}
                    disabled={uploadingTarget !== null || isUploadingPhoto}
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 9,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {uploadingTarget === 'avatar' ? (
                      <ActivityIndicator size="small" color={THEME.greenPrimary} />
                    ) : (
                      <Upload size={13} color={THEME.greenPrimary} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                      {uploadingTarget === 'avatar' ? 'Uploading...' : avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>

                  {avatarUrl ? (
                    <>
                      <TouchableOpacity
                        onPress={() => setCropModalUri(avatarUrl)}
                        style={{
                          paddingHorizontal: 11,
                          paddingVertical: 8,
                          borderRadius: 9,
                          backgroundColor: THEME.surface,
                          borderWidth: 1,
                          borderColor: THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                          Adjust / Crop
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setAvatarUrl('')}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 9,
                          backgroundColor: '#FDF2F2',
                          borderWidth: 1,
                          borderColor: '#F5C2C2',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B' }}>Remove</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Doctor Full Name <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!editingDocId && (partnerMode || !slugTouched)) {
                    setSlug(txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                placeholder="e.g. Dr. Arvind Sharma"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                {partnerMode ? 'URL Slug (Auto-generated)' : 'URL Slug'}
              </Text>
              <TextInput
                value={slug}
                editable={!partnerMode}
                onChangeText={
                  partnerMode
                    ? undefined
                    : (txt) => {
                        setSlugTouched(true);
                        setSlug(txt.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-/, ''));
                      }
                }
                placeholder="dr-arvind-sharma"
                style={[inputStyle, partnerMode && { opacity: 0.7, backgroundColor: '#F3EFE4' }]}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
              Specialty <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
            </Text>
            <TextInput value={specialty} onChangeText={setSpecialty} style={inputStyle} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_SPECIALTIES.slice(0, 7).map((sp) => (
                <TouchableOpacity
                  key={sp}
                  onPress={() => setSpecialty(sp)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: specialty === sp ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: specialty === sp ? THEME.greenPrimary : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: specialty === sp ? THEME.greenPrimary : THEME.muted }}>
                    {sp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.3 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Qualifications / Degrees <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={qualification}
                onChangeText={setQualification}
                placeholder="MBBS, MD, DM (Cardiology)"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Medical Reg. No. {partnerMode ? <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text> : null}
              </Text>
              <TextInput
                value={regNumber}
                onChangeText={setRegNumber}
                placeholder="RMC-45210"
                style={inputStyle}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 0.7 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Exp (yrs)
              </Text>
              <TextInput value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1.3 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Languages
              </Text>
              <TextInput value={languages} onChangeText={setLanguages} style={inputStyle} />
            </View>
          </View>

          {!partnerMode && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 110 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                OPD Fee (₹) *
              </Text>
              <TextInput value={fee} onChangeText={setFee} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1, minWidth: 110 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Discount (%)
              </Text>
              <TextInput
                value={discountPct}
                onChangeText={setDiscountPct}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1, minWidth: 110 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Clients / Hour Slot
              </Text>
              <TextInput
                value={slotCapacity}
                onChangeText={setSlotCapacity}
                keyboardType="numeric"
                placeholder="5-8"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1, minWidth: 110 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Commission (%)
              </Text>
              <TextInput
                value={commissionPct}
                onChangeText={setCommissionPct}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>
          </View>
          )}

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Short Bio / About
            </Text>
            <TextInput
              value={about}
              onChangeText={setAbout}
              multiline
              placeholder="Senior consultant specializing in..."
              style={inputStyle}
            />
          </View>

          {!partnerMode && (
          <TouchableOpacity
            onPress={() => setFeatured(!featured)}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: featured ? THEME.greenSoft : THEME.creamBg,
              borderWidth: 1,
              borderColor: featured ? THEME.greenPrimary : THEME.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: featured ? THEME.greenPrimary : THEME.muted }}>
              Featured Doctor: {featured ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
          )}
        </View>
        )}

        {/* Card 2: Clinic, Contacts & Fee/Discount */}
        {(!partnerMode || currentStep === 2) && (
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            {partnerMode ? '2. OPD Fee, Discount, Slot Capacity & Contacts' : '2. Clinic Location, Contacts & OPD Hours'}
          </Text>

          {partnerMode && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    OPD Fee (₹) <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
                  </Text>
                  <TextInput
                    value={fee}
                    onChangeText={(t) => setFee(t.replace(/\D/g, '').slice(0, 5))}
                    placeholder="e.g. 600"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Doctor Discount (%) <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
                  </Text>
                  <TextInput
                    value={discountPct}
                    onChangeText={(t) => setDiscountPct(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="e.g. 15"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Platform Commission (%)
                  </Text>
                  <TextInput
                    value={commissionPct}
                    editable={false}
                    style={[inputStyle, { opacity: 0.7, backgroundColor: '#F3EFE4' }]}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Clients / Hour Slot
                  </Text>
                  <TextInput
                    value={slotCapacity}
                    onChangeText={(t) => setSlotCapacity(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="5-8"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
              </View>
              {Number(fee) > 0 && (() => {
                const gross = Number(fee) || 0;
                const dPct = Math.max(0, Math.min(80, Number(discountPct) || 0));
                const cPct = Math.max(0, Math.min(50, Number(commissionPct) || 0));
                const patientPays = Math.max(50, Math.round(gross * (1 - dPct / 100)));
                const platformFee = Math.round(patientPays * (cPct / 100));
                const netPayout = Math.max(0, patientPays - platformFee);
                return (
                  <View
                    style={{
                      backgroundColor: THEME.greenSoft,
                      borderWidth: 1,
                      borderColor: THEME.greenBorder,
                      borderRadius: 9,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenPrimary }}>
                      Patient Pays ₹{patientPays} ({dPct}% off) · Platform Fee ({cPct}%): ₹{platformFee} · Your Net Payout: ₹{netPayout}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {!partnerMode && (
            <View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Clinic Name
              </Text>
              <TextInput
                value={clinicName}
                onChangeText={setClinicName}
                placeholder="e.g. Sharma Heart & Care Clinic"
                placeholderTextColor="#9CA3AF"
                style={inputStyle}
              />
            </View>
          )}

          {partnerMode ? (
            <View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Doctor / Cabin Desk Phone (10 digits)
              </Text>
              <TextInput
                value={phone1}
                onChangeText={(t) => setPhone1(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="e.g. 9829012345"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                style={inputStyle}
              />
            </View>
          ) : (
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Phone 1 (Direct / Desk, 10 digits)
                </Text>
                <TextInput
                  value={phone1}
                  onChangeText={(t) => setPhone1(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9829012345"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Phone 2 (Alternate, 10 digits)
                </Text>
                <TextInput
                  value={phone2}
                  onChangeText={(t) => setPhone2(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9829054321"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={inputStyle}
                />
              </View>
            </View>
          )}

          {!partnerMode && (
            <>
              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Clinic Address
                </Text>
                <TextInput
                  value={clinicAddress}
                  onChangeText={setClinicAddress}
                  placeholder="Plot 14, Vaishali Nagar, Jaipur"
                  style={inputStyle}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>City</Text>
                  <TextInput value={city} onChangeText={setCity} style={inputStyle} />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>Pincode</Text>
                  <TextInput value={pincode} onChangeText={setPincode} keyboardType="numeric" style={inputStyle} />
                </View>
              </View>

              <LocationPickerInput
                address={clinicAddress}
                city={city}
                pincode={pincode}
                lat={lat}
                lng={lng}
                onChangeCoords={(nextLat, nextLng) => {
                  setLat(nextLat);
                  setLng(nextLng);
                }}
                onFillAddressMeta={(meta) => {
                  if (meta.city && !city.trim()) setCity(meta.city);
                  if (meta.pincode && !pincode.trim()) setPincode(meta.pincode);
                  if (meta.address && !clinicAddress.trim()) setClinicAddress(meta.address);
                }}
              />
            </>
          )}
        </View>
        )}
      </View>
      )}

      {/* Collapsible Full-Width OPD Schedule Card */}
      {(!partnerMode || currentStep === 3) && (
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowScheduleEditor((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: THEME.greenSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} color={THEME.greenPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                Clinic OPD Timings (Day-by-Day)
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                {summarizeWeeklySchedule(weeklySchedule)}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: THEME.creamBg,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
              {showScheduleEditor ? 'Hide Schedule' : 'Customize 7-Day Hours'}
            </Text>
            {showScheduleEditor ? (
              <ChevronUp size={15} color={THEME.ink} />
            ) : (
              <ChevronDown size={15} color={THEME.ink} />
            )}
          </View>
        </TouchableOpacity>

        {showScheduleEditor && (
          <WeeklyScheduleEditor
            value={weeklySchedule}
            onChange={setWeeklySchedule}
            title="Weekly OPD Shifts"
          />
        )}
      </View>
      )}

      {/* Section 3: Services & Hospital Linking */}
      {(!partnerMode || currentStep === 3) && (
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 20,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
          3. Services & Optional Hospital Linking
        </Text>

        <CustomChipSelector
          title="Services Offered"
          subtitle="Select consultation services or add unlimited custom services below"
          presets={PRESET_DOCTOR_SERVICES}
          selected={services}
          onChange={setServices}
          placeholder="Add custom service (e.g. ECG Review, Echo, Arthroscopy)..."
        />

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
          {!partnerMode && (
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="Also Link to a Partner Hospital (Optional)"
                placeholder="Solo Clinic Only (No Hospital)"
                value={linkedHospitalId}
                options={[
                  { value: '', label: 'Solo Clinic Only (No Hospital)' },
                  ...hospitals.map((h) => ({
                    value: h.id,
                    label: h.name,
                    subtitle: h.address || undefined,
                  })),
                ]}
                onChange={(hospId) => {
                  setLinkedHospitalId(hospId);
                  if (!hospId) {
                    setLinkedBranchId('');
                  } else {
                    const firstBr = branches.find((b) => b.hospital_id === hospId);
                    setLinkedBranchId(firstBr?.id || '');
                  }
                }}
              />
            </View>
          )}

          {Boolean(linkedHospitalId) && hospitalBranches.length > 0 && (
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="Hospital Branch"
                placeholder="Select Hospital Branch..."
                value={linkedBranchId}
                options={hospitalBranches.map((br) => ({
                  value: br.id,
                  label: br.area || br.name,
                  subtitle: br.address || undefined,
                }))}
                onChange={(brId) => setLinkedBranchId(brId)}
              />
            </View>
          )}
        </View>
      </View>
      )}

      {partnerMode && currentStep === 4 && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            4. Medical Degree, Hospital Affiliation & Verification
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted }}>
            Changes are not deployed live immediately. Adityam Staff will verify the doctor&apos;s degree, registration number, and hospital presence before publishing.
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
              Degree / Medical Council Certificate <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: degreeProofUrl ? THEME.greenBorder : THEME.border,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                {degreeProofUrl ? (
                  <Image
                    source={{ uri: degreeProofUrl }}
                    resizeMode="contain"
                    style={{ width: 48, height: 36, borderRadius: 6, backgroundColor: THEME.surface }}
                  />
                ) : null}
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: degreeProofUrl ? THEME.greenPrimary : THEME.muted }}>
                  {degreeProofUrl ? 'Certificate Uploaded ✓' : 'Upload degree / medical council certificate'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  setUploadingTarget('degree');
                  try {
                    await onPickPhoto(setDegreeProofUrl);
                  } finally {
                    setUploadingTarget(null);
                  }
                }}
                disabled={uploadingTarget !== null || isUploadingPhoto}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {uploadingTarget === 'degree' ? (
                  <ActivityIndicator size="small" color={THEME.greenPrimary} />
                ) : (
                  <Upload size={13} color={THEME.greenPrimary} />
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                  {uploadingTarget === 'degree' ? 'Uploading...' : degreeProofUrl ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
              Government ID / Hospital Affiliation Letter (Optional)
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: idProofUrl ? THEME.greenBorder : THEME.border,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                {idProofUrl ? (
                  <Image
                    source={{ uri: idProofUrl }}
                    resizeMode="contain"
                    style={{ width: 48, height: 36, borderRadius: 6, backgroundColor: THEME.surface }}
                  />
                ) : null}
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: idProofUrl ? THEME.greenPrimary : THEME.muted }}>
                  {idProofUrl ? 'ID / Affiliation Uploaded ✓' : 'Optional ID or hospital appointment letter'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  setUploadingTarget('id');
                  try {
                    await onPickPhoto(setIdProofUrl);
                  } finally {
                    setUploadingTarget(null);
                  }
                }}
                disabled={uploadingTarget !== null || isUploadingPhoto}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {uploadingTarget === 'id' ? (
                  <ActivityIndicator size="small" color={THEME.ink} />
                ) : (
                  <Upload size={13} color={THEME.ink} />
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                  {uploadingTarget === 'id' ? 'Uploading...' : idProofUrl ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setAffiliationConfirmed((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              backgroundColor: affiliationConfirmed ? THEME.greenSoft : THEME.creamBg,
              borderWidth: 1,
              borderColor: affiliationConfirmed ? THEME.greenBorder : THEME.border,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: affiliationConfirmed ? THEME.greenPrimary : THEME.muted,
                backgroundColor: affiliationConfirmed ? THEME.greenPrimary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {affiliationConfirmed ? <CheckCircle2 size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
              I confirm this doctor actively sits at our hospital & branch during the listed hours.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTermsAccepted((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              backgroundColor: termsAccepted ? THEME.greenSoft : THEME.creamBg,
              borderWidth: 1,
              borderColor: termsAccepted ? THEME.greenBorder : THEME.border,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: termsAccepted ? THEME.greenPrimary : THEME.muted,
                backgroundColor: termsAccepted ? THEME.greenPrimary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {termsAccepted ? <CheckCircle2 size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
              I accept the Adityam Niramayaa Partner Terms & Conditions and certify that all medical documents are authentic.
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {formError ? (
        <View
          style={{
            backgroundColor: '#FDF2F2',
            borderWidth: 1,
            borderColor: '#F5C2C2',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
            {formError}
          </Text>
        </View>
      ) : null}

      {/* Bottom Save Bar */}
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={partnerMode && currentStep > 1 ? () => setCurrentStep((s) => Math.max(1, s - 1)) : onCancel}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 13,
            borderRadius: 10,
            backgroundColor: THEME.surface,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>
            {partnerMode && currentStep > 1 ? '← Previous Step' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        {partnerMode && currentStep < 4 ? (
          <TouchableOpacity
            onPress={() => void handleNextStep()}
            style={{
              paddingHorizontal: 22,
              paddingVertical: 13,
              borderRadius: 10,
              backgroundColor: THEME.greenPrimary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
              Save & Next →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={{
              paddingHorizontal: 22,
              paddingVertical: 13,
              borderRadius: 10,
              backgroundColor: THEME.greenPrimary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
              {isSaving
                ? 'Submitting...'
                : partnerMode
                  ? editingDocId
                    ? 'Update & Send for Verification'
                    : 'Submit for Admin Verification'
                  : editingDocId
                    ? 'Save Doctor Changes'
                    : 'Save Solo Doctor'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ImageCropAdjustModal
        visible={Boolean(cropModalUri)}
        imageUri={cropModalUri || ''}
        aspect={[3, 4]}
        filePrefix="doctor_thumb"
        title="Adjust Doctor Portrait (3:4)"
        onClose={() => setCropModalUri(null)}
        onSaved={(croppedUrl) => setAvatarUrl(croppedUrl)}
      />
    </View>
  );
}
