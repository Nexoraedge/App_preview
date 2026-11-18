// apps/mobile/src/hooks/useSupabaseData.ts
// React Query hooks for all Supabase-backed data. Each hook falls back gracefully.

import { useQuery } from '@tanstack/react-query';
import {
  fetchLabItems,
  fetchLabCentres,
  fetchLabPricesForItems,
  fetchPharmacies,
  fetchIpdSurgeries,
  fetchHeroBanners,
  fetchHealthPackages,
  fetchPartnerOffers,
  fetchHospitalBranchesWithDoctors,
} from '../lib/supabase';

const STALE_5MIN = 1000 * 60 * 5;

export function useLabItems(segment?: string) {
  return useQuery({
    queryKey: ['lab-items', segment ?? 'all'],
    queryFn: () => fetchLabItems(segment),
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function useLabCentres() {
  return useQuery({
    queryKey: ['lab-centres'],
    queryFn: fetchLabCentres,
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function useLabPrices(itemIds: string[]) {
  return useQuery({
    queryKey: ['lab-prices', itemIds],
    queryFn: () => fetchLabPricesForItems(itemIds),
    staleTime: STALE_5MIN,
    retry: 1,
    enabled: itemIds.length > 0,
  });
}

export function usePharmacies() {
  return useQuery({
    queryKey: ['pharmacies'],
    queryFn: fetchPharmacies,
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 1,
  });
}

export function useIpdSurgeries(category?: string) {
  return useQuery({
    queryKey: ['ipd-surgeries', category ?? 'ALL'],
    queryFn: () => fetchIpdSurgeries(category),
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function useHeroBanners() {
  return useQuery({
    queryKey: ['hero-banners'],
    queryFn: fetchHeroBanners,
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function useHealthPackages() {
  return useQuery({
    queryKey: ['health-packages'],
    queryFn: fetchHealthPackages,
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function usePartnerOffers() {
  return useQuery({
    queryKey: ['partner-offers'],
    queryFn: fetchPartnerOffers,
    staleTime: STALE_5MIN,
    retry: 1,
  });
}

export function useHospitalBranches(hospitalIds: string[]) {
  return useQuery({
    queryKey: ['hospital-branches', hospitalIds],
    queryFn: () => fetchHospitalBranchesWithDoctors(hospitalIds),
    staleTime: STALE_5MIN,
    retry: 1,
    enabled: hospitalIds.length > 0,
  });
}
