-- ==============================================================================
-- QUICK FIX: Add missing columns to existing tables, then run full seed
-- Paste THIS into Supabase SQL editor first, then run the full migration
-- ==============================================================================

-- Fix 1: Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_last_four VARCHAR(4);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS abha_id VARCHAR(50);

-- Fix 2: Add missing columns to hospitals table
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS name_hi VARCHAR(255);
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS specialties_hi TEXT[];
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS tag VARCHAR(100);
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS tag_hi VARCHAR(100);
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS nabh_accredited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS jci_accredited BOOLEAN DEFAULT FALSE;

-- Fix 3: Add missing columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_fee NUMERIC(10, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS slot_time VARCHAR(100);

-- Confirm
SELECT 'users cols' AS check, column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('aadhaar_last_four', 'abha_id')
UNION ALL
SELECT 'hospitals cols', column_name FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name IN ('name_hi', 'tag', 'nabh_accredited')
UNION ALL
SELECT 'bookings cols', column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name IN ('branch_id', 'doctor_id', 'doctor_fee');

