// apps/mobile/app/(tabs)/ipd.tsx
// Inpatient Care & Surgeries Screen - Modularized Orchestrator

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { List, LayoutGrid } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { saveNewBooking, subscribeCloudBookings } from '../../src/services/bookingStorage';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useLocation } from '../../src/context/LocationContext';
import { uploadPrescriptionSlip, calculateDistanceKm } from '../../src/lib/supabase';
import { ipdCopy } from '../../src/i18n/ipdCopy';
import {
  CategoryFilter,
  PlannedSurgery,
  HospitalAdmissionInfo,
} from '../../src/data/ipdData';
import { useIpdSurgeries } from '../../src/hooks/useSupabaseData';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { QuickAssistBar } from '../../components/ui/QuickAssistBar';
import { IpdCardSkeleton } from '../../components/ui/SkeletonBox';
import { IpdHeroHeader } from '../../components/ipd/IpdHeroHeader';
import { CategoryChipsRow } from '../../components/ipd/CategoryChipsRow';
import { SurgeryPackageCard } from '../../components/ipd/SurgeryPackageCard';
import { AdmissionHospitalCard } from '../../components/ipd/AdmissionHospitalCard';
import { EmergencyBanner } from '../../components/ipd/EmergencyBanner';
import { DoctorSlipUploadModal } from '../../components/ipd/DoctorSlipUploadModal';
import { AdmissionBookingSheet } from '../../components/ipd/AdmissionBookingSheet';
import { VerifyPhoneModal } from '../../components/auth/VerifyPhoneModal';

export default function IpdScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { activeAddress, currentLocationName } = useLocation();
  const isHi = language === 'hi';
  const c = isHi ? ipdCopy.hi : ipdCopy.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [profileVisible, setProfileVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false);
  const [pendingIpdAction, setPendingIpdAction] = useState<'admission' | 'advice' | null>(null);
  const [liveHospitals, setLiveHospitals] = useState<HospitalAdmissionInfo[]>([]);

  const loadIpdHospitals = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ data: hospRows }, { data: branchRows }] = await Promise.all([
        supabase.from('hospitals').select('*').order('name', { ascending: true }),
        supabase.from('hospital_branches').select('*'),
      ]);

      const refLat = activeAddress?.latitude ?? null;
      const refLng = activeAddress?.longitude ?? null;

      const activeHosps = (hospRows || []).filter((h: any) => h.is_active !== false);
      const activeBranches = (branchRows || []).filter((b: any) => b.is_active !== false);
      const mapped: HospitalAdmissionInfo[] = activeHosps.map((h: any) => {
        const mainBr = activeBranches.find((b: any) => b.hospital_id === h.id && b.is_main_branch) ||
          activeBranches.find((b: any) => b.hospital_id === h.id);
        const hLat = Number(mainBr?.latitude ?? h.latitude);
        const hLng = Number(mainBr?.longitude ?? h.longitude);
        const dist =
          refLat && refLng && Number.isFinite(hLat) && Number.isFinite(hLng) && hLat !== 0 && hLng !== 0
            ? Number(calculateDistanceKm(refLat, refLng, hLat, hLng).toFixed(1))
            : Number(h.distance_km ?? 0);

        const disc = Number(h.discount_percentage ?? 0);
        const facs = Array.isArray(h.facilities) && h.facilities.length > 0
          ? h.facilities
          : ['24x7 IPD', 'Cashless Care'];

        return {
          id: h.id,
          name: h.name,
          nameHi: h.name_hi || h.name,
          location: h.address || mainBr?.address || h.city || 'Jaipur',
          locationHi: h.address_hi || h.address || mainBr?.address || 'जयपुर',
          distance_km: dist,
          image_url: h.image_url || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
          rating: Number(h.rating ?? 4.8),
          total_reviews: Number(h.total_reviews ?? h.reviews_count ?? 0),
          tag: disc > 0 ? `${disc}% Off IPD` : 'Adityam Verified',
          tagHi: disc > 0 ? `${disc}% छूट` : 'सत्यापित अस्पताल',
          specialties: facs,
          specialtiesHi: Array.isArray(h.facilities_hi) && h.facilities_hi.length > 0 ? h.facilities_hi : facs,
        };
      });

      mapped.sort((a, b) => a.distance_km - b.distance_km);
      setLiveHospitals(mapped);
    } catch {
      setLiveHospitals([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress?.latitude, activeAddress?.longitude]);

  useEffect(() => {
    void loadIpdHospitals();
  }, [loadIpdHospitals]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadIpdHospitals();
    setIsRefreshing(false);
  }, [loadIpdHospitals]);

  const { data: dbSurgeries } = useIpdSurgeries(selectedCategory !== 'ALL' ? selectedCategory : undefined);

  const liveSurgeries: PlannedSurgery[] = useMemo(() => {
    if (dbSurgeries && dbSurgeries.length > 0) {
      return dbSurgeries.map((s: any) => ({
        id: s.id,
        shortName: s.short_name,
        shortNameHi: s.short_name_hi ?? s.short_name,
        name: s.name,
        nameHi: s.name_hi ?? s.name,
        category: s.category as PlannedSurgery['category'],
        stayDays: s.stay_days,
        stayDaysHi: s.stay_days_hi ?? s.stay_days,
        price: Number(s.price),
        tag: s.tag ?? '',
        tagHi: s.tag_hi ?? s.tag ?? '',
        whatItInvolves: s.what_it_involves ?? '',
        whatItInvolvesHi: s.what_it_involves_hi ?? s.what_it_involves ?? '',
        recoveryTimeline: s.recovery_timeline ?? '',
        recoveryTimelineHi: s.recovery_timeline_hi ?? s.recovery_timeline ?? '',
      }));
    }
    return [];
  }, [dbSurgeries]);

  // Filtered surgeries based on search query and category chip
  const filteredSurgeries = useMemo(() => {
    let list = liveSurgeries;
    if (selectedCategory !== 'ALL') {
      list = list.filter((s) => s.category === selectedCategory);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.shortName.toLowerCase().includes(q) ||
        (s.shortNameHi && s.shortNameHi.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q) ||
        (s.nameHi && s.nameHi.toLowerCase().includes(q)) ||
        s.tag.toLowerCase().includes(q) ||
        (s.tagHi && s.tagHi.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }, [liveSurgeries, searchQuery, selectedCategory]);

  // Filtered hospitals based on search query
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return liveHospitals;
    const q = searchQuery.toLowerCase().trim();
    return liveHospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.nameHi && h.nameHi.toLowerCase().includes(q)) ||
        h.location.toLowerCase().includes(q) ||
        (h.locationHi && h.locationHi.toLowerCase().includes(q)) ||
        h.specialties.some((spec) => spec.toLowerCase().includes(q)) ||
        (h.specialtiesHi && h.specialtiesHi.some((spec) => spec.toLowerCase().includes(q)))
    );
  }, [liveHospitals, searchQuery]);

  // Bottom Sheet State for Procedure / Hospital Booking
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalAdmissionInfo | null>(null);

  // Booking fields
  const [patientName, setPatientName] = useState(user?.full_name || '');
  const [patientPhone, setPatientPhone] = useState(
    user?.phone && user.phone !== '+91 99999 99999' && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910')
      ? user.phone
      : ''
  );

  useEffect(() => {
    if (user?.full_name) setPatientName(user.full_name);
    if (user?.phone && user.phone !== '+91 99999 99999' && !user.phone.startsWith('+9100') && !user.phone.startsWith('+910')) {
      setPatientPhone(user.phone);
    }
  }, [user]);

  // Realtime subscription for Supabase cloud bookings
  useEffect(() => {
    const unsub = subscribeCloudBookings(user?.id);
    return () => unsub();
  }, [user?.id]);
  const [roomType, setRoomType] = useState<'DELUXE' | 'SEMI' | 'GENERAL' | 'ICU'>('DELUXE');
  const [insurancePolicy, setInsurancePolicy] = useState('Star Health Insurance');
  const [admissionReason, setAdmissionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  // Doctor Slip Upload Sheet State
  const [adviceSheetVisible, setAdviceSheetVisible] = useState(false);
  const [adviceNote, setAdviceNote] = useState('');
  const [isSubmittingAdvice, setIsSubmittingAdvice] = useState(false);
  const [adviceSuccessRef, setAdviceSuccessRef] = useState<string | null>(null);

  const handleOpenProcedureSheet = (surgery: PlannedSurgery) => {
    setSelectedSurgery(surgery);
    setSelectedHospital(null);
    setConfirmedBookingId(null);
    setBottomSheetVisible(true);
  };

  const handleOpenHospitalBooking = (hosp: HospitalAdmissionInfo) => {
    setSelectedHospital(hosp);
    setSelectedSurgery(null);
    setConfirmedBookingId(null);
    setBottomSheetVisible(true);
  };

  const handleConfirmAdmissionBooking = async () => {
    if (!user?.phone) {
      setPendingIpdAction('admission');
      setIsVerifyPhoneOpen(true);
      return;
    }

    setIsSubmitting(true);
    const bookingRef = `IPD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      booking_ref: bookingRef,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_id: selectedHospital?.id || undefined,
      hospital_name: selectedHospital?.name || 'Network Hospital',
      doctor_name: selectedSurgery?.name || 'Inpatient Specialist',
      slot_time: 'Next Available Admission',
      specialty_requested: selectedSurgery?.category || 'Surgery & Inpatient Care',
      status: 'CONFIRMED',
      call_status: 'connected',
      doctor_fee: 0,
      final_payable: 0,
      notes: `Room: ${roomType} | Insurance: ${insurancePolicy} | Reason: ${admissionReason}`,
      created_at: new Date().toISOString(),
    };

    try {
      await saveNewBooking(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBookingId(bookingRef);
    }, 700);
  };

  const handleSubmitAdvice = async (slipUri?: string | null, slipBase64?: string) => {
    if (!user?.phone) {
      setPendingIpdAction('advice');
      setIsVerifyPhoneOpen(true);
      return;
    }

    setIsSubmittingAdvice(true);
    const caseId = `DOC-ADVICE-${Math.floor(10000 + Math.random() * 90000)}`;

    let uploadedUrl: string | undefined;
    if (slipUri) {
      try {
        uploadedUrl = await uploadPrescriptionSlip(slipUri, `${caseId}_advice.jpg`, slipBase64);
      } catch {}
    }

    const resolvedLocation = activeAddress
      ? [activeAddress.house_flat, activeAddress.landmark_street, activeAddress.city]
          .filter(Boolean)
          .join(', ')
      : currentLocationName || 'Jaipur';

    const newBooking: Booking = {
      id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
      booking_ref: caseId,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: 'Adityam Review Desk',
      branch_name: resolvedLocation,
      doctor_name: 'Inpatient Concierge Coordinator',
      slot_time: 'Immediate Concierge Review',
      specialty_requested: 'IPD Doctor Advice / Admission',
      status: 'CONFIRMED',
      call_status: 'connected',
      doctor_fee: 0,
      final_payable: 0,
      bill_image_url: uploadedUrl,
      notes: `Prescription Advice Upload (${resolvedLocation}): ${adviceNote}`,
      created_at: new Date().toISOString(),
    };

    try {
      await saveNewBooking(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmittingAdvice(false);
      setAdviceSuccessRef(caseId);
    }, 700);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 80,
        }}
      >
        <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        {/* Modular Hero Header with Search & Advice Slip Upload */}
        <IpdHeroHeader
          isHi={isHi}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenProfile={() => setProfileVisible(true)}
          onOpenAdviceUpload={() => {
            setAdviceSuccessRef(null);
            setAdviceSheetVisible(true);
          }}
        />

        {/* Quick Assistance 3-Pill Bar (Call, Doctor Advice Upload, WhatsApp) */}
        <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 4 }}>
          <QuickAssistBar
            context="ipd"
            isHi={isHi}
            onPressQuickOrder={() => {
              setAdviceSuccessRef(null);
              setAdviceSheetVisible(true);
            }}
          />
        </View>

        {/* Modular Surgery Category Chips */}
        <CategoryChipsRow
          isHi={isHi}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Hospital Care Trust Strip */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#DBEAFE',
              borderRadius: 14,
              paddingVertical: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            {[
              { icon: '💳', en: '0% EMI option', hi: '0% ईएमआई' },
              { icon: '🛡️', en: 'Cashless insurance', hi: 'कैशलेस बीमा' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <Text style={{ fontSize: 11 }}>{item.icon}</Text>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}
                >
                  {isHi ? item.hi : item.en}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Procedures Section Header & Switcher */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}
              >
                {c.surgeriesTitle}
              </Text>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '400',
                  color: '#64748B',
                  marginTop: 2,
                }}
              >
                {c.surgeriesSubtitle}
              </Text>
            </View>

            {/* View Layout Toggle: List vs Grid */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#F1F5F9',
                borderRadius: 10,
                padding: 2,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <TouchableOpacity
                onPress={() => setViewMode('list')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  elevation: viewMode === 'list' ? 1 : 0,
                }}
              >
                <List
                  size={16}
                  color={viewMode === 'list' ? '#1E40AF' : '#64748B'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewMode('grid')}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  elevation: viewMode === 'grid' ? 1 : 0,
                }}
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === 'grid' ? '#1E40AF' : '#64748B'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Surgeries Rendering */}
          {filteredSurgeries.length === 0 ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                padding: 24,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}
              >
                {c.noResults}
              </Text>
            </View>
          ) : isLoading ? (
            <View style={{ width: '100%' }}>
              <IpdCardSkeleton />
              <IpdCardSkeleton />
              <IpdCardSkeleton />
            </View>
          ) : viewMode === 'list' ? (
            <View style={{ gap: 12 }}>
              {filteredSurgeries.map((s, i) => (
                <SurgeryPackageCard
                  key={s.id}
                  surgery={s}
                  isHi={isHi}
                  viewMode="list"
                  index={i}
                  onPress={handleOpenProcedureSheet}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                rowGap: 14,
              }}
            >
              {filteredSurgeries.map((s, i) => (
                <SurgeryPackageCard
                  key={s.id}
                  surgery={s}
                  isHi={isHi}
                  viewMode="grid"
                  index={i}
                  onPress={handleOpenProcedureSheet}
                />
              ))}
            </View>
          )}

          {/* Footnote */}
          <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>
              {isHi
                ? '*कीमतें सांकेतिक हैं; अंतिम लागत आपके डॉक्टर, अस्पताल और बीमा अनुमोदन पर निर्भर करती है।'
                : '*Prices are indicative; final cost depends on your doctor, hospital, and insurance approval.'}
            </Text>
          </View>
        </View>

        {/* Partner Hospitals Horizontal Carousel */}
        <View style={{ marginTop: 22, paddingBottom: 10 }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text
              style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}
            >
              {c.hospitalsTitle}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '400',
                color: '#64748B',
                marginTop: 1,
              }}
            >
              {c.hospitalsSubtitle}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          >
            {filteredHospitals.map((hosp, idx) => (
              <AdmissionHospitalCard
                key={hosp.id}
                hospital={hosp}
                isHi={isHi}
                index={idx}
                onBookAdmission={handleOpenHospitalBooking}
              />
            ))}
          </ScrollView>
        </View>

        {/* Calm Emergency Banner */}
        <EmergencyBanner isHi={isHi} />
        </View>
      </ScrollView>

      {/* Modular Admission Booking Bottom Sheet */}
      <AdmissionBookingSheet
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        isHi={isHi}
        selectedSurgery={selectedSurgery}
        selectedHospital={selectedHospital}
        roomType={roomType}
        onSelectRoomType={setRoomType}
        patientName={patientName}
        onPatientNameChange={setPatientName}
        patientPhone={patientPhone}
        onPatientPhoneChange={setPatientPhone}
        insurancePolicy={insurancePolicy}
        onInsurancePolicyChange={setInsurancePolicy}
        admissionReason={admissionReason}
        onAdmissionReasonChange={setAdmissionReason}
        isSubmitting={isSubmitting}
        onSubmit={handleConfirmAdmissionBooking}
        confirmedBookingId={confirmedBookingId}
        onViewAppointments={() => {
          setBottomSheetVisible(false);
          router.push('/appointments');
        }}
      />

      {/* Modular Doctor Advice Slip Upload Modal */}
      <DoctorSlipUploadModal
        visible={adviceSheetVisible}
        onClose={() => setAdviceSheetVisible(false)}
        isHi={isHi}
        patientName={patientName}
        onPatientNameChange={setPatientName}
        patientPhone={patientPhone}
        onPatientPhoneChange={setPatientPhone}
        adviceNote={adviceNote}
        onAdviceNoteChange={setAdviceNote}
        isSubmitting={isSubmittingAdvice}
        onSubmit={handleSubmitAdvice}
        successRef={adviceSuccessRef}
        onViewAppointments={() => {
          setAdviceSheetVisible(false);
          router.push('/appointments');
        }}
      />

      {/* Profile & Language Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />

      {/* Progressive Phone Verification for Google Login Users */}
      <VerifyPhoneModal
        visible={isVerifyPhoneOpen}
        onClose={() => {
          setIsVerifyPhoneOpen(false);
          setPendingIpdAction(null);
        }}
        onSuccess={(verifiedPhone) => {
          setIsVerifyPhoneOpen(false);
          setPatientPhone(verifiedPhone);
          const action = pendingIpdAction;
          setPendingIpdAction(null);
          if (action === 'admission') {
            handleConfirmAdmissionBooking();
          } else if (action === 'advice') {
            handleSubmitAdvice();
          }
        }}
        isHi={isHi}
        title={isHi ? 'अस्पताल भर्ती हेतु मोबाइल सत्यापन' : 'Verify Phone for Hospital Admission'}
        subtitle={
          isHi
            ? 'कैशलेस टीपीए क्लेम और अस्पताल कंसीयर्ज सहायता हेतु अपना मोबाइल नंबर सत्यापित करें।'
            : 'Hospital TPA and clinical concierge coordinators require a verified mobile number to process cashless admission.'
        }
      />
    </View>
  );
}
