// apps/mobile/src/lib/supabase.ts
// Direct client and helper exports for mobile app

export {
  getSupabaseClient,
  requestOtp,
  verifyPhoneOtp,
  calculateDistanceKm,
  fetchNearbyHospitals,
  fetchLabItems,
  fetchLabCentres,
  fetchLabCentrePrice,
  fetchLabPricesForItems,
  fetchPharmacies,
  fetchIpdSurgeries,
  fetchHeroBanners,
  fetchHealthPackages,
  fetchPartnerOffers,
  fetchHospitalBranchesWithDoctors,
  fetchUserAddressesFromDb,
  saveUserAddressToDb,
  deleteUserAddressFromDb,
  uploadPrescriptionSlip,
  SEED_HOSPITALS,
  SEED_BOOKINGS,
} from '@adityam/supabase';
