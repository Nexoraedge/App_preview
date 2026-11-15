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
import type { Hospital } from '@adityam/types';
import { THEME, ExtendedLabCentre, getLabSlug } from './labTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { SelectDropdown } from '../SelectDropdown';
import {
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../WeeklyScheduleEditor';

interface AddLabPageProps {
  editSlug?: string;
  isUploadingPhoto: boolean;
  onPickPhoto: (onPicked: (url: string) => void) => Promise<void>;
  onCancel: () => void;
  onSaved: (slug: string) => Promise<void>;
}

export function AddLabPage({
  editSlug,
  isUploadingPhoto,
  onPickPhoto,
  onCancel,
  onSaved,
}: AddLabPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // 1. Centre Details & Capabilities
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [discountPct, setDiscountPct] = useState('20');
  const [commissionPct, setCommissionPct] = useState('12');
  const [offers, setOffers] = useState<string[]>(['lab', 'package']);
  const [nablCertified, setNablCertified] = useState(true);
  const [is24x7, setIs24x7] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // 2. Location, Contacts & Home Collection Rules
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [pincode, setPincode] = useState('302001');
  const [lat, setLat] = useState('26.9124');
  const [lng, setLng] = useState('75.7873');

  const [homeCollection, setHomeCollection] = useState(true);
  const [homeRadiusKm, setHomeRadiusKm] = useState('10');
  const [homeFee, setHomeFee] = useState('0');
  const [freeAbove, setFreeAbove] = useState('499');
  const [homeSlots, setHomeSlots] = useState('6:30 AM - 11:00 AM, 4:00 PM - 7:30 PM');
  const [homePincodes, setHomePincodes] = useState('302001, 302017, 302020, 302021');
  const [reportHrs, setReportHrs] = useState('12');

  // 3. Operating Hours & Optional Hospital Link
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [linkedHospitalId, setLinkedHospitalId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editSlug));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        const supabase = getSupabaseClient();
        const [hospRes, labRes] = await Promise.all([
          supabase.from('hospitals').select('*').order('name'),
          editSlug ? supabase.from('lab_centres').select('*') : Promise.resolve({ data: null }),
        ]);

        if (hospRes.data && active) setHospitals(hospRes.data as Hospital[]);

        if (editSlug && labRes.data && active) {
          const found = (labRes.data as ExtendedLabCentre[]).find(
            (c) => getLabSlug(c) === editSlug || c.id === editSlug
          );
          if (found) {
            setEditingId(found.id);
            setName(found.name || '');
            setSlug(getLabSlug(found));
            setImageUrl(found.image_url || '');
            setLicenseNumber(found.license_number || '');
            setDiscountPct(String(found.discount_percentage ?? 20));
            setCommissionPct(String(found.commission_percentage ?? 12));
            setOffers(Array.isArray(found.offers) && found.offers.length > 0 ? found.offers : ['lab']);
            setNablCertified(found.nabl_certified !== false);
            setIs24x7(Boolean(found.is_24x7));
            setFeatured(Boolean(found.is_featured));
            setIsActive(found.is_active !== false);

            setPhone1(found.phone || '');
            setPhone2(found.secondary_phone || '');
            setAddress(found.address || '');
            setArea(found.area || '');
            setCity(found.city || 'Jaipur');
            setPincode(found.pincode || '302001');
            setLat(found.latitude != null ? String(found.latitude) : '26.9124');
            setLng(found.longitude != null ? String(found.longitude) : '75.7873');

            setHomeCollection(found.home_collection !== false);
            setHomeRadiusKm(String(found.home_collection_radius_km ?? 10));
            setHomeFee(String(found.home_collection_fee ?? 0));
            setFreeAbove(String(found.free_home_collection_above ?? 499));
            setHomeSlots(found.home_collection_slots || '6:30 AM - 11:00 AM, 4:00 PM - 7:30 PM');
            setHomePincodes(found.home_collection_pincodes || '302001, 302017, 302020, 302021');
            setReportHrs(String(found.report_turnaround_hrs ?? 12));

            if (found.weekly_schedule) setWeeklySchedule(found.weekly_schedule);
            setLinkedHospitalId(found.hospital_id || '');
          }
        }
      } catch {
        // Ignore load errors
      } finally {
        if (active) setIsLoadingEdit(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, [editSlug]);

  const toggleOffer = (cap: string) => {
    setOffers((prev) => {
      if (prev.includes(cap)) {
        return prev.length > 1 ? prev.filter((x) => x !== cap) : prev;
      }
      return [...prev, cap];
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !area.trim()) {
      Alert.alert('Missing Details', 'Please enter Centre Name and Area.');
      return;
    }

    setIsSaving(true);
    const cleanSlug =
      (slug.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `lab-${Date.now()}`;

    const basePayload = {
      name: name.trim(),
      area: area.trim(),
      city: city.trim() || 'Jaipur',
      state: 'Rajasthan',
      pincode: pincode.trim() || '302001',
      latitude: Number(lat) || 26.9124,
      longitude: Number(lng) || 75.7873,
      home_collection: homeCollection,
      offers,
      is_active: isActive,
    };

    const fullPayload = {
      ...basePayload,
      slug: cleanSlug,
      image_url: imageUrl.trim() || null,
      address: address.trim() || `${area.trim()}, ${city.trim() || 'Jaipur'}`,
      phone: phone1.trim() || null,
      secondary_phone: phone2.trim() || null,
      nabl_certified: nablCertified,
      license_number: licenseNumber.trim() || null,
      is_24x7: is24x7,
      weekly_schedule: weeklySchedule,
      home_collection_radius_km: Number(homeRadiusKm) || 10,
      home_collection_fee: Number(homeFee) || 0,
      free_home_collection_above: Number(freeAbove) || 499,
      home_collection_slots: homeSlots.trim() || null,
      home_collection_pincodes: homePincodes.trim() || null,
      report_turnaround_hrs: Number(reportHrs) || 12,
      discount_percentage: Number(discountPct) || 20,
      commission_percentage: Number(commissionPct) || 12,
      hospital_id: linkedHospitalId || null,
      is_featured: featured,
    };

    try {
      const supabase = getSupabaseClient();
      if (editingId) {
        let { error } = await supabase.from('lab_centres').update(fullPayload).eq('id', editingId);
        if (error && isMissingColumnError(error)) {
          ({ error } = await supabase.from('lab_centres').update(basePayload).eq('id', editingId));
        }
        if (error) throw error;
      } else {
        const newId = `lab-${Date.now()}`;
        let { error } = await supabase
          .from('lab_centres')
          .insert({ id: newId, rating: 4.6, reviews: 140, price_factor: 1.0, ...fullPayload });
        if (error && isMissingColumnError(error)) {
          ({ error } = await supabase
            .from('lab_centres')
            .insert({ id: newId, rating: 4.6, reviews: 140, price_factor: 1.0, ...basePayload }));
        }
        if (error) throw error;
      }

      await onSaved(cleanSlug);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save lab centre.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingEdit) {
    return (
      <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={THEME.greenPrimary} />
        <Text style={{ marginTop: 10, color: THEME.muted, fontSize: 13 }}>Loading lab centre...</Text>
      </View>
    );
  }

  const inputStyle = {
    backgroundColor: THEME.creamBg,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    fontSize: 13,
    color: THEME.ink,
  } as const;

  return (
    <View style={{ gap: 18 }}>
      {/* Top Bar */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 16,
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
            width: 36,
            height: 36,
            borderRadius: 9,
            backgroundColor: THEME.creamSoft,
            borderWidth: 1,
            borderColor: THEME.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={16} color={THEME.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: THEME.ink }}>
            {editingId ? 'Edit Lab / Scan Centre' : 'Add Lab & Scan Centre'}
          </Text>
          <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
            Capabilities (Labs, Scans, Home Checkups), NABL, location & hospital linking
          </Text>
        </View>
      </View>

      {/* Two-Column Top Cards */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* Card 1: Centre Details & Capabilities */}
        <View
          style={{
            flex: 1,
            width: isDesktop ? undefined : '100%',
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            1. Centre Details & Capabilities
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {Boolean(imageUrl) && (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: THEME.creamSoft }}
              />
            )}
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Centre photo URL or upload"
              style={[inputStyle, { flex: 1 }]}
            />
            <TouchableOpacity
              disabled={isUploadingPhoto}
              onPress={() => onPickPhoto((url) => setImageUrl(url))}
              style={{
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Upload size={14} color={THEME.greenPrimary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                {isUploadingPhoto ? '...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1.5 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Lab / Scan Centre Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!editingId && !slug) {
                    setSlug(txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }
                }}
                placeholder="e.g. Dr. Lal PathLabs - Vaishali Nagar"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                URL Slug
              </Text>
              <TextInput value={slug} onChangeText={setSlug} placeholder="lal-pathlabs-vaishali" style={inputStyle} />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted }}>
              What This Centre Offers
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'lab', label: 'Pathology / Blood Labs' },
                { id: 'scan', label: 'Scans & MRI / CT / X-Ray' },
                { id: 'package', label: 'Full Body Checkup Packages' },
              ].map((cap) => {
                const active = offers.includes(cap.id);
                return (
                  <TouchableOpacity
                    key={cap.id}
                    onPress={() => toggleOffer(cap.id)}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: active ? THEME.greenPrimary : THEME.creamBg,
                      borderWidth: 1,
                      borderColor: active ? THEME.greenPrimary : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                      {cap.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1.4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                NABL / Reg. License No.
              </Text>
              <TextInput
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="NABL-MC-4521"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Discount (%)
              </Text>
              <TextInput value={discountPct} onChangeText={setDiscountPct} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Commission (%)
              </Text>
              <TextInput value={commissionPct} onChangeText={setCommissionPct} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Active', val: isActive, toggle: () => setIsActive(!isActive) },
              { label: 'NABL Certified', val: nablCertified, toggle: () => setNablCertified(!nablCertified) },
              { label: '24x7 Open', val: is24x7, toggle: () => setIs24x7(!is24x7) },
              { label: 'Featured', val: featured, toggle: () => setFeatured(!featured) },
            ].map((t) => (
              <TouchableOpacity
                key={t.label}
                onPress={t.toggle}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
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

        {/* Card 2: Location, Contacts & Home Collection */}
        <View
          style={{
            flex: 1,
            width: isDesktop ? undefined : '100%',
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 20,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
            2. Location, Contacts & Home Checkups
          </Text>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 1 (Booking Desk)
              </Text>
              <TextInput value={phone1} onChangeText={setPhone1} placeholder="+91 141..." style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 2 (Home Sample Team)
              </Text>
              <TextInput value={phone2} onChangeText={setPhone2} placeholder="+91 98290..." style={inputStyle} />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Full Centre Address
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Plot 18, Amrapali Marg, Vaishali Nagar, Jaipur"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1.2 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Area / Locality *
              </Text>
              <TextInput value={area} onChangeText={setArea} placeholder="Vaishali Nagar" style={inputStyle} />
            </View>
            <View style={{ flex: 0.9 }}>
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

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => setHomeCollection(!homeCollection)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: homeCollection ? THEME.greenPrimary : THEME.creamBg,
                borderWidth: 1,
                borderColor: homeCollection ? THEME.greenPrimary : THEME.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: homeCollection ? '#FFFFFF' : THEME.ink }}>
                Home Sample Collection: {homeCollection ? 'Yes' : 'Walk-in Only'}
              </Text>
            </TouchableOpacity>
            <View style={{ width: 130 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, marginBottom: 3 }}>
                Report Time (hrs)
              </Text>
              <TextInput value={reportHrs} onChangeText={setReportHrs} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          {homeCollection && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Radius (km)
                  </Text>
                  <TextInput value={homeRadiusKm} onChangeText={setHomeRadiusKm} keyboardType="numeric" style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Home Fee (₹)
                  </Text>
                  <TextInput value={homeFee} onChangeText={setHomeFee} keyboardType="numeric" style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                    Free Above (₹)
                  </Text>
                  <TextInput value={freeAbove} onChangeText={setFreeAbove} keyboardType="numeric" style={inputStyle} />
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Home Collection Slot Timings
                </Text>
                <TextInput value={homeSlots} onChangeText={setHomeSlots} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                  Serviceable Pincodes / Areas (comma-separated)
                </Text>
                <TextInput
                  value={homePincodes}
                  onChangeText={setHomePincodes}
                  placeholder="302001, 302017, 302020, Vaishali Nagar"
                  style={inputStyle}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Collapsible Full-Width Hours Card */}
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
                Centre Operating Hours (Day-by-Day)
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                {is24x7 ? 'Open 24 Hours · All 7 Days' : summarizeWeeklySchedule(weeklySchedule)}
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
            {showScheduleEditor ? <ChevronUp size={15} color={THEME.ink} /> : <ChevronDown size={15} color={THEME.ink} />}
          </View>
        </TouchableOpacity>

        {showScheduleEditor && (
          <WeeklyScheduleEditor
            value={weeklySchedule}
            onChange={setWeeklySchedule}
            title="Weekly Diagnostic Centre Hours"
          />
        )}
      </View>

      {/* Optional Hospital Link */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 20,
          borderWidth: 1,
          borderColor: THEME.border,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
          3. Optional In-House Hospital Link
        </Text>
        <SelectDropdown
          label="Link to Partner Hospital (Leave standalone if independent diagnostic centre)"
          placeholder="Standalone Diagnostic Centre"
          value={linkedHospitalId}
          options={[
            { value: '', label: 'Standalone Diagnostic Centre (No Hospital)' },
            ...hospitals.map((h) => ({
              value: h.id,
              label: h.name,
              subtitle: h.address || undefined,
            })),
          ]}
          onChange={(hospId) => setLinkedHospitalId(hospId)}
        />
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
            {isSaving ? 'Saving...' : editingId ? 'Save Centre Changes' : 'Save Lab & Scan Centre'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
