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

  if (listError) {
    console.error('[Storage] List failed for cleanup:', listError.message);
    return;
  }
  if (!files || files.length === 0) return;

  const paths = files.map((f: { name: string }) => `${productId}/${f.name}`);
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
