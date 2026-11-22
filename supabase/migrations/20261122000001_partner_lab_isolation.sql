-- Index bookings by (hospital_id, service_type) for fast partner lab & OPD isolation
CREATE INDEX IF NOT EXISTS idx_bookings_hospital_service ON public.bookings (hospital_id, service_type);

-- Helper function to check if current authenticated user is an admin/staff
CREATE OR REPLACE FUNCTION public.is_adityam_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND LOWER(COALESCE(u.role, '')) IN ('admin', 'super_admin', 'staff', 'call_center', 'support', 'lab_tech')
  );
$$;
