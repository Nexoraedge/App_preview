-- Support Solo / Independent Doctors with full qualifications, clinic details,
-- optional hospital/branch linking, and weekly doctor payouts.

DO $$ BEGIN
    ALTER TABLE public.doctors ALTER COLUMN hospital_id DROP NOT NULL;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_solo BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS clinic_address TEXT;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Jaipur';
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(30);
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 15;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 10;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS about TEXT;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT ARRAY['OPD Consultation', 'Follow-up'];
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_available_today BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.doctor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id VARCHAR(100) NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    utr_reference VARCHAR(120),
    period_label VARCHAR(120) DEFAULT 'Last 7 Days',
    notes TEXT,
    settled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctor_payouts_doc ON public.doctor_payouts (doctor_id);
