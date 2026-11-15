-- Align hospital_payouts with both HospitalDetailView (amount, utr_reference, settled_at)
-- and Finance Partner Payouts Ledger (period_start, period_end, gross_amount, commission_amount, status)

CREATE TABLE IF NOT EXISTS public.hospital_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  utr_reference VARCHAR(120),
  period_label VARCHAR(120) DEFAULT 'Weekly Settlement',
  notes TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_payouts ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.hospital_payouts ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE public.hospital_payouts ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2);
ALTER TABLE public.hospital_payouts ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.hospital_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PAID';

CREATE INDEX IF NOT EXISTS idx_hospital_payouts_hosp ON public.hospital_payouts (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_payouts_status ON public.hospital_payouts (status);

ALTER TABLE public.hospital_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin all hospital_payouts" ON public.hospital_payouts;
CREATE POLICY "Allow admin all hospital_payouts"
  ON public.hospital_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
