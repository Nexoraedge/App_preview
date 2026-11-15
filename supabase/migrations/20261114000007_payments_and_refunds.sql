-- Payments & Refunds tracking on bookings + refund_requests ledger

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_ref VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(30) NOT NULL,
  service_type VARCHAR(50),
  provider_name VARCHAR(255),
  refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  refund_mode VARCHAR(30) NOT NULL DEFAULT 'UPI_SOURCE' CHECK (refund_mode IN ('UPI_SOURCE', 'WALLET', 'BANK_NEFT')),
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED')),
  utr_ref VARCHAR(100),
  admin_notes TEXT,
  requested_by VARCHAR(100) DEFAULT 'Admin',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests (status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_ref ON public.refund_requests (booking_ref);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests (created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin all refund_requests" ON public.refund_requests;
CREATE POLICY "Allow admin all refund_requests"
  ON public.refund_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
