-- ==============================================================================
-- Adityam Niramayaa — Clean Reset & Updated Production-Ready Jaipur Seed
-- Run this in Supabase Dashboard → SQL Editor to wipe all old demo bookings/data
-- and seed a focused, realistic Jaipur catalog matching all updated tables.
-- NOTE: public.users is NOT deleted so your Google Admin & Staff accounts stay intact.
-- ==============================================================================

-- 1. Wipe all demo transactional & audit data
DELETE FROM public.refund_requests;
DELETE FROM public.hospital_payouts;
DELETE FROM public.lab_payouts;
DELETE FROM public.pharmacy_payouts;
DELETE FROM public.doctor_payouts;
DELETE FROM public.crm_logs;
DELETE FROM public.partner_enquiries;
DELETE FROM public.admin_audit_logs;
DELETE FROM public.staff_login_attempts;
DELETE FROM public.bookings;

-- 2. Wipe old demo catalog
DELETE FROM public.doctors;
DELETE FROM public.hospital_branches;
DELETE FROM public.hospitals;
DELETE FROM public.pharmacies;
DELETE FROM public.lab_centre_prices;
DELETE FROM public.lab_centres;

-- 3. Seed 2 Focused Partner Hospitals (with full timings, beds, IPD & insurance)
INSERT INTO public.hospitals (
  id, name, name_hi, slug, address, city, state, pincode,
  location, rating, total_reviews,
  specialties, specialties_hi, facilities,
  contact_number, secondary_contact_number, emergency_contact_number, virtual_exotel_number,
  discount_percentage, commission_percentage, opd_hours, is_24x7,
  total_beds, icu_beds, ot_count,
  weekly_schedule, labs_offered, ipd_services_offered, insurance_partners,
  image_url, tag, tag_hi, is_active, featured, nabh_accredited, jci_accredited
) VALUES
(
  '22222222-2222-2222-2222-222222222210',
  'Santokba Durlabhji Memorial Hospital (SDMH)',
  'संतोकबा दुर्लभजी मेमोरियल अस्पताल (एसडीएमएच)',
  'sdmh-jaipur',
  'Bhawani Singh Road, Near Rambagh Circle, Jaipur, Rajasthan',
  'Jaipur', 'Rajasthan', '302005',
  ST_SetSRID(ST_MakePoint(75.8078, 26.8986), 4326)::geography,
  4.8, 920,
  ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'General Surgery', 'General Medicine'],
  ARRAY['हृदय रोग', 'न्यूरोलॉजी', 'हड्डी रोग', 'सामान्य सर्जरी', 'सामान्य चिकित्सा'],
  ARRAY['24x7 Emergency', 'NABH Accredited', 'Cardiac ICU', 'Cath Lab', 'Cashless TPA'],
  '+91-141-2566251', '+91-98290-11210', '+91-141-2566252', '+911141000210',
  20, 10, 'Mon-Sat, 09:00 AM - 07:00 PM', true,
  450, 65, 10,
  '{"mon":{"open":true,"start":"09:00","end":"19:00"},"tue":{"open":true,"start":"09:00","end":"19:00"},"wed":{"open":true,"start":"09:00","end":"19:00"},"thu":{"open":true,"start":"09:00","end":"19:00"},"fri":{"open":true,"start":"09:00","end":"19:00"},"sat":{"open":true,"start":"09:00","end":"17:00"},"sun":{"open":false,"start":"10:00","end":"13:00"}}'::jsonb,
  ARRAY['Pathology & Blood Tests', 'Digital X-Ray', '2D Echo & ECG', 'CT Scan'],
  ARRAY['Cardiac Bypass / Angioplasty', 'Knee & Hip Replacement', 'Laparoscopic Surgery', 'Cashless TPA Admission'],
  ARRAY['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'RGHS', 'CGHS'],
  'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
  'NABH Multispeciality', 'एनएबीएच मल्टीस्पेशलिटी',
  true, true, true, false
),
(
  '22222222-2222-2222-2222-222222222212',
  'Fortis Escorts Hospital, Jaipur',
  'फोर्टिस एस्कॉर्ट्स हॉस्पिटल, जयपुर',
  'fortis-escorts-jaipur',
  'JLN Marg, Malviya Nagar, Jaipur, Rajasthan',
  'Jaipur', 'Rajasthan', '302017',
  ST_SetSRID(ST_MakePoint(75.8035, 26.8453), 4326)::geography,
  4.8, 780,
  ARRAY['Cardiology', 'Orthopedics', 'Gastroenterology', 'Gynecology', 'Oncology'],
  ARRAY['हृदय रोग', 'हड्डी रोग', 'गैस्ट्रोएंटरोलॉजी', 'स्त्री रोग', 'कैंसर रोग'],
  ARRAY['24x7 Trauma & Emergency', 'Cath Lab', 'Robotic Surgery', 'NICU', 'Cashless Desk'],
  '+91-141-2547000', '+91-98290-22212', '+91-141-2547001', '+911141000212',
  15, 10, 'Mon-Sat, 09:00 AM - 08:00 PM', true,
  275, 50, 8,
  '{"mon":{"open":true,"start":"09:00","end":"20:00"},"tue":{"open":true,"start":"09:00","end":"20:00"},"wed":{"open":true,"start":"09:00","end":"20:00"},"thu":{"open":true,"start":"09:00","end":"20:00"},"fri":{"open":true,"start":"09:00","end":"20:00"},"sat":{"open":true,"start":"09:00","end":"18:00"},"sun":{"open":false,"start":"10:00","end":"14:00"}}'::jsonb,
  ARRAY['Pathology', 'MRI 3T', 'CT Scan', 'Ultrasound'],
  ARRAY['Joint Replacement', 'Cardiac Care & Stenting', 'Maternity & NICU', 'Cashless TPA Admission'],
  ARRAY['Star Health', 'HDFC Ergo', 'Niva Bupa', 'Care Health'],
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'Super Speciality Care', 'सुपर स्पेशलिटी केयर',
  true, true, true, true
);

-- 4. Seed Hospital Branches
INSERT INTO public.hospital_branches (
  id, hospital_id, name, name_hi, area, area_hi, address, city,
  location, distance_km, contact_number, secondary_contact_number, virtual_exotel_number,
  opd_hours, is_24x7, is_main_branch
) VALUES
(
  'branch-sdmh-main', '22222222-2222-2222-2222-222222222210',
  'SDMH Main Campus', 'एसडीएमएच मुख्य परिसर',
  'Bhawani Singh Road, Jaipur', 'भवानी सिंह रोड, जयपुर',
  'Bhawani Singh Road, Near Rambagh Circle, Jaipur - 302005', 'Jaipur',
  ST_SetSRID(ST_MakePoint(75.8078, 26.8986), 4326)::geography,
  1.9, '+91-141-2566251', '+91-98290-11210', '+911141000210',
  'Mon-Sat, 09:00 AM - 07:00 PM', true, true
),
(
  'branch-fortis-jaipur', '22222222-2222-2222-2222-222222222212',
  'Fortis Escorts Main', 'फोर्टिस एस्कॉर्ट्स मुख्य',
  'Malviya Nagar, JLN Marg, Jaipur', 'मालवीय नगर, जेएलएन मार्ग, जयपुर',
  'JLN Marg, Malviya Nagar, Jaipur - 302017', 'Jaipur',
  ST_SetSRID(ST_MakePoint(75.8035, 26.8453), 4326)::geography,
  7.2, '+91-141-2547000', '+91-98290-22212', '+911141000212',
  'Mon-Sat, 09:00 AM - 08:00 PM', true, true
);

-- 5. Seed 4 Doctors (2 Hospital Specialists + 2 Solo Clinic Doctors with varied timings & fees)
INSERT INTO public.doctors (
  id, hospital_id, branch_id, is_solo, slug, name, specialty, qualification, experience_years,
  rating, total_reviews, consultation_fee, discounted_fee, discount_percentage, commission_percentage,
  next_available_slot, opd_timing, is_available_today,
  clinic_name, clinic_address, city, pincode, phone,
  weekly_schedule, services_offered,
  avatar_url, languages, is_active, featured
) VALUES
(
  'doc-sdmh-1', '22222222-2222-2222-2222-222222222210', 'branch-sdmh-main', false, 'dr-rajesh-mathur-cardio',
  'Dr. Rajesh Mathur', 'Cardiology', 'MD, DM (Cardiology)', 18,
  4.9, 310, 800, 640, 20, 10,
  'Today, 11:30 AM', 'Mon-Sat: 10:00 AM - 02:00 PM', true,
  'SDMH Heart OPD', 'Bhawani Singh Road, Jaipur', 'Jaipur', '302005', '+91-98290-30001',
  '{"mon":{"open":true,"start":"10:00","end":"14:00"},"tue":{"open":true,"start":"10:00","end":"14:00"},"wed":{"open":true,"start":"10:00","end":"14:00"},"thu":{"open":true,"start":"10:00","end":"14:00"},"fri":{"open":true,"start":"10:00","end":"14:00"},"sat":{"open":true,"start":"10:00","end":"13:00"},"sun":{"open":false,"start":"10:00","end":"13:00"}}'::jsonb,
  ARRAY['Cardiac OPD', 'ECG & Echo Review', 'Angiography Consult'],
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80',
  ARRAY['Hindi', 'English'], true, true
),
(
  'doc-fortis-1', '22222222-2222-2222-2222-222222222212', 'branch-fortis-jaipur', false, 'dr-anita-sharma-ortho',
  'Dr. Anita Sharma', 'Orthopedics', 'MS (Orthopedics), Joint Replacement', 14,
  4.8, 245, 700, 595, 15, 10,
  'Today, 04:30 PM', 'Mon-Sat: 04:00 PM - 07:30 PM', true,
  'Fortis Ortho Clinic', 'JLN Marg, Malviya Nagar, Jaipur', 'Jaipur', '302017', '+91-98290-30002',
  '{"mon":{"open":true,"start":"16:00","end":"19:30"},"tue":{"open":true,"start":"16:00","end":"19:30"},"wed":{"open":true,"start":"16:00","end":"19:30"},"thu":{"open":true,"start":"16:00","end":"19:30"},"fri":{"open":true,"start":"16:00","end":"19:30"},"sat":{"open":true,"start":"16:00","end":"19:00"},"sun":{"open":false,"start":"10:00","end":"13:00"}}'::jsonb,
  ARRAY['Knee Pain Consult', 'Fracture Care', 'Joint Replacement Planning'],
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=80',
  ARRAY['Hindi', 'English'], true, true
),
(
  'doc-solo-1', NULL, NULL, true, 'dr-vikram-singh-physician',
  'Dr. Vikram Singh Rathore', 'General Medicine', 'MBBS, MD (Internal Medicine)', 12,
  4.9, 190, 500, 425, 15, 10,
  'Today, 05:30 PM', 'Mon-Sat: 09:30 AM - 01:00 PM, 05:00 PM - 08:30 PM', true,
  'Rathore Family Clinic', 'Shop 14, Surajpole Bazar, Jaipur', 'Jaipur', '302003', '+91-98290-30003',
  '{"mon":{"open":true,"start":"09:30","end":"20:30"},"tue":{"open":true,"start":"09:30","end":"20:30"},"wed":{"open":true,"start":"09:30","end":"20:30"},"thu":{"open":true,"start":"09:30","end":"20:30"},"fri":{"open":true,"start":"09:30","end":"20:30"},"sat":{"open":true,"start":"09:30","end":"19:00"},"sun":{"open":false,"start":"10:00","end":"13:00"}}'::jsonb,
  ARRAY['Fever & Infection OPD', 'Diabetes & BP Care', 'Follow-up Consult'],
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
  ARRAY['Hindi', 'English', 'Rajasthani'], true, true
),
(
  'doc-solo-2', NULL, NULL, true, 'dr-neha-khandelwal-gynae',
  'Dr. Neha Khandelwal', 'Gynecology', 'MBBS, MS (OBG)', 11,
  4.8, 165, 600, 510, 15, 10,
  'Tomorrow, 10:30 AM', 'Mon-Sat: 10:00 AM - 02:00 PM', true,
  'Matritva Women Care Clinic', 'MI Road, Near Panch Batti, Jaipur', 'Jaipur', '302001', '+91-98290-30004',
  '{"mon":{"open":true,"start":"10:00","end":"14:00"},"tue":{"open":true,"start":"10:00","end":"14:00"},"wed":{"open":true,"start":"10:00","end":"14:00"},"thu":{"open":true,"start":"10:00","end":"14:00"},"fri":{"open":true,"start":"10:00","end":"14:00"},"sat":{"open":true,"start":"10:00","end":"13:30"},"sun":{"open":false,"start":"10:00","end":"13:00"}}'::jsonb,
  ARRAY['Antenatal Checkup', 'PCOD & Fertility Consult', 'Women Wellness'],
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
  ARRAY['Hindi', 'English'], true, false
);

-- 6. Seed 2 Partner Pharmacies (1 24x7 Store + 1 Daytime Store)
INSERT INTO public.pharmacies (
  id, name, name_hi, slug, area, area_hi, latitude, longitude,
  rating, reviews, delivery, pickup, app_discount_pct, commission_percentage,
  shop_address, shop_phone, secondary_phone, drug_license_number, gst_number,
  is_24x7, delivery_radius_km, delivery_time_mins, min_order_free_delivery,
  weekly_schedule, city, state, pincode, is_active, is_featured
) VALUES
(
  'jp1',
  'Surajpole Jan Aushadhi & Medicos',
  'सूरजपोल जन औषधि एवं मेडिकोज़',
  'surajpole-jan-aushadhi',
  'Surajpole Gate, Mohanbari, Jaipur', 'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
  26.9208, 75.8445,
  4.9, 340, true, true, 20, 10,
  'Shop 4, Near Surajpole Gate Police Chowki, Mohanbari, Jaipur - 302003',
  '+91-98290-40001', '+91-141-2601122', 'RJ-JPR-2024-8812', '08AABCS1234F1Z5',
  true, 8, 35, 299,
  '{"mon":{"open":true,"start":"00:00","end":"23:59"},"tue":{"open":true,"start":"00:00","end":"23:59"},"wed":{"open":true,"start":"00:00","end":"23:59"},"thu":{"open":true,"start":"00:00","end":"23:59"},"fri":{"open":true,"start":"00:00","end":"23:59"},"sat":{"open":true,"start":"00:00","end":"23:59"},"sun":{"open":true,"start":"00:00","end":"23:59"}}'::jsonb,
  'Jaipur', 'Rajasthan', '302003', true, true
),
(
  'jp4',
  'Apollo Pharmacy - MI Road',
  'अपोलो फार्मेसी - एमआई रोड',
  'apollo-pharmacy-mi-road',
  'MI Road, Near Panch Batti, Jaipur', 'एमआई रोड, पांच बत्ती के पास, जयपुर',
  26.9175, 75.8120,
  4.7, 430, true, true, 15, 10,
  'Panch Batti, Mirza Ismail Road, Jaipur - 302001',
  '+91-98290-40002', '+91-141-2375500', 'RJ-JPR-2023-4421', '08AAACA5521K1Z9',
  false, 6, 40, 399,
  '{"mon":{"open":true,"start":"08:00","end":"22:30"},"tue":{"open":true,"start":"08:00","end":"22:30"},"wed":{"open":true,"start":"08:00","end":"22:30"},"thu":{"open":true,"start":"08:00","end":"22:30"},"fri":{"open":true,"start":"08:00","end":"22:30"},"sat":{"open":true,"start":"08:00","end":"22:30"},"sun":{"open":true,"start":"09:00","end":"21:00"}}'::jsonb,
  'Jaipur', 'Rajasthan', '302001', true, true
);

-- 7. Seed 2 Diagnostic Lab & Scan Centres
INSERT INTO public.lab_centres (
  id, name, slug, area, area_hi, address, phone, secondary_phone,
  distance_km, rating, reviews, home_collection, next_slot, offers, price_factor,
  nabl_certified, is_24x7, home_collection_radius_km, home_collection_fee, free_home_collection_above,
  home_collection_slots, report_turnaround_hrs, discount_percentage, commission_percentage,
  weekly_schedule, latitude, longitude, city, state, pincode, is_active, is_featured
) VALUES
(
  'jp-c1',
  'Dr. Lal PathLabs - Surajpole',
  'dr-lal-pathlabs-surajpole',
  'Surajpole Gate, Mohanbari, Jaipur', 'सूरजपोल गेट, मोहनबाड़ी, जयपुर',
  'Shop 8, Near Surajpole Gate, Jaipur - 302003',
  '+91-98290-50001', '+91-141-2607788',
  0.4, 4.8, 680, true, 'Today, 07:00 AM - 11:00 AM', ARRAY['lab', 'package'], 1.0,
  true, false, 10, 0, 499,
  '6:30 AM - 11:00 AM, 4:00 PM - 7:30 PM', 12, 20, 12,
  '{"mon":{"open":true,"start":"06:30","end":"20:00"},"tue":{"open":true,"start":"06:30","end":"20:00"},"wed":{"open":true,"start":"06:30","end":"20:00"},"thu":{"open":true,"start":"06:30","end":"20:00"},"fri":{"open":true,"start":"06:30","end":"20:00"},"sat":{"open":true,"start":"06:30","end":"20:00"},"sun":{"open":true,"start":"07:00","end":"14:00"}}'::jsonb,
  26.9212, 75.8455, 'Jaipur', 'Rajasthan', '302003', true, true
),
(
  'jp-c2',
  'Metropolis Healthcare & Scans - C-Scheme',
  'metropolis-c-scheme',
  'Ashok Marg, C-Scheme, Jaipur', 'अशोक मार्ग, सी-स्कीम, जयपुर',
  'Plot 24, Ashok Marg, C-Scheme, Jaipur - 302001',
  '+91-98290-50002', '+91-141-2379900',
  3.5, 4.9, 540, true, 'Today, 08:00 AM - 12:00 PM', ARRAY['lab', 'scan', 'package'], 1.0,
  true, true, 12, 50, 599,
  '6:30 AM - 11:30 AM, 4:00 PM - 8:00 PM', 10, 20, 12,
  '{"mon":{"open":true,"start":"00:00","end":"23:59"},"tue":{"open":true,"start":"00:00","end":"23:59"},"wed":{"open":true,"start":"00:00","end":"23:59"},"thu":{"open":true,"start":"00:00","end":"23:59"},"fri":{"open":true,"start":"00:00","end":"23:59"},"sat":{"open":true,"start":"00:00","end":"23:59"},"sun":{"open":true,"start":"00:00","end":"23:59"}}'::jsonb,
  26.9110, 75.8020, 'Jaipur', 'Rajasthan', '302001', true, true
);
