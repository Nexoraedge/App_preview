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
import { getSupabaseClient } from '@adityam/supabase';
import { SelectDropdown } from '../SelectDropdown';
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
  prefill?: HospitalPrefill;
  isUploadingPhoto: boolean;
  onPickPhoto: (onPicked: (url: string) => void) => Promise<void>;
  onCancel: () => void;
  onCreated: (slug: string) => Promise<void>;
}

export function AddHospitalPage({
  editSlug,
  prefill,
  isUploadingPhoto,
  onPickPhoto,
  onCancel,
  onCreated,
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
  const [tag, setTag] = useState('Multi-Specialty Hospital');
  const [imageUrl, setImageUrl] = useState('');
  const [discount, setDiscount] = useState(prefill?.discount || '20');
  const [commission, setCommission] = useState('10');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [is24x7, setIs24x7] = useState(true);
  const [totalBeds, setTotalBeds] = useState('100');
  const [icuBeds, setIcuBeds] = useState('20');
  const [otCount, setOtCount] = useState('4');
  const [nabh, setNabh] = useState(true);
  const [jci, setJci] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [specialties, setSpecialties] = useState(
    prefill?.specialty || 'General Medicine, Cardiology, Orthopedics'
  );

  // 2. Contacts & Location
  const [phone1, setPhone1] = useState(prefill?.phone || '');
  const [phone2, setPhone2] = useState('');
  const [helpline, setHelpline] = useState('+91 141 400 8800');
  const [address, setAddress] = useState(prefill?.address || '');
  const [city, setCity] = useState(prefill?.city || 'Jaipur');
  const [stateName, setStateName] = useState('Rajasthan');
  const [pincode, setPincode] = useState('302001');
  const [lat, setLat] = useState('26.9124');
  const [lng, setLng] = useState('75.7873');
  const [mainBranchName, setMainBranchName] = useState('');
  const [mainBranchArea, setMainBranchArea] = useState(prefill?.area || '');

  // 3. Services, Labs, IPD & Insurance
  const [facilities, setFacilities] = useState<string[]>([
    'OPD Consultation',
    '24x7 Emergency & Trauma',
    'ICU / NICU / PICU',
    'In-House Pharmacy',
    'Cashless TPA Desk',
  ]);
  const [labs, setLabs] = useState<string[]>(['Pathology & Blood Tests', 'Digital X-Ray']);
  const [ipdServices, setIpdServices] = useState<string[]>([
    'General Surgery',
    'Orthopedics & Joint Replacement',
  ]);
  const [insurance, setInsurance] = useState<string[]>([
    'RGHS (Rajasthan Govt)',
    'Star Health',
    'HDFC Ergo',
  ]);

  // 4. Linked Doctors & Edit Mode State
  const [doctorsDraft, setDoctorsDraft] = useState<DraftDoctor[]>([]);
  const [existingBranches, setExistingBranches] = useState<ExtendedBranch[]>([]);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editingHospitalId, setEditingHospitalId] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editSlug));
  const [isSaving, setIsSaving] = useState(false);

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

        const [brRes, docRes] = await Promise.all([
          supabase.from('hospital_branches').select('*').eq('hospital_id', h.id).order('is_main_branch', { ascending: false }),
          supabase.from('doctors').select('*').eq('hospital_id', h.id).order('name', { ascending: true }),
        ]);
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
      };

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
              {editingHospitalId ? `Edit Hospital · ${name || editSlug}` : 'Add New Hospital'}
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Fill hospital info, contacts, services, and link doctors in one place
            </Text>
          </View>
        </View>
      </View>

      {/* Section 1 & 2: Two-column on Desktop */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18 }}>
        {/* Card 1: Hospital Info & Photo */}
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

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: THEME.creamSoft }}
              />
            ) : null}
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Paste photo URL or upload"
              placeholderTextColor="#9CA3AF"
              style={[inputStyle, { flex: 1 }]}
            />
            <TouchableOpacity
              onPress={() => onPickPhoto((url) => setImageUrl(url))}
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

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Hospital Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!slug) {
                    setSlug(txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                placeholder="e.g. Fortis Hospital"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Page URL Slug
              </Text>
              <TextInput
                value={slug}
                onChangeText={setSlug}
                placeholder="fortis-jaipur"
                style={inputStyle}
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
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Total Beds
              </Text>
              <TextInput value={totalBeds} onChangeText={setTotalBeds} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                ICU Beds
              </Text>
              <TextInput value={icuBeds} onChangeText={setIcuBeds} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                OTs
              </Text>
              <TextInput value={otCount} onChangeText={setOtCount} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Specialties (comma-separated)
            </Text>
            <TextInput value={specialties} onChangeText={setSpecialties} style={inputStyle} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '24x7 Open', val: is24x7, toggle: () => setIs24x7(!is24x7) },
              { label: 'NABH', val: nabh, toggle: () => setNabh(!nabh) },
              { label: 'JCI', val: jci, toggle: () => setJci(!jci) },
              { label: 'Featured', val: featured, toggle: () => setFeatured(!featured) },
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
        </View>

        {/* Card 2: Contacts & Location */}
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
                Phone 1 (Main Desk)
              </Text>
              <TextInput value={phone1} onChangeText={setPhone1} placeholder="+91 141 ..." style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 2 (Emergency)
              </Text>
              <TextInput value={phone2} onChangeText={setPhone2} placeholder="+91 141 ..." style={inputStyle} />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Virtual Helpline
            </Text>
            <TextInput value={helpline} onChangeText={setHelpline} style={inputStyle} />
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Full Address *
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Street, Area, Landmark"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>City</Text>
              <TextInput value={city} onChangeText={setCity} style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>State</Text>
              <TextInput value={stateName} onChangeText={setStateName} style={inputStyle} />
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>Pincode</Text>
              <TextInput value={pincode} onChangeText={setPincode} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>Latitude</Text>
              <TextInput value={lat} onChangeText={setLat} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>Longitude</Text>
              <TextInput value={lng} onChangeText={setLng} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

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
                onChangeText={setMainBranchArea}
                placeholder="e.g. Malviya Nagar"
                style={inputStyle}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Collapsible Full-Width OPD Schedule Card */}
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
                Hospital OPD Timings (Day-by-Day)
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

      {/* Section 3: Services, Labs, IPD & Insurance */}
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
        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
          3. Services, Labs, IPD & Insurance
        </Text>

        {[
          { title: 'Facilities', items: PRESET_FACILITIES, selected: facilities, set: setFacilities },
          { title: 'Labs & Scans', items: PRESET_LABS, selected: labs, set: setLabs },
          { title: 'IPD & Surgeries', items: PRESET_IPD_SERVICES, selected: ipdServices, set: setIpdServices },
          { title: 'Insurance / TPA', items: PRESET_INSURANCE_PARTNERS, selected: insurance, set: setInsurance },
        ].map((group) => (
          <View key={group.title} style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>{group.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {group.items.map((item) => {
                const active = group.selected.includes(item);
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
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleChip(group.selected, group.set, item)}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenPrimary : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: active ? '700' : '600', color: active ? THEME.greenPrimary : THEME.muted }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Section 4: Link Doctors to This Hospital */}
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

      {/* Bottom Save Bar */}
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 13,
            borderRadius: 10,
            backgroundColor: THEME.surface,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
        </TouchableOpacity>

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
            {isSaving ? 'Saving...' : editingHospitalId ? 'Save Hospital Changes' : 'Save Hospital & Doctors'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
