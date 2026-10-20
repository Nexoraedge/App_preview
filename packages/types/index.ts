// ==============================================================================
// Adityam Niramayaa - Core Shared TypeScript Definitions
// Modern Healthcare Design System
// ==============================================================================

export type UserRole = 'patient' | 'admin' | 'call_center_agent' | 'partner';

export interface User {
  id: string;
  phone: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  city: string;
  wallet_balance: number;
  is_verified: boolean;
  role: UserRole;
  avatar_url?: string | null;
  aadhaar_last_four?: string | null;
  abha_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type DependentRelation = 'Father' | 'Mother' | 'Spouse' | 'Son' | 'Daughter' | 'Other';
export type KycStatus = 'pending_verification' | 'lazy_submitted' | 'verified';

export interface Dependent {
  id: string;
  user_id: string;
  full_name: string;
  relation: DependentRelation;
  age: number;
  gender: string;
  aadhaar_last_four?: string | null;
  kyc_status: KycStatus;
  consent_given: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Doctor {
  id: string;
  hospital_id: string;
  branch_id: string;
  name: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  rating: number;
  total_reviews: number;
  consultation_fee: number;
  discounted_fee: number;
  next_available_slot: string;
  avatar_url?: string | null;
  languages?: string[];
  opd_timing?: string;
}

export interface HospitalBranch {
  id: string;
  hospital_id: string;
  name: string;
  area: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  contact_number: string;
  virtual_exotel_number?: string;
  is_main_branch?: boolean;
  doctors: Doctor[];
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  distance_km?: number;
  rating: number;
  total_reviews: number;
  specialties: string[];
  facilities: string[];
  contact_number: string;
  virtual_exotel_number: string;
  discount_percentage: number;
  image_url?: string | null;
  is_active: boolean;
  featured: boolean;
  branches?: HospitalBranch[];
  created_at?: string;
}

export type ServiceType = 
  | 'OPD_CONCIERGE' 
  | 'INVESTIGATION' 
  | 'PHARMACY_SCAN_PAY' 
  | 'IPD_ENQUIRY';

export type BookingStatus = 
  | 'NEW' 
  | 'CALLING' 
  | 'CONFIRMED' 
  | 'CANCELLED' 
  | 'PAID';

export type CallStatus = 'pending' | 'calling' | 'connected' | 'completed' | 'missed';

export interface Booking {
  id: string;
  booking_ref: string;
  service_type: ServiceType;
  user_id?: string | null;
  patient_name: string;
  patient_phone: string;
  hospital_id?: string | null;
  hospital_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  doctor_id?: string | null;
  doctor_name?: string | null;
  doctor_fee?: number | null;
  slot_time?: string | null;
  specialty_requested?: string | null;
  bill_amount?: number | null;
  discount_amount?: number | null;
  final_payable?: number | null;
  bill_image_url?: string | null;
  qr_data?: string | null;
  status: BookingStatus;
  call_status: CallStatus;
  assigned_agent?: string | null;
  exotel_call_sid?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

// Modern Healthcare Design System Tokens - Royal Medical Blue & Clinical Lux
export const THEME_COLORS = {
  // Brand - Royal Medical Blue
  brandPrimary: '#3B82F6',
  brandAzure: '#447EEA',
  brandDeepBlue: '#1D4ED8',
  brandHover: '#2563EB',
  brandSoftBlue: '#EFF6FF',
  brandBlueBorder: '#BFDBFE',

  // Surfaces
  bgApp: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgMuted: '#F1F5F9',
  borderDefault: '#E2E8F0',

  // Text
  textPrimary: '#182F3B',
  textSecondary: '#64748B',
  textInverse: '#FFFFFF',

  // Gold Accents for Privileges & Discounts
  goldBadge: '#CF8A40',
  goldBg: '#FFF9F0',
  goldBorder: '#CF8A40',

  // Service Accents
  accentBlue: '#447EEA',
  accentViolet: '#8B70D6',
  accentAmber: '#E69A43',
  accentCoral: '#E87869',
  accentTeal: '#12AFA5',

  // Status
  statusSuccess: '#16A34A',
  statusError: '#DC2626',
} as const;

