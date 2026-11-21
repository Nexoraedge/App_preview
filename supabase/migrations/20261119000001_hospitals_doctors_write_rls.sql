-- Allow Admin & Partner Portal writes and full reads on hospitals, hospital_branches, and doctors

DROP POLICY IF EXISTS "Public read all hospitals for admin" ON public.hospitals;
CREATE POLICY "Public read all hospitals for admin"
  ON public.hospitals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert hospitals" ON public.hospitals;
CREATE POLICY "Allow insert hospitals"
  ON public.hospitals FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update hospitals" ON public.hospitals;
CREATE POLICY "Allow update hospitals"
  ON public.hospitals FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert hospital_branches" ON public.hospital_branches;
CREATE POLICY "Allow insert hospital_branches"
  ON public.hospital_branches FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update hospital_branches" ON public.hospital_branches;
CREATE POLICY "Allow update hospital_branches"
  ON public.hospital_branches FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read all doctors for admin" ON public.doctors;
CREATE POLICY "Public read all doctors for admin"
  ON public.doctors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert doctors" ON public.doctors;
CREATE POLICY "Allow insert doctors"
  ON public.doctors FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update doctors" ON public.doctors;
CREATE POLICY "Allow update doctors"
  ON public.doctors FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete doctors" ON public.doctors;
CREATE POLICY "Allow delete doctors"
  ON public.doctors FOR DELETE
  USING (true);
