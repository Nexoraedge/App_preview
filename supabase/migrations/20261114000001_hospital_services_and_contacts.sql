-- Add secondary/emergency contact numbers, commission %, operating hours,
-- structured Services/Labs/IPD/Insurance arrays, and hospital_payouts table.

DO $$ BEGIN
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS secondary_contact_number VARCHAR(30);
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(30);
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 10;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS opd_hours VARCHAR(120) DEFAULT 'Mon-Sat, 9 AM - 8 PM';
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS is_24x7 BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 100;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS icu_beds INTEGER DEFAULT 20;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS ot_count INTEGER DEFAULT 4;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS labs_offered TEXT[] DEFAULT ARRAY['Pathology & Blood Tests', 'Digital X-Ray'];
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS ipd_services_offered TEXT[] DEFAULT ARRAY['General Surgery', 'Orthopedics', 'Cashless TPA'];
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS insurance_partners TEXT[] DEFAULT ARRAY['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'RGHS'];
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS secondary_contact_number VARCHAR(30);
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS opd_hours VARCHAR(120) DEFAULT 'Mon-Sat, 9 AM - 8 PM';
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS is_24x7 BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT ARRAY['OPD Consultation', '24x7 Emergency', 'In-House Pharmacy'];
    ALTER TABLE public.hospital_branches ADD COLUMN IF NOT EXISTS labs_offered TEXT[] DEFAULT ARRAY['Pathology & Blood Tests'];
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_available_today BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.hospital_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    utr_reference VARCHAR(120),
    period_label VARCHAR(120) DEFAULT 'Weekly Settlement',
    notes TEXT,
    settled_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_payouts_hosp ON public.hospital_payouts (hospital_id);
