export type PartnerModule = 'PHARMACY' | 'OPD' | 'LABS' | 'IPD';

export const ALL_PARTNER_MODULES: PartnerModule[] = ['PHARMACY', 'OPD', 'LABS', 'IPD'];

export const PARTNER_MODULE_META: Record<
  PartnerModule,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  PHARMACY: {
    label: 'Pharmacy & Medicines',
    shortLabel: 'Pharmacy',
    description: 'Prescription triage, itemized quoting, 24h delivery & pickup.',
    badgeBg: '#EBF5F0',
    badgeText: '#14362B',
  },
  OPD: {
    label: 'OPD Consultations',
    shortLabel: 'OPD',
    description: 'Doctor slot queue, token check-in & digital Rx upload.',
    badgeBg: '#EFF6FF',
    badgeText: '#1D4ED8',
  },
  LABS: {
    label: 'Labs & Diagnostics',
    shortLabel: 'Labs',
    description: 'Home sample pickup, test tracking & lab report upload.',
    badgeBg: '#F5F3FF',
    badgeText: '#6D28D9',
  },
  IPD: {
    label: 'IPD & Admissions',
    shortLabel: 'IPD',
    description: 'Bed availability, cashless TPA coordination & surgery desk.',
    badgeBg: '#FFF7ED',
    badgeText: '#C2410C',
  },
};

const VALID_MODULE_SET = new Set<string>(ALL_PARTNER_MODULES);

/**
 * Resolves which modules are enabled for a partner account.
 * Uses explicit `enabled_modules` from Supabase when present; otherwise infers
 * cleanly from `role` / `partnerType` so existing accounts work without manual setup.
 */
export function resolvePartnerModules(input: {
  role?: string | null;
  partnerType?: string | null;
  enabledModules?: string[] | null;
}): PartnerModule[] {
  const explicit = (input.enabledModules || [])
    .map((m) => String(m || '').toUpperCase().trim())
    .filter((m): m is PartnerModule => VALID_MODULE_SET.has(m));
  if (explicit.length > 0) {
    return explicit;
  }

  const role = String(input.role || '').toLowerCase();
  const pType = String(input.partnerType || '').toLowerCase();

  if (role === 'admin' || role === 'super_admin') {
    return ['PHARMACY', 'OPD', 'LABS', 'IPD'];
  }
  if (role === 'pharmacy_partner' || pType === 'pharmacy') {
    return ['PHARMACY'];
  }
  if (role === 'lab_partner' || pType === 'lab') {
    return ['LABS'];
  }
  if (role === 'doctor_partner' || pType === 'doctor') {
    return ['OPD'];
  }
  if (role === 'hospital_partner' || pType === 'hospital') {
    return ['OPD', 'IPD'];
  }
  return ['PHARMACY'];
}
