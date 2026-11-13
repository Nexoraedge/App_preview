-- Create public 'prescriptions' bucket for Lab & Pharmacy prescription slip uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions',
  'prescriptions',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Allow anyone (anon + authenticated) to upload prescription slips to 'prescriptions' bucket
DROP POLICY IF EXISTS "Allow public prescription uploads" ON storage.objects;
CREATE POLICY "Allow public prescription uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'prescriptions');

-- Allow public read access to prescription slips
DROP POLICY IF EXISTS "Allow public prescription reads" ON storage.objects;
CREATE POLICY "Allow public prescription reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prescriptions');

-- Allow updates/overwrites if needed
DROP POLICY IF EXISTS "Allow public prescription updates" ON storage.objects;
CREATE POLICY "Allow public prescription updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'prescriptions');

