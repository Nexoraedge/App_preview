-- ==============================================================================
-- Adityam Niramayaa — FULL SCHEMA v2 + COMPLETE DEMO DATA
-- Run in: https://supabase.com/dashboard/project/bgzkpbeeypydmmufuoho/sql/new
-- Covers: users, dependents, hospitals, hospital_branches, doctors,
--         bookings, lab_items, lab_centres, lab_centre_prices,
--         lab_packages, pharmacies, ipd_surgeries, appointments,
--         hero_banners, health_packages, partner_offers
-- All tables linked with FK, RLS, indexes, and full seed data
-- ==============================================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20),
    city VARCHAR(100) DEFAULT 'Delhi NCR',
    wallet_balance NUMERIC(10, 2) DEFAULT 2500.00,
    is_verified BOOLEAN DEFAULT TRUE,
    role VARCHAR(30) DEFAULT 'patient',
    avatar_url TEXT,
    aadhaar_last_four VARCHAR(4),
    abha_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

-- Add columns to existing users table if they don't exist yet
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_last_four VARCHAR(4);
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS abha_id VARCHAR(50);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- TABLE 2: dependents (Family Vault)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(20) NOT NULL,
    aadhaar_last_four VARCHAR(4),
    kyc_status VARCHAR(30) DEFAULT 'verified',
    consent_given BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dependents_user_id ON public.dependents (user_id);

-- ============================================================
-- TABLE 3: hospitals (with PostGIS geography)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Delhi NCR',
    pincode VARCHAR(20),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
    longitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(location::geometry)) STORED,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    total_reviews INTEGER DEFAULT 120,
    specialties TEXT[] DEFAULT ARRAY['General Medicine'],
    specialties_hi TEXT[] DEFAULT ARRAY['सामान्य चिकित्सा'],
    facilities TEXT[] DEFAULT ARRAY['24x7 Emergency'],
    contact_number VARCHAR(30),
    virtual_exotel_number VARCHAR(30) DEFAULT '+911140008899',
    discount_percentage INTEGER DEFAULT 20,
    image_url TEXT,
    tag VARCHAR(100),
    tag_hi VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    nabh_accredited BOOLEAN DEFAULT FALSE,
    jci_accredited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals (city);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON public.hospitals (is_active);
CREATE INDEX IF NOT EXISTS idx_hospitals_featured ON public.hospitals (featured);

-- Add new columns to existing hospitals table if they don't exist
DO $$ BEGIN
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS name_hi VARCHAR(255);
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS specialties_hi TEXT[];
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS tag VARCHAR(100);
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS tag_hi VARCHAR(100);
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS nabh_accredited BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS jci_accredited BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- TABLE 4: hospital_branches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_branches (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    area VARCHAR(255),
    area_hi VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(Point, 4326),
    latitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
    longitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(location::geometry)) STORED,
    distance_km NUMERIC(6, 2),
    contact_number VARCHAR(30),
    virtual_exotel_number VARCHAR(30),
    is_main_branch BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branches_hospital_id ON public.hospital_branches (hospital_id);

-- ============================================================
-- TABLE 5: doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.doctors (
    id VARCHAR(100) PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    branch_id VARCHAR(100) REFERENCES public.hospital_branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualification TEXT,
    experience_years INTEGER DEFAULT 10,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    total_reviews INTEGER DEFAULT 100,
    consultation_fee NUMERIC(10, 2) DEFAULT 800,
    discounted_fee NUMERIC(10, 2) DEFAULT 600,
    next_available_slot VARCHAR(100) DEFAULT 'Today, 6:30 PM',
    avatar_url TEXT,
    languages TEXT[] DEFAULT ARRAY['English', 'Hindi'],
    opd_timing TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON public.doctors (hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_branch ON public.doctors (branch_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors (specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_featured ON public.doctors (featured);

-- ============================================================
-- TABLE 6: bookings (core CRM table, Realtime enabled)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    hospital_name VARCHAR(255),
    branch_id VARCHAR(100) REFERENCES public.hospital_branches(id) ON DELETE SET NULL,
    branch_name VARCHAR(255),
    doctor_id VARCHAR(100) REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_name VARCHAR(255),
    doctor_fee NUMERIC(10, 2),
    slot_time VARCHAR(100),
    specialty_requested VARCHAR(100),
    bill_amount NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    final_payable NUMERIC(10, 2),
    bill_image_url TEXT,
    qr_data TEXT,
    status VARCHAR(50) DEFAULT 'NEW',
    call_status VARCHAR(50) DEFAULT 'pending',
    assigned_agent VARCHAR(100),
    exotel_call_sid VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings (patient_phone);

-- Add missing columns to existing bookings table
DO $$ BEGIN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id VARCHAR(100);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(100);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS doctor_fee NUMERIC(10, 2);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS slot_time VARCHAR(100);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- TABLE 7: lab_items (tests, scans, packages)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255) NOT NULL,
    segment VARCHAR(20) NOT NULL CHECK (segment IN ('lab', 'scan', 'package')),
    category VARCHAR(50) NOT NULL,
    report_hrs INTEGER NOT NULL DEFAULT 24,
    fasting_hrs INTEGER,
    about TEXT,
    about_hi TEXT,
    prep TEXT,
    prep_hi TEXT,
    tests_count INTEGER,
    gradient_from VARCHAR(20),
    gradient_to VARCHAR(20),
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_items_segment ON public.lab_items (segment);
CREATE INDEX IF NOT EXISTS idx_lab_items_category ON public.lab_items (category);
CREATE INDEX IF NOT EXISTS idx_lab_items_popular ON public.lab_items (popular);

-- ============================================================
-- TABLE 8: lab_centres (diagnostic centres)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_centres (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    area_hi VARCHAR(100),
    distance_km NUMERIC(6, 2),
    rating NUMERIC(2, 1) DEFAULT 4.5,
    reviews INTEGER DEFAULT 100,
    home_collection BOOLEAN DEFAULT TRUE,
    next_slot VARCHAR(100),
    offers TEXT[] DEFAULT ARRAY['lab'],
    price_factor NUMERIC(4, 2) DEFAULT 1.0,
    exclude_items TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 9: lab_centre_prices (junction: item × centre)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_centre_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id VARCHAR(50) NOT NULL REFERENCES public.lab_items(id) ON DELETE CASCADE,
    centre_id VARCHAR(50) NOT NULL REFERENCES public.lab_centres(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    UNIQUE(item_id, centre_id)
);
CREATE INDEX IF NOT EXISTS idx_lcp_item ON public.lab_centre_prices (item_id);
CREATE INDEX IF NOT EXISTS idx_lcp_centre ON public.lab_centre_prices (centre_id);

-- ============================================================
-- TABLE 10: pharmacies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    area VARCHAR(100) NOT NULL,
    area_hi VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating NUMERIC(2, 1) DEFAULT 4.5,
    reviews INTEGER DEFAULT 100,
    delivery BOOLEAN DEFAULT TRUE,
    pickup BOOLEAN DEFAULT TRUE,
    app_discount_pct INTEGER DEFAULT 12,
    shop_address TEXT,
    shop_phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 11: ipd_surgeries (surgery packages)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ipd_surgeries (
    id VARCHAR(100) PRIMARY KEY,
    short_name VARCHAR(255) NOT NULL,
    short_name_hi VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    category VARCHAR(50) NOT NULL CHECK (category IN ('GeneralSurgery','Orthopedics','Cardiology','Maternity','Urology','Ophthalmology')),
    stay_days VARCHAR(50),
    stay_days_hi VARCHAR(50),
    price NUMERIC(12, 2) NOT NULL,
    tag VARCHAR(100),
    tag_hi VARCHAR(100),
    what_it_involves TEXT,
    what_it_involves_hi TEXT,
    recovery_timeline TEXT,
    recovery_timeline_hi TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ipd_category ON public.ipd_surgeries (category);
CREATE INDEX IF NOT EXISTS idx_ipd_popular ON public.ipd_surgeries (popular);

-- ============================================================
-- TABLE 12: hero_banners (Home carousel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hero_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en VARCHAR(255),
    title_hi VARCHAR(255),
    subtitle_en VARCHAR(255),
    subtitle_hi VARCHAR(255),
    badge_en VARCHAR(100),
    badge_hi VARCHAR(100),
    bg_color VARCHAR(20) DEFAULT '#172554',
    image_url TEXT,
    action_route VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_sort ON public.hero_banners (sort_order);

-- ============================================================
-- TABLE 13: health_packages (Home screen packages card)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(255) NOT NULL,
    name_hi VARCHAR(255),
    tests_count INTEGER NOT NULL DEFAULT 72,
    base_price NUMERIC(10, 2) NOT NULL,
    discount_pct INTEGER DEFAULT 20,
    discounted_price NUMERIC(10, 2),
    gradient_from VARCHAR(20) DEFAULT '#172554',
    gradient_to VARCHAR(20) DEFAULT '#2563EB',
    report_hrs INTEGER DEFAULT 24,
    fasting_hrs INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 14: partner_offers (Home screen offers section)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255),
    subtitle_en VARCHAR(255),
    subtitle_hi VARCHAR(255),
    discount_text VARCHAR(50),
    badge_en VARCHAR(50),
    badge_hi VARCHAR(50),
    bg_color VARCHAR(20) DEFAULT '#EFF6FF',
    text_color VARCHAR(20) DEFAULT '#1E40AF',
    action_route VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSTGIS RPC: get_nearby_hospitals (unchanged, already live)
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_hospitals(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 50000,
    specialty_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(20),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    distance_km NUMERIC(6, 2),
    rating NUMERIC(2, 1),
    total_reviews INTEGER,
    specialties TEXT[],
    facilities TEXT[],
    contact_number VARCHAR(30),
    virtual_exotel_number VARCHAR(30),
    discount_percentage INTEGER,
    image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id, h.name, h.slug, h.address, h.city, h.pincode,
        ST_Y(h.location::geometry) AS latitude,
        ST_X(h.location::geometry) AS longitude,
        ST_Distance(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
        ROUND((ST_Distance(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km,
        h.rating, h.total_reviews, h.specialties, h.facilities,
        h.contact_number, h.virtual_exotel_number, h.discount_percentage, h.image_url
    FROM public.hospitals h
    WHERE h.is_active = TRUE
      AND ST_DWithin(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
      AND (specialty_filter IS NULL OR specialty_filter = '' OR specialty_filter = ANY(h.specialties))
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_centre_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipd_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;

-- Public read — all catalogue tables
DROP POLICY IF EXISTS "Public read active hospitals" ON public.hospitals;
CREATE POLICY "Public read active hospitals" ON public.hospitals FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read branches" ON public.hospital_branches;
CREATE POLICY "Public read branches" ON public.hospital_branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read lab items" ON public.lab_items;
CREATE POLICY "Public read lab items" ON public.lab_items FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read lab centres" ON public.lab_centres;
CREATE POLICY "Public read lab centres" ON public.lab_centres FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read lab prices" ON public.lab_centre_prices;
CREATE POLICY "Public read lab prices" ON public.lab_centre_prices FOR SELECT USING (is_available = TRUE);

DROP POLICY IF EXISTS "Public read pharmacies" ON public.pharmacies;
CREATE POLICY "Public read pharmacies" ON public.pharmacies FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read ipd surgeries" ON public.ipd_surgeries;
CREATE POLICY "Public read ipd surgeries" ON public.ipd_surgeries FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read banners" ON public.hero_banners;
CREATE POLICY "Public read banners" ON public.hero_banners FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read health packages" ON public.health_packages;
CREATE POLICY "Public read health packages" ON public.health_packages FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read partner offers" ON public.partner_offers;
CREATE POLICY "Public read partner offers" ON public.partner_offers FOR SELECT USING (is_active = TRUE);

-- Full access for MVP dev — users, dependents, bookings
DROP POLICY IF EXISTS "Public user access" ON public.users;
CREATE POLICY "Public user access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public dependents access" ON public.dependents;
CREATE POLICY "Public dependents access" ON public.dependents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookings access" ON public.bookings;
CREATE POLICY "Public bookings access" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ==============================================================
-- SEED DATA — USERS
-- ==============================================================
INSERT INTO public.users (id, phone, full_name, age, gender, city, wallet_balance, is_verified, role, aadhaar_last_four, abha_id)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Abhishek Jain',
    34, 'Male', 'Delhi NCR', 2500.00, TRUE, 'patient', '4592', '91-4582-9011'
)
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    wallet_balance = EXCLUDED.wallet_balance,
    aadhaar_last_four = EXCLUDED.aadhaar_last_four,
    abha_id = EXCLUDED.abha_id;

-- ==============================================================
-- SEED DATA — DEPENDENTS (Family Vault)
-- ==============================================================
INSERT INTO public.dependents (id, user_id, full_name, relation, age, gender, aadhaar_last_four, kyc_status, consent_given)
VALUES
    ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Sunita Malhotra', 'Mother', 62, 'Female', '4592', 'verified', TRUE),
    ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'Pooja Malhotra', 'Spouse', 32, 'Female', '8120', 'verified', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — HOSPITALS
-- ==============================================================
INSERT INTO public.hospitals (id, name, name_hi, slug, address, city, state, pincode, location, rating, total_reviews, specialties, specialties_hi, facilities, contact_number, virtual_exotel_number, discount_percentage, image_url, tag, tag_hi, is_active, featured, nabh_accredited, jci_accredited)
VALUES
(
    '22222222-2222-2222-2222-222222222201',
    'Jain ENT Hospital',
    'जैन ईएनटी अस्पताल',
    'jain-ent-hospital-saket',
    '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    'New Delhi', 'Delhi NCR', '110017',
    ST_SetSRID(ST_MakePoint(77.2120, 28.5283), 4326)::geography,
    5.0, 680,
    ARRAY['ENT', 'Cardiology', 'Orthopedics', 'Micro-Surgery', 'General Medicine', 'Dentistry'],
    ARRAY['ईएनटी', 'हृदय रोग', 'हड्डी रोग', 'माइक्रो-सर्जरी', 'सामान्य चिकित्सा', 'दंत चिकित्सा'],
    ARRAY['24x7 Emergency', 'NABH Accredited', 'Best ENT & Surgery Center', 'Audiology Lab', 'Cashless Desk'],
    '+91-11-2651-5050', '+911140008801', 25,
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    'Best Hospital • 5★ Rated', 'सर्वश्रेष्ठ अस्पताल • 5★ प्रमाणित',
    TRUE, TRUE, TRUE, FALSE
),
(
    '22222222-2222-2222-2222-222222222204',
    'CSK Hospital',
    'सीएसके अस्पताल',
    'csk-hospital-delhi',
    'A-24, Outer Ring Road, South Extension, New Delhi',
    'New Delhi', 'Delhi NCR', '110049',
    ST_SetSRID(ST_MakePoint(77.2215, 28.5720), 4326)::geography,
    5.0, 540,
    ARRAY['Laparoscopic Surgery', 'Cardiology', 'Orthopedics', 'ENT', 'General Medicine'],
    ARRAY['लैप्रोस्कोपिक सर्जरी', 'हृदय रोग', 'हड्डी रोग', 'ईएनटी', 'सामान्य चिकित्सा'],
    ARRAY['24x7 Emergency', 'NABH & JCI Accredited', 'Best Multispeciality Care', 'Level 1 Trauma Center', 'Cashless Desk'],
    '+91-11-7179-1090', '+911140008804', 25,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    'NABH & JCI Certified', 'NABH व JCI प्रमाणित',
    TRUE, TRUE, TRUE, TRUE
),
(
    '22222222-2222-2222-2222-222222222202',
    'Fortis Healthcare',
    'फोर्टिस हेल्थकेयर',
    'fortis-memorial-gurugram',
    'Sector - 44, Opposite HUDA City Centre Metro Station, Gurugram, Haryana',
    'Gurugram', 'Delhi NCR', '122002',
    ST_SetSRID(ST_MakePoint(77.0726, 28.4595), 4326)::geography,
    4.8, 380,
    ARRAY['Cardiology', 'Pediatrics', 'Gastroenterology', 'Neurology', 'Orthopedics'],
    ARRAY['हृदय रोग', 'शिशु रोग', 'गैस्ट्रो', 'न्यूरोलॉजी', 'हड्डी रोग'],
    ARRAY['24x7 Emergency', 'JCI Accredited', 'Dedicated ICU', 'Organ Transplant', 'Valet Parking'],
    '+91-124-4962200', '+911140008802', 20,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    'Specialist Cardiac Care', 'विशेषज्ञ हृदय देखभाल',
    TRUE, TRUE, FALSE, TRUE
),
(
    '22222222-2222-2222-2222-222222222203',
    'Medanta - The Medicity',
    'मेदांता - द मेडिसिटी',
    'medanta-the-medicity-gurugram',
    'CH Bakhtawar Singh Road, Sector 38, Gurugram, Haryana',
    'Gurugram', 'Delhi NCR', '122001',
    ST_SetSRID(ST_MakePoint(77.0426, 28.4391), 4326)::geography,
    4.9, 510,
    ARRAY['Cardiology', 'Cardiac Surgery', 'Neurosciences', 'Kidney & Urology', 'General Medicine'],
    ARRAY['हृदय रोग', 'हृदय शल्य', 'न्यूरोसाइंस', 'किडनी व यूरोलॉजी', 'सामान्य चिकित्सा'],
    ARRAY['24x7 Emergency', 'CyberKnife', 'Bone Marrow Transplant', 'Helipad', 'Air Ambulance'],
    '+91-124-4141414', '+911140008803', 25,
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    'Cashless Desk Partner', 'कैशलेस डेस्क पार्टनर',
    TRUE, TRUE, FALSE, FALSE
),
(
    '22222222-2222-2222-2222-222222222205',
    'Sir Ganga Ram Hospital',
    'सर गंगाराम अस्पताल',
    'sir-ganga-ram-hospital',
    'Rajinder Nagar, New Delhi',
    'New Delhi', 'Delhi NCR', '110060',
    ST_SetSRID(ST_MakePoint(77.1897, 28.6389), 4326)::geography,
    4.7, 340,
    ARRAY['General Medicine', 'Nephrology', 'General Surgery', 'Gastroenterology', 'ENT'],
    ARRAY['सामान्य चिकित्सा', 'नेफ्रोलॉजी', 'जनरल सर्जरी', 'गैस्ट्रो', 'ईएनटी'],
    ARRAY['24x7 Emergency', 'Blood Bank', 'Advanced Pathology', 'Dialysis'],
    '+91-11-2575-0000', '+911140008805', 15,
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
    'Trusted Since 1954', '1954 से विश्वसनीय',
    TRUE, FALSE, FALSE, FALSE
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    discount_percentage = EXCLUDED.discount_percentage,
    tag = EXCLUDED.tag,
    tag_hi = EXCLUDED.tag_hi;

-- ==============================================================
-- SEED DATA — HOSPITAL BRANCHES
-- ==============================================================
INSERT INTO public.hospital_branches (id, hospital_id, name, name_hi, area, area_hi, address, city, location, distance_km, contact_number, virtual_exotel_number, is_main_branch)
VALUES
-- Jain ENT branches
('branch-jain-saket', '22222222-2222-2222-2222-222222222201',
    'Saket Main Hospital', 'साकेत मुख्य अस्पताल', 'Saket, South Delhi', 'साकेत, दक्षिण दिल्ली',
    '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.2120, 28.5283), 4326)::geography,
    1.2, '+91-11-2651-5050', '+911140008801', TRUE),
('branch-jain-panchsheel', '22222222-2222-2222-2222-222222222201',
    'Panchsheel Park Clinic', 'पंचशील पार्क क्लिनिक', 'Panchsheel Park, South Delhi', 'पंचशील पार्क, दक्षिण दिल्ली',
    'B-19, Chirag Enclave, Panchsheel Park, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.2185, 28.5412), 4326)::geography,
    3.2, '+91-11-4609-7200', '+911140008801', FALSE),
('branch-jain-patparganj', '22222222-2222-2222-2222-222222222201',
    'Patparganj Unit', 'पटपड़गंज यूनिट', 'Patparganj, East Delhi', 'पटपड़गंज, पूर्वी दिल्ली',
    '108A, I.P. Extension, Patparganj, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.3000, 28.6300), 4326)::geography,
    9.5, '+91-11-4303-3333', '+911140008801', FALSE),
-- CSK branches
('branch-csk-south-ext', '22222222-2222-2222-2222-222222222204',
    'South Extension Main Unit', 'साउथ एक्सटेंशन मुख्य यूनिट', 'South Extension, South Delhi', 'साउथ एक्सटेंशन, दक्षिण दिल्ली',
    'A-24, Outer Ring Road, South Extension, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.2215, 28.5720), 4326)::geography,
    2.5, '+91-11-7179-1090', '+911140008804', TRUE),
('branch-csk-nehru', '22222222-2222-2222-2222-222222222204',
    'Nehru Enclave Clinic', 'नेहरू एन्क्लेव क्लिनिक', 'Nehru Enclave, Kalkaji', 'नेहरू एन्क्लेव, कालकाजी',
    'B-1, Nehru Enclave, Outer Ring Road, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.2512, 28.5489), 4326)::geography,
    4.5, '+91-11-4088-8888', '+911140008804', FALSE),
-- Fortis branches
('branch-fortis-vasant-kunj', '22222222-2222-2222-2222-222222222202',
    'Fortis Hospital, Vasant Kunj', 'फोर्टिस अस्पताल, वसंत कुंज', 'Vasant Kunj, South Delhi', 'वसंत कुंज, दक्षिण दिल्ली',
    'Sector B, Pocket 1, Aruna Asaf Ali Marg, Vasant Kunj, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.1582, 28.5244), 4326)::geography,
    6.2, '+91-11-4277-6222', '+911140008802', FALSE),
('branch-fortis-gurugram', '22222222-2222-2222-2222-222222222202',
    'FMRI Main Campus, Gurugram', 'FMRI मुख्य परिसर, गुरुग्राम', 'Sector 44, Gurugram', 'सेक्टर 44, गुरुग्राम',
    'Sector - 44, Opposite HUDA City Centre, Gurugram, Haryana', 'Gurugram',
    ST_SetSRID(ST_MakePoint(77.0726, 28.4595), 4326)::geography,
    18.5, '+91-124-4962200', '+911140008802', TRUE),
-- Medanta branches
('branch-medanta-defence', '22222222-2222-2222-2222-222222222203',
    'Medanta Mediclinic, Defence Colony', 'मेदांता मेडिक्लिनिक, डिफेंस कॉलोनी', 'Defence Colony, South Delhi', 'डिफेंस कॉलोनी, दक्षिण दिल्ली',
    'E-18, Defence Colony, Ring Road, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.2345, 28.5729), 4326)::geography,
    5.0, '+91-11-4411-4411', '+911140008803', FALSE),
-- Sir Ganga Ram
('branch-sgrh-rajinder', '22222222-2222-2222-2222-222222222205',
    'Rajinder Nagar Main Unit', 'राजिंदर नगर मुख्य यूनिट', 'Old Rajinder Nagar, Central Delhi', 'पुराना राजिंदर नगर, मध्य दिल्ली',
    'Sir Ganga Ram Hospital Marg, Rajinder Nagar, New Delhi', 'New Delhi',
    ST_SetSRID(ST_MakePoint(77.1897, 28.6389), 4326)::geography,
    11.5, '+91-11-2575-0000', '+911140008805', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — DOCTORS
-- ==============================================================
INSERT INTO public.doctors (id, hospital_id, branch_id, name, specialty, qualification, experience_years, rating, total_reviews, consultation_fee, discounted_fee, next_available_slot, avatar_url, languages, opd_timing, is_active, featured)
VALUES
-- Jain ENT
('doc-satish-jain', '22222222-2222-2222-2222-222222222201', 'branch-jain-saket',
    'Dr. Satish Jain', 'ENT', 'MBBS, MS (ENT), DLO - Chief Senior Specialist',
    24, 5.0, 950, 800, 600, 'Today, 5:30 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 10:00 AM - 02:00 PM, 05:00 PM - 08:00 PM', TRUE, TRUE),
('doc-meenakshi', '22222222-2222-2222-2222-222222222201', 'branch-jain-saket',
    'Dr. Meenakshi Sundaram', 'General Medicine', 'MBBS, MD (Internal Medicine)',
    14, 4.8, 240, 800, 600, 'Today, 7:15 PM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi', 'Tamil'], 'Mon-Sat: 09:00 AM - 04:00 PM', TRUE, FALSE),
('doc-vikramaditya', '22222222-2222-2222-2222-222222222201', 'branch-jain-saket',
    'Dr. Vikramaditya Sen', 'Orthopedics', 'MBBS, MS (Ortho), M.Ch',
    16, 4.9, 195, 1100, 825, 'Tomorrow, 11:00 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Tue-Sun: 11:00 AM - 06:00 PM', TRUE, FALSE),
('doc-anita', '22222222-2222-2222-2222-222222222201', 'branch-jain-panchsheel',
    'Dr. Anita Deshmukh', 'Pediatrics', 'MBBS, DCH, DNB (Pediatrics)',
    12, 4.9, 180, 900, 675, 'Today, 6:45 PM',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi', 'Marathi'], 'Mon-Fri: 10:00 AM - 07:00 PM', TRUE, FALSE),
('doc-saurabh', '22222222-2222-2222-2222-222222222201', 'branch-jain-panchsheel',
    'Dr. Saurabh Grover', 'Dentistry', 'BDS, MDS (Endodontics)',
    10, 4.8, 140, 700, 525, 'Tomorrow, 10:30 AM',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 10:00 AM - 06:00 PM', TRUE, FALSE),
('doc-rakesh-tandon', '22222222-2222-2222-2222-222222222201', 'branch-jain-patparganj',
    'Dr. Rakesh Tandon', 'Neurology', 'MBBS, MD, DM (Neurology)',
    20, 4.9, 320, 1400, 1050, 'Tomorrow, 02:00 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Tue-Sat: 12:00 PM - 05:00 PM', TRUE, FALSE),
-- CSK
('doc-alok-verma', '22222222-2222-2222-2222-222222222204', 'branch-csk-south-ext',
    'Dr. Alok Verma', 'Laparoscopic Surgery', 'MS (General Surgery), FIAGES - Chief Consultant',
    18, 5.0, 480, 1000, 750, 'Today, 7:00 PM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi', 'Telugu'], 'Mon-Sat: 10:00 AM - 04:30 PM', TRUE, TRUE),
('doc-rohan-kapur', '22222222-2222-2222-2222-222222222204', 'branch-csk-south-ext',
    'Dr. Rohan Kapur', 'Cardiology', 'MBBS, MD, DM',
    17, 4.8, 290, 1300, 1040, 'Tomorrow, 10:00 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 09:30 AM - 03:30 PM', TRUE, FALSE),
('doc-priya-jain', '22222222-2222-2222-2222-222222222204', 'branch-csk-nehru',
    'Dr. Priya Jain', 'Pediatrics', 'MBBS, MD (Pediatrics), Fellowship Neonatology',
    13, 4.9, 230, 900, 720, 'Today, 6:00 PM',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 11:00 AM - 07:00 PM', TRUE, FALSE),
('doc-divya-nambiar', '22222222-2222-2222-2222-222222222204', 'branch-csk-nehru',
    'Dr. Divya Nambiar', 'Dermatology', 'MBBS, MD (Dermatology & Cosmetology)',
    11, 4.8, 165, 850, 680, 'Tomorrow, 11:30 AM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi', 'Malayalam'], 'Tue-Sat: 10:00 AM - 04:00 PM', TRUE, FALSE),
-- Fortis
('doc-nitin-sood', '22222222-2222-2222-2222-222222222202', 'branch-fortis-vasant-kunj',
    'Dr. Nitin Sood', 'Cardiology', 'MBBS, MD, FACC',
    19, 4.9, 280, 1200, 960, 'Today, 6:45 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi', 'Punjabi'], 'Mon-Sat: 09:00 AM - 03:00 PM', TRUE, TRUE),
('doc-shweta-bansal', '22222222-2222-2222-2222-222222222202', 'branch-fortis-vasant-kunj',
    'Dr. Shweta Bansal', 'General Medicine', 'MBBS, DNB (Internal Medicine)',
    11, 4.8, 145, 750, 600, 'Today, 7:30 PM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Fri: 11:00 AM - 06:00 PM', TRUE, FALSE),
('doc-ashok-sethi', '22222222-2222-2222-2222-222222222202', 'branch-fortis-gurugram',
    'Dr. Ashok Sethi', 'Neurology', 'MBBS, MD, DM (Neuro), FRCP',
    22, 4.9, 410, 1500, 1200, 'Tomorrow, 11:30 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 10:00 AM - 04:00 PM', TRUE, FALSE),
-- Medanta
('doc-monica-vasudev', '22222222-2222-2222-2222-222222222203', 'branch-medanta-defence',
    'Dr. Monica Vasudev', 'General Medicine', 'MBBS, MD (Medicine)',
    15, 4.9, 290, 1000, 750, 'Today, 7:00 PM',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 09:30 AM - 05:30 PM', TRUE, FALSE),
('doc-vivek-taneja', '22222222-2222-2222-2222-222222222203', 'branch-medanta-defence',
    'Dr. Vivek Taneja', 'Cardiology', 'MBBS, MD, DM (Cardiology)',
    17, 4.8, 310, 1400, 1050, 'Tomorrow, 10:30 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 10:00 AM - 04:00 PM', TRUE, FALSE),
-- Sir Ganga Ram
('doc-sp-byotra', '22222222-2222-2222-2222-222222222205', 'branch-sgrh-rajinder',
    'Dr. S.P. Byotra', 'General Medicine', 'MBBS, MD (General Medicine), FRCP',
    25, 4.9, 350, 900, 765, 'Today, 7:30 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 11:00 AM - 06:00 PM', TRUE, FALSE),
('doc-ajay-swaroop', '22222222-2222-2222-2222-222222222205', 'branch-sgrh-rajinder',
    'Dr. Ajay Swaroop', 'ENT', 'MBBS, MS (ENT), DNB',
    18, 4.8, 220, 850, 720, 'Tomorrow, 09:30 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['English', 'Hindi'], 'Mon-Sat: 09:30 AM - 03:00 PM', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — BOOKINGS (Demo CRM stream)
-- ==============================================================
INSERT INTO public.bookings (id, booking_ref, service_type, user_id, patient_name, patient_phone, hospital_id, hospital_name, branch_id, branch_name, doctor_id, doctor_name, doctor_fee, slot_time, specialty_requested, status, call_status, notes)
VALUES
(
    '33333333-3333-3333-3333-333333333301', 'AN-2026-9041', 'OPD_CONCIERGE',
    '00000000-0000-0000-0000-000000000001', 'Abhishek Jain', '+919999999999',
    '22222222-2222-2222-2222-222222222201', 'Jain ENT Hospital, Saket',
    'branch-jain-saket', 'Saket Main Hospital',
    'doc-satish-jain', 'Dr. Satish Jain', 800, 'Tomorrow, 10:30 AM', 'ENT',
    'CONFIRMED', 'connected',
    'Priority OPD token issued. Direct desk check-in code generated.'
),
(
    '33333333-3333-3333-3333-333333333302', 'AN-2026-9042', 'PHARMACY_SCAN_PAY',
    '00000000-0000-0000-0000-000000000001', 'Sunita Malhotra', '+919811223344',
    '22222222-2222-2222-2222-222222222203', 'Medanta Medstore Saket',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'PAID', 'completed',
    'Counter bill ₹1,600. Applied 25% Adityam discount ₹400. Paid ₹1,200 via UPI.'
),
(
    '33333333-3333-3333-3333-333333333303', 'AN-2026-9043', 'OPD_CONCIERGE',
    '00000000-0000-0000-0000-000000000001', 'Sunita Malhotra (Mother)', '+919999999999',
    '22222222-2222-2222-2222-222222222205', 'Sir Ganga Ram Hospital',
    'branch-sgrh-rajinder', 'Rajinder Nagar Main Unit',
    'doc-sp-byotra', 'Dr. S.P. Byotra', 1200, 'Friday, 02:00 PM', 'Cardiology & Heart Care',
    'NEW', 'pending',
    'Tele-concierge coordinating VIP queue bypass.'
),
(
    '33333333-3333-3333-3333-333333333304', 'AN-2026-9044', 'IPD_ENQUIRY',
    NULL, 'Rajesh Mehra', '+919876543210',
    '22222222-2222-2222-2222-222222222202', 'Fortis Healthcare, Gurugram',
    'branch-fortis-gurugram', 'FMRI Main Campus',
    NULL, NULL, NULL, NULL, 'Orthopedics (Knee Replacement)',
    'CALLING', 'calling',
    'Inquiring about cashless TPA coverage with Star Health. Dedicated coordinator assigned.'
),
(
    '33333333-3333-3333-3333-333333333305', 'AN-2026-6109', 'INVESTIGATION',
    '00000000-0000-0000-0000-000000000001', 'Abhishek Jain', '+919999999999',
    NULL, 'Adityam Partner Labs • Saket Center',
    NULL, 'Saket Community Center',
    NULL, 'Diagnostic Pathology Bay', 1499, 'Completed • Oct 14, 2026', 'Pathology & Diagnostic Panel',
    'PAID', 'completed',
    'Full Body Lipid & HbA1c panel verified. Digital report uploaded.'
)
ON CONFLICT (booking_ref) DO NOTHING;

-- ==============================================================
-- SEED DATA — LAB ITEMS (Tests, Scans, Packages)
-- ==============================================================
INSERT INTO public.lab_items (id, name, name_hi, segment, category, report_hrs, fasting_hrs, about, about_hi, prep, prep_hi, tests_count, gradient_from, gradient_to, base_price, popular)
VALUES
-- Lab Tests
('cbc', 'Complete Blood Count (CBC)', 'कम्प्लीट ब्लड काउंट (CBC)', 'lab', 'blood', 6, NULL,
    'Counts red cells, white cells and platelets. Used to check for anaemia, infection and general health.',
    'लाल रक्त कोशिकाओं, सफेद कोशिकाओं और प्लेटलेट्स की संख्या मापता है।',
    'No special preparation.', 'किसी विशेष तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 350, TRUE),
('hba1c', 'HbA1c (3-month sugar)', 'एचबीए1सी (3 माह का शुगर)', 'lab', 'diabetes', 12, NULL,
    'Shows your average blood sugar over about three months. Useful for diabetes monitoring.',
    'पिछले 3 महीनों का औसत ब्लड शुगर स्तर दिखाता है।',
    'No fasting needed.', 'खाली पेट रहने की आवश्यकता नहीं है।', NULL, NULL, NULL, 550, TRUE),
('fbs', 'Fasting Blood Sugar', 'फास्टिंग ब्लड शुगर (FBS)', 'lab', 'diabetes', 6, 8,
    'Measures blood sugar after an overnight fast.',
    'रातभर खाली पेट रहने के बाद शरीर में ग्लूकोज के स्तर की सटीक जांच।',
    'Do not eat for 8 hours. Plain water is fine.', '8 घंटे तक कुछ न खाएं।', NULL, NULL, NULL, 150, FALSE),
('thyroid', 'Thyroid Profile (T3, T4, TSH)', 'थायरॉइड प्रोफाइल (T3, T4, TSH)', 'lab', 'thyroid', 12, NULL,
    'Checks how well your thyroid gland is working.',
    'थायरॉइड ग्रंथि के कार्य और हार्मोन संतुलन की जांच करता है।',
    'No fasting needed.', 'खाली पेट की आवश्यकता नहीं।', NULL, NULL, NULL, 600, TRUE),
('lipid', 'Lipid Profile', 'लिपिड प्रोफाइल (कोलेस्ट्रॉल जांच)', 'lab', 'heart', 12, 10,
    'Measures cholesterol and triglycerides to assess heart risk.',
    'हृदय रोग और ब्लॉकेज के खतरे का आकलन करने हेतु कोलेस्ट्रॉल जांच।',
    'Fast for 10 hours.', '10 घंटे तक खाली पेट रहें।', NULL, NULL, NULL, 650, FALSE),
('vitd', 'Vitamin D (25-OH)', 'विटामिन डी (25-OH)', 'lab', 'vitamins', 24, NULL,
    'Checks vitamin D level, which matters for bones and immunity.',
    'शरीर में विटामिन डी का स्तर जांचता है।',
    'No fasting needed.', 'किसी तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 1200, TRUE),
('b12', 'Vitamin B12', 'विटामिन बी12', 'lab', 'vitamins', 24, NULL,
    'Checks B12 level, linked to tiredness, nerves and anaemia.',
    'विटामिन बी12 के स्तर की जांच।',
    'No fasting needed.', 'किसी तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 1000, FALSE),
('lft', 'Liver Function Test (LFT)', 'लिवर फंक्शन टेस्ट (LFT)', 'lab', 'organ', 12, 8,
    'Checks liver enzymes and proteins.',
    'लिवर एंजाइम, बिलीरुबिन और प्रोटीन की जांच।',
    'Fast for 8 hours.', '8 घंटे तक खाली पेट रहें।', NULL, NULL, NULL, 700, FALSE),
('kft', 'Kidney Function Test (KFT)', 'किडनी फंक्शन टेस्ट (KFT)', 'lab', 'organ', 12, NULL,
    'Checks how well your kidneys filter waste.',
    'सीरम क्रिएटिनिन, यूरिया की जांच से किडनी की कार्यक्षमता का पता।',
    'No fasting needed. Drink water normally.', 'खाली पेट की आवश्यकता नहीं।', NULL, NULL, NULL, 700, FALSE),
('dengue', 'Dengue NS1 Antigen', 'डेंगू एनएस1 एंटीजन', 'lab', 'fever', 6, NULL,
    'Early test for dengue infection in the first days of fever.',
    'बुखार के शुरुआती दिनों में डेंगू संक्रमण का पता लगाने हेतु।',
    'No preparation.', 'किसी विशेष तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 800, FALSE),
('typhoid', 'Typhoid (Widal)', 'टाइफाइड विडाल टेस्ट', 'lab', 'fever', 12, NULL,
    'Helps detect typhoid fever.',
    'टाइफाइड और मियादी बुखार के संक्रमण की पहचान।',
    'No preparation.', 'किसी तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 300, FALSE),
('bhcg', 'Pregnancy Test (Beta hCG)', 'प्रेग्नेंसी टेस्ट (बीटा एचसीजी)', 'lab', 'women', 6, NULL,
    'Blood test that confirms pregnancy early.',
    'गर्भावस्था की शुरुआती, सटीक पुष्टि करने वाला रक्त परीक्षण।',
    'No preparation.', 'किसी विशेष तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 500, FALSE),
-- Scans
('xr-chest', 'Chest X-Ray (PA view)', 'चेस्ट एक्स-रे (PA View)', 'scan', 'xray', 2, NULL,
    'Images of the lungs and heart outline.',
    'फेफड़ों के संक्रमण और हृदय के आकार की डिजिटल एक्स-रे।',
    'Remove metal items from the chest area.', 'छाती से सभी धातु की वस्तुएं हटा दें।', NULL, NULL, NULL, 500, TRUE),
('xr-knee', 'X-Ray Knee (AP & Lateral)', 'एक्स-रे घुटना', 'scan', 'xray', 2, NULL,
    'Images of the knee bones and joint.',
    'घुटने के जोड़, गठिया और हड्डियों में फ्रैक्चर की जांच।',
    'No preparation.', 'किसी तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 700, FALSE),
('xr-spine', 'X-Ray Lumbar Spine', 'एक्स-रे लम्बर स्पाइन', 'scan', 'xray', 2, NULL,
    'Images of the lower spine.',
    'कमर और रीढ़ की हड्डियों की डिजिटल इमेजिंग।',
    'No preparation.', 'किसी तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 700, FALSE),
('usg-abd', 'Ultrasound Abdomen', 'अल्ट्रासाउंड पेट (USG)', 'scan', 'usg', 4, 6,
    'Looks at liver, gallbladder, kidneys and other organs.',
    'लिवर, पित्ताशय, गुर्दे और पेट के अंगों की सोनोग्राफी।',
    'Fast for 6 hours. Keep a full bladder.', '6 घंटे का उपवास रखें।', NULL, NULL, NULL, 1200, TRUE),
('ct-head', 'CT Scan Head', 'सीटी स्कैन हेड (CT Brain)', 'scan', 'ct', 6, NULL,
    'Detailed images of the brain and skull.',
    'मस्तिष्क और खोपड़ी का 3D सीटी स्कैन।',
    'Remove metal items. Tell the centre if you are pregnant.', 'धातु की वस्तुएं उतार दें।', NULL, NULL, NULL, 3500, FALSE),
('ct-chest', 'CT Scan Chest (HRCT)', 'सीटी स्कैन चेस्ट (HRCT)', 'scan', 'ct', 6, NULL,
    'Detailed images of the lungs and chest.',
    'फेफड़ों की संरचना और संक्रमण की पहचान के लिए उच्च रिज़ॉल्यूशन CT।',
    'Remove metal items.', 'धातु की वस्तुएं उतार दें।', NULL, NULL, NULL, 4500, FALSE),
('mri-brain', 'MRI Brain', 'एमआरआई ब्रेन', 'scan', 'mri', 24, NULL,
    'Detailed images of the brain using magnets.',
    'चुंबकीय तरंगों द्वारा मस्तिष्क के सूक्ष्म ऊतकों की जांच।',
    'Tell the centre about any implants or pacemaker.', 'शरीर पर कोई धातु या पेसमेकर न हो।', NULL, NULL, NULL, 7500, FALSE),
('mri-knee', 'MRI Knee', 'एमआरआई घुटना', 'scan', 'mri', 24, NULL,
    'Detailed images of knee ligaments and cartilage.',
    'घुटने के लिगामेंट इंजरी (ACL), मेनिस्कस टियर की जांच।',
    'Tell the centre about any implants.', 'शरीर पर कोई धातु न हो।', NULL, NULL, NULL, 7000, FALSE),
('ecg', 'ECG (12-lead)', 'ईसीजी (12-Lead ECG)', 'scan', 'ecg', 1, NULL,
    'Records the electrical activity of your heart.',
    'हृदय की धड़कन और विद्युत तरंगों को रिकॉर्ड करता है।',
    'No preparation. Wear loose clothing.', 'ढीले कपड़े पहनें।', NULL, NULL, NULL, 300, TRUE),
('echo', 'Echocardiography (2D Echo)', 'इकोकार्डियोग्राफी (2D Echo)', 'scan', 'ecg', 2, NULL,
    'Ultrasound of the heart showing how it pumps.',
    'हृदय के वाल्वों और रक्त पंप करने की क्षमता की रीयल-टाइम जांच।',
    'No preparation.', 'किसी विशेष तैयारी की आवश्यकता नहीं है।', NULL, NULL, NULL, 1800, FALSE),
-- Packages
('pk-full', 'Complete Health Checkup', 'संपूर्ण स्वास्थ्य जांच', 'package', 'package', 24, 10,
    'A full-body screen covering blood, sugar, liver, kidney, thyroid, lipids and vitamins.',
    'रक्त, डायबिटीज, लिवर, किडनी, थायरॉइड, लिपिड प्रोफाइल और विटामिन्स की 72 परीक्षणों वाली संपूर्ण जांच।',
    'Fast for 10 hours before the sample.', 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
    72, '#172554', '#2563EB', 2400, TRUE),
('pk-heart', 'Heart & Diabetes Care', 'हार्ट व डायबिटीज केयर पैकेज', 'package', 'package', 24, 10,
    'Heart risk and sugar control in one package.',
    'हृदय रोग के जोखिम और शुगर नियंत्रण की एक साथ संपूर्ण जांच।',
    'Fast for 10 hours before the sample.', 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
    52, '#7F1D1D', '#E11D48', 1800, TRUE),
('pk-senior', 'Senior Citizen Care', 'वरिष्ठ नागरिक स्वास्थ्य सुरक्षा', 'package', 'package', 24, 10,
    'Screening for bones, kidney, liver, heart and sugar, chosen for older adults.',
    'हड्डियों, किडनी, लिवर, दिल और शुगर की 60 वर्ष से अधिक उम्र के लिए विशेष जांच।',
    'Fast for 10 hours before the sample.', 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
    64, '#064E3B', '#059669', 2800, FALSE),
('pk-women', 'Women''s Wellness', 'महिला संपूर्ण वेलनेस पैकेज', 'package', 'package', 24, 10,
    'Blood health, thyroid, vitamins and hormones relevant to women.',
    'एनीमिया, थायरॉइड असंतुलन, विटामिन डी/बी12 और महिला स्वास्थ्य जांच।',
    'Fast for 10 hours before the sample.', 'सैंपल देने से पहले 10 घंटे तक खाली पेट रहें।',
    58, '#831843', '#DB2777', 2600, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — LAB CENTRES
-- ==============================================================
INSERT INTO public.lab_centres (id, name, area, area_hi, distance_km, rating, reviews, home_collection, next_slot, offers, price_factor, exclude_items)
VALUES
('c1', 'CityCare Diagnostics', 'Saket', 'साकेत', 1.4, 4.7, 420, TRUE, 'Today, 5:30 PM', ARRAY['lab','scan','package'], 1.0, NULL),
('c2', 'LifeLine Pathology', 'Malviya Nagar', 'मालवीय नगर', 2.8, 4.5, 260, TRUE, 'Tomorrow, 7:00 AM', ARRAY['lab','package'], 0.85, NULL),
('c3', 'Saket Imaging Centre', 'Saket', 'साकेत', 1.9, 4.6, 310, FALSE, 'Today, 6:15 PM', ARRAY['scan'], 0.9, ARRAY['mri-brain','mri-knee']),
('c4', 'Green Park Labs', 'Green Park', 'ग्रीन पार्क', 4.6, 4.4, 180, TRUE, 'Tomorrow, 8:00 AM', ARRAY['lab','package'], 0.95, NULL),
('c5', 'Metro Scan & Lab', 'Nehru Place', 'नेहरू प्लेस', 7.2, 4.8, 540, FALSE, 'Today, 7:45 PM', ARRAY['lab','scan','package'], 1.1, NULL)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — LAB CENTRE PRICES (item × centre junction)
-- Base prices × centre factor, rounded to nearest 10
-- ==============================================================
INSERT INTO public.lab_centre_prices (item_id, centre_id, price, is_available)
SELECT i.id, c.id,
    ROUND((i.base_price * c.price_factor) / 10) * 10,
    NOT (c.exclude_items IS NOT NULL AND i.id = ANY(c.exclude_items))
FROM public.lab_items i
CROSS JOIN public.lab_centres c
WHERE i.segment = ANY(c.offers)
ON CONFLICT (item_id, centre_id) DO UPDATE SET price = EXCLUDED.price;

-- ==============================================================
-- SEED DATA — PHARMACIES
-- ==============================================================
INSERT INTO public.pharmacies (id, name, name_hi, area, area_hi, latitude, longitude, rating, reviews, delivery, pickup, app_discount_pct, shop_address, shop_phone)
VALUES
('p1', 'Saket Care Pharmacy', 'साकेत केयर फार्मेसी', 'Saket, South Delhi', 'साकेत, दक्षिण दिल्ली', 28.5275, 77.2189, 4.7, 310, TRUE, TRUE, 15, 'Shop 4, Main Market, Saket, South Delhi 110017', '+91 98112 34567'),
('p2', 'Malviya Nagar Medicos', 'मालवीय नगर मेडिकोज', 'Malviya Nagar, New Delhi', 'मालवीय नगर, नई दिल्ली', 28.5355, 77.2100, 4.5, 190, TRUE, TRUE, 12, 'Shop 12, Main Market, Malviya Nagar, New Delhi 110017', '+91 98765 43210'),
('p3', 'LifeLine Chemist & Druggist', 'लाइफलाइन केमिस्ट', 'Hauz Khas, New Delhi', 'हौज खास, नई दिल्ली', 28.5494, 77.2001, 4.6, 260, FALSE, TRUE, 18, 'Shop 7, Village Market, Hauz Khas, New Delhi 110016', '+91 99001 23456'),
('p4', 'Green Park Dawakhana', 'ग्रीन पार्क दवाखाना', 'Green Park, New Delhi', 'ग्रीन पार्क, नई दिल्ली', 28.5589, 77.2065, 4.4, 140, TRUE, FALSE, 10, 'D-12, Green Park Extension, New Delhi 110016', '+91 95111 56789'),
('p5', 'Nehru Place Medico Hub', 'नेहरू प्लेस मेडिको हब', 'Nehru Place, South Delhi', 'नेहरू प्लेस, दक्षिण दिल्ली', 28.5491, 77.2530, 4.8, 420, TRUE, TRUE, 14, 'Shop 23, Nehru Place Market, South Delhi 110019', '+91 90022 98765')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — IPD SURGERIES
-- ==============================================================
INSERT INTO public.ipd_surgeries (id, short_name, short_name_hi, name, name_hi, category, stay_days, stay_days_hi, price, tag, tag_hi, what_it_involves, what_it_involves_hi, recovery_timeline, recovery_timeline_hi, popular)
VALUES
('surg-gallbladder', 'Gallbladder surgery', 'पित्त की थैली सर्जरी', 'Laparoscopic Cholecystectomy', 'लैप्रोस्कोपिक कोलेसिस्टेक्टॉमी', 'GeneralSurgery', '1–2 days stay', '1–2 दिन भर्ती', 45000, 'Minimal invasive', 'कम चीरा (लैप्रोस्कोपिक)', 'Keyhole surgical removal of the inflamed gallbladder containing painful gallstones.', 'दर्दनाक पथरी से ग्रस्त पित्त की थैली को लैप्रोस्कोपिक कीहोल विधि द्वारा सुरक्षित निकालना।', 'Normal routine resumed in 5–7 days.', '5–7 दिनों में सामान्य दिनचर्या फिर से शुरू।', TRUE),
('surg-knee-replace', 'Knee replacement', 'घुटना प्रत्यारोपण', 'Total Knee Arthroplasty (TKR)', 'टोटल नी आर्थ्रोप्लास्टी (TKR Surgery)', 'Orthopedics', '3–4 days stay', '3–4 दिन भर्ती', 125000, 'Implant included', 'यूएस-एफडीए इम्प्लांट शामिल', 'Precision joint resurfacing using US-FDA approved cobalt-chromium implants.', 'घिसे हुए जोड़ को उच्च गुणवत्ता वाले कोबाल्ट-क्रोमियम इम्प्लांट से बदलना।', 'Assisted walking on day 2. Physiotherapy included.', 'दूसरे दिन से फिजियोथेरेपी की मदद से चलना शुरू।', TRUE),
('surg-hernia', 'Hernia repair', 'हर्निया ऑपरेशन', 'Laparoscopic Hernioplasty', 'लैप्रोस्कोपिक हर्नियोप्लास्टी', 'GeneralSurgery', '1 day stay', '1 दिन भर्ती', 38000, 'Daycare / 24 hrs', '24 घंटे में छुट्टी', 'High-grade surgical mesh reinforcement for inguinal or umbilical wall weakness.', 'कमजोर पेट की दीवार को मेडिकल मेश लगाकर सुरक्षित रूप से मजबूत करना।', 'Discharge within 24 hours. Light desk work in 3 days.', '24 घंटे में डिस्चार्ज। 3 दिन में हल्का काम संभव।', FALSE),
('surg-csection', 'Maternity delivery', 'डिलीवरी व प्रसूति', 'Normal & C-Section Package', 'नॉर्मल व सिजेरियन डिलीवरी (Maternity)', 'Maternity', '2–3 days stay', '2–3 दिन भर्ती', 55000, 'Baby care included', 'शिशु देखभाल व कमरा शामिल', 'Complete delivery package with pediatrician attendance, baby care, and lactation consult.', 'बाल रोग विशेषज्ञ, नवजात शिशु देखभाल और स्तनपान परामर्श सहित संपूर्ण प्रसूति पैकेज।', '24–48 hours private room monitoring.', '24–48 घंटे प्राइवेट रूम में विशेषज्ञ देखरेख।', FALSE),
('surg-angioplasty', 'Coronary angioplasty', 'हार्ट एंजियोप्लास्टी', 'PTCA with Drug Eluting Stent', 'ड्रग एल्यूटिंग स्टेंट एंजियोप्लास्टी (PTCA)', 'Cardiology', '2 days stay', '2 दिन भर्ती', 110000, 'Cardiac desk', 'कार्डियक डेस्क सहायता', 'Radial or femoral artery catheterization to clear blockages with DES stent.', 'धमनियों में जमा ब्लॉकेज को हटाकर यूएस-एफडीए स्वीकृत स्टेंट लगाना।', 'Radial site recovery with normal walking next morning.', 'अगली सुबह से सामान्य चलना-फिरना शुरू।', FALSE),
('surg-kidney-stone', 'Kidney stone removal', 'गुर्दे की पथरी लेजर', 'Laser RIRS / PCNL Lithotripsy', 'लेजर RIRS / PCNL लिथोट्रिप्सी', 'Urology', '1 day stay', '1 दिन भर्ती', 42000, 'No-cut laser', 'बिना चीरे वाली लेजर', 'Holmium laser dusting of stones through natural urinary tract with zero incisions.', 'होलमियम लेजर द्वारा बिना किसी चीरे के पथरी को पाउडर बनाकर बाहर निकालना।', 'Same-day or next-morning discharge.', 'उसी दिन या अगली सुबह तक डिस्चार्ज।', FALSE),
('surg-cataract', 'Cataract eye surgery', 'मोतियाबिंद ऑपरेशन', 'Micro-Incision Phaco Laser', 'माइक्रो-इंसीजन फेको लेजर (Phaco Lens)', 'Ophthalmology', 'Daycare (4 hrs)', 'डेकेयर (4 घंटे)', 24000, 'Bladeless phaco', 'ब्लेडलेस फोल्डेबल लेंस', 'Foldable hydrophobic IOL lens implantation under gentle topical drop anesthesia.', 'आई-ड्रॉप एनेस्थीसिया के साथ प्रीमियम हाइड्रोफोबिक फोल्डेबल लेंस प्रत्यारोपण।', 'Walk home in 4 hours; crystal clear vision next day.', '4 घंटे में घर जाएं; अगले दिन से स्पष्ट दृष्टि।', TRUE),
('surg-appendix', 'Appendectomy', 'अपेंडिक्स सर्जरी', 'Emergency Laparoscopic Appendectomy', 'इमरजेंसी लैप्रोस्कोपिक अपेंडिसेक्टॉमी', 'GeneralSurgery', '1–2 days stay', '1–2 दिन भर्ती', 40000, 'Emergency fast-track', 'आपातकालीन त्वरित भर्ती', 'Urgent keyhole removal of inflamed appendix to prevent abdominal perforation.', 'सूजे हुए अपेंडिक्स को कीहोल सर्जरी से तुरंत सुरक्षित रूप से बाहर निकालना।', 'Prompt discharge within 24–36 hours.', '24–36 घंटों के भीतर सुरक्षित डिस्चार्ज।', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================
-- SEED DATA — HERO BANNERS (Home carousel)
-- ==============================================================
INSERT INTO public.hero_banners (title_en, title_hi, subtitle_en, subtitle_hi, badge_en, badge_hi, bg_color, action_route, sort_order)
VALUES
('Book Doctor Visits at Partner Hospitals', 'पार्टनर अस्पतालों में डॉक्टर बुक करें', 'Up to 25% off consultation fees', 'परामर्श शुल्क पर 25% तक की छूट', '150+ Hospitals', '150+ अस्पताल', '#0F2358', '/opd', 1),
('Lab Tests at NABL-Certified Centres', 'NABL प्रमाणित लैब में टेस्ट बुक करें', 'Home sample pickup available', 'घर से सैंपल कलेक्शन उपलब्ध', 'NABL Certified', 'NABL प्रमाणित', '#064E3B', '/labs', 2),
('Genuine Medicines at Partner Pharmacies', 'पार्टनर फार्मेसी में असली दवाइयां', 'Scan bill, save instantly in-app', 'बिल स्कैन करें, तुरंत बचत पाएं', 'Save up to 18%', '18% तक बचाएं', '#1C1917', '/pharmacy', 3)
ON CONFLICT DO NOTHING;

-- ==============================================================
-- SEED DATA — HEALTH PACKAGES (Home screen card)
-- ==============================================================
INSERT INTO public.health_packages (name_en, name_hi, tests_count, base_price, discount_pct, discounted_price, gradient_from, gradient_to, report_hrs, fasting_hrs, popular, sort_order)
VALUES
('Complete Health Checkup', 'संपूर्ण स्वास्थ्य जांच', 72, 3000, 20, 2400, '#172554', '#2563EB', 24, 10, TRUE, 1),
('Heart & Diabetes Care', 'हार्ट व डायबिटीज केयर', 52, 2200, 18, 1800, '#7F1D1D', '#E11D48', 24, 10, TRUE, 2),
('Senior Citizen Care', 'वरिष्ठ नागरिक सुरक्षा', 64, 3500, 20, 2800, '#064E3B', '#059669', 24, 10, FALSE, 3),
('Women''s Wellness', 'महिला वेलनेस पैकेज', 58, 3200, 19, 2600, '#831843', '#DB2777', 24, 10, FALSE, 4)
ON CONFLICT DO NOTHING;

-- ==============================================================
-- SEED DATA — PARTNER OFFERS (Home screen)
-- ==============================================================
INSERT INTO public.partner_offers (title_en, title_hi, subtitle_en, subtitle_hi, discount_text, badge_en, badge_hi, bg_color, text_color, action_route, sort_order)
VALUES
('OPD Concierge', 'ओपीडी कंसीयर्ज', 'Skip the queue at partner hospitals', 'पार्टनर अस्पतालों में लाइन से मुक्ति', 'Up to 25% off', 'OPD', 'ओपीडी', '#EFF6FF', '#1E40AF', '/opd', 1),
('Free Home Lab Pickup', 'घर से लैब सैंपल', 'NABL labs, report in 6–24 hrs', 'NABL लैब, 6–24 घंटे में रिपोर्ट', 'Free pickup', 'Labs', 'लैब', '#ECFDF5', '#047857', '/labs', 2),
('Pharmacy Scan & Save', 'फार्मेसी स्कैन व बचत', 'Scan medicine bill, pay less', 'दवाई बिल स्कैन करें, कम भुगतान करें', 'Save 10–18%', 'Pharmacy', 'फार्मेसी', '#FFFBEB', '#B45309', '/pharmacy', 3),
('Hospital Admission Help', 'अस्पताल भर्ती सहायता', 'Cashless IPD & TPA assistance', 'कैशलेस IPD व TPA सहायता', 'No queue', 'IPD', 'आईपीडी', '#F5F3FF', '#6D28D9', '/ipd', 4)
ON CONFLICT DO NOTHING;

-- ==============================================================
-- VERIFICATION QUERY (run after to confirm)
-- ==============================================================
-- SELECT 'users' AS tbl, COUNT(*) FROM public.users
-- UNION ALL SELECT 'dependents', COUNT(*) FROM public.dependents
-- UNION ALL SELECT 'hospitals', COUNT(*) FROM public.hospitals
-- UNION ALL SELECT 'hospital_branches', COUNT(*) FROM public.hospital_branches
-- UNION ALL SELECT 'doctors', COUNT(*) FROM public.doctors
-- UNION ALL SELECT 'bookings', COUNT(*) FROM public.bookings
-- UNION ALL SELECT 'lab_items', COUNT(*) FROM public.lab_items
-- UNION ALL SELECT 'lab_centres', COUNT(*) FROM public.lab_centres
-- UNION ALL SELECT 'lab_centre_prices', COUNT(*) FROM public.lab_centre_prices
-- UNION ALL SELECT 'pharmacies', COUNT(*) FROM public.pharmacies
-- UNION ALL SELECT 'ipd_surgeries', COUNT(*) FROM public.ipd_surgeries
-- UNION ALL SELECT 'hero_banners', COUNT(*) FROM public.hero_banners
-- UNION ALL SELECT 'health_packages', COUNT(*) FROM public.health_packages
-- UNION ALL SELECT 'partner_offers', COUNT(*) FROM public.partner_offers;

