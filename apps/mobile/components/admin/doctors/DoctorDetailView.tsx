import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Phone, Edit3 } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking, Hospital, HospitalBranch } from '@adityam/types';
import {
  THEME,
  DoctorStats,
  DoctorPayout,
  formatInr,
  getDoctorSlug,
} from './doctorTheme';
import { isMissingColumnError } from '../hospitals/hospitalTheme';
import { WeeklyScheduleDisplay } from '../WeeklyScheduleEditor';
import { SelectDropdown } from '../SelectDropdown';

type DoctorTab = 'overview' | 'linking' | 'ledger';

interface DoctorDetailViewProps {
  stats: DoctorStats;
  doctorBookings: Booking[];
  hospitals: Hospital[];
  branches: HospitalBranch[];
  onBack: () => void;
  onRefreshData: () => Promise<void>;
}

export function DoctorDetailView({
  stats,
  doctorBookings,
  hospitals,
  branches,
  onBack,
  onRefreshData,
}: DoctorDetailViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();
  const doc = stats.doctor;
  const docSlug = getDoctorSlug(doc);

  const [activeTab, setActiveTab] = useState<DoctorTab>('overview');
  const [payouts, setPayouts] = useState<DoctorPayout[]>([]);
  const [utrInput, setUtrInput] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<'ALL' | 'CONFIRMED' | 'MISSED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    const loadPayouts = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('doctor_payouts')
          .select('*')
          .eq('doctor_id', doc.id)
          .order('settled_at', { ascending: false });
        if (data) setPayouts(data as DoctorPayout[]);
      } catch {
        // table may not exist before migration
      }
    };
    loadPayouts();
  }, [doc.id]);

  const openMaps = () => {
    const url =
      doc.latitude && doc.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${doc.latitude},${doc.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            doc.clinic_address || doc.city || 'Jaipur'
          )}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleToggleLeave = async () => {
    const nextAvail = doc.is_available_today === false;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('doctors')
      .update({ is_available_today: nextAvail })
      .eq('id', doc.id);
    if (error && isMissingColumnError(error)) {
      Alert.alert(
        'Migration Needed',
        'Run migration 20261114000002_solo_doctors_support.sql in Supabase to save On Leave status.'
      );
      return;
    }
    if (error) {
      Alert.alert('Update Failed', error.message);
      return;
    }
    await onRefreshData();
  };

  const handleLinkHospital = async (hospitalId: string | null, branchId: string | null) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('doctors')
      .update({ hospital_id: hospitalId, branch_id: branchId })
      .eq('id', doc.id);
    if (error) {
      Alert.alert('Could Not Link', error.message);
      return;
    }
    await onRefreshData();
  };

  const handleSettlePayout = async () => {
    if (stats.weeklyPayoutDue <= 0) {
      Alert.alert('Nothing Due', 'No weekly payout amount due right now.');
      return;
    }
    setIsSettling(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('doctor_payouts').insert({
        doctor_id: doc.id,
        amount: stats.weeklyPayoutDue,
        utr_reference: utrInput.trim() || `UTR-${Date.now().toString(36).toUpperCase()}`,
        period_label: 'Last 7 Days',
      });
      if (error) {
        Alert.alert(
          'Migration Needed',
          'Run migration 20261114000002_solo_doctors_support.sql in Supabase to save payouts.'
        );
        return;
      }
      setUtrInput('');
      const { data } = await supabase
        .from('doctor_payouts')
        .select('*')
        .eq('doctor_id', doc.id)
        .order('settled_at', { ascending: false });
      if (data) setPayouts(data as DoctorPayout[]);
      Alert.alert('Settled', 'Doctor payout marked as paid.');
    } finally {
      setIsSettling(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return doctorBookings.filter((b) => {
      if (ledgerStatus === 'CONFIRMED') {
        return ['CONFIRMED', 'PAID', 'COMPLETED', 'SERVED'].includes(b.status);
      }
      if (ledgerStatus !== 'ALL') return b.status === ledgerStatus;
      return true;
    });
  }, [doctorBookings, ledgerStatus]);

  const isHospitalLinked = Boolean(doc.hospital_id);
  const effectiveTab: DoctorTab = isHospitalLinked && activeTab === 'ledger' ? 'overview' : activeTab;

  const TABS: { id: DoctorTab; label: string }[] = [
    { id: 'overview', label: 'Overview & Clinic' },
    { id: 'linking', label: 'Hospital & Branch Linking' },
    ...(!isHospitalLinked
      ? [{ id: 'ledger' as DoctorTab, label: `Bookings & Payouts (${doctorBookings.length})` }]
      : []),
  ];

  const discPct =
    doc.discount_percentage ??
    (doc.consultation_fee > 0 && doc.discounted_fee > 0
      ? Math.max(0, Math.round(((doc.consultation_fee - doc.discounted_fee) / doc.consultation_fee) * 100))
      : 0);

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

          {doc.avatar_url ? (
            <Image
              source={{ uri: doc.avatar_url }}
              style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: THEME.creamSoft }}
              resizeMode="cover"
            />
          ) : null}

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17.5, fontWeight: '800', color: THEME.ink }}>{doc.name}</Text>
              <View
                style={{
                  backgroundColor: doc.is_available_today === false ? THEME.redBg : THEME.greenSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: '800',
                    color: doc.is_available_today === false ? THEME.redText : THEME.greenPrimary,
                  }}
                >
                  {doc.is_available_today === false ? 'ON LEAVE TODAY' : 'AVAILABLE'}
                </Text>
              </View>
              {stats.linkedHospitalName && (
                <View style={{ backgroundColor: THEME.creamSoft, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.ink }}>
                    Linked: {stats.linkedHospitalName}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
              {doc.specialty} · {doc.qualification || 'MBBS'} · {doc.experience_years} yrs exp
              {doc.registration_number ? ` · Reg: ${doc.registration_number}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              {doc.phone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color={THEME.greenPrimary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>{doc.phone}</Text>
                </View>
              ) : null}
              <TouchableOpacity onPress={openMaps} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} color={THEME.greenPrimary} />
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.greenPrimary }}>
                  {doc.clinic_name || 'Clinic Location'} · Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleToggleLeave}
          style={{
            backgroundColor: doc.is_available_today === false ? THEME.greenSoft : THEME.redBg,
            borderWidth: 1,
            borderColor: doc.is_available_today === false ? THEME.greenBorder : '#FECACA',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: doc.is_available_today === false ? THEME.greenPrimary : THEME.redText,
            }}
          >
            {doc.is_available_today === false ? 'Mark Available' : 'Mark On Leave'}
          </Text>
        </TouchableOpacity>
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
            {isHospitalLinked ? 'Payout Settlement' : 'This Week Payout Due'}
          </Text>
          <Text
            style={{
              fontSize: isHospitalLinked ? 18 : 24,
              fontWeight: '900',
              color: '#FAF8F2',
              marginTop: 6,
            }}
          >
            {isHospitalLinked ? 'Handled via Hospital' : formatInr(stats.weeklyPayoutDue)}
          </Text>
          <Text style={{ fontSize: 11, color: '#B7D4C7', marginTop: 6 }}>
            {isHospitalLinked
              ? stats.linkedHospitalName || 'Settled in Hospital module'
              : `${stats.weeklyBookingsCount} bookings (7d, ${100 - (doc.commission_percentage ?? 10)}% net)`}
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
            OPD Fee & Discount
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: THEME.amberText, marginTop: 6 }}>
            {formatInr(doc.discounted_fee || doc.consultation_fee)}
          </Text>
          <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {discPct}% OFF · Base {formatInr(doc.consultation_fee)}
          </Text>
        </View>
      </View>

      {/* Clean Sub-Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((tab) => {
          const isActive = effectiveTab === tab.id;
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
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: isActive ? '#FAF8F2' : THEME.muted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TAB 1: OVERVIEW & CLINIC */}
      {effectiveTab === 'overview' && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: THEME.ink }}>
              Doctor Summary
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/admin/doctors/add-new?editSlug=${docSlug}` as any)}
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
            {/* Left Card: Qualifications & OPD Schedule */}
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
                Qualifications & OPD Schedule
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>DEGREES</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {doc.qualification || 'MBBS, MD'}
                  </Text>
                </View>
                <View style={{ minWidth: 120 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>REG. NUMBER</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {doc.registration_number || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 90 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>COMMISSION</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: THEME.greenPrimary, marginTop: 2 }}>
                    {doc.commission_percentage ?? 10}%
                  </Text>
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>LANGUAGES</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {(doc.languages || ['English', 'Hindi']).join(', ')}
                </Text>
              </View>

              {doc.about ? (
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>ABOUT</Text>
                  <Text style={{ fontSize: 12.5, color: THEME.ink, lineHeight: 18 }}>{doc.about}</Text>
                </View>
              ) : null}

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>OPD TIMINGS</Text>
                {doc.is_available_today === false ? (
                  <View style={{ backgroundColor: THEME.redBg, padding: 10, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.redText }}>
                      ● Doctor is marked On Leave Today
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
            </View>

            {/* Right Card: Clinic Contacts, Location & Services */}
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
                Clinic Contacts & Services
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PHONE 1 (CLINIC)</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {doc.phone || '—'}
                  </Text>
                </View>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>PHONE 2 (ALT)</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: THEME.ink, marginTop: 2 }}>
                    {doc.secondary_phone || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>CLINIC ADDRESS</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: THEME.ink }}>
                  {doc.clinic_name ? `${doc.clinic_name} · ` : ''}
                  {doc.clinic_address || doc.city || 'Jaipur'}
                  {doc.pincode ? ` - ${doc.pincode}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={openMaps}
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

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: THEME.muted }}>SERVICES OFFERED</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(doc.services_offered || ['OPD Consultation', 'Follow-up Visit']).map((svc) => (
                    <View
                      key={svc}
                      style={{
                        backgroundColor: THEME.creamBg,
                        borderWidth: 1,
                        borderColor: THEME.border,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: THEME.ink }}>{svc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* TAB 2: HOSPITAL & BRANCH LINKING */}
      {effectiveTab === 'linking' && (
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: THEME.border,
            gap: 16,
          }}
        >
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              justifyContent: 'space-between',
              alignItems: isDesktop ? 'center' : 'flex-start',
              gap: 10,
            }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
                Link Doctor to Partner Hospital & Branch
              </Text>
              <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Current status:{' '}
                <Text style={{ fontWeight: '700', color: THEME.greenPrimary }}>
                  {stats.linkedHospitalName
                    ? `${stats.linkedHospitalName}${stats.linkedBranchName ? ` (${stats.linkedBranchName})` : ''}`
                    : 'Independent Solo Clinic Only'}
                </Text>
              </Text>
            </View>

            {isHospitalLinked && (
              <TouchableOpacity
                onPress={() => handleLinkHospital(null, null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: THEME.creamBg,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.ink }}>
                  Unlink (Make Solo Only)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="Partner Hospital"
                placeholder="Independent Solo Clinic Only"
                value={doc.hospital_id || ''}
                options={[
                  { value: '', label: 'Independent Solo Clinic Only (No Hospital)' },
                  ...hospitals.map((h) => ({
                    value: h.id,
                    label: h.name,
                    subtitle: h.address || undefined,
                  })),
                ]}
                onChange={(hospId) => {
                  if (!hospId) {
                    handleLinkHospital(null, null);
                  } else {
                    const firstBr = branches.find((b) => b.hospital_id === hospId);
                    handleLinkHospital(hospId, firstBr?.id || null);
                  }
                }}
              />
            </View>

            {Boolean(doc.hospital_id) && (
              <View style={{ flex: 1 }}>
                <SelectDropdown
                  label="Hospital Branch"
                  placeholder="Select Hospital Branch..."
                  value={doc.branch_id || ''}
                  options={branches
                    .filter((b) => b.hospital_id === doc.hospital_id)
                    .map((br) => ({
                      value: br.id,
                      label: br.area || br.name,
                      subtitle: br.address || undefined,
                    }))}
                  onChange={(brId) => handleLinkHospital(doc.hospital_id || null, brId)}
                />
              </View>
            )}
          </View>

          {isHospitalLinked && (
            <View
              style={{
                backgroundColor: THEME.greenSoft,
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: THEME.greenBorder,
              }}
            >
              <Text style={{ fontSize: 12, color: THEME.ink, fontWeight: '600' }}>
                Note: This doctor is linked to a hospital, so bookings & weekly payouts are managed directly inside the Hospitals section.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: BOOKINGS & PAYOUTS (Solo Doctors Only) */}
      {!isHospitalLinked && effectiveTab === 'ledger' && (
        <View style={{ gap: 16 }}>
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
                  Weekly Payout ({formatInr(stats.weeklyPayoutDue)})
                </Text>
                <Text style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Net after {doc.commission_percentage ?? 10}% platform fee · Last 7 days
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
                  disabled={isSettling}
                  style={{
                    backgroundColor: THEME.greenPrimary,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                    {isSettling ? 'Saving...' : 'Mark Paid'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {payouts.length > 0 && (
              <View style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: THEME.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.muted }}>
                  PAST SETTLEMENTS ({payouts.length})
                </Text>
                {payouts.slice(0, 5).map((p) => (
                  <View
                    key={p.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: THEME.creamBg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.ink }}>
                      {p.utr_reference || 'Settled'} · {new Date(p.settled_at).toLocaleDateString('en-IN')}
                    </Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: THEME.greenPrimary }}>
                      {formatInr(p.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

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
            <Text style={{ fontSize: 15, fontWeight: '800', color: THEME.ink }}>
              Bookings Ledger ({filteredBookings.length})
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['ALL', 'CONFIRMED', 'MISSED', 'CANCELLED'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setLedgerStatus(st)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 7,
                    backgroundColor: ledgerStatus === st ? THEME.greenSoft : THEME.creamBg,
                    borderWidth: 1,
                    borderColor: ledgerStatus === st ? THEME.greenPrimary : THEME.border,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: ledgerStatus === st ? THEME.greenPrimary : THEME.muted }}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredBookings.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: THEME.muted, paddingVertical: 14, textAlign: 'center' }}>
                No bookings recorded for this doctor yet.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredBookings.map((b) => (
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
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
