import type { Hospital, HospitalBranch, Doctor } from '@adityam/types';
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

export interface ExtendedHospital extends Hospital {
  tag?: string | null;
  nabh_accredited?: boolean;
  jci_accredited?: boolean;
  secondary_contact_number?: string | null;
  emergency_contact_number?: string | null;
  commission_percentage?: number | null;
  opd_hours?: string | null;
  is_24x7?: boolean | null;
  total_beds?: number | null;
  icu_beds?: number | null;
  ot_count?: number | null;
  weekly_schedule?: WeeklySchedule | null;
  labs_offered?: string[] | null;
  ipd_services_offered?: string[] | null;
  insurance_partners?: string[] | null;
}

export interface ExtendedBranch extends HospitalBranch {
  secondary_contact_number?: string | null;
  opd_hours?: string | null;
  is_24x7?: boolean | null;
  weekly_schedule?: WeeklySchedule | null;
  services_offered?: string[] | null;
  labs_offered?: string[] | null;
}

export interface ExtendedDoctor extends Doctor {
  weekly_schedule?: WeeklySchedule | null;
  is_available_today?: boolean | null;
}

export interface HospitalPayout {
  id: string;
  hospital_id: string;
  amount: number;
  utr_reference?: string | null;
  period_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  gross_amount?: number | null;
  commission_amount?: number | null;
  status?: string | null;
  notes?: string | null;
  settled_at: string;
}

export interface BranchStats {
  branch: ExtendedBranch;
  totalBookings: number;
  confirmedCount: number;
  missedCount: number;
  grossEarnings: number;
  weeklyPayoutDue: number;
  doctorsCount: number;
}

export interface HospitalStats {
  hospital: ExtendedHospital;
  totalBookings: number;
  confirmedCount: number;
  missedCount: number;
  cancelledCount: number;
  grossEarnings: number;
  totalDiscountGiven: number;
  weeklyPayoutDue: number;
  weeklyBookingsCount: number;
  paidThisWeek: number;
  lastPayoutDate?: string | null;
  monthlyGross: number;
  monthlyBookingsCount: number;
  monthlyPaid: number;
  doctorsCount: number;
  branchesCount: number;
}

export const PRESET_FACILITIES = [
  'OPD Consultation',
  '24x7 Emergency & Trauma',
  'ICU / NICU / PICU',
  'In-House Pharmacy',
  'Cashless TPA Desk',
  'Ambulance Service',
  'Operation Theatre (OT)',
  'Blood Bank',
  'Dialysis Unit',
  'Physiotherapy',
];

export const PRESET_LABS = [
  'Pathology & Blood Tests',
  'Digital X-Ray',
  'Ultrasound / Sonography',
  'CT Scan',
  'MRI Scan',
  'ECG / 2D Echo / TMT',
  'Mammography',
  'Endoscopy & Colonoscopy',
  'Home Sample Collection',
  'Full Body Health Checkup',
];

export const PRESET_IPD_SERVICES = [
  'General Surgery',
  'Orthopedics & Joint Replacement',
  'Cardiology & Cath Lab',
  'Maternity & Gynecology',
  'Urology & Kidney Care',
  'Ophthalmology / Cataract',
  'Neurosurgery',
  'Oncology & Chemo',
  'ENT Surgery',
  'Laparoscopic Surgery',
];

export const PRESET_INSURANCE_PARTNERS = [
  'RGHS (Rajasthan Govt)',
  'Ayushman Bharat / Chiranjeevi',
  'Star Health',
  'HDFC Ergo',
  'ICICI Lombard',
  'Niva Bupa',
  'CGHS / ECHS',
  'Medi Assist',
];

export const PRESET_BRANCH_SERVICES = [
  'OPD Consultation',
  'IPD & Admissions',
  '24x7 Emergency',
  'Pathology Lab',
  'Radiology (X-Ray / MRI / CT)',
  'In-House Pharmacy',
  'Cashless TPA Desk',
  'Ambulance',
];

export const formatInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
}
