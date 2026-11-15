export type PartnerType = 'HOSPITAL' | 'DOCTOR' | 'LAB' | 'PHARMACY';
export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type EnquirySource = 'WEBSITE' | 'WHATSAPP' | 'REFERRAL' | 'DIRECT_ADMIN';

export interface PartnerEnquiry {
  id: string;
  partner_type: PartnerType;
  organization_name: string;
  contact_person: string;
  phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  city: string;
  area?: string | null;
  address?: string | null;
  specialty_or_services?: string | null;
  proposed_discount_pct?: number | null;
  source: EnquirySource | string;
  status: EnquiryStatus;
  notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  converted_entity_id?: string | null;
  created_at: string;
  updated_at?: string;
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

export const PARTNER_TYPE_META: Record<
  PartnerType,
  { label: string; purpose: string; bg: string; color: string }
> = {
  HOSPITAL: {
    label: 'Hospital',
    purpose: 'Hospital OPD & IPD Network Tie-up',
    bg: THEME.greenSoft,
    color: THEME.greenPrimary,
  },
  DOCTOR: {
    label: 'Solo Doctor',
    purpose: 'Solo Clinic OPD Consultation Listing',
    bg: THEME.blueBg,
    color: THEME.blueText,
  },
  LAB: {
    label: 'Lab & Scan',
    purpose: 'Diagnostic & Pathology Centre Tie-up',
    bg: THEME.amberBg,
    color: THEME.amberText,
  },
  PHARMACY: {
    label: 'Pharmacy',
    purpose: 'Medicine Delivery & Discount Tie-up',
    bg: THEME.creamSoft,
    color: THEME.ink,
  },
};

export const STATUS_META: Record<EnquiryStatus, { label: string; bg: string; color: string }> = {
  NEW: { label: 'New Request', bg: THEME.amberBg, color: THEME.amberText },
  CONTACTED: { label: 'Contacted', bg: THEME.blueBg, color: THEME.blueText },
  UNDER_REVIEW: { label: 'Under Review', bg: '#F3EEFF', color: '#6D28D9' },
  APPROVED: { label: 'Approved', bg: THEME.greenSoft, color: THEME.greenPrimary },
  REJECTED: { label: 'Rejected', bg: THEME.redBg, color: THEME.redText },
};

export function formatEnquiryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recently';
  const diffHours = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
