-- ==============================================================================
-- Adityam Niramayaa Seed Data
-- ==============================================================================

-- 1. Test User for App Store Review Bypass & Immediate Development
INSERT INTO public.users (
    id, phone, full_name, age, gender, city, wallet_balance, is_verified, role
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '+919999999999',
    'Rahul Jain',
    34,
    'Male',
    'Delhi NCR',
    2500.00,
    TRUE,
    'patient'
) ON CONFLICT (phone) DO UPDATE 
SET full_name = EXCLUDED.full_name, wallet_balance = EXCLUDED.wallet_balance;

-- 2. Test Dependents (Family Vault)
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
),
(
    '11111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000001',
    'Aarav Malhotra',
    'Son',
    6,
    'Male',
    '9034',
    'lazy_submitted',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 3. Top Indian Partner Hospitals with PostGIS Points (ST_MakePoint(longitude, latitude))
INSERT INTO public.hospitals (
    id, name, slug, address, city, state, pincode, location, rating, total_reviews,
    specialties, facilities, contact_number, virtual_exotel_number, discount_percentage, image_url, featured
) VALUES 
(
    '22222222-2222-2222-2222-222222222201',
    'Max Super Speciality Hospital, Saket',
    'max-super-speciality-saket',
    '1, 2, Press Enclave Marg, Saket Institutional Area, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110017',
    ST_SetSRID(ST_MakePoint(77.2120, 28.5283), 4326)::geography,
    4.9,
    420,
    ARRAY['Cardiology', 'Orthopedics', 'Oncology', 'Neurology', 'General Medicine'],
    ARRAY['24x7 Emergency', 'NABH Accredited', 'Robotic Surgery', 'Dialysis Unit', 'Cashless Desk'],
    '+91-11-2651-5050',
    '+911140008801',
    25,
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222202',
    'Fortis Memorial Research Institute (FMRI)',
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
    '22222222-2222-2222-2222-222222222204',
    'Indraprastha Apollo Hospitals',
    'apollo-hospitals-indraprastha',
    'Delhi-Mathura Road, Sarita Vihar, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110076',
    ST_SetSRID(ST_MakePoint(77.2831, 28.5402), 4326)::geography,
    4.8,
    490,
    ARRAY['Orthopedics', 'Cardiology', 'Pediatrics', 'Oncology', 'ENT'],
    ARRAY['24x7 Emergency', 'NABH & JCI Accredited', 'Level 1 Trauma Center', 'Apollo Pharmacy'],
    '+91-11-7179-1090',
    '+911140008804',
    20,
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    FALSE
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
    ARRAY['General Medicine', 'Nephrology', 'General Surgery', 'Gastroenterology'],
    ARRAY['24x7 Emergency', 'Blood Bank', 'Advanced Pathology', 'Dialysis'],
    '+91-11-2575-0000',
    '+911140008805',
    15,
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
    FALSE
),
(
    '22222222-2222-2222-2222-222222222206',
    'Manipal Hospital, Dwarka',
    'manipal-hospital-dwarka',
    'Sector 6, Dwarka, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110075',
    ST_SetSRID(ST_MakePoint(77.0545, 28.5835), 4326)::geography,
    4.8,
    290,
    ARRAY['Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'Pulmonology'],
    ARRAY['24x7 Emergency', 'Catheterization Lab', 'Pediatric ICU', 'Day Care Surgeries'],
    '+91-11-4967-4967',
    '+911140008806',
    20,
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    FALSE
),
(
    '22222222-2222-2222-2222-222222222207',
    'BLK-Max Super Speciality Hospital',
    'blk-max-super-speciality',
    'Pusa Road, Radha Soami Satsang, Rajendra Place, New Delhi',
    'New Delhi',
    'Delhi NCR',
    '110005',
    ST_SetSRID(ST_MakePoint(77.1793, 28.6433), 4326)::geography,
    4.8,
    315,
    ARRAY['Bone Marrow Transplant', 'Cardiology', 'Oncology', 'Plastic Surgery'],
    ARRAY['24x7 Emergency', 'NABH', 'Asia-Pacific Transplant Centre', 'Smart ICU'],
    '+91-11-3040-3040',
    '+911140008807',
    25,
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
    FALSE
),
(
    '22222222-2222-2222-2222-222222222208',
    'Artemis Hospital, Gurugram',
    'artemis-hospital-gurugram',
    'Sector 51, Gurugram, Haryana',
    'Gurugram',
    'Delhi NCR',
    '122001',
    ST_SetSRID(ST_MakePoint(77.0850, 28.4361), 4326)::geography,
    4.7,
    260,
    ARRAY['Cardiology', 'Orthopedics', 'Oncology', 'Neurology', 'Dermatology'],
    ARRAY['24x7 Emergency', 'JCI Accredited', 'Digital Imaging', 'In-House Pharmacy'],
    '+91-124-451-1111',
    '+911140008808',
    20,
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    FALSE
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, rating = EXCLUDED.rating;

-- 4. Initial Live Booking Requests for Call-Center CRM Real-Time Feed
INSERT INTO public.bookings (
    id, booking_ref, service_type, user_id, patient_name, patient_phone,
    hospital_id, hospital_name, specialty_requested, status, call_status, notes, created_at
) VALUES 
(
    '33333333-3333-3333-3333-333333333301',
    'AN-2026-9041',
    'OPD_CONCIERGE',
    '00000000-0000-0000-0000-000000000001',
    'Rahul Jain',
    '+919999999999',
    '22222222-2222-2222-2222-222222222201',
    'Max Super Speciality Hospital, Saket',
    'Cardiology',
    'NEW',
    'pending',
    'Patient requested senior cardiologist consult tomorrow 10:30 AM. VIP Member.',
    NOW() - INTERVAL '4 minutes'
),
(
    '33333333-3333-3333-3333-333333333302',
    'AN-2026-9042',
    'PHARMACY_SCAN_PAY',
    '00000000-0000-0000-0000-000000000001',
    'Sunita Malhotra',
    '+919811223344',
    '22222222-2222-2222-2222-222222222203',
    'Medanta Medstore Saket',
    NULL,
    'CONFIRMED',
    'completed',
    'Counter bill ₹1,600. Applied 25% Adityam discount ₹400. Paid ₹1,200 via UPI.',
    NOW() - INTERVAL '18 minutes'
),
(
    '33333333-3333-3333-3333-333333333303',
    'AN-2026-9043',
    'IPD_ENQUIRY',
    NULL,
    'Rajesh Mehra',
    '+919876543210',
    '22222222-2222-2222-2222-222222222202',
    'Fortis Memorial Research Institute (FMRI)',
    'Orthopedics (Knee Replacement)',
    'CALLING',
    'calling',
    'Inquiring about cashless TPA coverage with Star Health. Agent Simran calling via Exotel.',
    NOW() - INTERVAL '35 minutes'
)
ON CONFLICT (id) DO NOTHING;
