-- CRM Follow-Ups & Call/Chat Activity Logs for Live Bookings & Partner Enquiries

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

ALTER TABLE public.partner_enquiries
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_follow_up_at
  ON public.bookings (follow_up_at) WHERE follow_up_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_enquiries_follow_up_at
  ON public.partner_enquiries (follow_up_at) WHERE follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'BOOKING' | 'PARTNER_ENQUIRY'
  entity_id TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'CALL', -- 'CALL' | 'WHATSAPP' | 'NOTE' | 'EMAIL'
  purpose TEXT,
  summary TEXT NOT NULL,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_entity
  ON public.crm_activity_logs (entity_type, entity_id, created_at DESC);

ALTER TABLE public.crm_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and staff can read crm logs" ON public.crm_activity_logs;
CREATE POLICY "Admin and staff can read crm logs"
  ON public.crm_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND LOWER(COALESCE(u.role, '')) IN ('admin', 'super_admin', 'call_center_agent', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin and staff can insert crm logs" ON public.crm_activity_logs;
CREATE POLICY "Admin and staff can insert crm logs"
  ON public.crm_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND LOWER(COALESCE(u.role, '')) IN ('admin', 'super_admin', 'call_center_agent', 'finance')
    )
  );
