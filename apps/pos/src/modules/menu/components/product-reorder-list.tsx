'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/menu';
import { GripVertical, Loader2, ShoppingCart } from 'lucide-react';

const PRODUCT_PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';

interface ProductReorderListProps {
  products: Product[];
  isSaving: boolean;
  onReorder: (productIds: string[]) => Promise<void>;
  onClose: () => void;
}

interface SortableProductRowProps {
  product: Product;
  position: number;
  disabled: boolean;
}

function SortableProductRow({ product, position, disabled }: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const mainImage = product.images?.[0] ?? null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm',
        isDragging && 'z-10 shadow-lg ring-2 ring-primary/20'
      )}
      data-component="product-reorder-row"
      data-id={product.id}
    >
      <button
        type="button"
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors',
          !disabled && 'cursor-grab active:cursor-grabbing hover:text-foreground',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-label={`Przesun produkt ${product.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage.url}
            alt={mainImage.alt || product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={PRODUCT_PLACEHOLDER_IMAGE}
            alt=""
            className="h-full w-full object-contain opacity-40"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            #{position + 1}
          </span>
          <h3 className="truncate font-medium">{product.name}</h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={product.is_available ? 'default' : 'secondary'}>
            <ShoppingCart className="mr-1 h-3 w-3" />
            {product.is_available ? 'Dostepny' : 'Niedostepny'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function ProductReorderList({
  products,
  isSaving,
  onReorder,
  onClose,
}: ProductReorderListProps) {
  const [orderedProducts, setOrderedProducts] = useState(products);
  const productIds = useMemo(
    () => orderedProducts.map((product) => product.id),
    [orderedProducts]
  );

  useEffect(() => {
    setOrderedProducts(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isSaving) {
      return;
    }

    const oldIndex = orderedProducts.findIndex((product) => product.id === active.id);
    const newIndex = orderedProducts.findIndex((product) => product.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextOrderedProducts = arrayMove(orderedProducts, oldIndex, newIndex);
    setOrderedProducts(nextOrderedProducts);

    try {
      await onReorder(nextOrderedProducts.map((product) => product.id));
    } catch {
      setOrderedProducts(products);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card/50 p-4" data-component="product-reorder-list">
      <div className="flex flex-col gap-3 rounded-xl border bg-background/80 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold">Uloz kolejnosc produktow</h3>
          <p className="text-sm text-muted-foreground">
            Przeciagnij produkty, aby ustawic ich kolejnosc w wybranej kategorii.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie...
            </span>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Zakoncz ukladanie
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orderedProducts.map((product, index) => (
              <SortableProductRow
                key={product.id}
                product={product}
                position={index}
                disabled={isSaving}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
