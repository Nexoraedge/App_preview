-- Partner Portal role linking + QR / Verification Code Check-In fields

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_entity_id VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_type VARCHAR(30);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS verification_code VARCHAR(12);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(150);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS partner_notes TEXT;

-- Backfill short 6-character verification codes for existing bookings that do not have one
UPDATE public.bookings
SET verification_code = UPPER(SUBSTR(MD5(id::text || COALESCE(booking_ref, '')), 1, 6))
WHERE verification_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_verification_code ON public.bookings (verification_code);
CREATE INDEX IF NOT EXISTS idx_users_partner_entity ON public.users (partner_entity_id);
