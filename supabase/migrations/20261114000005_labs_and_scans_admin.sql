-- Extend public.lab_centres with capabilities, home collection rules, timings, hospital linking & payouts
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(30);
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS nabl_certified BOOLEAN DEFAULT TRUE;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS is_24x7 BOOLEAN DEFAULT FALSE;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS home_collection_radius_km INTEGER DEFAULT 10;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS home_collection_fee INTEGER DEFAULT 0;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS free_home_collection_above INTEGER DEFAULT 499;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS home_collection_slots TEXT DEFAULT '6:30 AM - 11:00 AM, 4:00 PM - 7:30 PM';
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS report_turnaround_hrs INTEGER DEFAULT 12;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 20;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 12;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Admin RLS policies on lab_centres, lab_items, lab_centre_prices
DROP POLICY IF EXISTS "Allow admin all lab_centres" ON public.lab_centres;
CREATE POLICY "Allow admin all lab_centres"
  ON public.lab_centres FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin all lab_items" ON public.lab_items;
CREATE POLICY "Allow admin all lab_items"
  ON public.lab_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin all lab_centre_prices" ON public.lab_centre_prices;
CREATE POLICY "Allow admin all lab_centre_prices"
  ON public.lab_centre_prices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Weekly lab payout settlement ledger
CREATE TABLE IF NOT EXISTS public.lab_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id VARCHAR(50) NOT NULL REFERENCES public.lab_centres(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  net_payout_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin all lab_payouts" ON public.lab_payouts;
CREATE POLICY "Allow admin all lab_payouts"
  ON public.lab_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
