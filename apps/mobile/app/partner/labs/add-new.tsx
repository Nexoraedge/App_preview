import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, CheckCircle2, Clock, FlaskConical, Search, ShieldCheck, Upload } from 'lucide-react-native';
import { getSupabaseClient, uploadPrescriptionSlip } from '@adityam/supabase';
import { PartnerShell } from '../../../components/partner/PartnerShell';
import { usePartnerAuth } from '../../../components/partner/PartnerAuthGate';
import { LocationPickerInput } from '../../../components/admin/LocationPickerInput';

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const TIMING_PRESETS = ['08:00 AM - 08:00 PM', '07:00 AM - 10:00 PM', '09:00 AM - 06:00 PM', '24 Hours', 'Closed'];

export default function PartnerAddLabRoute() {
  const router = useRouter();
  const { partnerUser } = usePartnerAuth();
  const hospitalId =
    partnerUser?.partnerHospitalId ||
    (partnerUser?.partnerType === 'hospital' ? partnerUser?.partnerEntityId : null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [hospitalInfo, setHospitalInfo] = useState<any | null>(null);
  const [locationMode, setLocationMode] = useState<'BRANCH' | 'STANDALONE'>('BRANCH');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Step 1: Identity & Location
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Step 2: Services & 7-Day Timings
  const [offers, setOffers] = useState<string[]>(['lab', 'scan', 'package']);
  const [is24x7, setIs24x7] = useState(false);
  const [nextSlot, setNextSlot] = useState('08:00 AM - 08:00 PM');
  const [reportTurnaroundHrs, setReportTurnaroundHrs] = useState('12');
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, d === 'Sunday' ? 'Closed' : '08:00 AM - 08:00 PM']))
  );

  // Step 3: Tests, Scans & Packages Catalog
  const [labItems, setLabItems] = useState<any[]>([]);
  const [catalogSegment, setCatalogSegment] = useState<'lab' | 'scan' | 'package'>('lab');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [priceMap, setPriceMap] = useState<Record<string, { price: string; available: boolean }>>({});

  // Step 4: Credentials & Submit
  const [licenseNumber, setLicenseNumber] = useState('');
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [nablCertified, setNablCertified] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [saving, setSaving] = useState(false);

  const persistDraft = (nextStep?: 1 | 2 | 3 | 4) => {
    AsyncStorage.setItem(
      '@adityam_partner_add_lab_draft_v1',
      JSON.stringify({
        step: nextStep ?? step,
        locationMode,
        selectedBranchId,
        name,
        area,
        address,
        city,
        pincode,
        phone,
        lat,
        lng,
        offers,
        is24x7,
        nextSlot,
        reportTurnaroundHrs,
        weeklySchedule,
        licenseNumber,
        certUrl,
      })
    ).catch(() => {});
  };

  useEffect(() => {
    AsyncStorage.getItem('@adityam_partner_add_lab_draft_v1')
      .then((raw) => {
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.name) setName(d.name);
        if (d.area) setArea(d.area);
        if (d.address) setAddress(d.address);
        if (d.city) setCity(d.city);
        if (d.pincode) setPincode(d.pincode);
        if (d.phone) setPhone(d.phone);
        if (d.lat) setLat(d.lat);
        if (d.lng) setLng(d.lng);
        if (d.licenseNumber) setLicenseNumber(d.licenseNumber);
        if (d.certUrl) setCertUrl(d.certUrl);
        if (d.weeklySchedule) setWeeklySchedule(d.weeklySchedule);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (hospitalId) {
      Promise.all([
        supabase.from('hospitals').select('*').eq('id', hospitalId).maybeSingle(),
        supabase.from('hospital_branches').select('*').eq('hospital_id', hospitalId),
      ]).then(([{ data: hData }, { data: brData }]) => {
        setHospitalInfo(hData || null);
        const list = (brData as any[]) || [];
        setBranches(list);
        if (list.length > 0) {
          applyBranch(list[0], hData);
        } else {
          setLocationMode('STANDALONE');
        }
      });
    } else {
      setLocationMode('STANDALONE');
    }

    supabase
      .from('lab_items')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const items = (data as any[]) || [];
        setLabItems(items);
        const initMap: Record<string, { price: string; available: boolean }> = {};
        for (const it of items) {
          initMap[it.id] = {
            price: String(it.segment === 'scan' ? 1200 : it.segment === 'package' ? 1999 : 450),
            available: false,
          };
        }
        setPriceMap(initMap);
      });
  }, [hospitalId]);

  const applyBranch = (br: any, hospOverride?: any) => {
    const h = hospOverride || hospitalInfo;
    setLocationMode('BRANCH');
    setSelectedBranchId(br.id);
    setBranchDropdownOpen(false);
    setName(`${h?.name ? `${h.name} · ` : ''}${br.name} Diagnostics & Lab`);
    setArea(br.area || br.city || '');
    setAddress(br.address || h?.address || '');
    setCity(br.city || h?.city || 'Jaipur');
    const pinFromAddr = String(br.address || '').match(/\b\d{6}\b/)?.[0] || '';
    setPincode(br.pincode || h?.pincode || pinFromAddr);
    setPhone(br.phone || h?.contact_number || '');
    if (h?.registration_number || h?.clinical_reg_no || br.license_number) {
      setLicenseNumber(br.license_number || h?.registration_number || h?.clinical_reg_no || '');
    }
    if (typeof br.latitude === 'number') setLat(String(br.latitude));
    if (typeof br.longitude === 'number') setLng(String(br.longitude));
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;
  const enabledCount = Object.values(priceMap).filter((v) => v.available).length;

  const handleSubmit = async () => {
    if (!name.trim() || !area.trim() || !address.trim()) {
      Alert.alert('Location Incomplete', 'Please complete Lab Name, Area, and Street Address in Step 1.');
      setStep(1);
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the Adityam Diagnostic Partner Terms.');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const id = `hosp-lab-${Date.now()}`;
      const { error } = await supabase.from('lab_centres').insert({
        id,
        name: name.trim(),
        area: area.trim(),
        address: address.trim(),
        city: city.trim() || 'Jaipur',
        pincode: pincode.trim() || '302001',
        phone: phone.trim() || null,
        license_number: licenseNumber.trim() || null,
        nabl_certified: nablCertified,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        hospital_id: hospitalId || null,
        home_collection: false,
        offers,
        is_24x7: is24x7,
        next_slot: nextSlot.trim() || '08:00 AM - 08:00 PM',
        report_turnaround_hrs: Number(reportTurnaroundHrs) || 12,
        weekly_schedule: weeklySchedule,
        rating: 0,
        reviews: 0,
        is_active: true,
        price_factor: 1,
      });
      if (error) {
        Alert.alert('Save Failed', error.message);
        return;
      }

      const priceRows = Object.entries(priceMap)
        .filter(([, v]) => v.available && Number(v.price) > 0)
        .map(([itemId, v]) => ({
          centre_id: id,
          item_id: itemId,
          price: Number(v.price),
          is_available: true,
        }));
      if (priceRows.length > 0) {
        await supabase.from('lab_centre_prices').upsert(priceRows, { onConflict: 'item_id,centre_id' });
      }
      await AsyncStorage.removeItem('@adityam_partner_add_lab_draft_v1').catch(() => {});
      router.replace('/partner/labs/services' as any);
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = labItems.filter((it) => {
    if (it.segment !== catalogSegment) return false;
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(it.name || '').toLowerCase().includes(q) ||
      String(it.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <PartnerShell
      activeRoute="labs_services"
      title="Register Lab & Diagnostics Wing"
      subtitle="4-step setup: Location, 7-day timings, tests/scans/packages & credentials"
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 920, width: '100%', alignSelf: 'center' }}>
        <TouchableOpacity
          onPress={() => router.replace('/partner/labs' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={16} color={THEME.green} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.green }}>Back to Labs Desk</Text>
        </TouchableOpacity>

        {/* 4-Step Wizard Progress Tabs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              { n: 1, label: '1. Location & Address' },
              { n: 2, label: '2. Services & Timings' },
              { n: 3, label: `3. Tests & Packages (${enabledCount})` },
              { n: 4, label: '4. Credentials & Save' },
            ] as const
          ).map((s) => {
            const active = step === s.n;
            return (
              <TouchableOpacity
                key={s.n}
                onPress={() => setStep(s.n)}
                style={{
                  flex: 1,
                  minWidth: 160,
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: active ? THEME.greenDark : THEME.surface,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step === 1 && (
          <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color={THEME.green} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Step 1: Lab Location Source & Physical Address
              </Text>
            </View>

            {/* Dropdown / Selector: Inside Hospital Branch vs Add New Standalone Lab */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Where is this Lab located? *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {branches.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setLocationMode('BRANCH')}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: locationMode === 'BRANCH' ? THEME.greenDark : THEME.border,
                      backgroundColor: locationMode === 'BRANCH' ? THEME.greenSoft : THEME.bg,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                      Inside Hospital / Branch
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      Auto-link address & GPS from hospital branch
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setLocationMode('STANDALONE');
                    setSelectedBranchId('');
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: locationMode === 'STANDALONE' ? THEME.greenDark : THEME.border,
                    backgroundColor: locationMode === 'STANDALONE' ? THEME.greenSoft : THEME.bg,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                    + Add Separate Lab Location
                  </Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    Enter standalone diagnostic centre address
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {locationMode === 'BRANCH' && branches.length > 0 && (
              <View style={{ gap: 6, zIndex: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Select Hospital Branch *</Text>
                <TouchableOpacity
                  onPress={() => setBranchDropdownOpen((v) => !v)}
                  style={{
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenDark }}>
                    {selectedBranch ? `${selectedBranch.name} (${selectedBranch.area || selectedBranch.city})` : 'Select a branch...'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                    {branchDropdownOpen ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {branchDropdownOpen && (
                  <View style={{ backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 6, gap: 4 }}>
                    {branches.map((br) => (
                      <TouchableOpacity
                        key={br.id}
                        onPress={() => applyBranch(br)}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor: selectedBranchId === br.id ? THEME.greenSoft : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                          {br.name} — {br.address || br.area}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Diagnostic Wing / Lab Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Testing -1 Diagnostics & Imaging"
                placeholderTextColor="#8B9690"
                style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Area / Locality *</Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. Mansarovar Sector 5"
                  placeholderTextColor="#8B9690"
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>City *</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Jaipur"
                  placeholderTextColor="#8B9690"
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Full Street Address *</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Building / Floor / Wing / Landmark"
                placeholderTextColor="#8B9690"
                style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Pincode</Text>
                <TextInput
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="302020"
                  keyboardType="numeric"
                  placeholderTextColor="#8B9690"
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Lab Desk Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98..."
                  keyboardType="phone-pad"
                  placeholderTextColor="#8B9690"
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13.5, color: THEME.ink }}
                />
              </View>
            </View>

            <LocationPickerInput
              address={address}
              city={city}
              pincode={pincode}
              lat={lat}
              lng={lng}
              onChangeCoords={(la, ln) => { setLat(la); setLng(ln); }}
              onFillAddressMeta={(meta) => {
                if (meta.address) setAddress(meta.address);
                if (meta.city) setCity(meta.city);
                if (meta.pincode) setPincode(meta.pincode);
              }}
            />

            <TouchableOpacity
              onPress={() => {
                persistDraft(2);
                setStep(2);
              }}
              style={{ backgroundColor: THEME.greenDark, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Save & Continue to Step 2: Services & Timings →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color={THEME.green} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Step 2: Services Provided & 7-Day Timings
              </Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Diagnostic Capabilities:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'lab', label: 'Pathology Lab Tests' },
                { id: 'scan', label: 'Radiology Scans (X-Ray / CT / MRI / USG)' },
                { id: 'package', label: 'Health Packages' },
              ].map((cap) => {
                const active = offers.includes(cap.id);
                return (
                  <TouchableOpacity
                    key={cap.id}
                    onPress={() =>
                      setOffers((prev) =>
                        prev.includes(cap.id) ? prev.filter((x) => x !== cap.id) : [...prev, cap.id]
                      )
                    }
                    style={{
                      paddingHorizontal: 13,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor: active ? THEME.greenDark : THEME.bg,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                      {active ? '✓ ' : ''}{cap.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setIs24x7((v) => !v)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, padding: 12, borderRadius: 10 }}
            >
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>24x7 Open Diagnostic Wing</Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>Available round-the-clock for walk-in & emergency scans</Text>
              </View>
              <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: is24x7 ? THEME.green : '#CBD5E1', padding: 2, alignItems: is24x7 ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' }} />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1.5, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Default Walk-in Slot Window</Text>
                <TextInput
                  value={nextSlot}
                  onChangeText={setNextSlot}
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13 }}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>Avg Report Time (hrs)</Text>
                <TextInput
                  value={reportTurnaroundHrs}
                  onChangeText={(v) => setReportTurnaroundHrs(v.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 11, fontSize: 13 }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>7-Day Lab & Scan Timings</Text>
              <TouchableOpacity
                onPress={() => {
                  const mon = weeklySchedule.Monday || '08:00 AM - 08:00 PM';
                  setWeeklySchedule(Object.fromEntries(DAYS.map((d) => [d, d === 'Sunday' ? weeklySchedule.Sunday : mon])));
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.green }}>Apply Monday to Mon–Sat</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {DAYS.map((day) => (
                <View key={day} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ width: 90, fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>{day}</Text>
                    <TextInput
                      value={weeklySchedule[day] || ''}
                      onChangeText={(val) => setWeeklySchedule((prev) => ({ ...prev, [day]: val }))}
                      style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12.5 }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingLeft: 100 }}>
                    {TIMING_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setWeeklySchedule((prev) => ({ ...prev, [day]: p }))}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 99,
                          backgroundColor: weeklySchedule[day] === p ? THEME.greenSoft : THEME.bg,
                          borderWidth: 1,
                          borderColor: weeklySchedule[day] === p ? THEME.green : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: weeklySchedule[day] === p ? THEME.green : THEME.muted }}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: THEME.ink, fontWeight: '800', fontSize: 14 }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  persistDraft(3);
                  setStep(3);
                }}
                style={{ flex: 2, backgroundColor: THEME.greenDark, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  Save & Continue to Step 3: Tests & Packages →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FlaskConical size={18} color={THEME.green} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                  Step 3: Select Tests, Scans & Packages Offered ({enabledCount} enabled)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() =>
                    setPriceMap((prev) => {
                      const next = { ...prev };
                      for (const it of filteredCatalog) {
                        next[it.id] = { price: next[it.id]?.price || '500', available: true };
                      }
                      return next;
                    })
                  }
                  style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.green }}>Enable All Shown</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setPriceMap((prev) => {
                      const next = { ...prev };
                      for (const it of filteredCatalog) {
                        next[it.id] = { price: next[it.id]?.price || '500', available: false };
                      }
                      return next;
                    })
                  }
                  style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>Clear Shown</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
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
              <Search size={15} color={THEME.muted} />
              <TextInput
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder="Search test, scan or package by name or category..."
                placeholderTextColor="#8B9690"
                style={{ flex: 1, fontSize: 13.5, color: THEME.ink }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  { id: 'lab', label: `Lab Tests (${labItems.filter((i) => i.segment === 'lab').length})` },
                  { id: 'scan', label: `Scans (${labItems.filter((i) => i.segment === 'scan').length})` },
                  { id: 'package', label: `Packages (${labItems.filter((i) => i.segment === 'package').length})` },
                ] as const
              ).map((seg) => {
                const active = catalogSegment === seg.id;
                return (
                  <TouchableOpacity
                    key={seg.id}
                    onPress={() => setCatalogSegment(seg.id)}
                    style={{
                      paddingHorizontal: 13,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor: active ? THEME.greenDark : THEME.bg,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenDark : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                      {seg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ gap: 8 }}>
              {filteredCatalog.map((it) => {
                const cur = priceMap[it.id] || { price: '500', available: false };
                return (
                  <View
                    key={it.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingVertical: 9,
                      borderBottomWidth: 1,
                      borderBottomColor: THEME.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>{it.name}</Text>
                      <Text style={{ fontSize: 11, color: THEME.muted }}>{it.category}</Text>
                    </View>
                    <TextInput
                      value={cur.price}
                      onChangeText={(v) =>
                        setPriceMap((prev) => ({
                          ...prev,
                          [it.id]: { price: v.replace(/\D/g, ''), available: true },
                        }))
                      }
                      keyboardType="numeric"
                      placeholder="₹ Price"
                      style={{ width: 90, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12.5 }}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setPriceMap((prev) => ({
                          ...prev,
                          [it.id]: { price: cur.price || '500', available: !cur.available },
                        }))
                      }
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: cur.available ? THEME.greenSoft : THEME.bg,
                        borderWidth: 1,
                        borderColor: cur.available ? THEME.green : THEME.border,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 99,
                        minWidth: 96,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: cur.available ? THEME.greenDark : THEME.muted }}>
                        {cur.available ? 'Enabled' : 'Off'}
                      </Text>
                      <View
                        style={{
                          width: 34,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: cur.available ? THEME.green : '#CBD5E1',
                          padding: 2,
                          alignItems: cur.available ? 'flex-end' : 'flex-start',
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF' }} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setStep(2)}
                style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: THEME.ink, fontWeight: '800', fontSize: 14 }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  persistDraft(4);
                  setStep(4);
                }}
                style={{ flex: 2, backgroundColor: THEME.greenDark, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  Save & Continue to Step 4: Credentials →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: THEME.border, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={THEME.green} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Step 4: Credentials & Activation
              </Text>
            </View>

            {locationMode === 'BRANCH' && hospitalInfo ? (
              <View style={{ backgroundColor: THEME.greenSoft, borderWidth: 1, borderColor: THEME.greenBorder, borderRadius: 12, padding: 12, gap: 4 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>
                  ✓ Using Verified Hospital Registration ({hospitalInfo.name})
                </Text>
                <Text style={{ fontSize: 12, color: THEME.green }}>
                  No separate certificate upload needed because this diagnostic wing is inside your verified hospital branch.
                </Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>NABL / Clinical Establishment Reg. No.</Text>
              <TextInput
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g. NABL-MC-4521 or CEA-RJ-9012"
                placeholderTextColor="#8B9690"
                style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, padding: 12, fontSize: 13.5, color: THEME.ink }}
              />
            </View>

            {locationMode === 'STANDALONE' && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.ink }}>
                  Upload Lab Registration / NABL Certificate *
                </Text>
                <TouchableOpacity
                  disabled={uploadingCert}
                  onPress={async () => {
                    try {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) return;
                      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
                      if (res.canceled || !res.assets?.[0]?.uri) return;
                      setUploadingCert(true);
                      const url = await uploadPrescriptionSlip(
                        res.assets[0].uri,
                        `lab-cert-${Date.now()}.jpg`,
                        res.assets[0].mimeType || 'image/jpeg'
                      );
                      setCertUrl(url);
                    } finally {
                      setUploadingCert(false);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: THEME.bg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 10,
                    paddingVertical: 12,
                  }}
                >
                  <Upload size={15} color={THEME.green} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.green }}>
                    {uploadingCert ? 'Uploading Certificate...' : certUrl ? 'Replace Certificate Image' : 'Upload Certificate Photo'}
                  </Text>
                </TouchableOpacity>
                {certUrl ? (
                  <Image source={{ uri: certUrl }} style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: THEME.bg }} resizeMode="contain" />
                ) : null}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setNablCertified((v) => !v)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, padding: 12, borderRadius: 10 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>NABL Accredited Lab</Text>
              <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: nablCertified ? THEME.green : '#CBD5E1', padding: 2, alignItems: nablCertified ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAcceptedTerms((v) => !v)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.greenSoft, padding: 12, borderRadius: 10, gap: 10 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenDark, flex: 1 }}>
                I confirm all diagnostic tests, scans, prices & timings are accurate for Adityam Niramayaa walk-in patients.
              </Text>
              <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: acceptedTerms ? THEME.green : '#CBD5E1', padding: 2, alignItems: acceptedTerms ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' }} />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setStep(3)}
                style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, paddingVertical: 13, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: THEME.ink, fontWeight: '800', fontSize: 14 }}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={handleSubmit}
                style={{
                  flex: 2,
                  backgroundColor: THEME.greenDark,
                  paddingVertical: 14,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                      Save & Activate In-Hospital Lab Wing
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </PartnerShell>
  );
}
