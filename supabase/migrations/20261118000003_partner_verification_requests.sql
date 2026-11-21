-- Partner Verification Requests & Compliance Documents for Doctors and Hospitals

CREATE TABLE IF NOT EXISTS public.partner_verification_requests (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('DOCTOR', 'HOSPITAL')),
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE')),
  target_entity_id TEXT,
  hospital_id TEXT,
  submitted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  entity_name TEXT NOT NULL,
  entity_slug TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_docs JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  reviewer_notes TEXT,
  reviewed_by_user_id UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_verification_status
  ON public.partner_verification_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_verification_hospital
  ON public.partner_verification_requests (hospital_id, created_at DESC);

ALTER TABLE public.partner_verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read partner_verification_requests" ON public.partner_verification_requests;
CREATE POLICY "Allow read partner_verification_requests"
  ON public.partner_verification_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert partner_verification_requests" ON public.partner_verification_requests;
CREATE POLICY "Allow insert partner_verification_requests"
  ON public.partner_verification_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update partner_verification_requests" ON public.partner_verification_requests;
CREATE POLICY "Allow update partner_verification_requests"
  ON public.partner_verification_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS degree_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS id_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'VERIFIED';

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS clinical_establishment_no TEXT,
  ADD COLUMN IF NOT EXISTS license_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'VERIFIED';
