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
import { THEME, ExtendedPharmacy, getPharmacySlug } from './pharmacyTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { SelectDropdown } from '../SelectDropdown';
import {
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../WeeklyScheduleEditor';

interface AddPharmacyPageProps {
  editSlug?: string;
  isUploadingPhoto: boolean;
  onPickPhoto: (onPicked: (url: string) => void) => Promise<void>;
  onCancel: () => void;
  onSaved: (slug: string) => Promise<void>;
}

export function AddPharmacyPage({
  editSlug,
  isUploadingPhoto,
  onPickPhoto,
  onCancel,
  onSaved,
}: AddPharmacyPageProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // 1. Store Details & License
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [drugLicense, setDrugLicense] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [discountPct, setDiscountPct] = useState('15');
  const [commissionPct, setCommissionPct] = useState('10');
  const [is24x7, setIs24x7] = useState(false);
  const [delivery, setDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // 2. Location, Contacts & Delivery Rules
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [pincode, setPincode] = useState('302001');
  const [lat, setLat] = useState('26.9124');
  const [lng, setLng] = useState('75.7873');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('5');
  const [deliveryTimeMins, setDeliveryTimeMins] = useState('35');
  const [minOrderFreeDelivery, setMinOrderFreeDelivery] = useState('299');

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
        const [hospRes, pharmRes] = await Promise.all([
          supabase.from('hospitals').select('*').order('name'),
          editSlug ? supabase.from('pharmacies').select('*') : Promise.resolve({ data: null }),
        ]);

        if (hospRes.data && active) setHospitals(hospRes.data as Hospital[]);

        if (editSlug && pharmRes.data && active) {
          const found = (pharmRes.data as ExtendedPharmacy[]).find(
            (p) => getPharmacySlug(p) === editSlug || p.id === editSlug
          );
          if (found) {
            setEditingId(found.id);
            setName(found.name || '');
            setSlug(getPharmacySlug(found));
            setImageUrl(found.image_url || '');
            setDrugLicense(found.drug_license_number || '');
            setGstNumber(found.gst_number || '');
            setDiscountPct(String(found.app_discount_pct ?? 15));
            setCommissionPct(String(found.commission_percentage ?? 10));
            setIs24x7(Boolean(found.is_24x7));
            setDelivery(found.delivery !== false);
            setPickup(found.pickup !== false);
            setFeatured(Boolean(found.is_featured));
            setIsActive(found.is_active !== false);

            setPhone1(found.shop_phone || '');
            setPhone2(found.secondary_phone || '');
            setShopAddress(found.shop_address || '');
            setArea(found.area || '');
            setCity(found.city || 'Jaipur');
            setPincode(found.pincode || '302001');
            setLat(found.latitude != null ? String(found.latitude) : '26.9124');
            setLng(found.longitude != null ? String(found.longitude) : '75.7873');
            setDeliveryRadiusKm(String(found.delivery_radius_km ?? 5));
            setDeliveryTimeMins(String(found.delivery_time_mins ?? 35));
            setMinOrderFreeDelivery(String(found.min_order_free_delivery ?? 299));
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

  const handleSave = async () => {
    if (!name.trim() || !area.trim()) {
      Alert.alert('Missing Details', 'Please enter Pharmacy Name and Area.');
      return;
    }

    setIsSaving(true);
    const cleanSlug =
      (slug.trim() || name.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `pharmacy-${Date.now()}`;

    const basePayload = {
      name: name.trim(),
      area: area.trim(),
      city: city.trim() || 'Jaipur',
      state: 'Rajasthan',
      pincode: pincode.trim() || '302001',
      latitude: Number(lat) || 26.9124,
      longitude: Number(lng) || 75.7873,
      delivery,
      pickup,
      app_discount_pct: Number(discountPct) || 15,
      shop_address: shopAddress.trim() || `${area.trim()}, ${city.trim() || 'Jaipur'}`,
      shop_phone: phone1.trim() || null,
      is_active: isActive,
    };

    const fullPayload = {
      ...basePayload,
      slug: cleanSlug,
      image_url: imageUrl.trim() || null,
      secondary_phone: phone2.trim() || null,
      drug_license_number: drugLicense.trim() || null,
      gst_number: gstNumber.trim() || null,
      is_24x7: is24x7,
      weekly_schedule: weeklySchedule,
      delivery_radius_km: Number(deliveryRadiusKm) || 5,
      delivery_time_mins: Number(deliveryTimeMins) || 35,
      min_order_free_delivery: Number(minOrderFreeDelivery) || 299,
      commission_percentage: Number(commissionPct) || 10,
      hospital_id: linkedHospitalId || null,
      is_featured: featured,
    };

    try {
      const supabase = getSupabaseClient();
      let savedSlug = cleanSlug;

      if (editingId) {
        let { error } = await supabase.from('pharmacies').update(fullPayload).eq('id', editingId);
        if (error && isMissingColumnError(error)) {
          ({ error } = await supabase.from('pharmacies').update(basePayload).eq('id', editingId));
          savedSlug = cleanSlug;
        }
        if (error) throw error;
      } else {
        const newId = `pharm-${Date.now()}`;
        let { error } = await supabase
          .from('pharmacies')
          .insert({ id: newId, rating: 4.6, reviews: 120, ...fullPayload });
        if (error && isMissingColumnError(error)) {
          ({ error } = await supabase
            .from('pharmacies')
            .insert({ id: newId, rating: 4.6, reviews: 120, ...basePayload }));
        }
        if (error) throw error;
      }

      await onSaved(savedSlug);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save pharmacy.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingEdit) {
    return (
      <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={THEME.greenPrimary} />
        <Text style={{ marginTop: 10, color: THEME.muted, fontSize: 13 }}>Loading pharmacy details...</Text>
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
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
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
              {editingId ? 'Edit Pharmacy Store' : 'Add Partner Pharmacy'}
            </Text>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Store license, location, delivery rules & operating hours
            </Text>
          </View>
        </View>
      </View>

      {/* Two-Column Top Cards */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* Card 1: Store Details & License */}
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
            1. Store Details & License
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
              placeholder="Storefront photo URL or upload"
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
                Pharmacy Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (!editingId && !slug) {
                    setSlug(txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }
                }}
                placeholder="e.g. Apollo Pharmacy - Malviya Nagar"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                URL Slug
              </Text>
              <TextInput value={slug} onChangeText={setSlug} placeholder="apollo-malviya-nagar" style={inputStyle} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Drug License No.
              </Text>
              <TextInput
                value={drugLicense}
                onChangeText={setDrugLicense}
                placeholder="RJ-JPR-20B/12345"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                GST Number (Optional)
              </Text>
              <TextInput value={gstNumber} onChangeText={setGstNumber} placeholder="08ABCDE1234F1Z5" style={inputStyle} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                App Discount (%)
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

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Active', val: isActive, toggle: () => setIsActive(!isActive) },
              { label: '24x7 Open', val: is24x7, toggle: () => setIs24x7(!is24x7) },
              { label: 'Home Delivery', val: delivery, toggle: () => setDelivery(!delivery) },
              { label: 'Store Pickup', val: pickup, toggle: () => setPickup(!pickup) },
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

        {/* Card 2: Location, Contacts & Delivery Rules */}
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
            2. Location, Contacts & Delivery Rules
          </Text>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 1 (Store Counter)
              </Text>
              <TextInput value={phone1} onChangeText={setPhone1} placeholder="+91 141..." style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Phone 2 (Owner / Alt)
              </Text>
              <TextInput value={phone2} onChangeText={setPhone2} placeholder="+91 98290..." style={inputStyle} />
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
              Full Shop Address
            </Text>
            <TextInput
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="Shop 12, Gaurav Tower Marg, Malviya Nagar, Jaipur"
              style={inputStyle}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1.2 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Area / Locality *
              </Text>
              <TextInput value={area} onChangeText={setArea} placeholder="Malviya Nagar" style={inputStyle} />
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

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Delivery Radius (km)
              </Text>
              <TextInput
                value={deliveryRadiusKm}
                onChangeText={setDeliveryRadiusKm}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Est. Delivery (mins)
              </Text>
              <TextInput
                value={deliveryTimeMins}
                onChangeText={setDeliveryTimeMins}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.muted, marginBottom: 5 }}>
                Free Delivery (₹)
              </Text>
              <TextInput
                value={minOrderFreeDelivery}
                onChangeText={setMinOrderFreeDelivery}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Collapsible Full-Width Store Hours Card */}
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
                Store Operating Hours (Day-by-Day)
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
            title="Weekly Store Timings"
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
          label="Link to Partner Hospital (Leave standalone if independent medical store)"
          placeholder="Standalone Medical Store"
          value={linkedHospitalId}
          options={[
            { value: '', label: 'Standalone Medical Store (No Hospital)' },
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
            {isSaving ? 'Saving...' : editingId ? 'Save Pharmacy Changes' : 'Save Partner Pharmacy'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
