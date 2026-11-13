-- ==============================================================================
-- Migration: 20261112000001_clean_and_seed_jaipur_launch.sql
-- Adityam Niramayaa — Complete Purge of Dummy/Delhi NCR Data & Seed Jaipur Launch
-- 
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bgzkpbeeypydmmufuoho/sql/new
-- ==============================================================================

-- ============================================================
-- STEP 1: CLEAN UP ALL LEGACY SAMPLE & DUMMY DATA
-- ============================================================

-- 1.1 Purge fake bookings / test history
DELETE FROM public.bookings
WHERE user_id = '00000000-0000-0000-0000-000000000001'
   OR patient_name IN ('Rahul Jain', 'Sunita Malhotra', 'Abhishek Jain')
   OR booking_ref LIKE 'AN-2026-%'
   OR booking_ref LIKE 'AN-RX-%';

-- 1.2 Purge old doctors, branches, and hospitals from Delhi/Gurugram
DELETE FROM public.doctors;
DELETE FROM public.hospital_branches;
DELETE FROM public.hospitals;

-- 1.3 Purge old pharmacies (all were Delhi test data)
DELETE FROM public.pharmacies;

-- 1.4 Purge old lab centre prices & lab centres (all were Delhi test data)
DELETE FROM public.lab_centre_prices;
DELETE FROM public.lab_centres;

-- ============================================================
-- STEP 2: ENSURE TABLE COLUMNS FOR REGIONAL FILTERING
-- ============================================================
DO $$ BEGIN
    ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Jaipur';
    ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Rajasthan';
    ALTER TABLE public.lab_centres ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '302001';

    ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Jaipur';
    ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Rajasthan';
    ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '302001';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- STEP 3: SEED REAL JAIPUR LAUNCH HOSPITALS & SUPER-SPECIALISTS
-- ============================================================

-- 3.1 Hospital 1: SDMH (Santokba Durlabhji Memorial Hospital)
INSERT INTO public.hospitals (
    id, name, name_hi, slug, address, city, state, pincode,
    location, rating, total_reviews,
    specialties, specialties_hi,
    facilities, contact_number, virtual_exotel_number,
    discount_percentage, image_url, tag, tag_hi,
    is_active, featured, nabh_accredited, jci_accredited
) VALUES (
    '22222222-2222-2222-2222-222222222210',
    'Santokba Durlabhji Memorial Hospital (SDMH)',
    'संतोकबा दुर्लभजी मेमोरियल अस्पताल (एसडीएमएच)',
    'sdmh-jaipur',
    'Bhawani Singh Road, Near Rambagh Circle, Jaipur, Rajasthan',
    'Jaipur', 'Rajasthan', '302005',
    ST_SetSRID(ST_MakePoint(75.8078, 26.8986), 4326)::geography,
    4.8, 920,
    ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'General Surgery', 'Pediatrics', 'General Medicine', 'ENT'],
    ARRAY['हृदय रोग', 'न्यूरोलॉजी', 'हड्डी रोग', 'सामान्य सर्जरी', 'बाल रोग', 'सामान्य चिकित्सा', 'ईएनटी'],
    ARRAY['24x7 Emergency', 'NABH Accredited', 'Cardiac ICU', 'Cath Lab', 'Blood Bank', 'Cashless Desk'],
    '+91-141-2566251', '+911141000210',
    20,
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    'Best Multispeciality in Jaipur', 'जयपुर का प्रमुख मल्टीस्पेशलिटी अस्पताल',
    true, true, true, false
);

INSERT INTO public.hospital_branches (
    id, hospital_id, name, name_hi, area, area_hi, address, city,
    location, distance_km, contact_number, virtual_exotel_number, is_main_branch
) VALUES (
    'branch-sdmh-main',
    '22222222-2222-2222-2222-222222222210',
    'SDMH Main Campus', 'एसडीएमएच मुख्य परिसर',
    'Bhawani Singh Road, Jaipur', 'भवानी सिंह रोड, जयपुर',
    'Bhawani Singh Road, Near Rambagh Circle, Jaipur - 302005', 'Jaipur',
    ST_SetSRID(ST_MakePoint(75.8078, 26.8986), 4326)::geography,
    1.9, '+91-141-2566251', '+911141000210', true
);

INSERT INTO public.doctors (
    id, hospital_id, branch_id, name, specialty, qualification, experience_years,
    rating, total_reviews, consultation_fee, discounted_fee, next_available_slot,
    avatar_url, languages, opd_timing, is_active, featured
) VALUES
(
    'doc-sdmh-1',
    '22222222-2222-2222-2222-222222222210', 'branch-sdmh-main',
    'Dr. Rajesh Sharma', 'Cardiology',
    'MBBS, MD, DM (Cardiology), FACC', 20,
    4.9, 540, 800, 640, 'Today, 5:00 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Sat: 10:00 AM - 02:00 PM, 05:00 PM - 07:00 PM',
    true, true
),
(
    'doc-sdmh-2',
    '22222222-2222-2222-2222-222222222210', 'branch-sdmh-main',
    'Dr. Priya Agarwal', 'General Medicine',
    'MBBS, MD (Internal Medicine)', 14,
    4.8, 320, 600, 480, 'Today, 6:30 PM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Sat: 09:00 AM - 05:00 PM',
    true, false
),
(
    'doc-sdmh-3',
    '22222222-2222-2222-2222-222222222210', 'branch-sdmh-main',
    'Dr. Amit Joshi', 'Orthopedics',
    'MBBS, MS (Ortho)', 16,
    4.7, 280, 700, 560, 'Tomorrow, 10:00 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Fri: 10:00 AM - 04:00 PM',
    true, false
);

-- 3.2 Hospital 2: Eternal Hospital (EHCC)
INSERT INTO public.hospitals (
    id, name, name_hi, slug, address, city, state, pincode,
    location, rating, total_reviews,
    specialties, specialties_hi,
    facilities, contact_number, virtual_exotel_number,
    discount_percentage, image_url, tag, tag_hi,
    is_active, featured, nabh_accredited, jci_accredited
) VALUES (
    '22222222-2222-2222-2222-222222222211',
    'Eternal Hospital (EHCC)',
    'इटरनल हॉस्पिटल (ईएचसीसी)',
    'eternal-hospital-jaipur',
    '3 A, Jagatpura Road, Near Jawahar Circle, Jaipur, Rajasthan',
    'Jaipur', 'Rajasthan', '302017',
    ST_SetSRID(ST_MakePoint(75.8016, 26.8402), 4326)::geography,
    4.7, 750,
    ARRAY['Cardiology', 'Oncology', 'Neurology', 'Gastroenterology', 'Pediatrics', 'Critical Care'],
    ARRAY['हृदय रोग', 'कैंसर रोग', 'न्यूरोलॉजी', 'गैस्ट्रोएंटरोलॉजी', 'बाल रोग', 'क्रिटिकल केयर'],
    ARRAY['24x7 Emergency', 'NABH Accredited', 'Cancer Centre', 'Kidney Transplant', 'Level 3 ICU'],
    '+91-141-2607777', '+911141000211',
    25,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    'Premier Cardiac & Cancer Hub', 'हृदय व कैंसर रोग का शीर्ष संस्थान',
    true, true, true, false
);

INSERT INTO public.hospital_branches (
    id, hospital_id, name, name_hi, area, area_hi, address, city,
    location, distance_km, contact_number, virtual_exotel_number, is_main_branch
) VALUES (
    'branch-eternal-main',
    '22222222-2222-2222-2222-222222222211',
    'Eternal Hospital Main Campus', 'इटरनल हॉस्पिटल मुख्य परिसर',
    'JLN Marg, Jawahar Circle, Jaipur', 'जेएलएन मार्ग, जवाहर सर्किल, जयपुर',
    '3 A, Jagatpura Road, Near Jawahar Circle, Jaipur - 302017', 'Jaipur',
    ST_SetSRID(ST_MakePoint(75.8016, 26.8402), 4326)::geography,
    3.5, '+91-141-2607777', '+911141000211', true
);

INSERT INTO public.doctors (
    id, hospital_id, branch_id, name, specialty, qualification, experience_years,
    rating, total_reviews, consultation_fee, discounted_fee, next_available_slot,
    avatar_url, languages, opd_timing, is_active, featured
) VALUES
(
    'doc-eternal-1',
    '22222222-2222-2222-2222-222222222211', 'branch-eternal-main',
    'Dr. Suresh Gupta', 'Neurology',
    'MBBS, MD, DM (Neurology)', 18,
    4.9, 460, 900, 675, 'Today, 4:30 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Sat: 10:00 AM - 03:00 PM, 05:00 PM - 07:00 PM',
    true, true
),
(
    'doc-eternal-2',
    '22222222-2222-2222-2222-222222222211', 'branch-eternal-main',
    'Dr. Meera Sharma', 'Pediatrics',
    'MBBS, MD (Pediatrics), DCH', 12,
    4.8, 310, 650, 490, 'Today, 7:00 PM',
    'https://images.unsplash.com/photo-1594824813583-36c1e57c6b54?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Sat: 09:00 AM - 06:00 PM',
    true, false
);

-- 3.3 Hospital 3: Fortis Escorts Hospital Jaipur
INSERT INTO public.hospitals (
    id, name, name_hi, slug, address, city, state, pincode,
    location, rating, total_reviews,
    specialties, specialties_hi,
    facilities, contact_number, virtual_exotel_number,
    discount_percentage, image_url, tag, tag_hi,
    is_active, featured, nabh_accredited, jci_accredited
) VALUES (
    '22222222-2222-2222-2222-222222222212',
    'Fortis Escorts Hospital Jaipur',
    'फोर्टिस एस्कॉर्ट्स अस्पताल जयपुर',
    'fortis-escorts-jaipur',
    'Jawaharlal Nehru Marg, Malviya Nagar, Jaipur, Rajasthan',
    'Jaipur', 'Rajasthan', '302017',
    ST_SetSRID(ST_MakePoint(75.8105, 26.8524), 4326)::geography,
    4.8, 820,
    ARRAY['Cardiology', 'Cardiac Surgery', 'Nephrology', 'Orthopedics', 'General Surgery'],
    ARRAY['हृदय रोग', 'हार्ट सर्जरी', 'किडनी रोग', 'हड्डी रोग', 'सामान्य सर्जरी'],
    ARRAY['24x7 Emergency', 'JCI Accredited', 'Cardiac Cath Lab', 'Renal Transplant', 'Robotic Surgery'],
    '+91-141-2547000', '+911141000212',
    20,
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    'JCI Accredited Heart & Kidney Care', 'जेसीआई प्रमाणित सुपर स्पेशलिटी',
    true, true, true, true
);

INSERT INTO public.hospital_branches (
    id, hospital_id, name, name_hi, area, area_hi, address, city,
    location, distance_km, contact_number, virtual_exotel_number, is_main_branch
) VALUES (
    'branch-fortis-jaipur',
    '22222222-2222-2222-2222-222222222212',
    'Fortis Escorts Jaipur Main', 'फोर्टिस एस्कॉर्ट्स मुख्य',
    'JLN Marg, Malviya Nagar, Jaipur', 'जेएलएन मार्ग, मालवीय नगर, जयपुर',
    'JLN Marg, Malviya Nagar, Jaipur - 302017', 'Jaipur',
    ST_SetSRID(ST_MakePoint(75.8105, 26.8524), 4326)::geography,
    4.2, '+91-141-2547000', '+911141000212', true
);

INSERT INTO public.doctors (
    id, hospital_id, branch_id, name, specialty, qualification, experience_years,
    rating, total_reviews, consultation_fee, discounted_fee, next_available_slot,
    avatar_url, languages, opd_timing, is_active, featured
) VALUES
(
    'doc-fortis-jp-1',
    '22222222-2222-2222-2222-222222222212', 'branch-fortis-jaipur',
    'Dr. Kapil Boob', 'Cardiology',
    'MBBS, MD, DM (Cardiology), FESC', 22,
    4.9, 680, 1000, 800, 'Today, 5:30 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English'], 'Mon-Sat: 10:00 AM - 02:00 PM',
    true, true
),
(
    'doc-fortis-jp-2',
    '22222222-2222-2222-2222-222222222212', 'branch-fortis-jaipur',
    'Dr. Vinod Sharma', 'Orthopedics',
    'MBBS, MS (Ortho), MCh', 17,
    4.7, 290, 800, 640, 'Tomorrow, 11:00 AM',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English', 'Rajasthani'], 'Mon-Fri: 11:00 AM - 05:00 PM',
    true, false
);

-- 3.4 Hospital 4: SMS Hospital (Government Medical College & Centre)
INSERT INTO public.hospitals (
    id, name, name_hi, slug, address, city, state, pincode,
    location, rating, total_reviews,
    specialties, specialties_hi,
    facilities, contact_number, virtual_exotel_number,
    discount_percentage, image_url, tag, tag_hi,
    is_active, featured, nabh_accredited, jci_accredited
) VALUES (
    '22222222-2222-2222-2222-222222222214',
    'SMS Hospital (Sawai Man Singh)',
    'सवाई मान सिंह अस्पताल (एसएमएस)',
    'sms-hospital-jaipur',
    'JLN Marg, Ashok Nagar, Jaipur, Rajasthan',
    'Jaipur', 'Rajasthan', '302004',
    ST_SetSRID(ST_MakePoint(75.8172, 26.9038), 4326)::geography,
    4.6, 1200,
    ARRAY['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pulmonology', 'ENT', 'Dentistry'],
    ARRAY['सामान्य चिकित्सा', 'हृदय रोग', 'न्यूरोलॉजी', 'हड्डी रोग', 'श्वास रोग', 'ईएनटी', 'दंत चिकित्सा'],
    ARRAY['24x7 Trauma Care', 'Government Medical College', 'Specialized Super-Care', 'Central Blood Bank'],
    '+91-141-2518224', '+911141000214',
    25,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    'Rajasthan Largest Medical Institution', 'राजस्थान का सबसे बड़ा चिकित्सा संस्थान',
    true, false, true, false
);

INSERT INTO public.hospital_branches (
    id, hospital_id, name, name_hi, area, area_hi, address, city,
    location, distance_km, contact_number, virtual_exotel_number, is_main_branch
) VALUES (
    'branch-sms-main',
    '22222222-2222-2222-2222-222222222214',
    'SMS Hospital Central Campus', 'एसएमएस अस्पताल मुख्य परिसर',
    'JLN Marg, Ashok Nagar, Jaipur', 'जेएलएन मार्ग, अशोक नगर, जयपुर',
    'JLN Marg, Ashok Nagar, Jaipur - 302004', 'Jaipur',
    ST_SetSRID(ST_MakePoint(75.8172, 26.9038), 4326)::geography,
    2.1, '+91-141-2518224', '+911141000214', true
);

INSERT INTO public.doctors (
    id, hospital_id, branch_id, name, specialty, qualification, experience_years,
    rating, total_reviews, consultation_fee, discounted_fee, next_available_slot,
    avatar_url, languages, opd_timing, is_active, featured
) VALUES (
    'doc-sms-1',
    '22222222-2222-2222-2222-222222222214', 'branch-sms-main',
    'Dr. Satish Jain', 'ENT',
    'MBBS, MS (ENT), DLO - Chief Senior Specialist', 24,
    5.0, 950, 500, 375, 'Today, 5:30 PM',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    ARRAY['Hindi', 'English', 'Rajasthani'], 'Mon-Sat: 09:00 AM - 01:00 PM, 04:00 PM - 07:00 PM',
    true, true
);

-- ============================================================
-- STEP 4: SEED REAL JAIPUR PARTNER PHARMACIES (NEAR MOHANBARI / SURAJPOLE)
-- ============================================================
INSERT INTO public.pharmacies (
    id, name, name_hi, area, area_hi, latitude, longitude,
    rating, reviews, delivery, pickup, app_discount_pct,
    shop_address, shop_phone, city, state, pincode, is_active
) VALUES
(
    'jp1',
    'Surajpole Jan Aushadhi & Medicos',
    'सूरजपोल जन औषधि एवं मेडिकोज़',
    'Surajpole Gate, Mohanbari, Jaipur',
    'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
    26.9208, 75.8445,
    4.9, 340, true, true, 20,
    'Shop 4, Near Surajpole Gate Police Chowki, Mohanbari, Jaipur - 302003',
    '+91-141-2601122', 'Jaipur', 'Rajasthan', '302003', true
),
(
    'jp2',
    'Pink City Care Chemist',
    'पिंक सिटी केयर केमिस्ट',
    'Ramganj Bazar, Jaipur',
    'रामगंज बाज़ार, जयपुर',
    26.9235, 75.8360,
    4.8, 280, true, true, 16,
    '112, Main Ramganj Bazar Road, Jaipur - 302003',
    '+91-141-2603344', 'Jaipur', 'Rajasthan', '302003', true
),
(
    'jp3',
    'SMS Lifeline Pharmacy',
    'एसएमएस लाइफलाइन फार्मेसी',
    'JLN Marg, Opp SMS Hospital, Jaipur',
    'जेएलएन मार्ग, एसएमएस अस्पताल के सामने, जयपुर',
    26.9045, 75.8165,
    4.8, 510, true, true, 18,
    'Opposite Emergency Gate, SMS Hospital, JLN Marg, Jaipur - 302004',
    '+91-141-2569988', 'Jaipur', 'Rajasthan', '302004', true
),
(
    'jp4',
    'Apollo Pharmacy - MI Road',
    'अपोलो फार्मेसी - एमआई रोड',
    'MI Road, Near Panch Batti, Jaipur',
    'एमआई रोड, पांच बत्ती के पास, जयपुर',
    26.9175, 75.8120,
    4.7, 430, true, true, 15,
    'Panch Batti, Mirza Ismail Road, Jaipur - 302001',
    '+91-141-2375500', 'Jaipur', 'Rajasthan', '302001', true
),
(
    'jp5',
    'Raja Park Day & Night Medicos',
    'राजा पार्क डे एंड नाइट मेडिकोज़',
    'Lane 2, Raja Park, Jaipur',
    'गली नं. 2, राजा पार्क, जयपुर',
    26.8940, 75.8280,
    4.8, 390, true, true, 15,
    'Plot 45, Lane 2, Main Market, Raja Park, Jaipur - 302004',
    '+91-141-2621100', 'Jaipur', 'Rajasthan', '302004', true
),
(
    'jp6',
    'Malviya Nagar Medicos Jaipur',
    'मालवीय नगर मेडिकोज़ जयपुर',
    'Gaurav Tower Road, Malviya Nagar, Jaipur',
    'गौरव टॉवर रोड, मालवीय नगर, जयपुर',
    26.8530, 75.8140,
    4.7, 310, true, true, 16,
    'Shop 12, GT Central Road, Malviya Nagar, Jaipur - 302017',
    '+91-141-2724455', 'Jaipur', 'Rajasthan', '302017', true
);

-- ============================================================
-- STEP 5: SEED REAL JAIPUR DIAGNOSTIC LAB CENTRES & PRICING
-- ============================================================
INSERT INTO public.lab_centres (
    id, name, area, area_hi, distance_km, rating, reviews,
    home_collection, next_slot, offers, price_factor,
    latitude, longitude, city, state, pincode, is_active
) VALUES
(
    'jp-c1',
    'Dr. Lal PathLabs - Surajpole',
    'Surajpole Gate, Mohanbari, Jaipur',
    'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
    0.4, 4.8, 680,
    true, 'Today, 5:00 PM', ARRAY['lab', 'package'], 1.0,
    26.9212, 75.8455, 'Jaipur', 'Rajasthan', '302003', true
),
(
    'jp-c2',
    'Metropolis Healthcare - C-Scheme',
    'Ashok Marg, C-Scheme, Jaipur',
    'अशोक मार्ग, सी-स्कीम, जयपुर',
    2.1, 4.7, 490,
    true, 'Today, 6:30 PM', ARRAY['lab', 'scan', 'package'], 1.05,
    26.9125, 75.8050, 'Jaipur', 'Rajasthan', '302001', true
),
(
    'jp-c3',
    'SRL Diagnostics - MI Road',
    'Mirza Ismail Road, Jaipur',
    'मिर्जा इस्माइल रोड, जयपुर',
    2.8, 4.6, 310,
    true, 'Tomorrow, 7:00 AM', ARRAY['lab', 'scan', 'package'], 0.95,
    26.9180, 75.8200, 'Jaipur', 'Rajasthan', '302001', true
),
(
    'jp-c4',
    'SMS Hospital Diagnostic Imaging Centre',
    'JLN Marg, Jaipur',
    'जेएलएन मार्ग, जयपुर',
    3.6, 4.5, 540,
    false, 'Today, 7:00 PM', ARRAY['lab', 'scan', 'package'], 0.85,
    26.9038, 75.8172, 'Jaipur', 'Rajasthan', '302004', true
),
(
    'jp-c5',
    'Thyrocare Wellness Centre - Raja Park',
    'Raja Park, Jaipur',
    'राजा पार्क, जयपुर',
    4.3, 4.4, 220,
    true, 'Tomorrow, 8:00 AM', ARRAY['lab', 'package'], 0.90,
    26.8920, 75.8300, 'Jaipur', 'Rajasthan', '302004', true
);

-- Seed price junctions for all existing lab items with the new Jaipur centres
INSERT INTO public.lab_centre_prices (item_id, centre_id, price, is_available)
SELECT 
    items.id AS item_id,
    centres.id AS centre_id,
    ROUND((items.base_price * centres.price_factor) / 10) * 10 AS price,
    true AS is_available
FROM public.lab_items items
CROSS JOIN public.lab_centres centres
WHERE centres.id LIKE 'jp-c%'
ON CONFLICT (item_id, centre_id) DO UPDATE 
SET price = EXCLUDED.price, is_available = true;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
SELECT 'Hospitals in DB:' AS entity, COUNT(*) AS total FROM public.hospitals
UNION ALL
SELECT 'Doctors in DB:', COUNT(*) FROM public.doctors
UNION ALL
SELECT 'Pharmacies in DB:', COUNT(*) FROM public.pharmacies
UNION ALL
SELECT 'Lab Centres in DB:', COUNT(*) FROM public.lab_centres;

