-- ============================================================
-- ADITYAM NIRAMAYAA - USER ADDRESSES TABLE
-- Migration: 20261101000001_create_user_addresses_table.sql
-- Supports Multi-Address Management (Home, Work, Other),
-- GPS Coordinates, and linkages to primary & alternate phone numbers.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    phone VARCHAR(30),
    type VARCHAR(50) NOT NULL DEFAULT 'Home',
    label VARCHAR(100),
    house_flat TEXT NOT NULL,
    landmark_street TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'South Delhi NCR',
    state VARCHAR(100) DEFAULT 'Delhi',
    pincode VARCHAR(20) NOT NULL DEFAULT '110017',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT FALSE,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_phone ON public.user_addresses(phone);

-- Enable RLS & Provide full development policy
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public user_addresses access" ON public.user_addresses;
CREATE POLICY "Public user_addresses access" ON public.user_addresses FOR ALL USING (true) WITH CHECK (true);

-- Baseline Seed Addresses linked to Test User (+91 99999 99999) & Mother (+91 98112 44550)
INSERT INTO public.user_addresses (
    id, user_id, phone, type, label, house_flat, landmark_street, city, state, pincode, latitude, longitude, is_default, contact_person, contact_phone
)
VALUES
(
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Home',
    'Home',
    'Flat 402, Block B, Saket Residency',
    'Opposite Community Center, Saket',
    'South Delhi NCR',
    'Delhi',
    '110017',
    28.5244,
    77.2167,
    TRUE,
    'Abhishek Jain',
    '+91 99999 99999'
),
(
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Work',
    'Work / Office',
    'Level 5, Building 10, DLF Cyber City',
    'DLF Phase 2, Sector 24',
    'Gurugram',
    'Haryana',
    '122002',
    28.4907,
    77.0949,
    FALSE,
    'Abhishek Jain',
    '+91 99999 99999'
),
(
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Other',
    'Parents'' House',
    'B-14, Sector 4, Central Avenue',
    'Near Gauri Temple, Malviya Nagar',
    'Jaipur',
    'Rajasthan',
    '302017',
    26.8532,
    75.8175,
    FALSE,
    'Sunita Malhotra',
    '+91 98112 44550'
)
ON CONFLICT (id) DO NOTHING;

