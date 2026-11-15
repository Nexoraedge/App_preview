-- Admin & Staff Security: Server-Side Brute-Force Lockout + Immutable Audit Logs

-- 1. Server-side login rate limiting & lockout
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  email TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- No direct client reads/writes; accessed only via SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.check_admin_login_allowed(p_email TEXT)
RETURNS TABLE (
  allowed BOOLEAN,
  locked_until TIMESTAMPTZ,
  remaining_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_rec RECORD;
  v_rem INTEGER;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT TRUE, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  SELECT * INTO v_rec
  FROM public.admin_login_attempts
  WHERE email = v_email;

  IF FOUND AND v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
    v_rem := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_rec.locked_until - NOW())))::INTEGER);
    RETURN QUERY SELECT FALSE, v_rec.locked_until, v_rem;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TIMESTAMPTZ, 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_admin_login_attempt(p_email TEXT, p_success BOOLEAN)
RETURNS TABLE (
  failed_count INTEGER,
  locked_until TIMESTAMPTZ,
  remaining_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
  v_failed INTEGER := 0;
  v_lock TIMESTAMPTZ := NULL;
  v_rem INTEGER := 0;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT 0, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  IF p_success THEN
    DELETE FROM public.admin_login_attempts WHERE email = v_email;
    RETURN QUERY SELECT 0, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  INSERT INTO public.admin_login_attempts (email, failed_count, locked_until, last_attempt_at)
  VALUES (v_email, 1, NULL, NOW())
  ON CONFLICT (email) DO UPDATE
  SET
    failed_count = CASE
      WHEN public.admin_login_attempts.last_attempt_at < NOW() - INTERVAL '2 hours' THEN 1
      ELSE public.admin_login_attempts.failed_count + 1
    END,
    last_attempt_at = NOW()
  RETURNING public.admin_login_attempts.failed_count INTO v_failed;

  IF v_failed >= 15 THEN
    v_lock := NOW() + INTERVAL '24 hours';
  ELSIF v_failed >= 10 THEN
    v_lock := NOW() + INTERVAL '1 hour';
  ELSIF v_failed >= 5 THEN
    v_lock := NOW() + INTERVAL '15 minutes';
  END IF;

  IF v_lock IS NOT NULL THEN
    UPDATE public.admin_login_attempts
    SET locked_until = v_lock
    WHERE email = v_email;
    v_rem := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_lock - NOW())))::INTEGER);
  END IF;

  RETURN QUERY SELECT v_failed, v_lock, v_rem;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_login_allowed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_login_attempt(TEXT, BOOLEAN) TO anon, authenticated;

-- 2. Immutable Audit Logs (shared across Founder Admin Panel & future Staff Panel)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  source_panel TEXT NOT NULL DEFAULT 'ADMIN', -- 'ADMIN' | 'STAFF_CALL_CENTER' | 'STAFF_FINANCE'
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id
  ON public.admin_audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_source_panel
  ON public.admin_audit_logs (source_panel, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND LOWER(COALESCE(u.role, '')) IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Authorized staff and admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Authorized staff and admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND LOWER(COALESCE(u.role, '')) IN ('admin', 'super_admin', 'call_center_agent', 'finance')
    )
  );
