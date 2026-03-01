# Product Photo Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace URL-based image input with direct file upload to Supabase Storage bucket `PRODUCT-PHOTOS`.

**Architecture:** Client-side upload via Supabase JS SDK to a public bucket. A storage helper module handles upload/delete/URL generation. A new `ImageUploader` component replaces the URL input in the product form step 2. The `ProductImage` type gains a `storage_path` field to enable deletion from the bucket.

**Tech Stack:** Supabase Storage (JS SDK `@supabase/ssr`), React drag & drop (native HTML5), shadcn/ui (Progress, Button, Badge), Tailwind CSS, Zod.

---

### Task 1: Set up Supabase Storage RLS policies

**Files:**
- Create: `supabase/migrations/20260225100000_storage_product_photos_policies.sql`

**Step 1: Create the migration file**

```sql
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
```

**Step 2: Push migration to remote Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Verify bucket exists and policies work**

Run the Supabase dashboard or use the JS client to confirm `PRODUCT-PHOTOS` bucket is accessible.

**Step 4: Commit**

```bash
git add supabase/migrations/20260225100000_storage_product_photos_policies.sql
git commit -m "feat(storage): add RLS policies for PRODUCT-PHOTOS bucket"
```

---

### Task 2: Add `storage_path` to ProductImage type and update schema validation

**Files:**
- Modify: `src/types/menu.ts:62-69` (ProductImage interface)
- Modify: `src/schemas/menu.ts:57-66` (ProductImageSchema)
- Modify: `src/schemas/menu.ts:82` (images min validation)

**Step 1: Add `storage_path` to ProductImage interface**

In `src/types/menu.ts`, update the `ProductImage` interface:

```typescript
export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  width: number;
  height: number;
  sort_order: number;
  storage_path?: string; // Path in Supabase Storage for deletion
}
```

**Step 2: Update ProductImageSchema with `storage_path` and relax images min**

In `src/schemas/menu.ts`, update:

```typescript
export const ProductImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().url('Nieprawidlowy URL zdjecia'),
  alt: z.string().optional(),
  width: z.number().int().min(MIN_IMAGE_WIDTH, `Minimalna szerokosc zdjecia to ${MIN_IMAGE_WIDTH}px`),
  height: z.number().int().min(MIN_IMAGE_HEIGHT, `Minimalna wysokosc zdjecia to ${MIN_IMAGE_HEIGHT}px`),
  sort_order: z.number().int().default(0),
  storage_path: z.string().optional(),
});
```

Change `images` validation in `CreateProductSchema` from:
```typescript
images: z.array(ProductImageSchema).min(1, 'Wymagane jest co najmniej 1 zdjecie').max(3, 'Maksymalnie 3 zdjecia'),
```
to:
```typescript
images: z.array(ProductImageSchema).max(3, 'Maksymalnie 3 zdjecia').default([]),
```

**Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/types/menu.ts src/schemas/menu.ts
git commit -m "feat(menu): add storage_path to ProductImage, make images optional"
```

---

### Task 3: Create Supabase Storage helper

**Files:**
- Create: `src/lib/supabase/storage.ts`

**Step 1: Create the storage helper module**

```typescript
import { supabase } from './client';

const BUCKET = 'PRODUCT-PHOTOS';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadResult {
  url: string;
  storage_path: string;
}

/**
 * Upload a product image to Supabase Storage.
 * @param productId - UUID used as folder name in the bucket
 * @param file - The image file to upload
 * @returns Public URL and storage path for later deletion
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Nieobslugiwany format pliku. Dozwolone: ${ALLOWED_TYPES.map((t) => t.split('/')[1].toUpperCase()).join(', ')}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Plik jest za duzy (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksymalny rozmiar to 5MB.`
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${productId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Blad uploadu: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    storage_path: storagePath,
  };
}

/**
 * Delete a product image from Supabase Storage.
 * @param storagePath - The path returned from uploadProductImage
 */
export async function deleteProductImage(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error('[Storage] Delete failed:', error.message);
  }
}

/**
 * Delete all images for a product (used when deleting a product).
 * @param productId - The product UUID (folder name)
 */
export async function deleteAllProductImages(productId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(productId);

  if (listError || !files || files.length === 0) return;

  const paths = files.map((f) => `${productId}/${f.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    console.error('[Storage] Bulk delete failed:', error.message);
  }
}

/**
 * Read image dimensions from a File object.
 */
export function getImageDimensionsFromFile(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Nie udalo sie odczytac wymiarow zdjecia'));
    };
    img.src = url;
  });
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/supabase/storage.ts
git commit -m "feat(storage): add upload/delete helpers for PRODUCT-PHOTOS bucket"
```

---

### Task 4: Create ImageUploader component

**Files:**
- Create: `src/modules/menu/components/image-uploader.tsx`

**Step 1: Create the ImageUploader component**

This component provides:
- Drag & drop zone with click-to-browse fallback
- Client-side validation (format, size, dimensions)
- Upload progress indicator
- Thumbnail list with reorder (up/down) and delete buttons
- Max 3 images constraint
- "Glowne" badge on first image

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { ProductImage } from '@/types/menu';
import { MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT } from '@/schemas/menu';
import {
  uploadProductImage,
  deleteProductImage,
  getImageDimensionsFromFile,
} from '@/lib/supabase/storage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  GripVertical,
  AlertCircle,
  ImageIcon,
} from 'lucide-react';

const MAX_IMAGES = 3;

interface ImageUploaderProps {
  productId: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

export function ImageUploader({ productId, images, onChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (images.length + fileArray.length > MAX_IMAGES) {
        setError(`Maksymalnie ${MAX_IMAGES} zdjec. Mozesz dodac jeszcze ${MAX_IMAGES - images.length}.`);
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      const newImages: ProductImage[] = [];
      const totalFiles = fileArray.length;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        try {
          // Validate dimensions
          const dimensions = await getImageDimensionsFromFile(file);

          if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
            setError(
              `${file.name}: za male (${dimensions.width}x${dimensions.height}px). Min. ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px.`
            );
            continue;
          }

          // Upload to Supabase Storage
          const result = await uploadProductImage(productId, file);

          newImages.push({
            id: crypto.randomUUID(),
            url: result.url,
            alt: file.name.replace(/\.[^.]+$/, ''),
            width: dimensions.width,
            height: dimensions.height,
            sort_order: images.length + newImages.length,
            storage_path: result.storage_path,
          });

          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        } catch (err) {
          setError(err instanceof Error ? err.message : `Blad uploadu ${file.name}`);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }

      setIsUploading(false);
      setUploadProgress(0);
    },
    [images, onChange, productId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    async (imageId: string) => {
      const img = images.find((i) => i.id === imageId);
      if (img?.storage_path) {
        await deleteProductImage(img.storage_path);
      }
      const updated = images
        .filter((i) => i.id !== imageId)
        .map((i, idx) => ({ ...i, sort_order: idx }));
      onChange(updated);
    },
    [images, onChange]
  );

  const handleMove = useCallback(
    (imageId: string, direction: 'up' | 'down') => {
      const idx = images.findIndex((i) => i.id === imageId);
      if (idx < 0) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= images.length) return;

      const updated = [...images];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      onChange(updated.map((i, j) => ({ ...i, sort_order: j })));
    },
    [images, onChange]
  );

  return (
    <div className="space-y-4" data-component="image-uploader">
      <div>
        <h3 className="font-medium">Zdjecia produktu</h3>
        <p className="text-sm text-muted-foreground">
          Dodaj do {MAX_IMAGES} zdjec (JPEG, PNG, WebP, max 5MB, min. {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}px).
          {images.length > 0 && ' Pierwsze zdjecie bedzie glownym.'}
        </p>
      </div>

      {/* Drop zone */}
      {images.length < MAX_IMAGES && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
            isUploading && 'pointer-events-none opacity-60'
          )}
          data-action="drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            data-field="image-file-input"
          />
          {isUploading ? (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 animate-pulse" />
                Przesylanie...
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                Przeciagnij zdjecia lub kliknij, aby wybrac
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP &middot; max 5MB &middot; min {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}px
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Image list */}
      {images.length === 0 && !isUploading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Brak zdjec. Zdjecia sa opcjonalne.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                idx === 0 && 'border-primary/30 bg-primary/5'
              )}
              data-id={img.id}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(img.id, 'up')}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  data-action="move-image-up"
                >
                  <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                </button>
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => handleMove(img.id, 'down')}
                  disabled={idx === images.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  data-action="move-image-down"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </button>
              </div>

              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt || 'Zdjecie produktu'}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <Badge variant="default" className="text-xs">Glowne</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {img.width}x{img.height}px
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground" title={img.url}>
                  {img.storage_path || img.url}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(img.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                data-action="remove-image"
                data-id={img.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Image count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{images.length}/{MAX_IMAGES} zdjec</span>
      </div>
    </div>
  );
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/modules/menu/components/image-uploader.tsx
git commit -m "feat(menu): add ImageUploader component with drag & drop"
```

---

### Task 5: Integrate ImageUploader into ProductForm

**Files:**
- Modify: `src/modules/menu/components/product-form.tsx`

**Step 1: Add productId state and import ImageUploader**

At the top of `product-form.tsx`, add import:

```typescript
import { ImageUploader } from './image-uploader';
```

Inside the component, add a `productId` state (after `step` state, around line 80):

```typescript
const [productId] = useState(() => product?.id ?? crypto.randomUUID());
```

**Step 2: Replace step 2 (Images) content**

Replace the entire `{step === 1 && (...)}` block (lines 568-718) with:

```tsx
{step === 1 && (
  <ImageUploader
    productId={productId}
    images={images}
    onChange={setImages}
  />
)}
```

**Step 3: Remove unused image state and functions**

Remove these lines that are no longer needed:
- `const [imageUrl, setImageUrl] = useState('');` (line 95)
- `const [imageError, setImageError] = useState<string | null>(null);` (line 96)
- `const [isLoadingImage, setIsLoadingImage] = useState(false);` (line 97)
- The entire `validateAndAddImage` callback (lines 143-199)
- The `removeImage` function (lines 201-207)
- The `moveImage` function (lines 209-220)
- The `getImageDimensions` helper function at the bottom of the file (lines 990-998)

**Step 4: Update `canGoNext` to allow step 2 without images**

Change line 291 from:
```typescript
if (step === 1) return images.length >= 1;
```
to:
```typescript
if (step === 1) return true;
```

**Step 5: Update submit button disabled condition**

Change line 978 from:
```typescript
disabled={isSubmitting || !name || !categoryId || price <= 0 || images.length < 1}
```
to:
```typescript
disabled={isSubmitting || !name || !categoryId || price <= 0}
```

**Step 6: Include `productId` in submitted data (for new products)**

In the `handleSubmit` function, add `id: productId` to ensure new products use the same UUID that was used for the image folder. Update the `onSubmit` call (around line 287):

The `handleSubmit` function builds a data object without `id`. But the product needs to be created with the same `productId` used for upload. Add `id` to the type by changing the `onSubmit` prop type and passing it through:

Actually, simpler approach: pass `productId` as part of the data object. Update `handleSubmit`:

At the end of the `data` object construction, before `onSubmit(data)`, add:

```typescript
// Use the same ID that was used for image upload folder
(data as Product & { id: string }).id = productId;
```

Wait — this is cleaner: update the `onSubmit` type to optionally accept `id`:

Change the `ProductFormProps` interface:
```typescript
onSubmit: (data: Omit<Product, 'created_at' | 'updated_at'>) => void;
```

And add `id: productId` to the data object in `handleSubmit`:
```typescript
const data = {
  id: productId,
  name,
  // ... rest of fields
};
```

**Step 7: Remove unused imports**

Remove from lucide-react imports: `Link`, `ExternalLink` (if only used in image URL input — check first; `ExternalLink` is still used in recipe picker, keep it). Remove `Link` only.

Remove `Image from 'next/image'` if unused (check — it's imported as `ImageIcon` alias, which is from lucide. The `next/image` `Image` might be unused).

**Step 8: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 9: Commit**

```bash
git add src/modules/menu/components/product-form.tsx
git commit -m "feat(menu): replace URL image input with ImageUploader in product form"
```

---

### Task 6: Clean up images on product delete

**Files:**
- Modify: `src/modules/menu/store.ts`

**Step 1: Import deleteAllProductImages**

Add at the top of `store.ts`:

```typescript
import { deleteAllProductImages } from '@/lib/supabase/storage';
```

**Step 2: Update deleteProduct to clean up storage**

Change the `deleteProduct` method from:

```typescript
deleteProduct: async (id) => {
  await productsRepository.delete(id);
  set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  }));
},
```

to:

```typescript
deleteProduct: async (id) => {
  await deleteAllProductImages(id);
  await productsRepository.delete(id);
  set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  }));
},
```

**Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/modules/menu/store.ts
git commit -m "feat(menu): clean up storage images on product delete"
```

---

### Task 7: Build verification and final commit

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Manual smoke test**

Start dev server (`npm run dev`) and verify:
1. Navigate to `/menu/new`
2. Fill in basic info (step 1), proceed to step 2
3. Drag & drop or click to upload an image
4. Image appears with thumbnail, dimensions, and "Glowne" badge
5. Upload a second image — first keeps "Glowne" badge
6. Reorder images with up/down buttons
7. Delete an image
8. Proceed through remaining steps and save the product
9. Edit the product — images should load from the database
10. Delete the product — images should be removed from storage

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(menu): address smoke test issues for product image upload"
```
