-- Optional dedicated delivery GPS & address columns on bookings for partner rider navigation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
