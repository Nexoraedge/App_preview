-- Bilingual Hindi display columns populated once on Admin approval (free auto-translate + staff override)

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS address_hi TEXT,
  ADD COLUMN IF NOT EXISTS tagline_hi TEXT;

ALTER TABLE public.hospital_branches
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS area_hi TEXT,
  ADD COLUMN IF NOT EXISTS address_hi TEXT;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS specialty_hi TEXT,
  ADD COLUMN IF NOT EXISTS clinic_address_hi TEXT;

ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS address_hi TEXT;
