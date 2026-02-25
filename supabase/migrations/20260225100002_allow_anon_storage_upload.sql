-- Allow anon role to upload/delete (auth not yet implemented in the app)
-- Will be tightened to authenticated-only when Supabase Auth is added

DROP POLICY IF EXISTS "Auth upload product-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete product-photos" ON storage.objects;

CREATE POLICY "Upload product-photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Delete product-photos"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'product-photos');
