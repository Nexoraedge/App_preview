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
import { ArrowLeft, Upload, CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Hospital, HospitalBranch } from '@adityam/types';
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
  isUploadingPhoto: boolean;
  onPickPhoto: (onPicked: (url: string) => void) => Promise<void>;
  onCancel: () => void;
  onSaved: (slug: string) => Promise<void>;
}

export function AddDoctorPage({
  editSlug,
  prefill,
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialty, setSpecialty] = useState(prefill?.specialty || 'General Medicine');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [regNumber, setRegNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('10');
  const [languages, setLanguages] = useState('English, Hindi');
  const [about, setAbout] = useState('');
  const [featured, setFeatured] = useState(false);

  // Fee & Commercials
  const [fee, setFee] = useState('600');
  const [discountPct, setDiscountPct] = useState(prefill?.discount || '15');
  const [commissionPct, setCommissionPct] = useState('10');

  // Clinic & Contacts
  const [clinicName, setClinicName] = useState(prefill?.clinicName || '');
  const [phone1, setPhone1] = useState(prefill?.phone || '');
  const [phone2, setPhone2] = useState('');
  const [clinicAddress, setClinicAddress] = useState(prefill?.address || '');
  const [city, setCity] = useState(prefill?.city || 'Jaipur');
  const [pincode, setPincode] = useState('302001');
  const [lat, setLat] = useState('26.9124');
  const [lng, setLng] = useState('75.7873');

  // Schedule & Services
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [services, setServices] = useState<string[]>(['OPD Consultation', 'Follow-up Visit']);

  // Optional Hospital & Branch Linking
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [linkedHospitalId, setLinkedHospitalId] = useState<string>('');
  const [linkedBranchId, setLinkedBranchId] = useState<string>('');

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const [hospRes, branchRes, docRes] = await Promise.all([
          supabase.from('hospitals').select('*').order('name', { ascending: true }),
          supabase.from('hospital_branches').select('*').order('is_main_branch', { ascending: false }),
          editSlug ? supabase.from('doctors').select('*') : Promise.resolve({ data: null }),
        ]);

        if (hospRes.data && active) setHospitals(hospRes.data as Hospital[]);
        if (branchRes.data && active) setBranches(branchRes.data as HospitalBranch[]);

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
      };

      const fullData: Record<string, unknown> = {
        ...baseData,
        is_solo: true,
        slug: cleanSlug,
        registration_number: regNumber.trim() || null,
        clinic_name: clinicName.trim() || `${name.trim()} Clinic`,
        clinic_address: clinicAddress.trim() || null,
        city: city.trim() || 'Jaipur',
        pincode: pincode.trim() || null,
        phone: phone1.trim() || null,
        secondary_phone: phone2.trim() || null,
        discount_percentage: discNum,
        commission_percentage: Number(commissionPct) || 10,
        about: about.trim() || null,
        services_offered: services,
        latitude: parseFloat(lat) || null,
        longitude: parseFloat(lng) || null,
        weekly_schedule: weeklySchedule,
      };

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
            {editingDocId ? `Edit Doctor · ${name}` : 'Add Solo Doctor'}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
            Qualifications, clinic location, OPD timings & optional hospital linking
          </Text>
        </View>
      </View>

      {/* Section 1 & 2 */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 18 }}>
        {/* Card 1: Profile & Qualifications */}
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

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.creamSoft }}
              />
            ) : null}
            <TextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="Photo URL or upload"
              placeholderTextColor="#9CA3AF"
              style={[inputStyle, { flex: 1 }]}
            />
            <TouchableOpacity
              onPress={() => onPickPhoto((url) => setAvatarUrl(url))}
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
                Doctor Full Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!editingDocId && !slug) {
                    setSlug(txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                placeholder="e.g. Dr. Arvind Sharma"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                URL Slug
              </Text>
              <TextInput value={slug} onChangeText={setSlug} placeholder="dr-arvind-sharma" style={inputStyle} />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Specialty *</Text>
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
                Qualifications / Degrees *
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
                Medical Reg. No.
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

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                OPD Fee (₹)
              </Text>
              <TextInput value={fee} onChangeText={setFee} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Discount (%)
              </Text>
              <TextInput value={discountPct} onChangeText={setDiscountPct} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Commission (%)
              </Text>
              <TextInput value={commissionPct} onChangeText={setCommissionPct} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

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
        </View>

        {/* Card 2: Clinic, Contacts & Weekly Schedule */}
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
            2. Clinic Location, Contacts & OPD Hours
          </Text>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Clinic Name
            </Text>
            <TextInput
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="e.g. Sharma Heart & Care Clinic"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 1 (Clinic Desk)
              </Text>
              <TextInput value={phone1} onChangeText={setPhone1} placeholder="+91 98290..." style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 2 (Personal / Alt)
              </Text>
              <TextInput value={phone2} onChangeText={setPhone2} placeholder="+91 98290..." style={inputStyle} />
            </View>
          </View>

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

      {/* Section 3: Services & Hospital Linking */}
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

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Services Offered</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_DOCTOR_SERVICES.map((svc) => {
              const active = services.includes(svc);
              return (
                <TouchableOpacity
                  key={svc}
                  onPress={() => toggleService(svc)}
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
                    {svc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
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
            {isSaving ? 'Saving...' : editingDocId ? 'Save Doctor Changes' : 'Save Solo Doctor'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
