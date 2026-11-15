import type { Doctor } from '@adityam/types';
import type { WeeklySchedule } from '../WeeklyScheduleEditor';

export const THEME = {
  creamBg: '#FAF8F2',
  creamSoft: '#F3EFE4',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  greenDark: '#14362B',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF5F0',
  greenBorder: '#C6E2D4',
  ink: '#1A2421',
  muted: '#5C6B64',
  amberText: '#9A5B13',
  amberBg: '#FEF7E6',
  amberBorder: '#F3DBA8',
  redText: '#B91C1C',
  redBg: '#FEF2F2',
};

export interface SoloDoctor extends Omit<Doctor, 'hospital_id'> {
  hospital_id?: string | null;
  is_solo?: boolean | null;
  slug?: string | null;
  registration_number?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  discount_percentage?: number | null;
  commission_percentage?: number | null;
  about?: string | null;
  services_offered?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  weekly_schedule?: WeeklySchedule | null;
  is_available_today?: boolean | null;
  featured?: boolean | null;
}

export interface DoctorStats {
  doctor: SoloDoctor;
  linkedHospitalName: string | null;
  linkedBranchName: string | null;
  totalBookings: number;
  confirmedCount: number;
  missedCount: number;
  cancelledCount: number;
  grossEarnings: number;
  totalDiscountGiven: number;
  weeklyPayoutDue: number;
  weeklyBookingsCount: number;
}

export interface DoctorPayout {
  id: string;
  doctor_id: string;
  amount: number;
  utr_reference?: string | null;
  period_label?: string | null;
  notes?: string | null;
  settled_at: string;
}

export const PRESET_DOCTOR_SERVICES = [
  'OPD Consultation',
  'Follow-up Visit',
  'Video Consultation',
  'ECG / Basic Screening',
  'Minor Procedures',
  'Chronic Care Management',
  'Second Opinion',
  'Home Visit',
];

export const PRESET_SPECIALTIES = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Gynecology & Obstetrics',
  'ENT',
  'Ophthalmology',
  'Neurology',
  'Psychiatry',
  'Dentistry',
];

export const formatInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function getDoctorSlug(doc: SoloDoctor): string {
  if (doc.slug) return doc.slug;
  return (doc.id || doc.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
