-- Extend public.pharmacies with store license, timings, delivery rules, hospital linking & payouts
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(30);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS drug_license_number VARCHAR(100);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS is_24x7 BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER DEFAULT 5;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS delivery_time_mins INTEGER DEFAULT 35;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS min_order_free_delivery INTEGER DEFAULT 299;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 10;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Allow admin read/write on pharmacies
DROP POLICY IF EXISTS "Allow admin read pharmacies" ON public.pharmacies;
CREATE POLICY "Allow admin read pharmacies"
  ON public.pharmacies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin insert pharmacies" ON public.pharmacies;
CREATE POLICY "Allow admin insert pharmacies"
  ON public.pharmacies FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin update pharmacies" ON public.pharmacies;
CREATE POLICY "Allow admin update pharmacies"
  ON public.pharmacies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin delete pharmacies" ON public.pharmacies;
CREATE POLICY "Allow admin delete pharmacies"
  ON public.pharmacies FOR DELETE TO anon, authenticated USING (true);

-- Weekly pharmacy payout settlement ledger
CREATE TABLE IF NOT EXISTS public.pharmacy_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id VARCHAR(50) NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
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

ALTER TABLE public.pharmacy_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin all pharmacy_payouts" ON public.pharmacy_payouts;
CREATE POLICY "Allow admin all pharmacy_payouts"
  ON public.pharmacy_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
