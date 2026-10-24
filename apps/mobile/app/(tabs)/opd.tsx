// apps/mobile/app/(tabs)/opd.tsx
// OPD Concierge Screen - Modularized Orchestrator

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Building2, UserCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNearbyHospitals, getSupabaseClient } from '@adityam/supabase';
import type { Hospital, Doctor, Booking } from '@adityam/types';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { opdCopy } from '../../src/i18n/opdCopy';
import { SortOption } from '../../src/data/opdData';
import { ProfileModal } from '../../components/ui/ProfileModal';
import { HospitalCardSkeleton, DoctorCardSkeleton } from '../../components/ui/SkeletonBox';
import { OpdSegmentedHeader } from '../../components/opd/OpdSegmentedHeader';
import { SpecialtyFilterPills } from '../../components/opd/SpecialtyFilterPills';
import { SortChipsRow } from '../../components/opd/SortChipsRow';
import { HospitalCard } from '../../components/opd/HospitalCard';
import {
  DoctorSpotlightCarousel,
  FlattenedDoctor,
} from '../../components/opd/DoctorSpotlightCarousel';
import { DoctorListItem } from '../../components/opd/DoctorListItem';
import {
  FloatingBookingBar,
  SelectedSlotDoctorInfo,
} from '../../components/opd/FloatingBookingBar';
import { BookingSlotModal } from '../../components/opd/BookingSlotModal';

export default function OpdConciergeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const c = isHi ? opdCopy.hi : opdCopy.en;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const cardGap = 16;
  const tabletCardWidth = (width - 40 - cardGap) / 2;
  const topDoctorCardWidth = Math.min(width - 48, 330);

  // Active tab state: Hospitals vs Doctors
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors'>('hospitals');
  const [hasVisitedDoctors, setHasVisitedDoctors] = useState(false);

  useEffect(() => {
    // Warm up doctors tab in idle background
    const timer = setTimeout(() => setHasVisitedDoctors(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const handleTabSwitch = useCallback((tab: 'hospitals' | 'doctors') => {
    if (tab === 'doctors') setHasVisitedDoctors(true);
    setActiveTab(tab);
    if (tab === 'hospitals') setSelectedSlotDoctor(null);
  }, []);

  const [screenLoading, setScreenLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setScreenLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (doctorId: string) => {
    setFavorites((prev) => ({ ...prev, [doctorId]: !prev[doctorId] }));
  };

  // Selected slot for sticky floating bar
  const [selectedSlotDoctor, setSelectedSlotDoctor] = useState<SelectedSlotDoctorInfo | null>(null);

  // Booking Modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingTargetDoctor, setBookingTargetDoctor] = useState<{
    doctor: Doctor;
    slot: string;
    hospitalName: string;
  } | null>(null);
  const [selectedModalSlot, setSelectedModalSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // TanStack Query for PostGIS Nearby Hospitals
  const { data: hospitals = [], isLoading, refetch } = useQuery({
    queryKey: ['nearby-hospitals', selectedSpecialty],
    queryFn: () =>
      fetchNearbyHospitals(
        28.5355,
        77.2,
        selectedSpecialty === 'All' ? undefined : selectedSpecialty
      ),
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refetch]);

  // Flattened doctors across all hospitals and branches
  const allDoctors = useMemo<FlattenedDoctor[]>(() => {
    const list: FlattenedDoctor[] = [];
    hospitals.forEach((h) => {
      (h.branches || []).forEach((b) => {
        (b.doctors || []).forEach((d) => {
          list.push({
            ...d,
            hospitalId: h.id,
            hospitalName: h.name,
            hospitalDiscount: h.discount_percentage,
            hospitalFeatured: !!h.featured,
            branchId: b.id,
            branchName: b.name,
            distanceKm: b.distance_km ?? h.distance_km ?? 5.0,
          });
        });
      });
    });
    return list;
  }, [hospitals]);

  // Filtered & Sorted Hospitals
  const filteredHospitals = useMemo(() => {
    let list = [...hospitals];

    if (selectedSpecialty !== 'All') {
      const target = selectedSpecialty.toLowerCase();
      list = list.filter((h) =>
        (h.specialties || []).some((s) => s.toLowerCase().includes(target))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((h) => {
        const nameMatch = h.name.toLowerCase().includes(q);
        const addressMatch = h.address.toLowerCase().includes(q);
        const cityMatch = h.city.toLowerCase().includes(q);
        const specialtyMatch = h.specialties.some((s) => s.toLowerCase().includes(q));
        const branchMatch = h.branches?.some(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.area.toLowerCase().includes(q) ||
            b.doctors.some((d) => d.name.toLowerCase().includes(q))
        );
        return nameMatch || addressMatch || cityMatch || specialtyMatch || branchMatch;
      });
    }

    if (sortBy === 'nearest') {
      list.sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
    } else if (sortBy === 'topRated') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'today') {
      list.sort((a, b) => {
        const aHasToday = a.branches?.some((br) =>
          br.doctors.some((d) => d.next_available_slot?.toLowerCase().includes('today'))
        );
        const bHasToday = b.branches?.some((br) =>
          br.doctors.some((d) => d.next_available_slot?.toLowerCase().includes('today'))
        );
        return (bHasToday ? 1 : 0) - (aHasToday ? 1 : 0);
      });
    } else if (sortBy === 'savings') {
      list.sort((a, b) => (b.discount_percentage ?? 0) - (a.discount_percentage ?? 0));
    }

    return list;
  }, [hospitals, selectedSpecialty, searchQuery, sortBy]);

  // Filtered & Sorted Doctors
  const filteredDoctors = useMemo(() => {
    let list = [...allDoctors];

    if (selectedSpecialty !== 'All') {
      const target = selectedSpecialty.toLowerCase();
      list = list.filter((d) => d.specialty.toLowerCase().includes(target));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        const nameMatch = d.name.toLowerCase().includes(q);
        const specMatch = d.specialty.toLowerCase().includes(q);
        const qualMatch = d.qualification.toLowerCase().includes(q);
        const hospMatch = d.hospitalName.toLowerCase().includes(q);
        const branchMatch = (d.branchName || '').toLowerCase().includes(q);
        return nameMatch || specMatch || qualMatch || hospMatch || branchMatch;
      });
    }

    if (sortBy === 'nearest') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'topRated') {
      list.sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
      );
    } else if (sortBy === 'today') {
      list.sort((a, b) => {
        const aToday = (a.next_available_slot || '').toLowerCase().includes('today');
        const bToday = (b.next_available_slot || '').toLowerCase().includes('today');
        return (bToday ? 1 : 0) - (aToday ? 1 : 0);
      });
    } else if (sortBy === 'savings') {
      list.sort((a, b) => {
        const aSave = a.consultation_fee - a.discounted_fee;
        const bSave = b.consultation_fee - b.discounted_fee;
        return bSave - aSave;
      });
    }

    return list;
  }, [allDoctors, selectedSpecialty, searchQuery, sortBy]);

  // Top Doctors Spotlight: Dr. Satish Jain strictly on top
  const showTopDoctors = filteredDoctors.length >= 2;
  const topDoctors = useMemo(() => {
    if (!showTopDoctors) return [];
    return [...filteredDoctors]
      .sort((a, b) => {
        const aSatish = a.name.includes('Satish Jain');
        const bSatish = b.name.includes('Satish Jain');
        if (aSatish && !bSatish) return -1;
        if (!aSatish && bSatish) return 1;
        return (
          (b.rating ?? 0) - (a.rating ?? 0) ||
          (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
        );
      })
      .slice(0, 3);
  }, [filteredDoctors, showTopDoctors]);

  // Regular doctors list excludes top doctors already in spotlight
  const regularDoctors = useMemo(() => {
    if (!showTopDoctors) return filteredDoctors;
    const topIds = new Set(topDoctors.map((d) => d.id));
    return filteredDoctors.filter((d) => !topIds.has(d.id));
  }, [filteredDoctors, showTopDoctors, topDoctors]);

  const handleSelectHospital = (hospital: Hospital) => {
    router.push({
      pathname: '/branch-doctors',
      params: {
        hospitalId: hospital.id,
        branchId: hospital.branches?.[0]?.id,
        specialty: selectedSpecialty !== 'All' ? selectedSpecialty : undefined,
      },
    });
  };

  const handleInitiateDoctorBooking = (
    doctor: Doctor,
    slot?: string,
    hospitalName?: string
  ) => {
    const effectiveSlot = slot || doctor.next_available_slot || 'Today, 6:30 PM';
    setBookingTargetDoctor({
      doctor,
      slot: effectiveSlot,
      hospitalName:
        hospitalName || (doctor as FlattenedDoctor).hospitalName || 'Hospital Network',
    });
    setSelectedModalSlot(effectiveSlot);
    setConfirmedBooking(null);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingTargetDoctor) return;
    setIsSubmitting(true);

    const bookingRef = `AN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveSlot = selectedModalSlot || bookingTargetDoctor.slot;
    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      booking_ref: bookingRef,
      service_type: 'OPD_CONCIERGE',
      user_id: user?.id,
      patient_name: user?.full_name || 'Rahul Jain',
      patient_phone: user?.phone || '+91 99999 99999',
      hospital_name: bookingTargetDoctor.hospitalName,
      doctor_name: bookingTargetDoctor.doctor.name,
      doctor_fee: bookingTargetDoctor.doctor.discounted_fee,
      slot_time: effectiveSlot,
      specialty_requested: bookingTargetDoctor.doctor.specialty,
      status: 'NEW',
      call_status: 'pending',
      notes: `OPD slot reserved for ${bookingTargetDoctor.doctor.name} at ${bookingTargetDoctor.hospitalName}. Masked Exotel dispatch initiated.`,
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
      setConfirmedBooking(newBooking);
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
          paddingBottom:
            Math.max(insets.bottom, 12) + (selectedSlotDoctor ? 150 : 90),
        }}
      >
        {/* Modular Segmented Header & Search */}
        <OpdSegmentedHeader
          isHi={isHi}
          activeTab={activeTab}
          onTabSwitch={handleTabSwitch}
          onOpenProfile={() => setProfileVisible(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Modular Specialty Filter Pills */}
        <SpecialtyFilterPills
          isHi={isHi}
          selectedSpecialty={selectedSpecialty}
          onSelectSpecialty={setSelectedSpecialty}
        />

        {/* Modular Sort Options Chips */}
        <SortChipsRow
          isHi={isHi}
          sortBy={sortBy}
          onSelectSort={setSortBy}
        />

        {/* TAB 1: HOSPITALS LIST */}
        <View style={{ display: activeTab === 'hospitals' ? 'flex' : 'none' }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#182F3B',
                    letterSpacing: -0.3,
                  }}
                >
                  {isHi ? 'अस्पताल नेटवर्क' : 'Hospital Networks'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#64748B',
                    fontWeight: '500',
                    marginTop: 2,
                  }}
                >
                  {isHi
                    ? `${filteredHospitals.length} अस्पताल नेटवर्क उपलब्ध`
                    : `${filteredHospitals.length} ${
                        filteredHospitals.length === 1
                          ? 'Hospital Network'
                          : 'Hospital Networks'
                      } available`}
                </Text>
              </View>
            </View>

            {isLoading || screenLoading ? (
              <View>
                <HospitalCardSkeleton />
                <HospitalCardSkeleton />
                <HospitalCardSkeleton />
              </View>
            ) : filteredHospitals.length === 0 ? (
              <View
                style={{
                  paddingVertical: 64,
                  alignItems: 'center',
                  paddingHorizontal: 24,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Building2 size={28} color="#94A3B8" />
                </View>
                <Text
                  style={{ fontSize: 16, fontWeight: '700', color: '#182F3B' }}
                >
                  {c.noHospitalsFound}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSpecialty('All')}
                  style={{
                    marginTop: 14,
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}
                  >
                    {c.resetFilters}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: isTablet ? 'row' : 'column',
                  flexWrap: isTablet ? 'wrap' : 'nowrap',
                  gap: isTablet ? cardGap : 0,
                  justifyContent: 'space-between',
                }}
              >
                {filteredHospitals.map((hospital) => (
                  <View
                    key={hospital.id}
                    style={{
                      width: isTablet ? tabletCardWidth : '100%',
                      marginBottom: isTablet ? cardGap : 16,
                    }}
                  >
                    <HospitalCard
                      hospital={hospital}
                      isHi={isHi}
                      onPress={handleSelectHospital}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* TAB 2: DOCTORS DIRECTORY */}
        {hasVisitedDoctors && (
          <View
            style={{
              display: activeTab === 'doctors' ? 'flex' : 'none',
              paddingHorizontal: 16,
              paddingTop: 16,
            }}
          >
            {isLoading || screenLoading ? (
              <View>
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
                <DoctorCardSkeleton />
              </View>
            ) : filteredDoctors.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 32,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                  marginVertical: 24,
                }}
              >
                <UserCheck size={36} color="#94A3B8" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#182F3B',
                    marginTop: 8,
                  }}
                >
                  {c.noDoctorsFound}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSpecialty('All')}
                  style={{
                    marginTop: 16,
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}
                  >
                    {c.resetFilters}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 1. Modular Top Doctors Spotlight Carousel */}
                <DoctorSpotlightCarousel
                  topDoctors={topDoctors}
                  language={language}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onBookDoctor={handleInitiateDoctorBooking}
                  cardWidth={topDoctorCardWidth}
                />

                {/* 2. Directory Section Heading */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    paddingHorizontal: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '900',
                      color: '#182F3B',
                      letterSpacing: -0.3,
                    }}
                  >
                    {c.allSpecialistsHeader}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#EFF6FF',
                      paddingHorizontal: 10,
                      paddingVertical: 2,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: 'rgba(191, 219, 254, 0.6)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#2563EB',
                      }}
                    >
                      {regularDoctors.length}{' '}
                      {isHi
                        ? 'डॉक्टर'
                        : regularDoctors.length === 1
                        ? 'Doctor'
                        : 'Doctors'}
                    </Text>
                  </View>
                </View>

                {/* 3. Modular Doctors List */}
                <View
                  style={{
                    flexDirection: isTablet ? 'row' : 'column',
                    flexWrap: isTablet ? 'wrap' : 'nowrap',
                    gap: isTablet ? cardGap : 0,
                    justifyContent: 'space-between',
                  }}
                >
                  {regularDoctors.map((doc) => (
                    <DoctorListItem
                      key={`${doc.id}-${doc.hospitalId}`}
                      doc={doc}
                      isFav={!!favorites[doc.id]}
                      language={language}
                      toggleFavorite={toggleFavorite}
                      onBookDoctor={handleInitiateDoctorBooking}
                      width={isTablet ? tabletCardWidth : '100%'}
                      marginBottom={isTablet ? cardGap : 16}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modular Floating Bottom Bar when slot selected */}
      <FloatingBookingBar
        selectedSlotDoctor={selectedSlotDoctor}
        language={language}
        bottomInset={insets.bottom}
        onClear={() => setSelectedSlotDoctor(null)}
        onBook={(doc, slot, hospName) =>
          handleInitiateDoctorBooking(doc, slot, hospName)
        }
      />

      {/* Modular Booking Slot Modal */}
      <BookingSlotModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        confirmedBooking={confirmedBooking}
        bookingTargetDoctor={bookingTargetDoctor}
        selectedModalSlot={selectedModalSlot}
        onSelectModalSlot={setSelectedModalSlot}
        isSubmitting={isSubmitting}
        onConfirmBooking={handleConfirmBooking}
        userPhone={user?.phone}
        userName={user?.full_name}
        language={language}
      />

      {/* Profile & Language Modal */}
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
}
