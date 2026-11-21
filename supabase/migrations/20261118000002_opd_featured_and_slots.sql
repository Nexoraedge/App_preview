-- OPD Step 1: Promoted / Featured Hospitals + Doctor Branch & Slot Capacity Support
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 100;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS branch_id UUID,
  ADD COLUMN IF NOT EXISTS opd_hours TEXT,
  ADD COLUMN IF NOT EXISTS slot_capacity INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
