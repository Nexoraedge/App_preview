-- Add home collection serviceable pincodes and lab booking report/collector tracking
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS home_collection_pincodes TEXT;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS report_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS collector_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS collector_phone TEXT;
