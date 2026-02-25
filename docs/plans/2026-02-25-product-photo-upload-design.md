# Product Photo Upload — Design

## Goal

Replace URL-based image input with direct file upload to Supabase Storage bucket `PRODUCT-PHOTOS`.

## Decisions

- **Upload approach:** Direct client-side upload to Supabase Storage (no API route proxy)
- **Bucket:** `PRODUCT-PHOTOS`, set to public read, authenticated write/delete
- **File structure:** `PRODUCT-PHOTOS/{product-id}/{uuid}.{ext}`
- **New product flow:** Generate UUID client-side for folder name, use as product ID on create
- **Images optional:** `images.min(0)` — products can be saved without photos
- **URL field removed:** No more manual URL input, upload only
- **Max 3 images per product** (existing constraint kept)

## File Structure in Bucket

```
PRODUCT-PHOTOS/
  {product-id}/
    {uuid}.{ext}
```

Public URL pattern:
```
https://gyxcdrcdnnzjdmcrwbpr.supabase.co/storage/v1/object/public/PRODUCT-PHOTOS/{product-id}/{uuid}.webp
```

## Upload Flow

1. User clicks "Dodaj zdjecie" or drags file onto drop zone
2. Client-side validation: format (JPEG/PNG/WebP), size (max 5MB), dimensions (min 400x300)
3. Upload to Supabase Storage: `supabase.storage.from('PRODUCT-PHOTOS').upload(path, file)`
4. Get public URL
5. Add to `images[]` array with dimensions and sort_order
6. Display thumbnail with delete and reorder controls

## Deletion Flow

1. Remove file from bucket: `supabase.storage.from('PRODUCT-PHOTOS').remove([path])`
2. Remove from `images[]` array

## RLS Policies

```sql
CREATE POLICY "Public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'PRODUCT-PHOTOS');
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'PRODUCT-PHOTOS');
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'PRODUCT-PHOTOS');
```

## New Files

- `src/lib/supabase/storage.ts` — upload/delete/getPublicUrl helpers for PRODUCT-PHOTOS bucket
- `src/modules/menu/components/image-uploader.tsx` — drag & drop component with preview, progress, reorder

## Modified Files

- `src/modules/menu/components/product-form.tsx` — step 2: replace URL input with ImageUploader
- `src/schemas/menu.ts` — `images.min(0)` instead of `min(1)`
- `src/modules/menu/store.ts` — on deleteProduct, clean up images from bucket

## Out of Scope

- Image optimization/resize
- Orphaned file cleanup
- Image CDN / transformations
