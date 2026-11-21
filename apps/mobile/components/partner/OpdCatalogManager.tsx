import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  Clock,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';

const THEME = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2EA',
  border: '#E6E1D5',
  greenDark: '#14362B',
  green: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  redText: '#991B1B',
  redBg: '#FDF2F2',
  redBorder: '#F5C2C2',
};

const FACILITY_OPTIONS = [
  'OPD',
  '24x7 Care',
  'ICU',
  'Pharmacy',
  'Pathology',
  'Parking',
  'Wheelchair',
  'Cashless TPA',
];

interface OpdCatalogManagerProps {
  mode: 'doctors' | 'hospital';
  hospitalId?: string | null;
  actorId?: string;
}

export function OpdCatalogManager({ mode, hospitalId, actorId }: OpdCatalogManagerProps) {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospId, setSelectedHospId] = useState<string | null>(hospitalId || null);
  const [branches, setBranches] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Add / Edit Hospital State
  const [showAddHosp, setShowAddHosp] = useState(false);
  const [hospName, setHospName] = useState('');
  const [hospCity, setHospCity] = useState('Jaipur');
  const [hospAddr, setHospAddr] = useState('');
  const [hospPincode, setHospPincode] = useState('302003');
  const [hospPhone, setHospPhone] = useState('');
  const [hospLat, setHospLat] = useState('26.9205');
  const [hospLng, setHospLng] = useState('75.8450');
  const [hospOpdHours, setHospOpdHours] = useState('Mon-Sat · 9:00 AM - 8:00 PM');
  const [hospSpecialties, setHospSpecialties] = useState('General Medicine, Cardiology, Orthopedics');
  const [hospFacilities, setHospFacilities] = useState<string[]>(['OPD', 'Parking', 'Pharmacy']);
  const [hospIs24x7, setHospIs24x7] = useState(false);
  const [savingHosp, setSavingHosp] = useState(false);

  // Add Branch State
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [brName, setBrName] = useState('');
  const [brArea, setBrArea] = useState('');
  const [brAddr, setBrAddr] = useState('');
  const [brCity, setBrCity] = useState('Jaipur');
  const [brLat, setBrLat] = useState('26.9205');
  const [brLng, setBrLng] = useState('75.8450');
  const [brPhone, setBrPhone] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);

  // Add / Edit Doctor State
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState('General Medicine');
  const [docQual, setDocQual] = useState('MBBS, MD');
  const [docExp, setDocExp] = useState('8');
  const [docFee, setDocFee] = useState('500');
  const [docTiming, setDocTiming] = useState('Mon-Sat, 10:00 AM - 2:00 PM, 5:00 PM - 8:00 PM');
  const [docCapacity, setDocCapacity] = useState('6');
  const [docBranchId, setDocBranchId] = useState<string>('');
  const [savingDoc, setSavingDoc] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      let q = supabase.from('hospitals').select('*').order('name');
      if (hospitalId) q = q.eq('id', hospitalId);
      const { data: hospRows } = await q;
      const list = hospRows || [];
      setHospitals(list);

      const targetId = hospitalId || selectedHospId || list[0]?.id || null;
      if (targetId && targetId !== selectedHospId) {
        setSelectedHospId(targetId);
      }

      if (targetId) {
        const activeHosp = list.find((h: any) => h.id === targetId);
        if (activeHosp) {
          setHospName(activeHosp.name || '');
          setHospCity(activeHosp.city || 'Jaipur');
          setHospAddr(activeHosp.address || '');
          setHospPincode(activeHosp.pincode || '302003');
          setHospPhone(activeHosp.contact_number || '');
          setHospLat(String(activeHosp.latitude ?? '26.9205'));
          setHospLng(String(activeHosp.longitude ?? '75.8450'));
          setHospOpdHours(activeHosp.opd_hours || 'Mon-Sat · 9:00 AM - 8:00 PM');
          setHospSpecialties(
            Array.isArray(activeHosp.specialties) ? activeHosp.specialties.join(', ') : ''
          );
          setHospFacilities(Array.isArray(activeHosp.facilities) ? activeHosp.facilities : []);
          setHospIs24x7(Boolean(activeHosp.is_24x7));
        }

        const [brRes, docRes] = await Promise.all([
          supabase
            .from('hospital_branches')
            .select('*')
            .eq('hospital_id', targetId)
            .order('is_main_branch', { ascending: false }),
          supabase
            .from('doctors')
            .select('*')
            .eq('hospital_id', targetId)
            .order('name', { ascending: true }),
        ]);
        setBranches(brRes.data || []);
        setDoctors(docRes.data || []);
        if (!docBranchId && brRes.data?.[0]?.id) {
          setDocBranchId(brRes.data[0].id);
        }
      } else {
        setBranches([]);
        setDoctors([]);
      }
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [hospitalId, selectedHospId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const activeHospital = hospitals.find((h) => h.id === selectedHospId) || null;

  const notify = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleToggleHospitalActive = async (val: boolean) => {
    if (!activeHospital) return;
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('hospitals')
        .update({ is_active: val, updated_at: new Date().toISOString() })
        .eq('id', activeHospital.id);
      notify(val ? 'Hospital is now OPEN on patient app.' : 'Hospital marked Currently Unavailable.');
      await loadCatalog();
    } catch {}
  };

  const handleSaveHospital = async (isCreatingNew: boolean) => {
    if (!hospName.trim() || !hospAddr.trim()) {
      notify('Please enter hospital name and address.');
      return;
    }
    setSavingHosp(true);
    try {
      const supabase = getSupabaseClient();
      const latNum = Number(hospLat) || 26.9205;
      const lngNum = Number(hospLng) || 75.845;
      const cleanSpecs = hospSpecialties.split(',').map((s) => s.trim()).filter(Boolean);

      if (isCreatingNew || !activeHospital) {
        const newId = `hosp-${Date.now().toString(36)}`;
        const slug = hospName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36).slice(-3);
        const { error } = await supabase.from('hospitals').insert({
          id: newId,
          name: hospName.trim(),
          slug,
          tag: 'Partner Hospital',
          address: hospAddr.trim(),
          city: hospCity.trim() || 'Jaipur',
          state: 'Rajasthan',
          pincode: hospPincode.trim() || '302003',
          latitude: latNum,
          longitude: lngNum,
          location: `SRID=4326;POINT(${lngNum} ${latNum})`,
          contact_number: hospPhone.trim() || '+91 141 0000000',
          discount_percentage: 15,
          specialties: cleanSpecs,
          facilities: hospFacilities,
          is_24x7: hospIs24x7,
          opd_hours: hospOpdHours.trim(),
          is_active: true,
        });
        if (error) throw error;

        // Create default main branch so doctors can be assigned right away
        await supabase.from('hospital_branches').insert({
          id: `br-${Date.now().toString(36)}`,
          hospital_id: newId,
          name: `${hospName.trim()} - Main Branch`,
          area: hospCity.trim() || 'Main Campus',
          address: hospAddr.trim(),
          city: hospCity.trim() || 'Jaipur',
          latitude: latNum,
          longitude: lngNum,
          contact_number: hospPhone.trim() || '+91 141 0000000',
          is_main_branch: true,
          is_active: true,
        });

        setSelectedHospId(newId);
        setShowAddHosp(false);
        notify('Hospital & Main Branch created!');
      } else {
        const { error } = await supabase
          .from('hospitals')
          .update({
            name: hospName.trim(),
            address: hospAddr.trim(),
            city: hospCity.trim() || 'Jaipur',
            pincode: hospPincode.trim() || '302003',
            latitude: latNum,
            longitude: lngNum,
            contact_number: hospPhone.trim() || activeHospital.contact_number,
            specialties: cleanSpecs,
            facilities: hospFacilities,
            is_24x7: hospIs24x7,
            opd_hours: hospOpdHours.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeHospital.id);
        if (error) throw error;
        notify('Hospital details updated.');
      }
      await loadCatalog();
    } catch (err: any) {
      notify(err?.message || 'Could not save hospital.');
    } finally {
      setSavingHosp(false);
    }
  };

  const handleAddBranch = async () => {
    if (!activeHospital || !brName.trim()) {
      notify('Enter branch name.');
      return;
    }
    setSavingBranch(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('hospital_branches').insert({
        id: `br-${Date.now().toString(36)}`,
        hospital_id: activeHospital.id,
        name: brName.trim(),
        area: brArea.trim() || brCity.trim() || 'Jaipur',
        address: brAddr.trim() || activeHospital.address,
        city: brCity.trim() || activeHospital.city || 'Jaipur',
        latitude: Number(brLat) || Number(activeHospital.latitude) || 26.9205,
        longitude: Number(brLng) || Number(activeHospital.longitude) || 75.845,
        contact_number: brPhone.trim() || activeHospital.contact_number,
        is_main_branch: branches.length === 0,
        is_active: true,
      });
      if (error) throw error;
      setBrName('');
      setBrArea('');
      setBrAddr('');
      setShowAddBranch(false);
      notify('Branch added.');
      await loadCatalog();
    } catch (err: any) {
      notify(err?.message || 'Could not add branch.');
    } finally {
      setSavingBranch(false);
    }
  };

  const handleToggleBranch = async (b: any, val: boolean) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('hospital_branches')
        .update({ is_active: val })
        .eq('id', b.id);
      await loadCatalog();
    } catch {}
  };

  const handleSaveDoctor = async () => {
    if (!activeHospital || !docName.trim()) {
      notify('Enter doctor name.');
      return;
    }
    setSavingDoc(true);
    try {
      const supabase = getSupabaseClient();
      const feeNum = Math.max(50, Number(docFee) || 500);
      const discPct = Number(activeHospital.discount_percentage ?? 0);
      const discountedFee = Math.max(50, Math.round(feeNum * (1 - discPct / 100)));
      const capNum = Math.min(8, Math.max(5, Number(docCapacity) || 6));
      const targetBranch = docBranchId || branches[0]?.id || null;

      if (editingDocId) {
        const { error } = await supabase
          .from('doctors')
          .update({
            name: docName.trim(),
            branch_id: targetBranch,
            specialty: docSpec.trim() || 'General Medicine',
            qualification: docQual.trim() || 'MBBS',
            experience_years: Number(docExp) || 5,
            consultation_fee: feeNum,
            discounted_fee: discountedFee,
            opd_timing: docTiming.trim(),
            opd_hours: docTiming.trim(),
            slot_capacity: capNum,
          })
          .eq('id', editingDocId);
        if (error) throw error;
        notify('Doctor updated.');
      } else {
        const { error } = await supabase.from('doctors').insert({
          id: `doc-${Date.now().toString(36)}`,
          hospital_id: activeHospital.id,
          branch_id: targetBranch,
          name: docName.trim(),
          specialty: docSpec.trim() || 'General Medicine',
          qualification: docQual.trim() || 'MBBS',
          experience_years: Number(docExp) || 5,
          consultation_fee: feeNum,
          discounted_fee: discountedFee,
          opd_timing: docTiming.trim(),
          opd_hours: docTiming.trim(),
          slot_capacity: capNum,
          is_active: true,
        });
        if (error) throw error;
        notify('Doctor added to hospital.');
      }
      setShowAddDoc(false);
      setEditingDocId(null);
      setDocName('');
      await loadCatalog();
    } catch (err: any) {
      notify(err?.message || 'Could not save doctor.');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleDoctor = async (d: any, val: boolean) => {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('doctors').update({ is_active: val }).eq('id', d.id);
      await loadCatalog();
    } catch {}
  };

  const handleDeleteDoctor = async (d: any) => {
    const runDelete = async () => {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('doctors').delete().eq('id', d.id);
        notify(`Removed ${d.name}.`);
        await loadCatalog();
      } catch {}
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete ${d.name} from OPD directory?`)) {
        await runDelete();
      }
    } else {
      Alert.alert('Delete Doctor?', `Remove ${d.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={THEME.green} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {statusMsg && (
        <View
          style={{
            backgroundColor: THEME.greenSoft,
            borderWidth: 1,
            borderColor: THEME.greenBorder,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenDark }}>{statusMsg}</Text>
        </View>
      )}

      {/* Hospital Selector (if multiple hospitals) */}
      {hospitals.length > 0 && !hospitalId && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {hospitals.map((h) => {
            const active = h.id === selectedHospId;
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => {
                  setSelectedHospId(h.id);
                  setShowAddHosp(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: active ? THEME.greenDark : THEME.surface,
                  borderWidth: 1,
                  borderColor: active ? THEME.greenDark : THEME.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : THEME.ink }}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {mode === 'hospital' && (
            <TouchableOpacity
              onPress={() => {
                setShowAddHosp(true);
                setHospName('');
                setHospAddr('');
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: THEME.greenSoft,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={14} color={THEME.greenDark} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>Add Hospital</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* HOSPITAL & BRANCHES MODE */}
      {mode === 'hospital' && (showAddHosp || !activeHospital) ? (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 10,
            maxWidth: 680,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
            Add New Partner Hospital
          </Text>
          <TextInput
            value={hospName}
            onChangeText={setHospName}
            placeholder="Hospital / Clinic Name *"
            style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
          />
          <TextInput
            value={hospAddr}
            onChangeText={setHospAddr}
            placeholder="Full Address *"
            style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={hospCity}
              onChangeText={setHospCity}
              placeholder="City"
              style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
            <TextInput
              value={hospPincode}
              onChangeText={setHospPincode}
              placeholder="Pincode"
              style={{ width: 110, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={hospLat}
              onChangeText={setHospLat}
              placeholder="Latitude"
              style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
            <TextInput
              value={hospLng}
              onChangeText={setHospLng}
              placeholder="Longitude"
              style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
          </View>
          <TextInput
            value={hospPhone}
            onChangeText={setHospPhone}
            placeholder="Reception Phone"
            style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
          />
          <TextInput
            value={hospOpdHours}
            onChangeText={setHospOpdHours}
            placeholder="OPD Sitting Hours (e.g. Mon-Sat 9 AM - 8 PM)"
            style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
          />
          <TextInput
            value={hospSpecialties}
            onChangeText={setHospSpecialties}
            placeholder="Specialties (comma-separated)"
            style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
          />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>Facilities Provided</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {FACILITY_OPTIONS.map((fac) => {
              const sel = hospFacilities.includes(fac);
              return (
                <TouchableOpacity
                  key={fac}
                  onPress={() =>
                    setHospFacilities((prev) => (sel ? prev.filter((f) => f !== fac) : [...prev, fac]))
                  }
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 99,
                    backgroundColor: sel ? THEME.greenSoft : THEME.bg,
                    borderWidth: 1,
                    borderColor: sel ? THEME.green : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: sel ? THEME.greenDark : THEME.muted }}>
                    {sel ? `✓ ${fac}` : fac}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {activeHospital && (
              <TouchableOpacity
                onPress={() => setShowAddHosp(false)}
                style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: THEME.surfaceAlt, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleSaveHospital(true)}
              disabled={savingHosp}
              style={{ flex: 2, paddingVertical: 11, borderRadius: 10, backgroundColor: THEME.greenDark, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {savingHosp ? 'Creating...' : 'Create Hospital & Main Branch'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : mode === 'hospital' && activeHospital ? (
        <View style={{ gap: 14, maxWidth: 720 }}>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: THEME.ink }}>
                  {activeHospital.name}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted }}>
                  App Discount: {activeHospital.discount_percentage ?? 15}% (Locked by Admin)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: activeHospital.is_active !== false ? THEME.green : THEME.redText }}>
                  {activeHospital.is_active !== false ? 'OPEN' : 'CLOSED'}
                </Text>
                <Switch
                  value={activeHospital.is_active !== false}
                  onValueChange={handleToggleHospitalActive}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>Open 24×7</Text>
              <Switch value={hospIs24x7} onValueChange={setHospIs24x7} />
            </View>

            <TextInput
              value={hospOpdHours}
              onChangeText={setHospOpdHours}
              placeholder="OPD Hours"
              style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
            <TextInput
              value={hospSpecialties}
              onChangeText={setHospSpecialties}
              placeholder="Specialties (comma-separated)"
              style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 9, padding: 10, fontSize: 13 }}
            />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.muted }}>Facilities Provided</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FACILITY_OPTIONS.map((fac) => {
                const sel = hospFacilities.includes(fac);
                return (
                  <TouchableOpacity
                    key={fac}
                    onPress={() =>
                      setHospFacilities((prev) => (sel ? prev.filter((f) => f !== fac) : [...prev, fac]))
                    }
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 99,
                      backgroundColor: sel ? THEME.greenSoft : THEME.bg,
                      borderWidth: 1,
                      borderColor: sel ? THEME.green : THEME.border,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: sel ? THEME.greenDark : THEME.muted }}>
                      {sel ? `✓ ${fac}` : fac}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => handleSaveHospital(false)}
              disabled={savingHosp}
              style={{ backgroundColor: THEME.green, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                {savingHosp ? 'Saving...' : 'Save Hospital Profile & Facilities'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Branches Section */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Hospital Branches ({branches.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddBranch((prev) => !prev)}
                style={{
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.greenDark }}>
                  {showAddBranch ? 'Close' : '+ Add Branch'}
                </Text>
              </TouchableOpacity>
            </View>

            {showAddBranch && (
              <View style={{ backgroundColor: THEME.bg, borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: THEME.border }}>
                <TextInput value={brName} onChangeText={setBrName} placeholder="Branch Name *" style={{ backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 12.5 }} />
                <TextInput value={brArea} onChangeText={setBrArea} placeholder="Area / Locality" style={{ backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 12.5 }} />
                <TextInput value={brAddr} onChangeText={setBrAddr} placeholder="Branch Full Address" style={{ backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 12.5 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={brLat} onChangeText={setBrLat} placeholder="Lat" style={{ flex: 1, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 12.5 }} />
                  <TextInput value={brLng} onChangeText={setBrLng} placeholder="Lng" style={{ flex: 1, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 12.5 }} />
                </View>
                <TouchableOpacity
                  onPress={handleAddBranch}
                  disabled={savingBranch}
                  style={{ backgroundColor: THEME.greenDark, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    {savingBranch ? 'Adding...' : 'Save New Branch'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {branches.map((b) => (
              <View
                key={b.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: THEME.bg,
                  borderRadius: 10,
                  padding: 11,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>{b.name}</Text>
                  <Text style={{ fontSize: 11.5, color: THEME.muted }}>{b.area} · {b.city}</Text>
                </View>
                <Switch value={b.is_active !== false} onValueChange={(v) => handleToggleBranch(b, v)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* DOCTORS & TIMINGS MODE */}
      {mode === 'doctors' && (
        <View style={{ gap: 12, maxWidth: 760 }}>
          {!activeHospital ? (
            <View style={{ backgroundColor: THEME.surface, borderRadius: 14, padding: 24, borderWidth: 1, borderColor: THEME.border }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: THEME.ink }}>
                Create or select a hospital under OPD → Hospital & Branches first before adding doctors.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  Doctors at {activeHospital.name} ({doctors.length})
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingDocId(null);
                    setDocName('');
                    setShowAddDoc((prev) => !prev);
                  }}
                  style={{
                    backgroundColor: THEME.greenDark,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                    {showAddDoc ? 'Close' : 'Add Doctor'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showAddDoc && (
                <View
                  style={{
                    backgroundColor: THEME.surface,
                    borderRadius: 14,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    gap: 9,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.greenDark }}>
                    {editingDocId ? 'Edit Doctor & Sitting Timings' : 'Add New Doctor'}
                  </Text>
                  <TextInput value={docName} onChangeText={setDocName} placeholder="Doctor Name (e.g. Dr. R.K. Sharma) *" style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput value={docSpec} onChangeText={setDocSpec} placeholder="Specialty" style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                    <TextInput value={docQual} onChangeText={setDocQual} placeholder="Qualification" style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput value={docFee} onChangeText={setDocFee} placeholder="Consultation Fee (₹)" keyboardType="numeric" style={{ flex: 1, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                    <TextInput value={docExp} onChangeText={setDocExp} placeholder="Exp (yrs)" keyboardType="numeric" style={{ width: 90, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                    <TextInput value={docCapacity} onChangeText={setDocCapacity} placeholder="Cap/hr (5-8)" keyboardType="numeric" style={{ width: 100, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                  </View>
                  <TextInput value={docTiming} onChangeText={setDocTiming} placeholder="Sitting Timings (e.g. Mon-Sat, 10 AM - 2 PM, 5 PM - 8 PM)" style={{ backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, padding: 9, fontSize: 13 }} />
                  {branches.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {branches.map((br) => {
                        const sel = (docBranchId || branches[0]?.id) === br.id;
                        return (
                          <TouchableOpacity
                            key={br.id}
                            onPress={() => setDocBranchId(br.id)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              backgroundColor: sel ? THEME.greenSoft : THEME.bg,
                              borderWidth: 1,
                              borderColor: sel ? THEME.green : THEME.border,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: sel ? THEME.greenDark : THEME.ink }}>
                              {br.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={handleSaveDoctor}
                    disabled={savingDoc}
                    style={{ backgroundColor: THEME.green, borderRadius: 9, paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {savingDoc ? 'Saving...' : editingDocId ? 'Save Doctor Changes' : 'Add Doctor'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {doctors.map((d) => {
                const branch = branches.find((b) => b.id === d.branch_id);
                return (
                  <View
                    key={d.id}
                    style={{
                      backgroundColor: THEME.surface,
                      borderRadius: 13,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: d.is_active !== false ? THEME.border : THEME.redBorder,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{d.name}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.green }}>
                          {d.specialty} · {d.qualification} · ₹{d.discounted_fee ?? d.consultation_fee}
                        </Text>
                        {branch && (
                          <Text style={{ fontSize: 11.5, color: THEME.muted }}>{branch.name}</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Switch value={d.is_active !== false} onValueChange={(v) => handleToggleDoctor(d, v)} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Clock size={12} color={THEME.muted} />
                        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                          {d.opd_timing || d.opd_hours || 'Mon-Sat, 10 AM - 6 PM'} · {d.slot_capacity || 6}/hr cap
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingDocId(d.id);
                            setDocName(d.name || '');
                            setDocSpec(d.specialty || '');
                            setDocQual(d.qualification || '');
                            setDocFee(String(d.consultation_fee || 500));
                            setDocExp(String(d.experience_years || 5));
                            setDocTiming(d.opd_timing || d.opd_hours || '');
                            setDocCapacity(String(d.slot_capacity || 6));
                            setDocBranchId(d.branch_id || '');
                            setShowAddDoc(true);
                          }}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, backgroundColor: THEME.surfaceAlt, borderWidth: 1, borderColor: THEME.border }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.ink }}>Edit Timings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteDoctor(d)}
                          style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: THEME.redBg, borderWidth: 1, borderColor: THEME.redBorder }}
                        >
                          <Trash2 size={13} color={THEME.redText} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}
    </View>
  );
}
