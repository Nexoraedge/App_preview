import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  X,
  CheckCircle2,
  ExternalLink,
  Upload,
  MapPin,
  Phone,
  Edit3,
  Download,
  ChevronDown,
} from 'lucide-react-native';
import { AdminPagination } from '../AdminPagination';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Doctor } from '@adityam/types';
import {
  THEME,
  ExtendedHospital,
  ExtendedBranch,
  ExtendedDoctor,
  BranchStats,
  HospitalStats,
  HospitalPayout,
  PRESET_FACILITIES,
  PRESET_LABS,
  PRESET_IPD_SERVICES,
  PRESET_INSURANCE_PARTNERS,
  PRESET_BRANCH_SERVICES,
  formatInr,
  isMissingColumnError,
} from './hospitalTheme';
import {
  WeeklyScheduleDisplay,
  WeeklyScheduleEditor,
  DEFAULT_WEEKLY_SCHEDULE,
  WeeklySchedule,
  summarizeWeeklySchedule,
} from '../WeeklyScheduleEditor';

type DetailTab = 'overview' | 'branches' | 'doctors' | 'services' | 'bookings' | 'ledger';

interface HospitalDetailViewProps {
  stats: HospitalStats;
  hospitalBookings: Booking[];
  hospitalBranches: ExtendedBranch[];
  hospitalDoctors: ExtendedDoctor[];
  isUploadingPhoto: boolean;
  onPickPhoto: (onPicked: (url: string) => void) => Promise<void>;
  onBack: () => void;
  onOpenSlugRoute?: (slug: string) => void;
  onRefreshData: () => Promise<void>;
}

interface ChipGroupEditorProps {
  title: string;
  subtitle: string;
  presets: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}

function ChipGroupEditor({
  title,
  subtitle,
  presets,
  selected,
  onChange,
  placeholder,
}: ChipGroupEditorProps) {
  const [customVal, setCustomVal] = useState('');

  const allOptions = useMemo(() => {
    const set = new Set<string>(presets);
    selected.forEach((s) => set.add(s));
    return Array.from(set);
  }, [presets, selected]);

  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const addCustom = () => {
    const trimmed = customVal.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomVal('');
  };

  return (
    <View
      style={{
        backgroundColor: THEME.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: THEME.border,
        gap: 12,
      }}
    >
      <View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{title}</Text>
        <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>{subtitle}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {allOptions.map((item) => {
          const active = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => toggleItem(item)}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6.5,
                borderRadius: 8,
                backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                borderWidth: 1,
                borderColor: active ? THEME.greenPrimary : THEME.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {active && <CheckCircle2 size={12} color={THEME.greenPrimary} />}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '700' : '600',
                  color: active ? THEME.greenPrimary : THEME.muted,
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={customVal}
          onChangeText={setCustomVal}
          onSubmitEditing={addCustom}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={{
            flex: 1,
            backgroundColor: THEME.creamBg,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
            fontSize: 12.5,
            color: THEME.ink,
          }}
        />
        <TouchableOpacity
          onPress={addCustom}
          style={{
            backgroundColor: THEME.creamSoft,
            borderWidth: 1,
            borderColor: THEME.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function HospitalDetailView({
  stats,
  hospitalBookings,
  hospitalBranches,
  hospitalDoctors,
  isUploadingPhoto,
  onPickPhoto,
  onBack,
  onOpenSlugRoute,
  onRefreshData,
}: HospitalDetailViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();
  const h = stats.hospital;

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [branchDocsModalBranch, setBranchDocsModalBranch] = useState<ExtendedBranch | null>(null);
  const [ledgerPeriod, setLedgerPeriod] = useState<'7D' | '1M' | '3M' | '1Y' | 'ALL'>('7D');
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPageSize, setBookingsPageSize] = useState(12);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(12);
  const [payoutPage, setPayoutPage] = useState(1);

  // Overview & Contacts state
  const [editTag, setEditTag] = useState(h.tag || '');
  const [editDiscount, setEditDiscount] = useState(String(h.discount_percentage ?? 20));
  const [editCommission, setEditCommission] = useState(String(h.commission_percentage ?? 10));
  const [editWeeklySchedule, setEditWeeklySchedule] = useState<WeeklySchedule>(
    h.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE
  );
  const [editIs24x7, setEditIs24x7] = useState(h.is_24x7 !== false);
  const [editTotalBeds, setEditTotalBeds] = useState(String(h.total_beds ?? 100));
  const [editIcuBeds, setEditIcuBeds] = useState(String(h.icu_beds ?? 20));
  const [editOtCount, setEditOtCount] = useState(String(h.ot_count ?? 4));
  const [editPhone, setEditPhone] = useState(h.contact_number || '');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState(h.secondary_contact_number || '');
  const [editExotel, setEditExotel] = useState(h.virtual_exotel_number || '');
  const [editAddress, setEditAddress] = useState(h.address || '');
  const [editCity, setEditCity] = useState(h.city || 'Jaipur');
  const [editState, setEditState] = useState(h.state || 'Rajasthan');
  const [editPincode, setEditPincode] = useState(h.pincode || '');
  const [editLat, setEditLat] = useState(String(h.latitude ?? 26.9124));
  const [editLng, setEditLng] = useState(String(h.longitude ?? 75.7873));
  const [editImageUrl, setEditImageUrl] = useState(h.image_url || '');
  const [editSpecialties, setEditSpecialties] = useState((h.specialties || []).join(', '));
  const [editActive, setEditActive] = useState(h.is_active !== false);
  const [editFeatured, setEditFeatured] = useState(Boolean(h.featured));
  const [editNabh, setEditNabh] = useState(Boolean(h.nabh_accredited));
  const [editJci, setEditJci] = useState(Boolean(h.jci_accredited));
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Services, IPD & Labs state
  const [facilitiesList, setFacilitiesList] = useState<string[]>(h.facilities || []);
  const [labsList, setLabsList] = useState<string[]>(
    h.labs_offered || ['Pathology & Blood Tests', 'Digital X-Ray']
  );
  const [ipdList, setIpdList] = useState<string[]>(
    h.ipd_services_offered || ['General Surgery', 'Orthopedics & Joint Replacement']
  );
  const [insuranceList, setInsuranceList] = useState<string[]>(
    h.insurance_partners || ['RGHS (Rajasthan Govt)', 'Star Health', 'HDFC Ergo']
  );
  const [isSavingServices, setIsSavingServices] = useState(false);

  // Branch Add / Edit Modal state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchArea, setBranchArea] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState(h.city || 'Jaipur');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchSecondaryPhone, setBranchSecondaryPhone] = useState('');
  const [branchExotel, setBranchExotel] = useState(h.virtual_exotel_number || '+91 141 400 8800');
  const [branchLat, setBranchLat] = useState(String(h.latitude ?? 26.9124));
  const [branchLng, setBranchLng] = useState(String(h.longitude ?? 75.7873));
  const [branchIsMain, setBranchIsMain] = useState(false);
  const [branchServices, setBranchServices] = useState<string[]>(['OPD Consultation', '24x7 Emergency']);
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Doctors Tab state
  const [doctorBranchFilter, setDoctorBranchFilter] = useState<string>('ALL');
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('General Medicine');
  const [docQualification, setDocQualification] = useState('MBBS, MD');
  const [docExperience, setDocExperience] = useState('10');
  const [docFee, setDocFee] = useState('600');
  const [docTiming, setDocTiming] = useState('Mon-Sat, 10 AM - 5 PM');
  const [docBranchId, setDocBranchId] = useState<string>('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [editingDocSchedule, setEditingDocSchedule] = useState<ExtendedDoctor | null>(null);
  const [docScheduleDraft, setDocScheduleDraft] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [isSavingDocSchedule, setIsSavingDocSchedule] = useState(false);

  // Ledger & Payout Settlement state
  const [ledgerBranchFilter, setLedgerBranchFilter] = useState<string>('ALL');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'MISSED' | 'CANCELLED'>('ALL');
  const [payouts, setPayouts] = useState<HospitalPayout[]>([]);
  const [utrInput, setUtrInput] = useState('');
  const [isSettlingPayout, setIsSettlingPayout] = useState(false);

  useEffect(() => {
    setEditTag(h.tag || '');
    setEditDiscount(String(h.discount_percentage ?? 20));
    setEditCommission(String(h.commission_percentage ?? 10));
    setEditWeeklySchedule(h.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE);
    setEditIs24x7(h.is_24x7 !== false);
    setEditTotalBeds(String(h.total_beds ?? 100));
    setEditIcuBeds(String(h.icu_beds ?? 20));
    setEditOtCount(String(h.ot_count ?? 4));
    setEditPhone(h.contact_number || '');
    setEditSecondaryPhone(h.secondary_contact_number || '');
    setEditExotel(h.virtual_exotel_number || '');
    setEditAddress(h.address || '');
    setEditCity(h.city || 'Jaipur');
    setEditState(h.state || 'Rajasthan');
    setEditPincode(h.pincode || '');
    setEditLat(String(h.latitude ?? 26.9124));
    setEditLng(String(h.longitude ?? 75.7873));
    setEditImageUrl(h.image_url || '');
    setEditSpecialties((h.specialties || []).join(', '));
    setEditActive(h.is_active !== false);
    setEditFeatured(Boolean(h.featured));
    setEditNabh(Boolean(h.nabh_accredited));
    setEditJci(Boolean(h.jci_accredited));
    setFacilitiesList(h.facilities || []);
    setLabsList(h.labs_offered || ['Pathology & Blood Tests', 'Digital X-Ray']);
    setIpdList(h.ipd_services_offered || ['General Surgery', 'Orthopedics & Joint Replacement']);
    setInsuranceList(h.insurance_partners || ['RGHS (Rajasthan Govt)', 'Star Health', 'HDFC Ergo']);

    const loadPayouts = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('hospital_payouts')
          .select('*')
          .eq('hospital_id', h.id)
          .order('settled_at', { ascending: false });
        if (data) setPayouts(data as HospitalPayout[]);
      } catch {
        // table may not exist yet before migration
      }
    };
    loadPayouts();
  }, [h]);

  const handleSettlePayout = async () => {
    if (stats.weeklyPayoutDue <= 0) {
      Alert.alert('Nothing Due', 'No weekly payout amount due right now.');
      return;
    }
    setIsSettlingPayout(true);
    try {
      const supabase = getSupabaseClient();
      const periodEnd = new Date().toISOString().slice(0, 10);
      const periodStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const commPct = Number(h.commission_percentage ?? 10);
      const netRate = Math.max(0.01, (100 - commPct) / 100);
      const estGross = Math.round(stats.weeklyPayoutDue / netRate);
      const estComm = Math.max(0, estGross - stats.weeklyPayoutDue);

      const { error } = await supabase.from('hospital_payouts').insert({
        hospital_id: h.id,
        amount: stats.weeklyPayoutDue,
        utr_reference: utrInput.trim() || `UTR-${Date.now().toString(36).toUpperCase()}`,
        period_label: `${periodStart} to ${periodEnd}`,
        period_start: periodStart,
        period_end: periodEnd,
        gross_amount: estGross,
        commission_amount: estComm,
        status: 'PAID',
        settled_at: new Date().toISOString(),
      });
      if (error) {
        Alert.alert(
          'Migration Needed',
          'Run migration 20261114000008_hospital_payouts_and_ledger.sql in Supabase to save payout settlements.'
        );
        return;
      }
      setUtrInput('');
      const { data } = await supabase
        .from('hospital_payouts')
        .select('*')
        .eq('hospital_id', h.id)
        .order('settled_at', { ascending: false });
      if (data) setPayouts(data as HospitalPayout[]);
      await onRefreshData();
      Alert.alert('Settled', 'Weekly payout marked as paid.');
    } finally {
      setIsSettlingPayout(false);
    }
  };

  const branchStatsList = useMemo<BranchStats[]>(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return hospitalBranches.map((br) => {
      const brName = (br.name || '').toLowerCase();
      const brArea = (br.area || '').toLowerCase();
      const brBookings = hospitalBookings.filter((b) => {
        if (b.branch_id && b.branch_id === br.id) return true;
        const bBrName = (b.branch_name || '').toLowerCase();
        if (bBrName && (bBrName === brName || bBrName.includes(brArea))) return true;
        return Boolean(br.is_main_branch && !b.branch_id && !b.branch_name);
      });
      const paid = brBookings.filter((b) =>
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
      );
      const gross = paid.reduce(
        (s, b) => s + Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0),
        0
      );
      const weeklyGross = paid
        .filter((b) => new Date(b.created_at).getTime() >= sevenDaysAgo)
        .reduce((s, b) => s + Number(b.final_payable ?? b.doctor_fee ?? 0), 0);

      return {
        branch: br,
        totalBookings: brBookings.length,
        confirmedCount: paid.length,
        missedCount: brBookings.filter((b) => b.status === 'MISSED').length,
        grossEarnings: gross,
        weeklyPayoutDue: Math.round(weeklyGross * 0.9),
        doctorsCount: hospitalDoctors.filter((d) => d.branch_id === br.id).length,
      };
    });
  }, [hospitalBranches, hospitalBookings, hospitalDoctors]);

  const openGoogleMaps = (lat?: number | null, lng?: number | null, fallbackAddress?: string) => {
    const url =
      lat && lng
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackAddress || h.address)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const supabase = getSupabaseClient();
      const latNum = parseFloat(editLat);
      const lngNum = parseFloat(editLng);
      const basePayload: Record<string, unknown> = {
        tag: editTag.trim() || null,
        discount_percentage: Number(editDiscount) || 0,
        contact_number: editPhone.trim() || null,
        virtual_exotel_number: editExotel.trim() || null,
        address: editAddress.trim(),
        city: editCity.trim() || 'Jaipur',
        state: editState.trim() || 'Rajasthan',
        pincode: editPincode.trim() || null,
        image_url: editImageUrl.trim() || null,
        specialties: editSpecialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        is_active: editActive,
        featured: editFeatured,
        nabh_accredited: editNabh,
        jci_accredited: editJci,
        updated_at: new Date().toISOString(),
      };
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        basePayload.location = `SRID=4326;POINT(${lngNum} ${latNum})`;
      }

      const fullPayload = {
        ...basePayload,
        secondary_contact_number: editSecondaryPhone.trim() || null,
        commission_percentage: Number(editCommission) || 10,
        opd_hours: summarizeWeeklySchedule(editWeeklySchedule),
        weekly_schedule: editWeeklySchedule,
        is_24x7: editIs24x7,
        total_beds: Number(editTotalBeds) || 0,
        icu_beds: Number(editIcuBeds) || 0,
        ot_count: Number(editOtCount) || 0,
      };

      const { error } = await supabase.from('hospitals').update(fullPayload).eq('id', h.id);
      if (error && isMissingColumnError(error)) {
        const { error: fallbackErr } = await supabase
          .from('hospitals')
          .update(basePayload)
          .eq('id', h.id);
        if (fallbackErr) {
          Alert.alert('Update Failed', fallbackErr.message);
          return;
        }
        setIsEditingOverview(false);
        await onRefreshData();
        Alert.alert(
          'Saved',
          'Core details saved. Run the latest SQL migration in Supabase to store beds, commission & secondary contact.'
        );
        return;
      }

      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setIsEditingOverview(false);
      await onRefreshData();
      Alert.alert('Saved', 'Hospital details updated.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveServices = async () => {
    setIsSavingServices(true);
    try {
      const supabase = getSupabaseClient();
      const fullPayload = {
        facilities: facilitiesList,
        labs_offered: labsList,
        ipd_services_offered: ipdList,
        insurance_partners: insuranceList,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('hospitals').update(fullPayload).eq('id', h.id);
      if (error && isMissingColumnError(error)) {
        const { error: fallbackErr } = await supabase
          .from('hospitals')
          .update({
            facilities: facilitiesList,
            updated_at: new Date().toISOString(),
          })
          .eq('id', h.id);
        if (fallbackErr) {
          Alert.alert('Update Failed', fallbackErr.message);
          return;
        }
        await onRefreshData();
        Alert.alert(
          'Saved Facilities',
          'Core facilities saved. Run migration 20261114000001_hospital_services_and_contacts.sql in Supabase to persist Labs, IPD & Insurance arrays.'
        );
        return;
      }
      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      await onRefreshData();
      Alert.alert('Saved', 'Hospital facilities, Labs, IPD & Insurance partners updated.');
    } finally {
      setIsSavingServices(false);
    }
  };

  const openAddBranchModal = () => {
    setEditingBranchId(null);
    setBranchName('');
    setBranchArea('');
    setBranchAddress('');
    setBranchCity(h.city || 'Jaipur');
    setBranchPhone(h.contact_number || '');
    setBranchSecondaryPhone(h.secondary_contact_number || '');
    setBranchExotel(h.virtual_exotel_number || '+91 141 400 8800');
    setBranchLat(String(h.latitude ?? 26.9124));
    setBranchLng(String(h.longitude ?? 75.7873));
    setBranchIsMain(hospitalBranches.length === 0);
    setBranchServices(['OPD Consultation', '24x7 Emergency', 'In-House Pharmacy']);
    setIsBranchModalOpen(true);
  };

  const openEditBranchModal = (br: ExtendedBranch) => {
    setEditingBranchId(br.id);
    setBranchName(br.name || '');
    setBranchArea(br.area || '');
    setBranchAddress(br.address || '');
    setBranchCity(br.city || h.city || 'Jaipur');
    setBranchPhone(br.contact_number || '');
    setBranchSecondaryPhone(br.secondary_contact_number || '');
    setBranchExotel(br.virtual_exotel_number || h.virtual_exotel_number || '');
    setBranchLat(String(br.latitude ?? h.latitude ?? 26.9124));
    setBranchLng(String(br.longitude ?? h.longitude ?? 75.7873));
    setBranchIsMain(Boolean(br.is_main_branch));
    setBranchServices(br.services_offered || ['OPD Consultation', '24x7 Emergency']);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim() || !branchAddress.trim()) {
      Alert.alert('Missing Fields', 'Please enter branch name and full address.');
      return;
    }
    setIsSavingBranch(true);
    try {
      const supabase = getSupabaseClient();
      const latNum = parseFloat(branchLat) || 26.9124;
      const lngNum = parseFloat(branchLng) || 75.7873;
      const baseData: Record<string, unknown> = {
        name: branchName.trim(),
        area: branchArea.trim() || branchCity.trim() || 'Jaipur',
        address: branchAddress.trim(),
        city: branchCity.trim() || 'Jaipur',
        location: `SRID=4326;POINT(${lngNum} ${latNum})`,
        contact_number: branchPhone.trim() || h.contact_number,
        virtual_exotel_number: branchExotel.trim() || h.virtual_exotel_number || '+91 141 400 8800',
        is_main_branch: branchIsMain,
      };
      const fullData = {
        ...baseData,
        secondary_contact_number: branchSecondaryPhone.trim() || null,
        services_offered: branchServices,
      };

      if (editingBranchId) {
        const { error } = await supabase
          .from('hospital_branches')
          .update(fullData)
          .eq('id', editingBranchId);
        if (error && isMissingColumnError(error)) {
          const { error: fb } = await supabase
            .from('hospital_branches')
            .update(baseData)
            .eq('id', editingBranchId);
          if (fb) {
            Alert.alert('Update Failed', fb.message);
            return;
          }
        } else if (error) {
          Alert.alert('Update Failed', error.message);
          return;
        }
      } else {
        const brId = `br-${h.slug.slice(0, 12)}-${Date.now().toString(36)}`;
        const insertFull = {
          id: brId,
          hospital_id: h.id,
          distance_km: 2.5,
          ...fullData,
        };
        const { error } = await supabase.from('hospital_branches').insert(insertFull);
        if (error && isMissingColumnError(error)) {
          const { error: fb } = await supabase.from('hospital_branches').insert({
            id: brId,
            hospital_id: h.id,
            distance_km: 2.5,
            ...baseData,
          });
          if (fb) {
            Alert.alert('Could Not Add Branch', fb.message);
            return;
          }
        } else if (error) {
          Alert.alert('Could Not Add Branch', error.message);
          return;
        }
      }

      setIsBranchModalOpen(false);
      await onRefreshData();
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleAssignDoctorBranch = async (doctorId: string, branchId: string | null) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('doctors')
      .update({ branch_id: branchId })
      .eq('id', doctorId);
    if (error) {
      Alert.alert('Could Not Reassign', error.message);
      return;
    }
    await onRefreshData();
  };

  const handleToggleDoctorLeave = async (doc: ExtendedDoctor) => {
    const nextAvailable = doc.is_available_today === false;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('doctors')
      .update({ is_available_today: nextAvailable })
      .eq('id', doc.id);
    if (error && isMissingColumnError(error)) {
      Alert.alert(
        'Migration Needed',
        'Run migration 20261114000001_hospital_services_and_contacts.sql in Supabase to save Doctor On Leave status.'
      );
      return;
    }
    if (error) {
      Alert.alert('Update Failed', error.message);
      return;
    }
    await onRefreshData();
  };

  const handleSaveDoctorSchedule = async () => {
    if (!editingDocSchedule) return;
    setIsSavingDocSchedule(true);
    try {
      const supabase = getSupabaseClient();
      const summary = summarizeWeeklySchedule(docScheduleDraft);
      const { error } = await supabase
        .from('doctors')
        .update({
          weekly_schedule: docScheduleDraft,
          opd_timing: summary,
        })
        .eq('id', editingDocSchedule.id);
      if (error && isMissingColumnError(error)) {
        const { error: fb } = await supabase
          .from('doctors')
          .update({ opd_timing: summary })
          .eq('id', editingDocSchedule.id);
        if (fb) {
          Alert.alert('Update Failed', fb.message);
          return;
        }
      } else if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }
      setEditingDocSchedule(null);
      await onRefreshData();
    } finally {
      setIsSavingDocSchedule(false);
    }
  };

  const handleCreateHospitalDoctor = async () => {
    if (!docName.trim()) {
      Alert.alert('Missing Name', 'Please enter the doctor name.');
      return;
    }
    setIsSavingDoc(true);
    try {
      const supabase = getSupabaseClient();
      const feeNum = Number(docFee) || 600;
      const discountPct = Number(h.discount_percentage ?? 0);
      const discountedFee = Math.max(100, Math.round(feeNum * (1 - discountPct / 100)));
      const docId = `doc-${Date.now().toString(36)}`;

      const { error } = await supabase.from('doctors').insert({
        id: docId,
        hospital_id: h.id,
        branch_id: docBranchId || hospitalBranches[0]?.id || null,
        name: docName.trim(),
        specialty: docSpecialty.trim() || 'General Medicine',
        qualification: docQualification.trim() || 'MBBS, MD',
        experience_years: Number(docExperience) || 8,
        consultation_fee: feeNum,
        discounted_fee: discountedFee,
        opd_timing: docTiming.trim() || 'Mon-Sat, 10 AM - 5 PM',
        is_active: true,
      });
      if (error) {
        Alert.alert('Could Not Add Doctor', error.message);
        return;
      }
      setIsAddDocOpen(false);
      setDocName('');
      await onRefreshData();
    } finally {
      setIsSavingDoc(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (doctorBranchFilter === 'ALL') return hospitalDoctors;
    if (doctorBranchFilter === 'UNASSIGNED') return hospitalDoctors.filter((d) => !d.branch_id);
    return hospitalDoctors.filter((d) => d.branch_id === doctorBranchFilter);
  }, [hospitalDoctors, doctorBranchFilter]);

  const filteredBookings = useMemo(() => {
    return hospitalBookings.filter((b) => {
      if (ledgerBranchFilter !== 'ALL') {
        const br = hospitalBranches.find((item) => item.id === ledgerBranchFilter);
        const matchesBranch =
          b.branch_id === ledgerBranchFilter ||
          (br && (b.branch_name || '').toLowerCase().includes((br.area || br.name).toLowerCase()));
        if (!matchesBranch) return false;
      }
      if (ledgerStatusFilter === 'CONFIRMED') {
        return ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status);
      }
      if (ledgerStatusFilter !== 'ALL') return b.status === ledgerStatusFilter;
      return true;
    });
  }, [hospitalBookings, ledgerBranchFilter, ledgerStatusFilter, hospitalBranches]);

  const commPct = h.commission_percentage ?? 10;

  const billableBookings = useMemo(
    () =>
      hospitalBookings.filter((b) =>
        ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status)
      ),
    [hospitalBookings]
  );

  const ledgerPeriods = useMemo(() => {
    const nowMs = Date.now();
    const cutoffs: Record<'7D' | '1M' | '3M' | '1Y' | 'ALL', number> = {
      '7D': nowMs - 7 * 24 * 60 * 60 * 1000,
      '1M': nowMs - 30 * 24 * 60 * 60 * 1000,
      '3M': nowMs - 90 * 24 * 60 * 60 * 1000,
      '1Y': nowMs - 365 * 24 * 60 * 60 * 1000,
      ALL: 0,
    };

    const calc = (sinceMs: number) => {
      const rows = billableBookings.filter(
        (b) => sinceMs === 0 || new Date(b.created_at).getTime() >= sinceMs
      );
      const periodPayouts = payouts.filter(
        (p) => sinceMs === 0 || new Date(p.settled_at).getTime() >= sinceMs
      );
      const gross = Math.round(
        rows.reduce(
          (sum, b) => sum + Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0),
          0
        )
      );
      const commission = Math.round((gross * commPct) / 100);
      const netShare = Math.max(0, gross - commission);
      const paid = Math.round(
        periodPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      );
      const balanceDue = Math.max(0, netShare - paid);
      return {
        bookingsCount: rows.length,
        rows,
        payouts: periodPayouts,
        gross,
        commission,
        netShare,
        paid,
        balanceDue,
      };
    };

    return {
      '7D': calc(cutoffs['7D']),
      '1M': calc(cutoffs['1M']),
      '3M': calc(cutoffs['3M']),
      '1Y': calc(cutoffs['1Y']),
      ALL: calc(cutoffs.ALL),
    };
  }, [billableBookings, payouts, commPct]);

  const activeLedgerSummary = ledgerPeriods[ledgerPeriod];

  const PERIOD_OPTIONS: { key: '7D' | '1M' | '3M' | '1Y' | 'ALL'; label: string }[] = [
    { key: '7D', label: 'Last 7 days (1 Week)' },
    { key: '1M', label: 'Past 1 month (30 days)' },
    { key: '3M', label: 'Past 3 months (90 days)' },
    { key: '1Y', label: 'Past 1 year (12 months)' },
    { key: 'ALL', label: 'All time' },
  ];
  const activePeriodLabel =
    PERIOD_OPTIONS.find((p) => p.key === ledgerPeriod)?.label || 'Last 7 days (1 Week)';

  useEffect(() => {
    setBookingsPage(1);
  }, [ledgerBranchFilter, ledgerStatusFilter, bookingsPageSize]);

  useEffect(() => {
    setLedgerPage(1);
    setPayoutPage(1);
  }, [ledgerPeriod, ledgerPageSize]);

  const bookingsTotalPages = Math.max(1, Math.ceil(filteredBookings.length / bookingsPageSize));
  const safeBookingsPage = Math.min(bookingsPage, bookingsTotalPages);
  const pagedBookings = filteredBookings.slice(
    (safeBookingsPage - 1) * bookingsPageSize,
    safeBookingsPage * bookingsPageSize
  );

  const ledgerTotalPages = Math.max(1, Math.ceil(activeLedgerSummary.rows.length / ledgerPageSize));
  const safeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const pagedLedgerBookings = activeLedgerSummary.rows.slice(
    (safeLedgerPage - 1) * ledgerPageSize,
    safeLedgerPage * ledgerPageSize
  );

  const payoutPageSize = 5;
  const payoutTotalPages = Math.max(1, Math.ceil(activeLedgerSummary.payouts.length / payoutPageSize));
  const safePayoutPage = Math.min(payoutPage, payoutTotalPages);
  const pagedPayouts = activeLedgerSummary.payouts.slice(
    (safePayoutPage - 1) * payoutPageSize,
    safePayoutPage * payoutPageSize
  );

  const downloadHospitalCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('CSV Ready', `${filename} (${rows.length} rows) is available on Web Admin.`);
    }
  };

  const handleExportBookingsCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = (h.slug || h.name || 'hospital').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadHospitalCsv(
      `${slug}-bookings-${stamp}.csv`,
      ['Booking Ref', 'Patient', 'Phone', 'Doctor / Service', 'Branch', 'Slot / Date', 'Bill Amount', 'Status'],
      filteredBookings.map((b) => [
        b.booking_ref || b.id.slice(0, 8),
        b.patient_name || '',
        b.patient_phone || '',
        b.doctor_name || b.service_type || '',
        b.branch_name || '',
        b.slot_time || new Date(b.created_at).toLocaleDateString('en-IN'),
        Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0),
        b.status,
      ])
    );
  };

  const handleExportLedgerCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = (h.slug || h.name || 'hospital').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const summaryRows: (string | number)[][] = [
      ['PERIOD SUMMARY', 'Bookings', 'Gross Collected', `Platform Fee (${commPct}%)`, 'Hospital Net Share', 'Paid / Shared', 'Balance Due'],
      ['Last 7 days (1 Week)', ledgerPeriods['7D'].bookingsCount, ledgerPeriods['7D'].gross, ledgerPeriods['7D'].commission, ledgerPeriods['7D'].netShare, ledgerPeriods['7D'].paid, ledgerPeriods['7D'].balanceDue],
      ['Past 1 month', ledgerPeriods['1M'].bookingsCount, ledgerPeriods['1M'].gross, ledgerPeriods['1M'].commission, ledgerPeriods['1M'].netShare, ledgerPeriods['1M'].paid, ledgerPeriods['1M'].balanceDue],
      ['Past 3 months', ledgerPeriods['3M'].bookingsCount, ledgerPeriods['3M'].gross, ledgerPeriods['3M'].commission, ledgerPeriods['3M'].netShare, ledgerPeriods['3M'].paid, ledgerPeriods['3M'].balanceDue],
      ['Past 1 year', ledgerPeriods['1Y'].bookingsCount, ledgerPeriods['1Y'].gross, ledgerPeriods['1Y'].commission, ledgerPeriods['1Y'].netShare, ledgerPeriods['1Y'].paid, ledgerPeriods['1Y'].balanceDue],
      ['All time', ledgerPeriods.ALL.bookingsCount, ledgerPeriods.ALL.gross, ledgerPeriods.ALL.commission, ledgerPeriods.ALL.netShare, ledgerPeriods.ALL.paid, ledgerPeriods.ALL.balanceDue],
      ['', '', '', '', '', '', ''],
      ['PAYOUT & BILL HISTORY', 'Date', 'UTR / Bill Ref', 'Period', 'Gross', 'Platform Fee', 'Net Paid'],
      ...payouts.map((p) => [
        'SETTLEMENT',
        new Date(p.settled_at).toLocaleDateString('en-IN'),
        p.utr_reference || 'Settled',
        p.period_label || 'Weekly',
        p.gross_amount ?? p.amount,
        p.commission_amount ?? 0,
        p.amount,
      ]),
      ['', '', '', '', '', '', ''],
      ['BILL-BY-BILL LEDGER', 'Booking Ref', 'Patient', 'Date', 'Gross Bill', `Platform Fee (${commPct}%)`, 'Hospital Net Share'],
      ...billableBookings.map((b) => {
        const gross = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
        const comm = Math.round((gross * commPct) / 100);
        return [
          'BOOKING',
          b.booking_ref || b.id.slice(0, 8),
          b.patient_name || '',
          new Date(b.created_at).toLocaleDateString('en-IN'),
          gross,
          comm,
          Math.max(0, gross - comm),
        ];
      }),
    ];
    downloadHospitalCsv(
      `${slug}-ledger-${stamp}.csv`,
      ['Type', 'Col 1', 'Col 2', 'Col 3', 'Col 4', 'Col 5', 'Col 6'],
      summaryRows
    );
  };

  const TABS: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview & Contacts' },
    { id: 'branches', label: `Branches & Locations (${hospitalBranches.length})` },
    { id: 'doctors', label: `Doctors & Linking (${hospitalDoctors.length})` },
    { id: 'services', label: 'Services, IPD & Labs' },
    { id: 'bookings', label: `Bookings (${hospitalBookings.length})` },
    { id: 'ledger', label: 'Ledger & Payouts' },
  ];

  return (
    <View style={{ gap: 16 }}>
      {/* Header Card */}
      <View
        style={{
          backgroundColor: THEME.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: THEME.border,
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity
            onPress={onBack}
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

          {h.image_url ? (
            <Image
              source={{ uri: h.image_url }}
              style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: THEME.creamSoft }}
              resizeMode="cover"
            />
          ) : null}

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17.5, fontWeight: '800', color: THEME.ink }}>{h.name}</Text>
              <View
                style={{
                  backgroundColor: h.is_active !== false ? THEME.greenSoft : THEME.redBg,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: h.is_active !== false ? THEME.greenPrimary : THEME.redText,
                  }}
                >
                  {h.is_active !== false ? 'ACTIVE' : 'PAUSED'}
                </Text>
              </View>
              {h.nabh_accredited && (
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.ink }}>NABH</Text>
                </View>
              )}
              {h.jci_accredited && (
                <View style={{ backgroundColor: THEME.amberBg, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.amberText }}>JCI</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
              {h.tag || 'Partner Hospital'} · {h.address}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              {h.contact_number ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>
                    {h.contact_number}
                    {h.secondary_contact_number ? ` · ${h.secondary_contact_number}` : ''}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => openGoogleMaps(h.latitude, h.longitude, h.address)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              >
                <MapPin size={11} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                  View Location on Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 4 Financial & Operational KPIs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.greenDark,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#9DC0B1', textTransform: 'uppercase' }}>
            {stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0 ? 'This Week Settled' : 'This Week Payout Due'}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FAF8F2', marginTop: 6 }}>
            {stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0
              ? `PAID · ${formatInr(stats.paidThisWeek)}`
              : formatInr(stats.weeklyPayoutDue)}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            {stats.weeklyBookingsCount} bookings (last 7d, {100 - (h.commission_percentage ?? 10)}% net)
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Total Gross Earnings
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.greenPrimary, marginTop: 6 }}>
            {formatInr(stats.grossEarnings)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.totalBookings} total bookings
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Confirmed vs Missed
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.ink, marginTop: 6 }}>
            {stats.confirmedCount} / {stats.missedCount}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {stats.cancelledCount} cancelled
          </Text>
        </View>

        <View
          style={{
            flexGrow: 1,
            flexBasis: isDesktop ? '23%' : '46%',
            minWidth: 150,
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted, textTransform: 'uppercase' }}>
            Discount Offered
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {h.discount_percentage}% OFF
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {formatInr(stats.totalDiscountGiven)} total savings
          </Text>
        </View>
      </View>

      {/* Clean Sub-Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: isActive ? THEME.greenDark : THEME.surface,
                borderWidth: 1,
                borderColor: isActive ? THEME.greenDark : THEME.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '700',
                  color: isActive ? '#FAF8F2' : THEME.muted,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TAB 1: OVERVIEW & CONTACTS */}
      {activeTab === 'overview' && !isEditingOverview && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
              Hospital Summary
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/admin/hospitals/add-new?editSlug=${h.slug}` as any)}
              style={{
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 12,
                paddingVertical: 7.5,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Edit3 size={13} color={THEME.greenPrimary} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.greenPrimary }}>
                Edit Details
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
            {/* Left Summary Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                Profile & Capacity
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 110 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>TOTAL BEDS</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink, marginTop: 2 }}>
                    {h.total_beds ?? 100}
                  </Text>
                </View>
                <View style={{ minWidth: 90 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ICU BEDS</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink, marginTop: 2 }}>
                    {h.icu_beds ?? 20}
                  </Text>
                </View>
                <View style={{ minWidth: 80 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>OTs</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink, marginTop: 2 }}>
                    {h.ot_count ?? 4}
                  </Text>
                </View>
                <View style={{ minWidth: 100 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>COMMISSION</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                    {h.commission_percentage ?? 10}%
                  </Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>OPD TIMINGS</Text>
                <WeeklyScheduleDisplay
                  schedule={h.weekly_schedule}
                  is24x7={h.is_24x7 !== false}
                  fallbackText={h.opd_hours}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>SPECIALTIES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(h.specialties || []).map((sp) => (
                    <View
                      key={sp}
                      style={{
                        backgroundColor: THEME.creamBg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>{sp}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Right Summary Card */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 14,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.ink }}>
                Contacts & Location
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PHONE 1 (DESK)</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {h.contact_number || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PHONE 2 (EMERGENCY)</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {h.secondary_contact_number || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>VIRTUAL HELPLINE</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {h.virtual_exotel_number || '—'}
                </Text>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ADDRESS</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {h.address}, {h.city}, {h.state} {h.pincode ? `- ${h.pincode}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => openGoogleMaps(h.latitude, h.longitude, h.address)}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: THEME.greenSoft,
                  borderWidth: 1,
                  borderColor: THEME.greenBorder,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <MapPin size={13} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                  Open in Google Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'overview' && isEditingOverview && (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
              Edit Hospital Details
            </Text>
            <TouchableOpacity
              onPress={() => setIsEditingOverview(false)}
              style={{
                backgroundColor: THEME.surface,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
            {/* Left Column: Photo, Identity & Accreditations */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                Hospital Profile, Photo & Accreditations
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  placeholder="https://... hospital image URL"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
                <TouchableOpacity
                  onPress={() => onPickPhoto((url) => setEditImageUrl(url))}
                  disabled={isUploadingPhoto}
                  style={{
                    backgroundColor: THEME.greenSoft,
                    borderWidth: 1,
                    borderColor: THEME.greenBorder,
                    paddingHorizontal: 11,
                    paddingVertical: 9,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Upload size={13} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.greenPrimary }}>
                    {isUploadingPhoto ? '...' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Hospital Tagline / Type
                  </Text>
                  <TextInput
                    value={editTag}
                    onChangeText={setEditTag}
                    placeholder="Multi-Specialty Tertiary Care"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Discount (%)
                  </Text>
                  <TextInput
                    value={editDiscount}
                    onChangeText={setEditDiscount}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Commission (%)
                  </Text>
                  <TextInput
                    value={editCommission}
                    onChangeText={setEditCommission}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <WeeklyScheduleEditor
                value={editWeeklySchedule}
                onChange={setEditWeeklySchedule}
                title="OPD Timings (Day-by-Day)"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Total Beds
                  </Text>
                  <TextInput
                    value={editTotalBeds}
                    onChangeText={setEditTotalBeds}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    ICU Beds
                  </Text>
                  <TextInput
                    value={editIcuBeds}
                    onChangeText={setEditIcuBeds}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    OTs
                  </Text>
                  <TextInput
                    value={editOtCount}
                    onChangeText={setEditOtCount}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Medical Specialties (comma-separated)
                </Text>
                <TextInput
                  value={editSpecialties}
                  onChangeText={setEditSpecialties}
                  multiline
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: editActive ? 'Active' : 'Paused', value: editActive, toggle: () => setEditActive(!editActive) },
                  { label: editIs24x7 ? '24x7 Open' : 'Day Hours', value: editIs24x7, toggle: () => setEditIs24x7(!editIs24x7) },
                  { label: editFeatured ? 'Featured' : 'Standard', value: editFeatured, toggle: () => setEditFeatured(!editFeatured) },
                  { label: editNabh ? 'NABH: Yes' : 'NABH: No', value: editNabh, toggle: () => setEditNabh(!editNabh) },
                  { label: editJci ? 'JCI: Yes' : 'JCI: No', value: editJci, toggle: () => setEditJci(!editJci) },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.toggle}
                    style={{
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: item.value ? THEME.greenSoft : THEME.creamSoft,
                      borderWidth: 1,
                      borderColor: item.value ? THEME.greenPrimary : THEME.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: item.value ? THEME.greenPrimary : THEME.muted,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Right Column: Dual Contact Numbers & Location Coordinates */}
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: THEME.border,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
                Contact Numbers & Location Details
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Contact 1 (Primary Desk)
                  </Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="+91 141 2566251"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Contact 2 (Emergency / Alt)
                  </Text>
                  <TextInput
                    value={editSecondaryPhone}
                    onChangeText={setEditSecondaryPhone}
                    placeholder="+91 141 2566999"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Virtual Helpline (Exotel Routing)
                </Text>
                <TextInput
                  value={editExotel}
                  onChangeText={setEditExotel}
                  placeholder="+91 141 400 8800"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Main Campus Street Address
                </Text>
                <TextInput
                  value={editAddress}
                  onChangeText={setEditAddress}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    City
                  </Text>
                  <TextInput
                    value={editCity}
                    onChangeText={setEditCity}
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    State
                  </Text>
                  <TextInput
                    value={editState}
                    onChangeText={setEditState}
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Pincode
                  </Text>
                  <TextInput
                    value={editPincode}
                    onChangeText={setEditPincode}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Latitude
                  </Text>
                  <TextInput
                    value={editLat}
                    onChangeText={setEditLat}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Longitude
                  </Text>
                  <TextInput
                    value={editLng}
                    onChangeText={setEditLng}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 12.5,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => openGoogleMaps(parseFloat(editLat), parseFloat(editLng), editAddress)}
                  style={{
                    backgroundColor: THEME.creamSoft,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    paddingHorizontal: 11,
                    paddingVertical: 9,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MapPin size={13} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                    Verify Map
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
            style={{
              backgroundColor: THEME.greenPrimary,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={15} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
              {isSavingProfile ? 'Saving Changes...' : 'Save Hospital Profile & Contacts'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 2: BRANCHES & LOCATIONS */}
      {activeTab === 'branches' && (
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Hospital Branches & Campus Locations ({branchStatsList.length})
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Per-branch contact numbers, GPS coordinates, assigned doctors, services & earnings
              </Text>
            </View>

            <TouchableOpacity
              onPress={openAddBranchModal}
              style={{
                backgroundColor: THEME.greenPrimary,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 9,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Add Branch</Text>
            </TouchableOpacity>
          </View>

          {branchStatsList.length === 0 ? (
            <Text style={{ fontSize: 13, color: THEME.muted, paddingVertical: 12 }}>
              No branches configured yet. Add the main campus or satellite clinics.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {branchStatsList.map((bs) => {
                const br = bs.branch;
                const brDocs = hospitalDoctors.filter((d) => d.branch_id === br.id);
                const brServices = br.services_offered || ['OPD Consultation', '24x7 Emergency'];
                return (
                  <View
                    key={br.id}
                    style={{
                      flexGrow: 1,
                      flexBasis: isDesktop ? '48%' : '100%',
                      backgroundColor: THEME.creamBg,
                      borderRadius: 12,
                      padding: 15,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>{br.name}</Text>
                          {br.is_main_branch && (
                            <View style={{ backgroundColor: THEME.greenSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: THEME.greenPrimary }}>MAIN CAMPUS</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                          {br.address} ({br.area || br.city})
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => openGoogleMaps(br.latitude, br.longitude, br.address)}
                          style={{
                            backgroundColor: THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 7,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <MapPin size={12} color={THEME.greenPrimary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>Map</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openEditBranchModal(br)}
                          style={{
                            backgroundColor: THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 7,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Edit3 size={12} color={THEME.ink} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.ink }}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Branch Contact Numbers */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <Text style={{ fontSize: 11.5, color: THEME.ink, fontWeight: '600' }}>
                        Desk: {br.contact_number || '—'}
                      </Text>
                      {br.secondary_contact_number ? (
                        <Text style={{ fontSize: 11.5, color: THEME.ink, fontWeight: '600' }}>
                          Alt/Emerg: {br.secondary_contact_number}
                        </Text>
                      ) : null}
                      {br.virtual_exotel_number ? (
                        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                          Helpline: {br.virtual_exotel_number}
                        </Text>
                      ) : null}
                    </View>

                    {/* Per-Branch Financial & Booking Strip */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.surface,
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>BOOKINGS</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                          {bs.confirmedCount} conf · {bs.missedCount} miss
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>EARNINGS</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenPrimary }}>
                          {formatInr(bs.grossEarnings)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.muted }}>WEEK PAYOUT</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.ink }}>
                          {formatInr(bs.weeklyPayoutDue)}
                        </Text>
                      </View>
                    </View>

                    {/* Doctors at this Branch */}
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                          DOCTORS AT THIS BRANCH ({brDocs.length})
                        </Text>
                        <TouchableOpacity
                          onPress={() => setBranchDocsModalBranch(br)}
                          style={{
                            backgroundColor: THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.greenBorder,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Plus size={11} color={THEME.greenPrimary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>
                            Assign / Add Doctor
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {brDocs.length === 0 ? (
                        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                          No doctors assigned to this branch yet.
                        </Text>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {brDocs.map((d) => (
                            <View
                              key={d.id}
                              style={{
                                backgroundColor: d.is_available_today === false ? THEME.redBg : THEME.surface,
                                borderWidth: 1,
                                borderColor: d.is_available_today === false ? '#FECACA' : THEME.border,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: d.is_available_today === false ? THEME.redText : THEME.ink }}>
                                {d.name} · <Text style={{ color: THEME.muted, fontWeight: '500' }}>{d.specialty}</Text>
                                {d.is_available_today === false ? ' (On Leave)' : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Services at this Branch */}
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                        BRANCH SERVICES & LABS
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {brServices.map((svc) => (
                          <View
                            key={svc}
                            style={{
                              backgroundColor: THEME.greenSoft,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 5,
                            }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.greenPrimary }}>{svc}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* TAB 3: DOCTORS & BRANCH LINKING */}
      {activeTab === 'doctors' && (
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
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 10 }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Hospital Doctors & Branch Assignment ({filteredDoctors.length})
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Filter by campus branch or reassign which doctor practices at which branch
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setDocBranchId(hospitalBranches[0]?.id || '');
                setIsAddDocOpen(true);
              }}
              style={{
                backgroundColor: THEME.greenPrimary,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 9,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Add Hospital Doctor</Text>
            </TouchableOpacity>
          </View>

          {/* Branch filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity
              onPress={() => setDoctorBranchFilter('ALL')}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: doctorBranchFilter === 'ALL' ? THEME.greenSoft : THEME.creamBg,
                borderWidth: 1,
                borderColor: doctorBranchFilter === 'ALL' ? THEME.greenPrimary : THEME.border,
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: doctorBranchFilter === 'ALL' ? THEME.greenPrimary : THEME.muted }}>
                All Branches ({hospitalDoctors.length})
              </Text>
            </TouchableOpacity>
            {hospitalBranches.map((br) => (
              <TouchableOpacity
                key={br.id}
                onPress={() => setDoctorBranchFilter(br.id)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 7,
                  backgroundColor: doctorBranchFilter === br.id ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: doctorBranchFilter === br.id ? THEME.greenPrimary : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: doctorBranchFilter === br.id ? THEME.greenPrimary : THEME.muted }}>
                  {br.area || br.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredDoctors.length === 0 ? (
            <Text style={{ fontSize: 13, color: THEME.muted, paddingVertical: 12 }}>
              No doctors found for this branch filter.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredDoctors.map((doc) => (
                <View
                  key={doc.id}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 11,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: THEME.ink }}>{doc.name}</Text>
                        {doc.is_available_today === false && (
                          <View style={{ backgroundColor: THEME.redBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: THEME.redText }}>ON LEAVE TODAY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: THEME.muted }}>
                        {doc.specialty} · {doc.qualification || 'MBBS'} · {doc.experience_years} yrs exp
                      </Text>
                      {doc.is_available_today === false ? (
                        <View
                          style={{
                            backgroundColor: THEME.redBg,
                            borderWidth: 1,
                            borderColor: '#FECACA',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                            ● Unavailable Today (Marked On Leave)
                          </Text>
                        </View>
                      ) : (
                        <WeeklyScheduleDisplay
                          schedule={doc.weekly_schedule}
                          is24x7={false}
                          fallbackText={doc.opd_timing}
                        />
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: THEME.greenPrimary }}>
                        {formatInr(doc.discounted_fee || doc.consultation_fee)}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: THEME.muted, textDecorationLine: 'line-through' }}>
                        {formatInr(doc.consultation_fee)}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleToggleDoctorLeave(doc)}
                          style={{
                            backgroundColor: doc.is_available_today === false ? THEME.greenSoft : THEME.redBg,
                            borderWidth: 1,
                            borderColor: doc.is_available_today === false ? THEME.greenBorder : '#FECACA',
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 7,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: doc.is_available_today === false ? THEME.greenPrimary : THEME.redText,
                            }}
                          >
                            {doc.is_available_today === false ? 'Mark Available' : 'Mark On Leave'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingDocSchedule(doc);
                            setDocScheduleDraft(doc.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE);
                          }}
                          style={{
                            backgroundColor: THEME.surface,
                            borderWidth: 1,
                            borderColor: THEME.border,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 7,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.greenPrimary }}>
                            Edit Hours
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {hospitalBranches.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginRight: 4 }}>
                        Assigned Branch:
                      </Text>
                      {hospitalBranches.map((br) => {
                        const isAssigned = doc.branch_id === br.id;
                        return (
                          <TouchableOpacity
                            key={br.id}
                            onPress={() => handleAssignDoctorBranch(doc.id, br.id)}
                            style={{
                              paddingHorizontal: 9,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: isAssigned ? THEME.greenPrimary : THEME.surface,
                              borderWidth: 1,
                              borderColor: isAssigned ? THEME.greenPrimary : THEME.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: isAssigned ? '#FFFFFF' : THEME.ink,
                              }}
                            >
                              {br.area || br.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 4: SERVICES, IPD & LABS */}
      {activeTab === 'services' && (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <ChipGroupEditor
                title="Core Hospital Facilities & Departments"
                subtitle="OPD, Emergency, ICU, Pharmacy & support units available at this hospital"
                presets={PRESET_FACILITIES}
                selected={facilitiesList}
                onChange={setFacilitiesList}
                placeholder="Add custom facility (e.g. Trauma Center)..."
              />
            </View>
            <View style={{ flex: 1 }}>
              <ChipGroupEditor
                title="Labs & Diagnostic Imaging Offered"
                subtitle="Pathology, Radiology, Scans & Home Sample services offered in-house"
                presets={PRESET_LABS}
                selected={labsList}
                onChange={setLabsList}
                placeholder="Add custom lab/scan (e.g. PET-CT)..."
              />
            </View>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <ChipGroupEditor
                title="IPD & Surgeries Offered"
                subtitle="Inpatient surgical specialties & procedures handled by this hospital"
                presets={PRESET_IPD_SERVICES}
                selected={ipdList}
                onChange={setIpdList}
                placeholder="Add custom surgery/IPD package..."
              />
            </View>
            <View style={{ flex: 1 }}>
              <ChipGroupEditor
                title="Cashless Insurance & TPA Partners"
                subtitle="Government schemes & private health insurers accepted for IPD"
                presets={PRESET_INSURANCE_PARTNERS}
                selected={insuranceList}
                onChange={setInsuranceList}
                placeholder="Add TPA / insurer..."
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSaveServices}
            disabled={isSavingServices}
            style={{
              backgroundColor: THEME.greenPrimary,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={15} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
              {isSavingServices ? 'Saving Services...' : 'Save Services, IPD, Labs & Insurance'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAB 5: BOOKINGS */}
      {activeTab === 'bookings' && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Hospital Bookings ({filteredBookings.length})
            </Text>
            <TouchableOpacity
              onPress={handleExportBookingsCsv}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: THEME.border,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
              }}
            >
              <Download size={14} color={THEME.ink} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                Export Bookings CSV
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['ALL', 'CONFIRMED', 'MISSED', 'CANCELLED'] as const).map((st) => (
              <TouchableOpacity
                key={st}
                onPress={() => setLedgerStatusFilter(st)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 7,
                  backgroundColor: ledgerStatusFilter === st ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: ledgerStatusFilter === st ? THEME.greenPrimary : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: ledgerStatusFilter === st ? THEME.greenPrimary : THEME.muted }}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
            {hospitalBranches.map((br) => (
              <TouchableOpacity
                key={br.id}
                onPress={() => setLedgerBranchFilter(ledgerBranchFilter === br.id ? 'ALL' : br.id)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 7,
                  backgroundColor: ledgerBranchFilter === br.id ? THEME.amberBg : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: ledgerBranchFilter === br.id ? THEME.amberBorder : THEME.border,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: ledgerBranchFilter === br.id ? THEME.amberText : THEME.muted }}>
                  {br.area || br.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredBookings.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
              No bookings match the selected filters.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {pagedBookings.map((b) => (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                      #{b.booking_ref || b.id.slice(0, 8)} · {b.patient_name}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      {b.doctor_name || b.service_type} · {b.branch_name ? `${b.branch_name} · ` : ''}
                      {b.slot_time || new Date(b.created_at).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0))}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: '800',
                        color:
                          b.status === 'MISSED' || b.status === 'CANCELLED'
                            ? THEME.redText
                            : THEME.greenPrimary,
                        marginTop: 2,
                      }}
                    >
                      {b.status}
                    </Text>
                  </View>
                </View>
              ))}
              <AdminPagination
                totalCount={filteredBookings.length}
                page={safeBookingsPage}
                pageSize={bookingsPageSize}
                onPageChange={setBookingsPage}
                onPageSizeChange={(sz) => {
                  setBookingsPageSize(sz);
                  setBookingsPage(1);
                }}
                itemLabel="bookings"
              />
            </View>
          )}
        </View>
      )}

      {/* TAB 6: LEDGER & PAYOUTS */}
      {activeTab === 'ledger' && (
        <View style={{ gap: 16 }}>
          {/* Ledger Header, Period Dropdown & CSV Export */}
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: isDesktop ? 'center' : 'flex-start',
              gap: 10,
              zIndex: 20,
            }}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Hospital Financial Ledger & Payouts
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Collections, {commPct}% platform fee, shared payouts & bill history
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
              {/* YouTube-style Period Dropdown */}
              <View style={{ position: 'relative', zIndex: 30 }}>
                <TouchableOpacity
                  onPress={() => setIsPeriodMenuOpen((prev) => !prev)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: THEME.surface,
                    borderWidth: 1,
                    borderColor: isPeriodMenuOpen ? THEME.greenPrimary : THEME.border,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    borderRadius: 9,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                    {activePeriodLabel}
                  </Text>
                  <ChevronDown size={14} color={THEME.muted} />
                </TouchableOpacity>

                {isPeriodMenuOpen && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 40,
                      right: 0,
                      minWidth: 220,
                      backgroundColor: THEME.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      paddingVertical: 4,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                      zIndex: 40,
                    }}
                  >
                    {PERIOD_OPTIONS.map((opt) => {
                      const active = opt.key === ledgerPeriod;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => {
                            setLedgerPeriod(opt.key);
                            setIsPeriodMenuOpen(false);
                          }}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            backgroundColor: active ? THEME.greenSoft : 'transparent',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12.5,
                              fontWeight: active ? '800' : '600',
                              color: active ? THEME.greenPrimary : THEME.ink,
                            }}
                          >
                            {opt.label}
                          </Text>
                          {active && <CheckCircle2 size={13} color={THEME.greenPrimary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleExportLedgerCsv}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: THEME.surface,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 9,
                }}
              >
                <Download size={14} color={THEME.ink} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                  Export Ledger CSV
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Unified Selected Period Ledger Summary */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: THEME.border,
              flexDirection: isDesktop ? 'row' : 'column',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                GROSS COLLECTED ({activePeriodLabel.toUpperCase()})
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: THEME.ink, marginTop: 4 }}>
                {formatInr(activeLedgerSummary.gross)}
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                {activeLedgerSummary.bookingsCount} billed bookings
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                ADITYAM FEE ({commPct}%)
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: THEME.ink, marginTop: 4 }}>
                {formatInr(activeLedgerSummary.commission)}
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                Hospital net: {formatInr(activeLedgerSummary.netShare)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                PAID / SHARED TO HOSPITAL
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: THEME.greenPrimary, marginTop: 4 }}>
                {formatInr(activeLedgerSummary.paid)}
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                {activeLedgerSummary.payouts.length} settlements in period
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: THEME.muted }}>
                BALANCE DUE
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: activeLedgerSummary.balanceDue > 0 ? THEME.amberText : THEME.greenDark,
                  marginTop: 4,
                }}
              >
                {activeLedgerSummary.balanceDue === 0 && activeLedgerSummary.paid > 0
                  ? 'PAID ✓'
                  : formatInr(activeLedgerSummary.balanceDue)}
              </Text>
              <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                {activeLedgerSummary.balanceDue > 0 ? 'Pending payout' : 'Settled'}
              </Text>
            </View>
          </View>

          {/* Weekly Payout Settlement Card */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12 }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                  {stats.weeklyPayoutDue === 0 && stats.paidThisWeek > 0
                    ? `Weekly Payout Settled (${formatInr(stats.paidThisWeek)} Paid)`
                    : `Weekly Payout (${formatInr(stats.weeklyPayoutDue)})`}
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Net after {commPct}% platform fee · Last 7 days
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', width: isDesktop ? 360 : '100%' }}>
                <TextInput
                  value={utrInput}
                  onChangeText={setUtrInput}
                  placeholder="UTR / Bank Ref (optional)"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    flex: 1,
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 12.5,
                    color: THEME.ink,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSettlePayout}
                  disabled={isSettlingPayout}
                  style={{
                    backgroundColor: THEME.greenPrimary,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                    {isSettlingPayout ? 'Saving...' : 'Mark Paid'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                PAYOUT & SETTLEMENT HISTORY ({activeLedgerSummary.payouts.length})
              </Text>
              {activeLedgerSummary.payouts.length === 0 ? (
                <Text style={{ fontSize: 12, color: THEME.muted, paddingVertical: 8 }}>
                  No payouts recorded in this period. Use Mark Paid above when settling this hospital.
                </Text>
              ) : (
                <>
                  {pagedPayouts.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: THEME.creamBg,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: THEME.ink }}>
                          {p.utr_reference || 'Settled'} · {p.period_label || 'Weekly'}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          {new Date(p.settled_at).toLocaleDateString('en-IN')}
                          {p.gross_amount ? ` · Gross ${formatInr(p.gross_amount)} · Fee ${formatInr(p.commission_amount || 0)}` : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.greenPrimary }}>
                        {formatInr(p.amount)}
                      </Text>
                    </View>
                  ))}
                  <AdminPagination
                    totalCount={activeLedgerSummary.payouts.length}
                    page={safePayoutPage}
                    pageSize={payoutPageSize}
                    onPageChange={setPayoutPage}
                    itemLabel="payouts"
                    compact
                  />
                </>
              )}
            </View>
          </View>

          {/* Bill-by-Bill Financial Ledger */}
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 14,
              padding: 18,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Bill-by-Bill Ledger ({activeLedgerSummary.rows.length})
            </Text>
            {activeLedgerSummary.rows.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
                No confirmed or billed bookings in this period.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {pagedLedgerBookings.map((b) => {
                  const gross = Number(b.bill_amount ?? b.final_payable ?? b.doctor_fee ?? 0);
                  const comm = Math.round((gross * commPct) / 100);
                  const net = Math.max(0, gross - comm);
                  return (
                    <View
                      key={b.id}
                      style={{
                        backgroundColor: THEME.creamBg,
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.ink }}>
                          #{b.booking_ref || b.id.slice(0, 8)} · {b.patient_name}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                          {new Date(b.created_at).toLocaleDateString('en-IN')} · {b.doctor_name || b.service_type}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: THEME.ink }}>
                          Gross {formatInr(gross)}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          Fee {formatInr(comm)} · Net{' '}
                          <Text style={{ fontWeight: '800', color: THEME.greenPrimary }}>
                            {formatInr(net)}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <AdminPagination
                  totalCount={activeLedgerSummary.rows.length}
                  page={safeLedgerPage}
                  pageSize={ledgerPageSize}
                  onPageChange={setLedgerPage}
                  onPageSizeChange={(sz) => {
                    setLedgerPageSize(sz);
                    setLedgerPage(1);
                  }}
                  itemLabel="bills"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* ADD / EDIT BRANCH MODAL */}
      <Modal
        visible={isBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90%',
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                  {editingBranchId ? 'Edit Hospital Branch' : 'Add Hospital Branch'}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                  {h.name} · Contacts, GPS & Branch Services
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 11, paddingBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Branch Name *
                </Text>
                <TextInput
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="e.g. Mansarovar Satellite Clinic"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Area / Locality
                  </Text>
                  <TextInput
                    value={branchArea}
                    onChangeText={setBranchArea}
                    placeholder="Mansarovar"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    City
                  </Text>
                  <TextInput
                    value={branchCity}
                    onChangeText={setBranchCity}
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                  Branch Full Address *
                </Text>
                <TextInput
                  value={branchAddress}
                  onChangeText={setBranchAddress}
                  placeholder="Sector 5, Shipra Path, Mansarovar, Jaipur"
                  style={{
                    backgroundColor: THEME.creamBg,
                    borderWidth: 1,
                    borderColor: THEME.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: THEME.ink,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Contact 1 (Desk)
                  </Text>
                  <TextInput
                    value={branchPhone}
                    onChangeText={setBranchPhone}
                    placeholder="+91 141 ..."
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Contact 2 (Alt / Emergency)
                  </Text>
                  <TextInput
                    value={branchSecondaryPhone}
                    onChangeText={setBranchSecondaryPhone}
                    placeholder="+91 141 ..."
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Latitude
                  </Text>
                  <TextInput
                    value={branchLat}
                    onChangeText={setBranchLat}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted, marginBottom: 4 }}>
                    Longitude
                  </Text>
                  <TextInput
                    value={branchLng}
                    onChangeText={setBranchLng}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: THEME.creamBg,
                      borderWidth: 1,
                      borderColor: THEME.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                  Services & Labs Available at This Branch
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {PRESET_BRANCH_SERVICES.map((svc) => {
                    const active = branchServices.includes(svc);
                    return (
                      <TouchableOpacity
                        key={svc}
                        onPress={() =>
                          setBranchServices(
                            active
                              ? branchServices.filter((s) => s !== svc)
                              : [...branchServices, svc]
                          )
                        }
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 7,
                          backgroundColor: active ? THEME.greenSoft : THEME.creamBg,
                          borderWidth: 1,
                          borderColor: active ? THEME.greenPrimary : THEME.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '700',
                            color: active ? THEME.greenPrimary : THEME.muted,
                          }}
                        >
                          {svc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setBranchIsMain(!branchIsMain)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: branchIsMain ? THEME.greenSoft : THEME.creamBg,
                  borderWidth: 1,
                  borderColor: branchIsMain ? THEME.greenPrimary : THEME.border,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: branchIsMain ? THEME.greenPrimary : THEME.muted }}>
                  {branchIsMain ? '✓ Main Campus Branch' : 'Set as Main Campus Branch'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveBranch}
                disabled={isSavingBranch}
                style={{
                  backgroundColor: THEME.greenPrimary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {isSavingBranch ? 'Saving Branch...' : editingBranchId ? 'Save Branch Changes' : 'Create Branch'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUICK ADD DOCTOR TO HOSPITAL MODAL */}
      <Modal
        visible={isAddDocOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddDocOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.45)',
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
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 11,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                Add Doctor to {h.name}
              </Text>
              <TouchableOpacity onPress={() => setIsAddDocOpen(false)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={docName}
              onChangeText={setDocName}
              placeholder="Doctor Name (e.g. Dr. Ananya Verma)"
              style={{
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 13,
                color: THEME.ink,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={docSpecialty}
                onChangeText={setDocSpecialty}
                placeholder="Specialty"
                style={{
                  flex: 1,
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                }}
              />
              <TextInput
                value={docQualification}
                onChangeText={setDocQualification}
                placeholder="MBBS, MD"
                style={{
                  flex: 1,
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={docFee}
                onChangeText={setDocFee}
                keyboardType="numeric"
                placeholder="OPD Fee (₹)"
                style={{
                  flex: 1,
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                }}
              />
              <TextInput
                value={docExperience}
                onChangeText={setDocExperience}
                keyboardType="numeric"
                placeholder="Exp (yrs)"
                style={{
                  flex: 1,
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: THEME.ink,
                }}
              />
            </View>

            <TextInput
              value={docTiming}
              onChangeText={setDocTiming}
              placeholder="OPD Timing (e.g. Mon-Sat, 10 AM - 5 PM)"
              style={{
                backgroundColor: THEME.creamBg,
                borderWidth: 1,
                borderColor: THEME.border,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                fontSize: 13,
                color: THEME.ink,
              }}
            />

            {hospitalBranches.length > 0 && (
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>Assign Branch</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {hospitalBranches.map((br) => {
                    const active = docBranchId === br.id;
                    return (
                      <TouchableOpacity
                        key={br.id}
                        onPress={() => setDocBranchId(br.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 7,
                          backgroundColor: active ? THEME.greenPrimary : THEME.creamBg,
                          borderWidth: 1,
                          borderColor: active ? THEME.greenPrimary : THEME.border,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#FFFFFF' : THEME.ink }}>
                          {br.area || br.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreateHospitalDoctor}
              disabled={isSavingDoc}
              style={{
                backgroundColor: THEME.greenPrimary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                {isSavingDoc ? 'Adding Doctor...' : 'Save & Link Doctor'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT DOCTOR WEEKLY SCHEDULE MODAL */}
      <Modal
        visible={Boolean(editingDocSchedule)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingDocSchedule(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.45)',
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
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                  {editingDocSchedule?.name} · OPD Hours
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                  Set exact day-by-day shifts (e.g. Sat 14:00 to 16:00)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingDocSchedule(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <WeeklyScheduleEditor
                value={docScheduleDraft}
                onChange={setDocScheduleDraft}
                title="Doctor Weekly Schedule"
              />
              <TouchableOpacity
                onPress={handleSaveDoctorSchedule}
                disabled={isSavingDocSchedule}
                style={{
                  backgroundColor: THEME.greenPrimary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  {isSavingDocSchedule ? 'Saving...' : 'Save Doctor Hours'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BRANCH DOCTOR ASSIGNMENT MODAL */}
      <Modal
        visible={Boolean(branchDocsModalBranch)}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchDocsModalBranch(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20, 54, 43, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 500,
              maxHeight: '85%',
              backgroundColor: THEME.surface,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: THEME.border,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.ink }}>
                  Doctors at {branchDocsModalBranch?.name}
                </Text>
                <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                  Assign existing hospital doctors to this branch or add a new doctor
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBranchDocsModalBranch(null)}>
                <X size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {hospitalDoctors.length === 0 ? (
                <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 8 }}>
                  No doctors in this hospital yet.
                </Text>
              ) : (
                hospitalDoctors.map((doc) => {
                  const isHere = doc.branch_id === branchDocsModalBranch?.id;
                  const otherBranch = hospitalBranches.find((b) => b.id === doc.branch_id);
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      onPress={() =>
                        handleAssignDoctorBranch(
                          doc.id,
                          isHere ? null : branchDocsModalBranch?.id || null
                        )
                      }
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: isHere ? THEME.greenSoft : THEME.creamBg,
                        borderWidth: 1,
                        borderColor: isHere ? THEME.greenPrimary : THEME.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink }}>
                          {doc.name}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: THEME.muted }}>
                          {doc.specialty}
                          {!isHere && otherBranch ? ` · Currently at ${otherBranch.area || otherBranch.name}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: isHere ? THEME.greenPrimary : THEME.muted,
                        }}
                      >
                        {isHere ? '✓ Assigned' : '+ Assign'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                const targetBrId = branchDocsModalBranch?.id || '';
                setBranchDocsModalBranch(null);
                setDocBranchId(targetBrId);
                setIsAddDocOpen(true);
              }}
              style={{
                backgroundColor: THEME.greenPrimary,
                borderRadius: 10,
                paddingVertical: 11,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Add New Doctor to This Branch
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
