import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Upload, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@adityam/supabase';
import { SelectDropdown } from '../SelectDropdown';
import { CustomChipSelector } from '../CustomChipSelector';
import { FormStepBar } from '../FormStepBar';
import { LocationPickerInput } from '../LocationPickerInput';
import { ImageCropAdjustModal } from '../ImageCropAdjustModal';
import { INDIA_STATES, INDIA_STATE_CITIES } from '../../../src/constants/indiaLocations';

const sanitizeDigits = (txt: string, maxLen: number) => txt.replace(/\D/g, '').slice(0, maxLen);
import {
  THEME,
  ExtendedHospital,
  ExtendedBranch,
  ExtendedDoctor,
  PRESET_FACILITIES,
  PRESET_LABS,
  PRESET_IPD_SERVICES,
  PRESET_INSURANCE_PARTNERS,
  isMissingColumnError,
} from './hospitalTheme';
import {
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../WeeklyScheduleEditor';

interface DraftDoctor {
  localId: string;
  existingId?: string;
  branchId?: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: string;
  fee: string;
  timing: string;
}

export interface HospitalPrefill {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  discount?: string;
  specialty?: string;
}

interface AddHospitalPageProps {
  editSlug?: string;
  requestId?: string;
  prefill?: HospitalPrefill;
  partnerMode?: boolean;
  submittedBy?: { id?: string; fullName?: string; email?: string };
  isUploadingPhoto: boolean;
  onPickPhoto: (
    onPicked: (url: string) => void,
    options?: { aspect?: [number, number]; allowsEditing?: boolean }
  ) => Promise<void>;
  onCancel: () => void;
  onCreated: (slug: string) => Promise<void>;
  onSavedHospitalId?: (hospitalId: string) => Promise<void>;
}

export function AddHospitalPage({
  editSlug,
  requestId,
  prefill,
  partnerMode = false,
  submittedBy,
  isUploadingPhoto,
  onPickPhoto,
  onCancel,
  onCreated,
  onSavedHospitalId,
}: AddHospitalPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // 1. Basic Info
  const [name, setName] = useState(prefill?.name || '');
  const [slug, setSlug] = useState(
    prefill?.name
      ? prefill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : ''
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(editSlug || requestId));
  const [tag, setTag] = useState(partnerMode ? '' : 'Multi-Specialty Hospital');
  const [imageUrl, setImageUrl] = useState('');
  const [discount, setDiscount] = useState(prefill?.discount || '20');
  const [commission, setCommission] = useState('10');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [is24x7, setIs24x7] = useState(partnerMode ? false : true);
  const [totalBeds, setTotalBeds] = useState(partnerMode ? '' : '100');
  const [icuBeds, setIcuBeds] = useState(partnerMode ? '' : '20');
  const [otCount, setOtCount] = useState(partnerMode ? '' : '4');
  const [nabh, setNabh] = useState(partnerMode ? false : true);
  const [jci, setJci] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [offersIpd, setOffersIpd] = useState(!partnerMode);
  const [hasInHouseLab, setHasInHouseLab] = useState(!partnerMode);
  const [specialties, setSpecialties] = useState(
    prefill?.specialty || (partnerMode ? '' : 'General Medicine, Cardiology, Orthopedics')
  );

  // 2. Contacts & Location
  const [phone1, setPhone1] = useState(prefill?.phone || '');
  const [phone2, setPhone2] = useState('');
  const [helpline, setHelpline] = useState(partnerMode ? '' : '+91 141 400 8800');
  const [address, setAddress] = useState(prefill?.address || '');
  const [city, setCity] = useState(prefill?.city || (partnerMode ? '' : 'Jaipur'));
  const [stateName, setStateName] = useState(partnerMode ? '' : 'Rajasthan');
  const [pincode, setPincode] = useState(partnerMode ? '' : '302001');
  const [lat, setLat] = useState(partnerMode ? '' : '26.9124');
  const [lng, setLng] = useState(partnerMode ? '' : '75.7873');
  const [mainBranchName, setMainBranchName] = useState('');
  const [mainBranchArea, setMainBranchArea] = useState(prefill?.area || '');

  // 3. Services, Labs, IPD & Insurance
  const [facilities, setFacilities] = useState<string[]>(
    partnerMode
      ? []
      : [
          'OPD Consultation',
          '24x7 Emergency & Trauma',
          'ICU / NICU / PICU',
          'In-House Pharmacy',
          'Cashless TPA Desk',
        ]
  );
  const [labs, setLabs] = useState<string[]>(partnerMode ? [] : ['Pathology & Blood Tests', 'Digital X-Ray']);
  const [ipdServices, setIpdServices] = useState<string[]>(
    partnerMode ? [] : ['General Surgery', 'Orthopedics & Joint Replacement']
  );
  const [insurance, setInsurance] = useState<string[]>(
    partnerMode ? [] : ['RGHS (Rajasthan Govt)', 'Star Health', 'HDFC Ergo']
  );

  // 4. Linked Doctors & Edit Mode State
  const [doctorsDraft, setDoctorsDraft] = useState<DraftDoctor[]>([]);
  const [existingBranches, setExistingBranches] = useState<ExtendedBranch[]>([]);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editingHospitalId, setEditingHospitalId] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editSlug));
  const [isSaving, setIsSaving] = useState(false);

  // Partner Compliance & Verification Docs
  const [clinicalEstNo, setClinicalEstNo] = useState('');
  const [licenseProofUrl, setLicenseProofUrl] = useState('');
  const [authorizedSignatory, setAuthorizedSignatory] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsLocked, setTermsLocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [cropModalUri, setCropModalUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const draftKey = `partner_hospital_draft_${submittedBy?.id || 'anon'}_${editSlug || requestId || 'new'}`;

  useEffect(() => {
    if (!partnerMode || editSlug || requestId) return;
    let active = true;
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw || !active) return;
        const d = JSON.parse(raw);
        if (d.name) setName(d.name);
        if (d.slug) setSlug(d.slug);
        if (d.tag) setTag(d.tag);
        if (d.imageUrl) setImageUrl(d.imageUrl);
        if (d.totalBeds) setTotalBeds(d.totalBeds);
        if (d.icuBeds) setIcuBeds(d.icuBeds);
        if (d.otCount) setOtCount(d.otCount);
        if (d.specialties) setSpecialties(d.specialties);
        if (typeof d.is24x7 === 'boolean') setIs24x7(d.is24x7);
        if (typeof d.nabh === 'boolean') setNabh(d.nabh);
        if (typeof d.jci === 'boolean') setJci(d.jci);
        if (d.phone1) setPhone1(d.phone1);
        if (d.phone2) setPhone2(d.phone2);
        if (d.helpline) setHelpline(d.helpline);
        if (d.address) setAddress(d.address);
        if (d.city) setCity(d.city);
        if (d.stateName) setStateName(d.stateName);
        if (d.pincode) setPincode(d.pincode);
        if (d.lat) setLat(d.lat);
        if (d.lng) setLng(d.lng);
        if (d.mainBranchName) setMainBranchName(d.mainBranchName);
        if (d.mainBranchArea) setMainBranchArea(d.mainBranchArea);
        if (Array.isArray(d.facilities)) setFacilities(d.facilities);
        if (Array.isArray(d.labs)) setLabs(d.labs);
        if (Array.isArray(d.ipdServices)) setIpdServices(d.ipdServices);
        if (Array.isArray(d.insurance)) setInsurance(d.insurance);
        if (d.weeklySchedule) setWeeklySchedule(d.weeklySchedule);
        if (d.clinicalEstNo) setClinicalEstNo(d.clinicalEstNo);
        if (d.licenseProofUrl) setLicenseProofUrl(d.licenseProofUrl);
        if (d.authorizedSignatory) setAuthorizedSignatory(d.authorizedSignatory);
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
          tag,
          imageUrl,
          totalBeds,
          icuBeds,
          otCount,
          specialties,
          is24x7,
          nabh,
          jci,
          phone1,
          phone2,
          helpline,
          address,
          city,
          stateName,
          pincode,
          lat,
          lng,
          mainBranchName,
          mainBranchArea,
          facilities,
          labs,
          ipdServices,
          insurance,
          weeklySchedule,
          clinicalEstNo,
          licenseProofUrl,
          authorizedSignatory,
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
        setFormError('Hospital Name (*) is required.');
        return;
      }
      if (partnerMode && !specialties.trim()) {
        setFormError('Specialties (*) are required.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!phone1.trim() || phone1.replace(/\D/g, '').length < 10) {
        setFormError('Valid 10-digit Phone 1 (Main Desk *) is required.');
        return;
      }
      if (!address.trim()) {
        setFormError('Full Address (*) is required.');
        return;
      }
      if (!stateName.trim() || !city.trim()) {
        setFormError('State (*) and City (*) are required.');
        return;
      }
    }
    const next = Math.min(4, currentStep + 1);
    await saveDraft(next);
    setCurrentStep(next);
  };

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    const loadRequest = async () => {
      setIsLoadingEdit(true);
      try {
        const supabase = getSupabaseClient();
        const { data: req } = await supabase
          .from('partner_verification_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();
        if (!req || !active) return;
        const full = (req as any).payload?.fullInsert || {};
        const docs = (req as any).verification_docs || {};
        if (full.name) setName(full.name);
        if (full.slug) setSlug(full.slug);
        if (full.tag) setTag(full.tag);
        if (full.image_url) setImageUrl(full.image_url);
        if (full.total_beds != null) setTotalBeds(String(full.total_beds));
        if (full.icu_beds != null) setIcuBeds(String(full.icu_beds));
        if (full.ot_count != null) setOtCount(String(full.ot_count));
        if (Array.isArray(full.specialties)) setSpecialties(full.specialties.join(', '));
        setIs24x7(Boolean(full.is_24x7));
        setNabh(Boolean(full.nabh_accredited));
        setJci(Boolean(full.jci_accredited));
        if (full.contact_number) setPhone1(full.contact_number);
        if (full.secondary_contact_number) setPhone2(full.secondary_contact_number);
        if (full.virtual_exotel_number) setHelpline(full.virtual_exotel_number);
        if (full.address) setAddress(full.address);
        if (full.city) setCity(full.city);
        if (full.state) setStateName(full.state);
        if (full.pincode) setPincode(full.pincode);
        if ((req as any).payload?.latNum) setLat(String((req as any).payload.latNum));
        if ((req as any).payload?.lngNum) setLng(String((req as any).payload.lngNum));
        if ((req as any).payload?.mainBranchName) setMainBranchName((req as any).payload.mainBranchName);
        if ((req as any).payload?.mainBranchArea) setMainBranchArea((req as any).payload.mainBranchArea);
        if (Array.isArray(full.facilities)) setFacilities(full.facilities);
        if (Array.isArray(full.labs_offered)) setLabs(full.labs_offered);
        if (Array.isArray(full.ipd_services_offered)) setIpdServices(full.ipd_services_offered);
        if (Array.isArray(full.insurance_partners)) setInsurance(full.insurance_partners);
        if (full.weekly_schedule) setWeeklySchedule(full.weekly_schedule);
        if (docs.clinicalEstablishmentNo) setClinicalEstNo(docs.clinicalEstablishmentNo);
        if (docs.licenseProofUrl) setLicenseProofUrl(docs.licenseProofUrl);
        if (docs.authorizedSignatory) setAuthorizedSignatory(docs.authorizedSignatory);
      } finally {
        if (active) setIsLoadingEdit(false);
      }
    };
    void loadRequest();
    return () => {
      active = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!editSlug) return;
    let active = true;
    const loadForEdit = async () => {
      setIsLoadingEdit(true);
      try {
        const supabase = getSupabaseClient();
        const { data: hosp } = await supabase
          .from('hospitals')
          .select('*')
          .eq('slug', editSlug)
          .single();
        if (!hosp || !active) return;
        const h = hosp as ExtendedHospital;
        setEditingHospitalId(h.id);
        setName(h.name || '');
        setSlug(h.slug || '');
        setTag(h.tag || 'Multi-Specialty Hospital');
        setImageUrl(h.image_url || '');
        setDiscount(String(h.discount_percentage ?? 20));
        setCommission(String(h.commission_percentage ?? 10));
        setWeeklySchedule(h.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE);
        setIs24x7(h.is_24x7 !== false);
        setTotalBeds(String(h.total_beds ?? 100));
        setIcuBeds(String(h.icu_beds ?? 20));
        setOtCount(String(h.ot_count ?? 4));
        setNabh(Boolean(h.nabh_accredited));
        setJci(Boolean(h.jci_accredited));
        setFeatured(Boolean(h.featured));
        setSpecialties((h.specialties || []).join(', '));
        setPhone1(h.contact_number || '');
        setPhone2(h.secondary_contact_number || '');
        setHelpline(h.virtual_exotel_number || '+91 141 400 8800');
        setAddress(h.address || '');
        setCity(h.city || 'Jaipur');
        setStateName(h.state || 'Rajasthan');
        setPincode(h.pincode || '302001');
        setLat(String(h.latitude ?? 26.9124));
        setLng(String(h.longitude ?? 75.7873));
        if (h.facilities?.length) setFacilities(h.facilities);
        if (h.labs_offered?.length) setLabs(h.labs_offered);
        if (h.ipd_services_offered?.length) setIpdServices(h.ipd_services_offered);
        if (h.insurance_partners?.length) setInsurance(h.insurance_partners);
        setOffersIpd((Number(h.total_beds) || 0) > 0 || (h.ipd_services_offered?.length ?? 0) > 0);
        setHasInHouseLab((h.labs_offered?.length ?? 0) > 0);
        if ((h as any).clinical_establishment_no) setClinicalEstNo(String((h as any).clinical_establishment_no));
        if ((h as any).license_proof_url) setLicenseProofUrl(String((h as any).license_proof_url));

        const [brRes, docRes, vrRes] = await Promise.all([
          supabase.from('hospital_branches').select('*').eq('hospital_id', h.id).order('is_main_branch', { ascending: false }),
          supabase.from('doctors').select('*').eq('hospital_id', h.id).order('name', { ascending: true }),
          supabase
            .from('partner_verification_requests')
            .select('verification_docs, terms_accepted')
            .eq('entity_type', 'HOSPITAL')
            .eq('entity_slug', h.slug)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!active) return;
        const brList = (brRes.data || []) as ExtendedBranch[];
        setExistingBranches(brList);
        const mainBr = brList.find((b) => b.is_main_branch) || brList[0];
        if (mainBr) {
          setMainBranchName(mainBr.name || '');
          setMainBranchArea(mainBr.area || '');
        }
        const vrData = vrRes.data as { verification_docs?: any; terms_accepted?: boolean } | null;
        if (vrData?.verification_docs) {
          if (vrData.verification_docs.clinicalEstablishmentNo) {
            setClinicalEstNo((prev) => prev || vrData.verification_docs.clinicalEstablishmentNo);
          }
          if (vrData.verification_docs.licenseProofUrl) {
            setLicenseProofUrl((prev) => prev || vrData.verification_docs.licenseProofUrl);
          }
          if (vrData.verification_docs.authorizedSignatory) {
            setAuthorizedSignatory(vrData.verification_docs.authorizedSignatory);
          }
        }
        if (vrData?.terms_accepted) {
          setTermsAccepted(true);
          setTermsLocked(true);
        }
        if (brRes.data && active) setExistingBranches(brRes.data as ExtendedBranch[]);
        if (docRes.data && active) {
          setDoctorsDraft(
            (docRes.data as ExtendedDoctor[]).map((d) => ({
              localId: d.id,
              existingId: d.id,
              branchId: d.branch_id || undefined,
              name: d.name,
              specialty: d.specialty,
              qualification: d.qualification || 'MBBS, MD',
              experienceYears: String(d.experience_years ?? 10),
              fee: String(d.consultation_fee ?? 600),
              timing: d.opd_timing || 'Mon-Sat, 10 AM - 5 PM',
            }))
          );
        }
      } finally {
        if (active) setIsLoadingEdit(false);
      }
    };
    loadForEdit();
    return () => {
      active = false;
    };
  }, [editSlug]);

  const toggleChip = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const addDoctorRow = () => {
    setDoctorsDraft((prev) => [
      ...prev,
      {
        localId: String(Date.now() + Math.random()),
        name: '',
        specialty: 'General Medicine',
        qualification: 'MBBS, MD',
        experienceYears: '10',
        fee: '600',
        timing: 'Mon-Sat, 10 AM - 5 PM',
      },
    ]);
  };

  const updateDoctorRow = (localId: string, field: keyof DraftDoctor, value: string) => {
    setDoctorsDraft((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, [field]: value } : d))
    );
  };

  const removeDoctorRow = (localId: string) => {
    setDoctorsDraft((prev) => prev.filter((d) => d.localId !== localId));
  };

  const handleSaveHospital = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Missing Info', 'Please enter Hospital Name and Address.');
      return;
    }

    const cleanSlug = (
      slug.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    ).toLowerCase();

    const latNum = parseFloat(lat) || 26.9124;
    const lngNum = parseFloat(lng) || 75.7873;
    const discountNum = Number(discount) || 20;
    const commissionNum = Number(commission) || 10;

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();
      const baseInsert: Record<string, unknown> = {
        name: name.trim(),
        slug: cleanSlug,
        tag: tag.trim() || 'Partner Hospital',
        address: address.trim(),
        city: city.trim() || 'Jaipur',
        state: stateName.trim() || 'Rajasthan',
        pincode: pincode.trim() || '302001',
        location: `SRID=4326;POINT(${lngNum} ${latNum})`,
        contact_number: phone1.trim() || '+91 141 0000000',
        virtual_exotel_number: helpline.trim() || '+91 141 400 8800',
        discount_percentage: discountNum,
        image_url:
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
        specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
        facilities,
        nabh_accredited: nabh,
        jci_accredited: jci,
        featured,
        is_active: true,
      };

      const fullInsert = {
        ...baseInsert,
        secondary_contact_number: phone2.trim() || null,
        commission_percentage: commissionNum,
        opd_hours: summarizeWeeklySchedule(weeklySchedule),
        weekly_schedule: weeklySchedule,
        is_24x7: is24x7,
        total_beds: Number(totalBeds) || 0,
        icu_beds: Number(icuBeds) || 0,
        ot_count: Number(otCount) || 0,
        labs_offered: labs,
        ipd_services_offered: ipdServices,
        insurance_partners: insurance,
        ...(partnerMode
          ? {
              clinical_establishment_no: clinicalEstNo.trim() || null,
              license_proof_url: licenseProofUrl.trim() || null,
              verification_status: 'VERIFIED',
            }
          : {}),
      };

      if (partnerMode) {
        setFormError(null);
        if (!clinicalEstNo.trim()) {
          setFormError('Clinical Establishment / Hospital Reg. No. (*) is required.');
          return;
        }
        if (!authorizedSignatory.trim()) {
          setFormError('Authorized Signatory (Name & Role *) is required.');
          return;
        }
        if (!licenseProofUrl.trim()) {
          setFormError('Hospital Registration / NABH / License Proof (*) is required.');
          return;
        }
        if (!termsAccepted) {
          setFormError('You must accept the Hospital Partner Terms & Conditions to submit.');
          return;
        }

        const reqId = requestId || `vr-hosp-${cleanSlug.slice(0, 12)}-${Date.now().toString(36)}`;
        const reqRow = {
          id: reqId,
          entity_type: 'HOSPITAL',
          action_type: editingHospitalId ? 'UPDATE' : 'CREATE',
          target_entity_id: editingHospitalId || null,
          hospital_id: editingHospitalId || null,
          submitted_by_user_id: submittedBy?.id || null,
          submitted_by_name: submittedBy?.fullName || null,
          submitted_by_email: submittedBy?.email || null,
          entity_name: name.trim(),
          entity_slug: cleanSlug,
          payload: {
            fullInsert,
            baseInsert,
            mainBranchName: mainBranchName.trim() || `${name.trim()} Main Campus`,
            mainBranchArea: mainBranchArea.trim() || city.trim() || 'Jaipur',
            latNum,
            lngNum,
          },
          verification_docs: {
            clinicalEstablishmentNo: clinicalEstNo.trim(),
            licenseProofUrl: licenseProofUrl.trim(),
            authorizedSignatory: authorizedSignatory.trim(),
            nabhAccredited: nabh,
            jciAccredited: jci,
          },
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          status: 'PENDING',
          reviewer_notes: null,
          updated_at: new Date().toISOString(),
        };
        const { error: vrError } = requestId
          ? await supabase.from('partner_verification_requests').update(reqRow).eq('id', requestId)
          : await supabase.from('partner_verification_requests').insert(reqRow);

        if (vrError) {
          Alert.alert('Submission Failed', vrError.message);
          return;
        }

        await AsyncStorage.removeItem(draftKey).catch(() => {});
        Alert.alert(
          'Submitted for Verification',
          'Hospital details and license documents have been sent to Adityam Admin Staff for verification. Once approved, it will go live automatically.'
        );
        await onCreated(cleanSlug);
        return;
      }

      let hospitalId: string | null = editingHospitalId;
      if (editingHospitalId) {
        const updateFull = { ...fullInsert, updated_at: new Date().toISOString() };
        const updateBase = { ...baseInsert, updated_at: new Date().toISOString() };
        const firstTry = await supabase.from('hospitals').update(updateFull).eq('id', editingHospitalId);
        if (firstTry.error && isMissingColumnError(firstTry.error)) {
          const fb = await supabase.from('hospitals').update(updateBase).eq('id', editingHospitalId);
          if (fb.error) {
            Alert.alert('Save Failed', fb.error.message);
            return;
          }
        } else if (firstTry.error) {
          Alert.alert('Save Failed', firstTry.error.message);
          return;
        }
      } else {
        const firstTry = await supabase.from('hospitals').insert(fullInsert).select('id').single();
        if (firstTry.error && isMissingColumnError(firstTry.error)) {
          const fb = await supabase.from('hospitals').insert(baseInsert).select('id').single();
          if (fb.error) {
            Alert.alert('Save Failed', fb.error.message);
            return;
          }
          hospitalId = fb.data?.id ?? null;
        } else if (firstTry.error) {
          Alert.alert('Save Failed', firstTry.error.message);
          return;
        } else {
          hospitalId = firstTry.data?.id ?? null;
        }
      }

      if (hospitalId) {
        let defaultBranchId = existingBranches[0]?.id || null;
        if (!editingHospitalId) {
          const brId = `br-${cleanSlug.slice(0, 12)}-main-${Date.now().toString(36)}`;
          defaultBranchId = brId;
          const branchBase = {
            id: brId,
            hospital_id: hospitalId,
            name: mainBranchName.trim() || `${name.trim()} Main Campus`,
            area: mainBranchArea.trim() || city.trim() || 'Jaipur',
            address: address.trim(),
            city: city.trim() || 'Jaipur',
            location: `SRID=4326;POINT(${lngNum} ${latNum})`,
            distance_km: 1.5,
            contact_number: phone1.trim() || '+91 141 0000000',
            virtual_exotel_number: helpline.trim() || '+91 141 400 8800',
            is_main_branch: true,
          };
          const branchRes = await supabase.from('hospital_branches').insert({
            ...branchBase,
            secondary_contact_number: phone2.trim() || null,
            services_offered: facilities,
          });
          if (branchRes.error && isMissingColumnError(branchRes.error)) {
            await supabase.from('hospital_branches').insert(branchBase);
          }
        }

        const validDocs = doctorsDraft.filter((d) => d.name.trim());
        const newDocs = validDocs.filter((d) => !d.existingId);
        const existingDocs = validDocs.filter((d) => Boolean(d.existingId));

        for (const d of existingDocs) {
          const feeNum = Number(d.fee) || 600;
          await supabase
            .from('doctors')
            .update({
              branch_id: d.branchId || defaultBranchId,
              name: d.name.trim(),
              specialty: d.specialty.trim() || 'General Medicine',
              qualification: d.qualification.trim() || 'MBBS, MD',
              experience_years: Number(d.experienceYears) || 8,
              consultation_fee: feeNum,
              discounted_fee: Math.max(100, Math.round(feeNum * (1 - discountNum / 100))),
              opd_timing: d.timing.trim() || 'Mon-Sat, 10 AM - 5 PM',
            })
            .eq('id', d.existingId!);
        }

        if (newDocs.length > 0) {
          const docRows = newDocs.map((d, idx) => {
            const feeNum = Number(d.fee) || 600;
            return {
              id: `doc-${cleanSlug.slice(0, 8)}-${Date.now().toString(36)}-${idx}`,
              hospital_id: hospitalId,
              branch_id: d.branchId || defaultBranchId,
              name: d.name.trim(),
              specialty: d.specialty.trim() || 'General Medicine',
              qualification: d.qualification.trim() || 'MBBS, MD',
              experience_years: Number(d.experienceYears) || 8,
              consultation_fee: feeNum,
              discounted_fee: Math.max(100, Math.round(feeNum * (1 - discountNum / 100))),
              opd_timing: d.timing.trim() || 'Mon-Sat, 10 AM - 5 PM',
              is_active: true,
            };
          });
          await supabase.from('doctors').insert(docRows);
        }
      }

      if (hospitalId && onSavedHospitalId) {
        await onSavedHospitalId(hospitalId);
      }

      await onCreated(cleanSlug);
    } finally {
      setIsSaving(false);
    }
  };

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

  if (isLoadingEdit) {
    return (
      <View style={{ padding: 48, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="large" color={THEME.greenPrimary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.muted }}>
          Loading hospital details...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {/* Top Page Header */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 18,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
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
              {editingHospitalId || requestId ? `Update Hospital · ${name || editSlug || 'Details'}` : 'Add New Hospital'}
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              {partnerMode
                ? 'Step-by-step hospital onboarding — your progress is saved as you go'
                : 'Fill hospital info, contacts, services, and link doctors in one place'}
            </Text>
          </View>
        </View>
      </View>

      {partnerMode && currentStep === 4 && (
        <FormStepBar
          currentStep={currentStep}
          onSelectStep={(s) => setCurrentStep(s)}
          steps={[
            { id: 1, title: 'Hospital Details', subtitle: 'Name, beds & specialties' },
            { id: 2, title: 'Contacts & Branch', subtitle: 'Phone, address & GPS' },
            { id: 3, title: 'Services & Timings', subtitle: 'Labs, IPD, TPA & hours' },
            { id: 4, title: 'Verification & Terms', subtitle: 'License & T&C submit' },
          ]}
        />
      )}

      {/* Section 1 & 2: Two-column on Desktop (or Step 1 / Step 2 in Partner Wizard) */}
      {(!partnerMode || currentStep === 1 || currentStep === 2) && (
      <View style={{ flexDirection: isDesktop && !partnerMode ? 'row' : 'column', gap: 18 }}>
        {/* Card 1: Hospital Info & Photo */}
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
            1. Hospital Details & Photo
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
              Hospital Banner Photo (Recommended: 16:9 Landscape · 1200×675px)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="Paste photo URL or upload (16:9 Landscape)"
                placeholderTextColor="#9CA3AF"
                style={[inputStyle, { flex: 1 }]}
              />
              <TouchableOpacity
                onPress={() =>
                  onPickPhoto(
                    (url) => {
                      setImageUrl(url);
                      setCropModalUri(url);
                    },
                    { aspect: [16, 9], allowsEditing: true }
                  )
                }
                disabled={isUploadingPhoto}
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  borderRadius: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Upload size={14} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenPrimary }}>
                  {isUploadingPhoto ? '...' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
            {imageUrl ? (
              <View style={{ gap: 6, alignItems: 'flex-start' }}>
                <Image
                  source={{ uri: imageUrl }}
                  resizeMode="cover"
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    aspectRatio: 16 / 9,
                    borderRadius: 10,
                    backgroundColor: THEME.creamSoft,
                    borderWidth: 1,
                    borderColor: THEME.border,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setCropModalUri(imageUrl)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.greenPrimary }}>
                    Adjust Thumbnail Alignment / Zoom
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Hospital Name <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!editingHospitalId && (partnerMode || !slugTouched)) {
                    const combined = [txt, mainBranchArea || city].filter(Boolean).join(' ');
                    setSlug(combined.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                placeholder="e.g. Fortis Hospital"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                {partnerMode ? 'Page URL Slug (Auto-generated with Branch)' : 'Page URL Slug'}
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
                placeholder="hospital-branch-slug"
                style={[inputStyle, partnerMode && { opacity: 0.7, backgroundColor: '#F3EFE4' }]}
              />
            </View>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Tagline
              </Text>
              <TextInput value={tag} onChangeText={setTag} style={inputStyle} />
            </View>
            {!partnerMode && (
              <>
                <View style={{ flex: 0.8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Discount (%)
                  </Text>
                  <TextInput value={discount} onChangeText={setDiscount} keyboardType="numeric" style={inputStyle} />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Commission (%)
                  </Text>
                  <TextInput value={commission} onChangeText={setCommission} keyboardType="numeric" style={inputStyle} />
                </View>
              </>
            )}
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Specialties (comma-separated) {partnerMode ? <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text> : null}
            </Text>
            <TextInput
              value={specialties}
              onChangeText={setSpecialties}
              placeholder="e.g. Cardiology, Orthopedics, General Medicine"
              placeholderTextColor="#9CA3AF"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '24x7 Open', val: is24x7, toggle: () => setIs24x7(!is24x7) },
              { label: 'NABH', val: nabh, toggle: () => setNabh(!nabh) },
              { label: 'JCI', val: jci, toggle: () => setJci(!jci) },
              ...(partnerMode
                ? [
                    { label: 'Offers IPD / Admissions', val: offersIpd, toggle: () => setOffersIpd(!offersIpd) },
                    { label: 'In-House Lab & Scans', val: hasInHouseLab, toggle: () => setHasInHouseLab(!hasInHouseLab) },
                  ]
                : [{ label: 'Featured', val: featured, toggle: () => setFeatured(!featured) }]),
            ].map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={t.toggle}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: t.val ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: t.val ? THEME.greenPrimary : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.val ? THEME.greenPrimary : THEME.muted }}>
                  {t.label}: {t.val ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(!partnerMode || offersIpd) && (
            <View
              style={{
                backgroundColor: THEME.creamBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: THEME.border,
                padding: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                IPD Bed &amp; Operation Theatre Capacity
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Total Beds
                  </Text>
                  <TextInput
                    value={totalBeds}
                    onChangeText={(t) => setTotalBeds(sanitizeDigits(t, 5))}
                    placeholder="e.g. 50"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={[inputStyle, { backgroundColor: THEME.surface }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    ICU Beds
                  </Text>
                  <TextInput
                    value={icuBeds}
                    onChangeText={(t) => setIcuBeds(sanitizeDigits(t, 4))}
                    placeholder="e.g. 10"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={[inputStyle, { backgroundColor: THEME.surface }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    OTs
                  </Text>
                  <TextInput
                    value={otCount}
                    onChangeText={(t) => setOtCount(sanitizeDigits(t, 3))}
                    placeholder="e.g. 2"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={[inputStyle, { backgroundColor: THEME.surface }]}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
        )}

        {/* Card 2: Contacts & Location */}
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
            2. Contacts, Location & Main Branch
          </Text>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 1 (Main Desk, 10 digits) <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={phone1}
                onChangeText={(t) => setPhone1(sanitizeDigits(t, 10))}
                placeholder="e.g. 9829012345"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 2 (Emergency, 10 digits)
              </Text>
              <TextInput
                value={phone2}
                onChangeText={(t) => setPhone2(sanitizeDigits(t, 10))}
                placeholder="e.g. 9829054321"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                style={inputStyle}
              />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Helpline / Reception Landline (10 digits)
            </Text>
            <TextInput
              value={helpline}
              onChangeText={(t) => setHelpline(sanitizeDigits(t, 10))}
              placeholder="e.g. 0141400880"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Full Address <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Building / Plot No., Street, Locality, Landmark"
              placeholderTextColor="#9CA3AF"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="State *"
                placeholder="Select State..."
                value={stateName}
                options={INDIA_STATES.map((st) => ({ value: st, label: st }))}
                onChange={(nextState) => {
                  setStateName(nextState);
                  const stateCities = INDIA_STATE_CITIES[nextState] || [];
                  if (!stateCities.includes(city)) {
                    setCity(stateCities[0] || '');
                  }
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="City *"
                placeholder={stateName ? 'Select City...' : 'Select State first'}
                value={city}
                options={(INDIA_STATE_CITIES[stateName] || (city ? [city] : [])).map((c) => ({
                  value: c,
                  label: c,
                }))}
                onChange={(nextCity) => setCity(nextCity)}
              />
            </View>
            <View style={{ flex: 0.7 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Pincode (6 digits)
              </Text>
              <TextInput
                value={pincode}
                onChangeText={(t) => setPincode(sanitizeDigits(t, 6))}
                placeholder="e.g. 302001"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={6}
                style={inputStyle}
              />
            </View>
          </View>

          <LocationPickerInput
            address={address}
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
              if (meta.state && !stateName.trim()) setStateName(meta.state);
              if (meta.pincode && !pincode.trim()) setPincode(meta.pincode);
              if (meta.address && !address.trim()) setAddress(meta.address);
            }}
          />

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Main Branch Name
              </Text>
              <TextInput
                value={mainBranchName}
                onChangeText={setMainBranchName}
                placeholder="Default: Main Campus"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Main Branch Area
              </Text>
              <TextInput
                value={mainBranchArea}
                onChangeText={(txt) => {
                  setMainBranchArea(txt);
                  if (!editingHospitalId && (partnerMode || !slugTouched)) {
                    const combined = [name, txt || city].filter(Boolean).join(' ');
                    setSlug(combined.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                placeholder="e.g. Malviya Nagar"
                style={inputStyle}
              />
            </View>
          </View>
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
                {partnerMode ? 'Hospital OPD & Lab Hours (Day-by-Day)' : 'Hospital OPD Timings (Day-by-Day)'}
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
            title="OPD Timings (Day-by-Day)"
          />
        )}
      </View>
      )}

      {/* Section 3: Services, Labs, IPD & Insurance (With Infinite Custom Options) */}
      {(!partnerMode || currentStep === 3) && (
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 20,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 18,
        }}
      >
        <View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            3. Services, Labs, IPD & Insurance
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
            Select only verified services available at your hospital, or add unlimited custom items below.
          </Text>
        </View>

        <CustomChipSelector
          title="Facilities"
          subtitle="Core hospital infrastructure & patient support"
          presets={PRESET_FACILITIES}
          selected={facilities}
          onChange={setFacilities}
          placeholder="Add custom facility (e.g. NICU Level 3, Burn Unit)..."
        />

        {(!partnerMode || hasInHouseLab) && (
          <CustomChipSelector
            title="Labs & Diagnostic Scans"
            subtitle="In-house pathology & imaging facilities"
            presets={PRESET_LABS}
            selected={labs}
            onChange={setLabs}
            placeholder="Add custom lab/scan (e.g. PET-CT, 3T MRI, DEXA)..."
          />
        )}

        {(!partnerMode || offersIpd) && (
          <>
            <CustomChipSelector
              title="IPD & Surgeries"
              subtitle="In-patient departments & surgical specialties"
              presets={PRESET_IPD_SERVICES}
              selected={ipdServices}
              onChange={setIpdServices}
              placeholder="Add custom surgery/IPD department..."
            />

            <CustomChipSelector
              title="Insurance / TPA Empanelment"
              subtitle="Cashless & government health schemes accepted"
              presets={PRESET_INSURANCE_PARTNERS}
              selected={insurance}
              onChange={setInsurance}
              placeholder="Add custom TPA / Insurance partner..."
            />
          </>
        )}
      </View>
      )}

      {/* Section 4: Link Doctors to This Hospital (Admin only — Partners add doctors via dedicated Doctor Verification form) */}
      {!partnerMode && (
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              4. Link Doctors ({doctorsDraft.length})
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Add doctors now — they will be linked to the Main Branch automatically
            </Text>
          </View>

          <TouchableOpacity
            onPress={addDoctorRow}
            style={{
              backgroundColor: THEME.greenSoft,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Plus size={14} color={THEME.greenPrimary} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenPrimary }}>
              Add Doctor
            </Text>
          </TouchableOpacity>
        </View>

        {doctorsDraft.length === 0 ? (
          <Text style={{ fontSize: 12.5, color: THEME.muted }}>
            No doctors added yet. Click "Add Doctor" above or add them later from the hospital page.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {doctorsDraft.map((doc, idx) => (
              <View
                key={doc.localId}
                style={{
                  backgroundColor: THEME.creamBg,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                    Doctor #{idx + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeDoctorRow(doc.localId)}>
                    <Trash2 size={15} color={THEME.redText} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                  <TextInput
                    value={doc.name}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'name', v)}
                    placeholder="Doctor Name *"
                    style={[inputStyle, { flex: 1.3, backgroundColor: THEME.surface }]}
                  />
                  <TextInput
                    value={doc.specialty}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'specialty', v)}
                    placeholder="Specialty"
                    style={[inputStyle, { flex: 1, backgroundColor: THEME.surface }]}
                  />
                  <TextInput
                    value={doc.qualification}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'qualification', v)}
                    placeholder="Degree (MBBS, MD)"
                    style={[inputStyle, { flex: 1, backgroundColor: THEME.surface }]}
                  />
                </View>

                <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                  <TextInput
                    value={doc.fee}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'fee', v)}
                    placeholder="Fee (₹)"
                    keyboardType="numeric"
                    style={[inputStyle, { flex: 0.7, backgroundColor: THEME.surface }]}
                  />
                  <TextInput
                    value={doc.experienceYears}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'experienceYears', v)}
                    placeholder="Exp (yrs)"
                    keyboardType="numeric"
                    style={[inputStyle, { flex: 0.7, backgroundColor: THEME.surface }]}
                  />
                  <TextInput
                    value={doc.timing}
                    onChangeText={(v) => updateDoctorRow(doc.localId, 'timing', v)}
                    placeholder="OPD Timing"
                    style={[inputStyle, { flex: 1.5, backgroundColor: THEME.surface }]}
                  />
                </View>

                {existingBranches.length > 0 && (
                  <SelectDropdown
                    label="Assigned Branch"
                    placeholder="Select Branch..."
                    value={doc.branchId || existingBranches[0]?.id || ''}
                    options={existingBranches.map((br) => ({
                      value: br.id,
                      label: br.area || br.name,
                      subtitle: br.address || undefined,
                    }))}
                    onChange={(brId) => updateDoctorRow(doc.localId, 'branchId', brId)}
                  />
                )}
              </View>
            ))}
          </View>
        )}
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
            4. Hospital Registration, License & Terms Verification
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted }}>
            Hospital creation and edits are reviewed by Adityam Admin Staff before going live to patients.
          </Text>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Clinical Establishment / Hospital Reg. No. <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={clinicalEstNo}
                onChangeText={setClinicalEstNo}
                placeholder="e.g. CEA/RJ/JPR/2024/1120"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Authorized Signatory (Name & Role) <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                value={authorizedSignatory}
                onChangeText={setAuthorizedSignatory}
                placeholder="e.g. Dr. R. Sharma (Medical Director)"
                style={inputStyle}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
              Hospital Registration / NABH / License Proof (Upload or URL) <Text style={{ color: '#DC2626', fontWeight: '900' }}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={licenseProofUrl}
                onChangeText={setLicenseProofUrl}
                placeholder="https://... or upload license certificate"
                style={[inputStyle, { flex: 1 }]}
              />
              <TouchableOpacity
                onPress={() => void onPickPhoto(setLicenseProofUrl)}
                disabled={isUploadingPhoto}
                style={{
                  paddingHorizontal: 14,
                  borderRadius: 9,
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Upload size={14} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                  {isUploadingPhoto ? '...' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (!termsLocked) setTermsAccepted((v) => !v);
            }}
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
              I accept the Adityam Niramayaa Hospital Partner Terms & Conditions and certify all licenses and facility claims are genuine.
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
            onPress={handleSaveHospital}
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
                  ? requestId || editingHospitalId
                    ? 'Update & Send for Verification'
                    : 'Submit for Admin Verification'
                  : editingHospitalId
                    ? 'Save Hospital Changes'
                    : 'Save Hospital & Doctors'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ImageCropAdjustModal
        visible={Boolean(cropModalUri)}
        imageUri={cropModalUri || ''}
        aspect={[16, 9]}
        filePrefix="hospital_thumb"
        title="Adjust Hospital Banner (16:9)"
        onClose={() => setCropModalUri(null)}
        onSaved={(croppedUrl) => setImageUrl(croppedUrl)}
      />
    </View>
  );
}
