-- Fix bucket_id: actual bucket name is 'product-photos' (lowercase), not 'PRODUCT-PHOTOS'

-- Drop old policies with wrong bucket_id
DROP POLICY IF EXISTS "Public read PRODUCT-PHOTOS" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload PRODUCT-PHOTOS" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete PRODUCT-PHOTOS" ON storage.objects;

-- Recreate with correct bucket_id
CREATE POLICY "Public read product-photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-photos');

CREATE POLICY "Auth upload product-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Auth delete product-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-photos');
