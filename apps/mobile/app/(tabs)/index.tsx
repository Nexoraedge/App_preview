// apps/mobile/app/(tabs)/index.tsx
// Adityam Niramayaa - Home Screen Orchestrator
// Fully modularized: decoupled data in src/data, centralized i18n in src/i18n,
// and clean isolated section components in components/home/ (< 180 lines total).

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StatusBar as RNStatusBar,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/context/LanguageContext';
import { SEED_HOSPITALS } from '@adityam/supabase';
import type { Doctor } from '@adityam/types';

// Modular Home Components
import { HomeHeader } from '../../components/home/HomeHeader';
import { HeroCarousel } from '../../components/home/HeroCarousel';
import { CoreServicesGrid } from '../../components/home/CoreServicesGrid';
import { QuickAccessCard } from '../../components/home/QuickAccessCard';
import { SpecialtySelector } from '../../components/home/SpecialtySelector';
import { DoctorSpotlightSection } from '../../components/home/DoctorSpotlightSection';
import { HealthPackagesSection } from '../../components/home/HealthPackagesSection';
import { FamilyVaultCard } from '../../components/home/FamilyVaultCard';
import { TrustGridSection } from '../../components/home/TrustGridSection';
import { PartnerOffersSection } from '../../components/home/PartnerOffersSection';

// Shared Global Modals
import { ProfileModal } from '../../components/ui/ProfileModal';
import { JaiJinendraBlessingModal } from '../../components/ui/JaiJinendraBlessingModal';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [selectedCity, setSelectedCity] = useState('Saket, South Delhi NCR');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [blessingModalVisible, setBlessingModalVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial loading timer for smooth skeleton transition
  useEffect(() => {
    const tId = setTimeout(() => {
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(tId);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  const cycleCity = () => {
    const nextCity = selectedCity.includes('Bengaluru')
      ? 'Malviya Nagar, Jaipur'
      : selectedCity.includes('Jaipur')
        ? 'Saket, South Delhi NCR'
        : 'Koramangala, Bengaluru';
    setSelectedCity(nextCity);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Top Featured Doctors Spotlight (Dr. Satish Jain on top with 5 stars)
  const homeTopDoctors: Doctor[] = useMemo(() => {
    const list: Doctor[] = [];
    SEED_HOSPITALS.forEach((h) => {
      h.branches?.forEach((b) => {
        b.doctors?.forEach((d) => {
          if (!list.some((existing) => existing.id === d.id)) {
            list.push(d);
          }
        });
      });
    });
    list.sort((a, b) => {
      if (a.name.includes('Satish Jain')) return -1;
      if (b.name.includes('Satish Jain')) return 1;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list.slice(0, 4);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <RNStatusBar barStyle="light-content" backgroundColor="#172554" translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1E40AF', '#2563EB']}
            tintColor="#1E40AF"
          />
        }
        contentContainerStyle={{
          // Generous bottom padding so the floating glass tab bar never cuts off the bottom offer cards
          paddingBottom: Math.max(insets.bottom, 24) + 140,
        }}
      >
        {/* 1. Curved Brand Header with Search & Profile */}
        <HomeHeader
          isHi={isHi}
          topInset={insets.top}
          selectedCity={selectedCity}
          onCycleCity={cycleCity}
          onOpenProfile={() => setProfileModalVisible(true)}
          onSearchPress={() => router.push('/search')}
        />

        {/* 2. Top Hero Carousel Banner (158px with 1:1 Transparent PNG Illustrations) */}
        <HeroCarousel isHi={isHi} isLoading={isLoading} />

        {/* 3. The 4 Core Services: OPD, IPD, Labs, Pharmacy */}
        <CoreServicesGrid isHi={isHi} isLoading={isLoading} />

        {/* 4. Your Quick Access (Upcoming Appointment) */}
        <QuickAccessCard isHi={isHi} />

        {/* 5. Find Doctors by Specialty Carousel */}
        <SpecialtySelector isHi={isHi} />

        {/* 6. Top Doctors Spotlight Carousel */}
        <DoctorSpotlightSection
          doctors={homeTopDoctors}
          isHi={isHi}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />

        {/* 7. Comprehensive Health Checkup Packages Card */}
        <HealthPackagesSection isHi={isHi} />

        {/* 8. Adityam Family Health Vault Card */}
        <FamilyVaultCard isHi={isHi} />

        {/* 9. Institutional Trust 2x2 Grid */}
        <TrustGridSection isHi={isHi} />

        {/* 10. Partner Offers Section */}
        <PartnerOffersSection isHi={isHi} />
      </ScrollView>

      {/* Global Profile & Language Switcher Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

      {/* Opening Mangal Ashirwad / Sacred Blessing Modal */}
      <JaiJinendraBlessingModal
        visible={blessingModalVisible}
        onClose={() => setBlessingModalVisible(false)}
      />
    </View>
  );
}
