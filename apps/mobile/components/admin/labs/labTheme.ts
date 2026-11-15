import type { WeeklySchedule } from '../WeeklyScheduleEditor';

export interface ExtendedLabCentre {
  id: string;
  slug?: string | null;
  name: string;
  area: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  secondary_phone?: string | null;
  image_url?: string | null;
  rating?: number | null;
  reviews?: number | null;
  home_collection?: boolean;
  home_collection_radius_km?: number | null;
  home_collection_fee?: number | null;
  free_home_collection_above?: number | null;
  home_collection_slots?: string | null;
  home_collection_pincodes?: string | null;
  report_turnaround_hrs?: number | null;
  next_slot?: string | null;
  offers?: string[] | null;
  price_factor?: number | null;
  exclude_items?: string[] | null;
  nabl_certified?: boolean;
  license_number?: string | null;
  is_24x7?: boolean;
  weekly_schedule?: WeeklySchedule | null;
  discount_percentage?: number | null;
  commission_percentage?: number | null;
  hospital_id?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface LabItem {
  id: string;
  name: string;
  name_hi?: string;
  segment: 'lab' | 'scan' | 'package';
  category: string;
  report_hrs: number;
  fasting_hrs?: number | null;
  prep?: string | null;
  tests_count?: number | null;
  base_price: number;
  is_active?: boolean;
  popular?: boolean;
}

export interface LabCentrePrice {
  id: string;
  item_id: string;
  centre_id: string;
  price: number;
  is_available: boolean;
}

export interface LabStats {
  centre: ExtendedLabCentre;
  linkedHospitalName?: string | null;
  totalBookings: number;
  confirmedCount: number;
  missedCount: number;
  cancelledCount: number;
  grossEarnings: number;
  weeklyGross: number;
  weeklyPayoutDue: number;
  weeklyBookingsCount: number;
  paidThisWeek: number;
  monthlyGross: number;
  monthlyBookingsCount: number;
  monthlyPaid: number;
  totalDiscountGiven: number;
}

export interface LabPayout {
  id: string;
  centre_id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  commission_amount: number;
  net_payout_amount: number;
  status: 'PENDING' | 'PAID';
  payment_ref?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export const THEME = {
  creamBg: '#FAF8F2',
  creamSoft: '#F3EFE4',
  surface: '#FFFFFF',
  border: '#E6E1D5',
  ink: '#14362B',
  muted: '#6B7D74',
  greenDark: '#14362B',
  greenPrimary: '#1B5E43',
  greenSoft: '#EBF4EE',
  greenBorder: '#C7E0D0',
  amberBg: '#FEF7E6',
  amberText: '#9A6300',
  redBg: '#FDECEC',
  redText: '#B42318',
  blueBg: '#EEF5FF',
  blueText: '#1D4ED8',
};

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getLabSlug(c: Pick<ExtendedLabCentre, 'id' | 'slug' | 'name'>): string {
  if (c.slug && c.slug.trim()) return c.slug.trim();
  const base = (c.name || 'lab-centre')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || c.id;
}
