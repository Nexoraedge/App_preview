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
import { List, LayoutGrid } from 'lucide-react-native';
import { getSupabaseClient } from '@adityam/supabase';
import type { Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { ipdCopy } from '../../src/i18n/ipdCopy';
import {
  CategoryFilter,
  PlannedSurgery,
  HospitalAdmissionInfo,
  MASTER_SURGERIES,
  MASTER_HOSPITALS,
} from '../../src/data/ipdData';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { IpdCardSkeleton } from '../../components/ui/SkeletonBox';
import { IpdHeroHeader } from '../../components/ipd/IpdHeroHeader';
import { CategoryChipsRow } from '../../components/ipd/CategoryChipsRow';
import { SurgeryPackageCard } from '../../components/ipd/SurgeryPackageCard';
import { AdmissionHospitalCard } from '../../components/ipd/AdmissionHospitalCard';
import { EmergencyBanner } from '../../components/ipd/EmergencyBanner';
import { DoctorSlipUploadModal } from '../../components/ipd/DoctorSlipUploadModal';
import { AdmissionBookingSheet } from '../../components/ipd/AdmissionBookingSheet';

export default function IpdScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const c = isHi ? ipdCopy.hi : ipdCopy.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [profileVisible, setProfileVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Filtered surgeries based on search query and category chip
  const filteredSurgeries = useMemo(() => {
    let list = MASTER_SURGERIES;
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
  }, [searchQuery, selectedCategory]);

  // Filtered hospitals based on search query
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_HOSPITALS;
    const q = searchQuery.toLowerCase().trim();
    return MASTER_HOSPITALS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.nameHi && h.nameHi.toLowerCase().includes(q)) ||
        h.location.toLowerCase().includes(q) ||
        (h.locationHi && h.locationHi.toLowerCase().includes(q)) ||
        h.specialties.some((spec) => spec.toLowerCase().includes(q)) ||
        (h.specialtiesHi && h.specialtiesHi.some((spec) => spec.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  // Bottom Sheet State for Procedure / Hospital Booking
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<PlannedSurgery | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalAdmissionInfo | null>(null);

  // Booking fields
  const [patientName, setPatientName] = useState(user?.full_name || 'Rahul Jain');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98112 44550');
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
    setIsSubmitting(true);
    const bookingRef = `IPD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: selectedHospital?.name || 'Network Hospital',
      doctor_name: selectedSurgery?.name || 'Inpatient Specialist',
      slot_time: 'Next Available Admission',
      specialty_requested: selectedSurgery?.category || 'Surgery & Inpatient Care',
      status: 'NEW',
      call_status: 'pending',
      notes: `Room: ${roomType} | Insurance: ${insurancePolicy} | Reason: ${admissionReason}`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
    } catch {
      // Offline fallback handling
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBookingId(bookingRef);
    }, 700);
  };

  const handleSubmitAdvice = async () => {
    setIsSubmittingAdvice(true);
    const caseId = `DOC-ADVICE-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: caseId,
      service_type: 'IPD_ENQUIRY',
      user_id: user?.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      hospital_name: 'Adityam Review Desk',
      slot_time: 'Immediate',
      status: 'NEW',
      call_status: 'pending',
      notes: `Prescription Advice Upload: ${adviceNote}`,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = getSupabaseClient();
      await supabase.from('bookings').insert(newBooking);
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
      />

      {/* Profile & Language Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
}
