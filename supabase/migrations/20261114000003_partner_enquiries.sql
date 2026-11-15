-- Partner Enquiries table for incoming Hospital, Solo Doctor, Lab & Pharmacy onboarding requests
CREATE TABLE IF NOT EXISTS public.partner_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type text NOT NULL CHECK (partner_type IN ('HOSPITAL', 'DOCTOR', 'LAB', 'PHARMACY')),
  organization_name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  secondary_phone text,
  email text,
  city text NOT NULL DEFAULT 'Jaipur',
  area text,
  address text,
  specialty_or_services text,
  proposed_discount_pct integer DEFAULT 15,
  source text NOT NULL DEFAULT 'WEBSITE',
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  converted_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_enquiries ENABLE ROW LEVEL SECURITY;

-- Allow public website/app "Join Us" form submissions
DROP POLICY IF EXISTS "Allow public insert partner_enquiries" ON public.partner_enquiries;
CREATE POLICY "Allow public insert partner_enquiries"
  ON public.partner_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated/admin read & manage
DROP POLICY IF EXISTS "Allow authenticated read partner_enquiries" ON public.partner_enquiries;
CREATE POLICY "Allow authenticated read partner_enquiries"
  ON public.partner_enquiries
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update partner_enquiries" ON public.partner_enquiries;
CREATE POLICY "Allow authenticated update partner_enquiries"
  ON public.partner_enquiries
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete partner_enquiries" ON public.partner_enquiries;
CREATE POLICY "Allow authenticated delete partner_enquiries"
  ON public.partner_enquiries
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed initial realistic Jaipur partner enquiries if empty
INSERT INTO public.partner_enquiries (
  partner_type,
  organization_name,
  contact_person,
  phone,
  email,
  city,
  area,
  address,
  specialty_or_services,
  proposed_discount_pct,
  source,
  status,
  notes
)
SELECT * FROM (
  VALUES
    (
      'HOSPITAL',
      'Apex Multispeciality Hospital',
      'Dr. Vikramaditya Rathore',
      '+91 98290 44112',
      'partnerships@apexjaipur.in',
      'Jaipur',
      'Malviya Nagar',
      'SP-4 & 6, Malviya Industrial Area, Malviya Nagar, Jaipur',
      'Cardiology, Orthopedics, Urology, 24x7 Trauma & ICU (120 Beds)',
      20,
      'WEBSITE',
      'NEW',
      'Interested in Adityam OPD & IPD cashless partner network. Wants callback this week.'
    ),
    (
      'DOCTOR',
      'Dr. Ananya Saxena Skin & Laser Clinic',
      'Dr. Ananya Saxena',
      '+91 98291 77820',
      'dr.ananya@skinclinicjpr.com',
      'Jaipur',
      'Vaishali Nagar',
      'Plot 22, Amrapali Marg, Vaishali Nagar, Jaipur',
      'Dermatology & Cosmetology (MBBS, MD) · 9 yrs exp',
      15,
      'WEBSITE',
      'NEW',
      'Solo clinic practitioner looking to join Adityam OPD booking platform.'
    ),
    (
      'HOSPITAL',
      'Narayana Hrudayalaya Jaipur',
      'Rakesh Sharma (Operations Head)',
      '+91 141 712 2200',
      'ops.jaipur@narayanahealth.org',
      'Jaipur',
      'Pratap Nagar',
      'Sector 28, Kumbha Marg, Pratap Nagar, Jaipur',
      'Cardiac Sciences, Neurology, Nephrology, Oncology',
      15,
      'REFERRAL',
      'CONTACTED',
      'Initial call done. Reviewing MOU and 10% platform commission terms.'
    ),
    (
      'DOCTOR',
      'Khandelwal Ortho & Spine Care',
      'Dr. Rohit Khandelwal',
      '+91 99280 55431',
      'rohit.ortho@gmail.com',
      'Jaipur',
      'Mansarovar',
      'B-45, Madhyam Marg, Mansarovar, Jaipur',
      'Orthopedics & Joint Replacement (MBBS, MS Ortho)',
      20,
      'WHATSAPP',
      'UNDER_REVIEW',
      'Shared RMC registration and clinic timings. Ready for profile setup.'
    )
) AS seed(
  partner_type,
  organization_name,
  contact_person,
  phone,
  email,
  city,
  area,
  address,
  specialty_or_services,
  proposed_discount_pct,
  source,
  status,
  notes
)
WHERE NOT EXISTS (SELECT 1 FROM public.partner_enquiries LIMIT 1);
