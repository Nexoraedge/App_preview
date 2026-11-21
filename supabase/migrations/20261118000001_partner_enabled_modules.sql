-- Modular Partner Capabilities: one unified partner portal supporting any subset of
-- PHARMACY, OPD, LABS, and IPD per partner account.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[],
  ADD COLUMN IF NOT EXISTS partner_hospital_id UUID,
  ADD COLUMN IF NOT EXISTS partner_lab_id UUID,
  ADD COLUMN IF NOT EXISTS partner_pharmacy_id UUID;

-- Backfill existing partner accounts cleanly based on role / partner_type
UPDATE public.users
SET enabled_modules = CASE
  WHEN LOWER(COALESCE(role, '')) IN ('admin', 'super_admin') THEN ARRAY['PHARMACY', 'OPD', 'LABS', 'IPD']::TEXT[]
  WHEN LOWER(COALESCE(role, '')) = 'pharmacy_partner' OR LOWER(COALESCE(partner_type, '')) = 'pharmacy' THEN ARRAY['PHARMACY']::TEXT[]
  WHEN LOWER(COALESCE(role, '')) = 'lab_partner' OR LOWER(COALESCE(partner_type, '')) = 'lab' THEN ARRAY['LABS']::TEXT[]
  WHEN LOWER(COALESCE(role, '')) = 'doctor_partner' OR LOWER(COALESCE(partner_type, '')) = 'doctor' THEN ARRAY['OPD']::TEXT[]
  WHEN LOWER(COALESCE(role, '')) = 'hospital_partner' OR LOWER(COALESCE(partner_type, '')) = 'hospital' THEN ARRAY['OPD', 'IPD']::TEXT[]
  ELSE enabled_modules
END
WHERE enabled_modules IS NULL
  AND LOWER(COALESCE(role, '')) IN ('partner', 'pharmacy_partner', 'lab_partner', 'hospital_partner', 'doctor_partner', 'admin', 'super_admin');
