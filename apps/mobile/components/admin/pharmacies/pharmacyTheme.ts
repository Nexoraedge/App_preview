import type { WeeklySchedule } from '../WeeklyScheduleEditor';

export interface ExtendedPharmacy {
  id: string;
  slug?: string | null;
  name: string;
  name_hi?: string | null;
  area: string;
  area_hi?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviews?: number | null;
  delivery?: boolean;
  pickup?: boolean;
  app_discount_pct?: number | null;
  commission_percentage?: number | null;
  shop_address?: string | null;
  shop_phone?: string | null;
  secondary_phone?: string | null;
  drug_license_number?: string | null;
  gst_number?: string | null;
  image_url?: string | null;
  is_24x7?: boolean;
  weekly_schedule?: WeeklySchedule | null;
  delivery_radius_km?: number | null;
  delivery_time_mins?: number | null;
  min_order_free_delivery?: number | null;
  hospital_id?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface PharmacyStats {
  pharmacy: ExtendedPharmacy;
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

export interface PharmacyPayout {
  id: string;
  pharmacy_id: string;
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
};

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function getPharmacySlug(p: Pick<ExtendedPharmacy, 'id' | 'slug' | 'name'>): string {
  if (p.slug && p.slug.trim()) return p.slug.trim();
  const base = (p.name || 'pharmacy')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || p.id;
}
