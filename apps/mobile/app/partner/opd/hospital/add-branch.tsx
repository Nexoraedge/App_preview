import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Building2, CheckCircle2, MapPin, Phone } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Hospital } from '@adityam/types';
import { PartnerShell } from '../../../../components/partner/PartnerShell';
import { usePartnerAuth } from '../../../../components/partner/PartnerAuthGate';
import { usePartnerHospitalId } from '../../../../src/hooks/usePartnerHospitalId';
import { SelectDropdown } from '../../../../components/admin/SelectDropdown';
import { LocationPickerInput } from '../../../../components/admin/LocationPickerInput';
import { CustomChipSelector } from '../../../../components/admin/CustomChipSelector';
import {
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../../../../components/admin/WeeklyScheduleEditor';
import { PRESET_FACILITIES } from '../../../../components/admin/hospitals/hospitalTheme';
import { INDIA_STATES, INDIA_STATE_CITIES } from '../../../../src/constants/indiaLocations';

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

export default function PartnerAddBranchRoute() {
  const router = useRouter();
  const { requestId, editBranchId } = useLocalSearchParams<{ requestId?: string; editBranchId?: string }>();
  const { partnerUser } = usePartnerAuth();
  const hospitalId = usePartnerHospitalId();

  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<Hospital | null>(null);

  const [branchName, setBranchName] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [stateName, setStateName] = useState('Rajasthan');
  const [city, setCity] = useState('Jaipur');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [is24x7, setIs24x7] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [totalBeds, setTotalBeds] = useState('');
  const [icuBeds, setIcuBeds] = useState('');
  const [otCount, setOtCount] = useState('');
  const [branchFacilities, setBranchFacilities] = useState<string[]>(['OPD Consultation', '24x7 Emergency & Trauma']);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hospitalId) {
        setLoading(false);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const [{ data }, vrRes, brRes] = await Promise.all([
          supabase.from('hospitals').select('*').eq('id', hospitalId).maybeSingle(),
          requestId
            ? supabase.from('partner_verification_requests').select('*').eq('id', requestId).maybeSingle()
            : Promise.resolve({ data: null }),
          editBranchId
            ? supabase.from('hospital_branches').select('*').eq('id', editBranchId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (active && data) {
          const h = data as Hospital;
          setHospital(h);
          if (h.state) setStateName(h.state);
          if (h.city) setCity(h.city);
        }

        const hydrateSource = (vrRes.data as any)?.payload?.branchData || (brRes.data as any);
        if (active && hydrateSource) {
          if (hydrateSource.name) setBranchName(hydrateSource.name);
          if (hydrateSource.contact_number) {
            setBranchPhone(String(hydrateSource.contact_number).replace(/\D/g, '').slice(-10));
          }
          if (hydrateSource.state) setStateName(hydrateSource.state);
          if (hydrateSource.city) setCity(hydrateSource.city);
          if (hydrateSource.area) setArea(hydrateSource.area);
          if (hydrateSource.pincode) setPincode(String(hydrateSource.pincode));
          if (hydrateSource.address) setAddress(hydrateSource.address);
          if (typeof hydrateSource.is_24x7 === 'boolean') setIs24x7(hydrateSource.is_24x7);
          if (hydrateSource.weekly_schedule) setWeeklySchedule(hydrateSource.weekly_schedule);
          if (hydrateSource.total_beds != null) setTotalBeds(String(hydrateSource.total_beds));
          if (hydrateSource.icu_beds != null) setIcuBeds(String(hydrateSource.icu_beds));
          if (hydrateSource.ot_count != null) setOtCount(String(hydrateSource.ot_count));
          if (Array.isArray(hydrateSource.facilities) && hydrateSource.facilities.length > 0) {
            setBranchFacilities(hydrateSource.facilities);
          }
          if (hydrateSource.latitude) setLat(String(hydrateSource.latitude));
          if (hydrateSource.longitude) setLng(String(hydrateSource.longitude));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hospitalId, requestId, editBranchId]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!hospital) {
      setFormError('No verified parent hospital found for your account.');
      return;
    }
    if (!branchName.trim()) {
      setFormError('Branch Name is required.');
      return;
    }
    const cleanPhone = branchPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFormError('Branch Mobile Number must be exactly 10 digits.');
      return;
    }
    if (!area.trim()) {
      setFormError('Area / Locality is required.');
      return;
    }
    if (!stateName.trim() || !city.trim()) {
      setFormError('State and City are required.');
      return;
    }
    if (!address.trim()) {
      setFormError('Full Street Address is required.');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const brSlug = `${hospital.slug || 'hosp'}-${branchName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const brId = `br-${brSlug.slice(0, 14)}-${Date.now().toString(36)}`;
      const timingsText = is24x7 ? '24x7 Open' : summarizeWeeklySchedule(weeklySchedule);

      let resolvedLat = parseFloat(lat) || null;
      let resolvedLng = parseFloat(lng) || null;
      if (!resolvedLat || !resolvedLng) {
        try {
          const q = [area.trim(), city.trim(), stateName.trim(), 'India'].filter(Boolean).join(', ');
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
          );
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData[0]?.lat && geoData[0]?.lon) {
            resolvedLat = parseFloat(geoData[0].lat);
            resolvedLng = parseFloat(geoData[0].lon);
          }
        } catch {}
      }

      const branchData = {
        id: brId,
        hospital_id: hospital.id,
        name: branchName.trim(),
        area: area.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.replace(/\D/g, '').slice(0, 6) || null,
        address: address.trim(),
        contact_number: `+91${cleanPhone}`,
        virtual_exotel_number: hospital.virtual_exotel_number || null,
        latitude: resolvedLat,
        longitude: resolvedLng,
        timings: timingsText,
        weekly_schedule: is24x7 ? null : weeklySchedule,
        is_24x7: is24x7,
        total_beds: Number(totalBeds) || 0,
        icu_beds: Number(icuBeds) || 0,
        ot_count: Number(otCount) || 0,
        facilities: branchFacilities,
        is_main_branch: false,
        is_active: true,
      };

      if (editBranchId) {
        const numLat = parseFloat(lat) || hospital.latitude || null;
        const numLng = parseFloat(lng) || hospital.longitude || null;
        const coreUpdate: Record<string, any> = {
          name: branchName.trim(),
          area: area.trim(),
          city: city.trim(),
          address: address.trim(),
          contact_number: `+91${cleanPhone}`,
          ...(numLat && numLng ? { location: `SRID=4326;POINT(${numLng} ${numLat})` } : {}),
        };
        const { error: brErr } = await supabase
          .from('hospital_branches')
          .update(coreUpdate)
          .eq('id', editBranchId);
        if (brErr) {
          setFormError(brErr.message);
          return;
        }
        Alert.alert('Branch Updated', `Branch "${branchName.trim()}" details have been updated.`);
        router.replace('/partner/opd/hospital' as any);
        return;
      }

      const payloadObj = {
        branchData,
        parentHospital: {
          id: hospital.id,
          name: hospital.name,
          slug: hospital.slug,
          address: hospital.address,
          city: hospital.city,
          contact_number: hospital.contact_number,
        },
      };

      let error: any = null;
      if (requestId) {
        const upd = await supabase
          .from('partner_verification_requests')
          .update({
            entity_name: `${hospital.name} — ${branchName.trim()}`,
            entity_slug: brSlug,
            payload: payloadObj,
            status: 'PENDING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);
        error = upd.error;
      } else {
        const reqId = `vr-br-${brSlug.slice(0, 12)}-${Date.now().toString(36)}`;
        const ins = await supabase.from('partner_verification_requests').insert({
          id: reqId,
          entity_type: 'HOSPITAL',
          action_type: 'CREATE',
          target_entity_id: hospital.id,
          hospital_id: hospital.id,
          submitted_by_user_id: partnerUser?.id || null,
          submitted_by_name: partnerUser?.fullName || null,
          submitted_by_email: partnerUser?.email || null,
          entity_name: `${hospital.name} — ${branchName.trim()}`,
          entity_slug: brSlug,
          payload: payloadObj,
          verification_docs: {},
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          status: 'PENDING',
        });
        error = ins.error;
      }

      if (error) {
        setFormError(error.message);
        return;
      }

      Alert.alert(
        requestId ? 'Branch Request Resubmitted' : 'Branch Submitted for Verification',
        `Branch "${branchName.trim()}" has been linked to ${hospital.name} and sent to Adityam Admin Staff for verification.`
      );
      router.replace('/partner/opd/hospital' as any);
    } finally {
      setSaving(false);
    }
  };

  const cityOptions = (INDIA_STATE_CITIES[stateName] || (city ? [city] : [])).map((c) => ({
    value: c,
    label: c,
  }));

  const inputStyle = {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: THEME.ink,
  };

  return (
    <PartnerShell
      activeRoute="opd_hospital"
      title="Add New Hospital Branch"
      subtitle="Link a new branch location to your verified hospital"
    >
      {loading ? (
        <View style={{ padding: 48, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={THEME.green} />
        </View>
      ) : !hospital ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            Please set up your main hospital first.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/partner/opd/hospital' as any)}
            style={{ backgroundColor: THEME.greenDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>← Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
          {/* Parent Hospital Linking Banner */}
          <View
            style={{
              backgroundColor: THEME.greenSoft,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: THEME.greenBorder,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <TouchableOpacity
                onPress={() => router.replace('/partner/opd/hospital' as any)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowLeft size={16} color={THEME.greenDark} />
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.green, letterSpacing: 0.5 }}>
                  LINKING NEW BRANCH TO EXISTING VERIFIED HOSPITAL
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: THEME.greenDark }}>
                  {hospital.name}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  {hospital.address} · {hospital.city}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: THEME.greenBorder }}>
              <Building2 size={13} color={THEME.green} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.greenDark }}>Requires Admin Approval</Text>
            </View>
          </View>

          {/* Branch Details Form */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
              1. Branch Identity &amp; Contact
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 220, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                  Branch Name <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="e.g. Mansarovar Wing"
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                />
              </View>

              <View style={{ flex: 1, minWidth: 220, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                  Branch Mobile Number (10 digits) <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>+91</Text>
                  </View>
                  <TextInput
                    value={branchPhone}
                    onChangeText={(t) => setBranchPhone(t.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9829012345"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={10}
                    style={[inputStyle, { flex: 1 }]}
                  />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <SelectDropdown
                  label="State *"
                  value={stateName}
                  options={INDIA_STATES.map((st) => ({ value: st, label: st }))}
                  onChange={(nextState) => {
                    setStateName(nextState);
                    const stateCities = INDIA_STATE_CITIES[nextState] || [];
                    if (stateCities.length > 0 && !stateCities.includes(city)) {
                      setCity(stateCities[0]);
                    }
                  }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 200 }}>
                <SelectDropdown
                  label="City *"
                  value={city}
                  options={cityOptions}
                  onChange={setCity}
                />
              </View>

              <View style={{ flex: 1, minWidth: 160, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>Pincode</Text>
                <TextInput
                  value={pincode}
                  onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="302020"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={inputStyle}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 200, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                  Area / Locality <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. Mansarovar Sector 4"
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                />
              </View>

              <View style={{ flex: 1.5, minWidth: 260, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>
                  Full Street Address &amp; Landmark <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Plot 14, Madhyam Marg, Near Metro Station"
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                />
              </View>
            </View>
          </View>

          {/* Timings & Location */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
              2. Branch Timings &amp; Exact Map Pin
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: THEME.bg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: THEME.border,
                padding: 12,
              }}
            >
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>24x7 Open Branch</Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>Toggle ON if this branch operates 24 hours</Text>
              </View>
              <Switch
                value={is24x7}
                onValueChange={setIs24x7}
                trackColor={{ false: '#D1D5DB', true: THEME.greenBorder }}
                thumbColor={is24x7 ? THEME.green : '#9CA3AF'}
              />
            </View>

            {!is24x7 ? (
              <WeeklyScheduleEditor
                value={weeklySchedule}
                onChange={setWeeklySchedule}
                title="Branch 7-Day Opening & Closing Hours"
              />
            ) : null}

            <LocationPickerInput
              address={address || area}
              city={city}
              pincode={pincode}
              lat={lat}
              lng={lng}
              onChangeCoords={(la, ln) => {
                setLat(la);
                setLng(ln);
              }}
              onFillAddressMeta={(meta) => {
                if (meta.city) setCity(meta.city);
                if (meta.state && INDIA_STATES.includes(meta.state)) setStateName(meta.state);
                if (meta.pincode && !pincode) setPincode(meta.pincode);
                if (meta.address && !address) setAddress(meta.address);
              }}
            />
          </View>

          {/* 3. Branch Capacity & IPD / OPD Services */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
              3. Branch IPD Capacity &amp; Services
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 140, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>Total Beds</Text>
                <TextInput
                  value={totalBeds}
                  onChangeText={(t) => setTotalBeds(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 50"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1, minWidth: 140, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>ICU Beds</Text>
                <TextInput
                  value={icuBeds}
                  onChangeText={(t) => setIcuBeds(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 10"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1, minWidth: 140, gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.muted }}>OT Rooms</Text>
                <TextInput
                  value={otCount}
                  onChangeText={(t) => setOtCount(t.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g. 3"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </View>
            </View>

            <CustomChipSelector
              title="Branch OPD & IPD Services Available"
              presets={PRESET_FACILITIES}
              selected={branchFacilities}
              onChange={setBranchFacilities}
              placeholder="Add custom service (e.g. Dialysis, NICU)..."
            />
          </View>

          {formError ? (
            <View style={{ backgroundColor: THEME.redBg, borderWidth: 1, borderColor: THEME.redBorder, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.redText }}>{formError}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.replace('/partner/opd/hospital' as any)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={saving}
              style={{
                paddingHorizontal: 22,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: THEME.greenDark,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>
                {saving ? 'Submitting...' : 'Submit Branch for Verification'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </PartnerShell>
  );
}
