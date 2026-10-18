-- ==============================================================================
-- Adityam Niramayaa Healthcare Aggregator - Core Schema with PostGIS
-- Database: Supabase PostgreSQL
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
    wallet_balance NUMERIC(10, 2) DEFAULT 1250.00,
    is_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(30) DEFAULT 'patient', -- 'patient', 'admin', 'call_center_agent', 'partner'
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);

-- 3. Create Family Vault Table (Dependents & Lazy Aadhaar KYC)
CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL, -- 'Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Other'
    age INTEGER NOT NULL,
    gender VARCHAR(20) NOT NULL,
    aadhaar_last_four VARCHAR(4),
    kyc_status VARCHAR(30) DEFAULT 'lazy_submitted', -- 'pending_verification', 'lazy_submitted', 'verified'
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
    location GEOGRAPHY(Point, 4326) NOT NULL, -- Point(longitude, latitude)
    rating NUMERIC(2, 1) DEFAULT 4.8,
    total_reviews INTEGER DEFAULT 120,
    specialties TEXT[] DEFAULT ARRAY['General Medicine', 'Cardiology', 'Pediatrics'],
    facilities TEXT[] DEFAULT ARRAY['24x7 Emergency', 'ICU', 'Pharmacy', 'Diagnostic Lab', 'Ambulance'],
    contact_number VARCHAR(30),
    virtual_exotel_number VARCHAR(30) DEFAULT '+911140008899', -- Masked calling endpoint
    discount_percentage INTEGER DEFAULT 20,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial GIST index for fast radial and nearest-neighbor PostGIS queries
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON public.hospitals USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals (city);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON public.hospitals (is_active);

-- 5. Create Bookings & Concierge Requests Table (Real-time Call-Center Stream)
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
    status VARCHAR(50) DEFAULT 'NEW', -- 'NEW', 'CALLING', 'CONFIRMED', 'CANCELLED', 'PAID'
    call_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'calling', 'connected', 'completed'
    assigned_agent VARCHAR(100),
    exotel_call_sid VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);

-- 6. PostGIS RPC: get_nearby_hospitals
-- Calculates real distance using WGS84 geography spheroid and sorts by proximity
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

-- 7. Supabase Realtime Setup
-- Enable replica identity full so all row changes are broadcasted
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings to realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
$$;

-- 8. Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active hospitals
CREATE POLICY "Public read active hospitals" 
    ON public.hospitals FOR SELECT 
    USING (is_active = TRUE);

-- Allow public read/write to users and bookings for MVP dev and test-user
CREATE POLICY "Public user access" 
    ON public.users FOR ALL 
    USING (true) WITH CHECK (true);

CREATE POLICY "Public dependents access" 
    ON public.dependents FOR ALL 
    USING (true) WITH CHECK (true);

CREATE POLICY "Public bookings access" 
    ON public.bookings FOR ALL 
    USING (true) WITH CHECK (true);
