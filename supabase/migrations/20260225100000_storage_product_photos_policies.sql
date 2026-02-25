-- Enable public read access to PRODUCT-PHOTOS bucket
CREATE POLICY "Public read PRODUCT-PHOTOS"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'PRODUCT-PHOTOS');

-- Allow authenticated users to upload to PRODUCT-PHOTOS
CREATE POLICY "Auth upload PRODUCT-PHOTOS"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'PRODUCT-PHOTOS');

-- Allow authenticated users to delete from PRODUCT-PHOTOS
CREATE POLICY "Auth delete PRODUCT-PHOTOS"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'PRODUCT-PHOTOS');
