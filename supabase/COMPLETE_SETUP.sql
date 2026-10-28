-- ==============================================================================
-- Adityam Niramayaa - Complete Database Setup & Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bgzkpbeeypydmmufuoho/sql/new
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Create Users Table
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

-- 3. Create Dependents (Family Vault) Table
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

-- 4. Create Hospitals Table with PostGIS Geography Point
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Delhi NCR',
    pincode VARCHAR(20),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    total_reviews INTEGER DEFAULT 120,
    specialties TEXT[] DEFAULT ARRAY['General Medicine', 'Cardiology', 'Pediatrics'],
    facilities TEXT[] DEFAULT ARRAY['24x7 Emergency', 'ICU', 'Pharmacy', 'Diagnostic Lab'],
    contact_number VARCHAR(30),
    virtual_exotel_number VARCHAR(30) DEFAULT '+911140008899',
    discount_percentage INTEGER DEFAULT 20,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals (city);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON public.hospitals (is_active);

-- 5. Create Bookings & Concierge Requests Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'OPD_CONCIERGE', 'INVESTIGATION', 'PHARMACY_SCAN_PAY', 'IPD_ENQUIRY'
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(30) NOT NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    hospital_name VARCHAR(255),
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

-- 6. PostGIS Proximity Function: get_nearby_hospitals
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
        h.id,
        h.name,
        h.slug,
        h.address,
        h.city,
        h.pincode,
        ST_Y(h.location::geometry) AS latitude,
        ST_X(h.location::geometry) AS longitude,
        ST_Distance(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters,
        ROUND((ST_Distance(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km,
        h.rating,
        h.total_reviews,
        h.specialties,
        h.facilities,
        h.contact_number,
        h.virtual_exotel_number,
        h.discount_percentage,
        h.image_url
    FROM public.hospitals h
    WHERE h.is_active = TRUE
      AND ST_DWithin(h.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_meters)
      AND (specialty_filter IS NULL OR specialty_filter = '' OR specialty_filter = ANY(h.specialties))
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$$;

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active hospitals" ON public.hospitals;
CREATE POLICY "Public read active hospitals" ON public.hospitals FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public user access" ON public.users;
CREATE POLICY "Public user access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public dependents access" ON public.dependents;
CREATE POLICY "Public dependents access" ON public.dependents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public bookings access" ON public.bookings;
CREATE POLICY "Public bookings access" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Publications
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

-- 9. Seed Master Data (Hospitals, Doctors, Test Reviewer User, CRM Stream)
INSERT INTO public.users (
    id, phone, full_name, age, gender, city, wallet_balance, is_verified, role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Abhishek Jain',
    34,
    'Male',
    'Delhi NCR',
    2500.00,
    TRUE,
    'patient'
) ON CONFLICT (phone) DO UPDATE 
SET full_name = EXCLUDED.full_name, wallet_balance = EXCLUDED.wallet_balance;

INSERT INTO public.dependents (
    id, user_id, full_name, relation, age, gender, aadhaar_last_four, kyc_status, consent_given
) VALUES 
(
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'Sunita Malhotra',
    'Mother',
    62,
    'Female',
    '4592',
    'verified',
    TRUE
),
(
    '11111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000001',
    'Pooja Malhotra',
    'Spouse',
    32,
    'Female',
    '8120',
    'verified',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hospitals (
    id, name, slug, address, city, state, pincode, location, rating, total_reviews,
    specialties, facilities, contact_number, virtual_exotel_number, discount_percentage, image_url, featured
) VALUES 
(
    '22222222-2222-2222-2222-222222222201',
    'Jain ENT Hospital, Saket',
    'jain-ent-hospital-saket',
    '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110017',
    ST_SetSRID(ST_MakePoint(77.2120, 28.5283), 4326)::geography,
    5.0,
    680,
    ARRAY['ENT', 'Cardiology', 'Orthopedics', 'Micro-Surgery', 'General Medicine', 'Dentistry'],
    ARRAY['24x7 Emergency', 'NABH Accredited', 'Best ENT & Surgery Center', 'Audiology Lab', 'Cashless Desk'],
    '+91-11-2651-5050',
    '+911140008801',
    25,
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222204',
    'CSK Hospital, South Extension',
    'csk-hospital-delhi',
    'A-24, Outer Ring Road, South Extension, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110049',
    ST_SetSRID(ST_MakePoint(77.2215, 28.5720), 4326)::geography,
    5.0,
    540,
    ARRAY['Laparoscopic Surgery', 'Cardiology', 'Orthopedics', 'ENT', 'General Medicine'],
    ARRAY['24x7 Emergency', 'NABH & JCI Accredited', 'Best Multispeciality Care', 'Level 1 Trauma Center', 'Cashless Desk'],
    '+91-11-7179-1090',
    '+911140008804',
    25,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222202',
    'Fortis Healthcare, Gurugram',
    'fortis-memorial-gurugram',
    'Sector - 44, Opposite HUDA City Centre Metro Station, Gurugram, Haryana',
    'Gurugram',
    'Delhi NCR',
    '122002',
    ST_SetSRID(ST_MakePoint(77.0726, 28.4595), 4326)::geography,
    4.8,
    380,
    ARRAY['Cardiology', 'Pediatrics', 'Gastroenterology', 'Neurology', 'Orthopedics'],
    ARRAY['24x7 Emergency', 'JCI Accredited', 'Dedicated ICU', 'Organ Transplant', 'Valet Parking'],
    '+91-124-4962200',
    '+911140008802',
    20,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222203',
    'Medanta - The Medicity',
    'medanta-the-medicity-gurugram',
    'CH Bakhtawar Singh Road, Sector 38, Gurugram, Haryana',
    'Gurugram',
    'Delhi NCR',
    '122001',
    ST_SetSRID(ST_MakePoint(77.0426, 28.4391), 4326)::geography,
    4.9,
    510,
    ARRAY['Cardiology', 'Cardiac Surgery', 'Neurosciences', 'Kidney & Urology', 'General Medicine'],
    ARRAY['24x7 Emergency', 'CyberKnife', 'Bone Marrow Transplant', 'Helipad', 'Air Ambulance'],
    '+91-124-4141414',
    '+911140008803',
    25,
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222205',
    'Sir Ganga Ram Hospital',
    'sir-ganga-ram-hospital',
    'Rajinder Nagar, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110060',
    ST_SetSRID(ST_MakePoint(77.1897, 28.6389), 4326)::geography,
    4.7,
    340,
    ARRAY['General Medicine', 'Nephrology', 'General Surgery', 'Gastroenterology', 'ENT'],
    ARRAY['24x7 Emergency', 'Blood Bank', 'Advanced Pathology', 'Dialysis'],
    '+91-11-2575-0000',
    '+911140008805',
    15,
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
    FALSE
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, discount_percentage = EXCLUDED.discount_percentage;

INSERT INTO public.bookings (
    id, booking_ref, service_type, patient_name, patient_phone, hospital_id,
    hospital_name, specialty_requested, status, call_status, notes
) VALUES 
(
    '33333333-3333-3333-3333-333333333301',
    'AN-2026-9041',
    'OPD_CONCIERGE',
    'Abhishek Jain',
    '+919999999999',
    '22222222-2222-2222-2222-222222222201',
    'Jain ENT Hospital, Saket',
    'ENT',
    'NEW',
    'pending',
    'Patient requested consultation with Dr. Satish Jain tomorrow 10:30 AM.'
),
(
    '33333333-3333-3333-3333-333333333302',
    'AN-2026-9042',
    'PHARMACY_SCAN_PAY',
    'Sunita Malhotra',
    '+919811223344',
    '22222222-2222-2222-2222-222222222203',
    'Medanta Medstore Saket',
    NULL,
    'PAID',
    'completed',
    'Counter bill ₹1,600. Applied 25% Adityam discount ₹400. Paid ₹1,200 via UPI.'
),
(
    '33333333-3333-3333-3333-333333333303',
    'AN-2026-9043',
    'IPD_ENQUIRY',
    'Rajesh Mehra',
    '+919876543210',
    '22222222-2222-2222-2222-222222222202',
    'Fortis Healthcare, Gurugram',
    'Orthopedics (Knee Replacement)',
    'CALLING',
    'calling',
    'Inquiring about cashless TPA coverage with Star Health. Dedicated coordinator assigned.'
)
ON CONFLICT (booking_ref) DO NOTHING;
