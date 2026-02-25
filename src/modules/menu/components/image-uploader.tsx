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

      {/* Drop zone - only show when not at max */}
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
