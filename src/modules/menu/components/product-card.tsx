'use client';

import { Product } from '@/types/menu';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Clock, Star, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AllergenBadges } from './allergen-badges';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  foodCost?: { totalCost: number; costPercentage: number } | null;
  onToggleAvailability: (id: string) => void;
  onClick: (id: string) => void;
}

export function ProductCard({
  product,
  categoryName,
  foodCost,
  onToggleAvailability,
  onClick,
}: ProductCardProps) {
  const hasVariants = product.variants.length > 0;

  // Warianty przechowują modyfikacje ceny (+/- PLN), nie ceny absolutne
  const priceDisplay = hasVariants
    ? (() => {
        const modifiers = product.variants.map((v) => v.price);
        const minMod = Math.min(...modifiers);
        const maxMod = Math.max(...modifiers);

        if (minMod === maxMod && minMod === 0) {
          return formatCurrency(product.price);
        }

        const formatMod = (mod: number) => (mod >= 0 ? `+${mod.toFixed(2)}` : mod.toFixed(2));
        return `${formatCurrency(product.price)} (${formatMod(minMod)} do ${formatMod(maxMod)} PLN)`;
      })()
    : formatCurrency(product.price);

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
        !product.is_available && 'opacity-60'
      )}
      data-component="product-card"
      data-id={product.id}
    >
      {/* Gradient placeholder image */}
      <button
        onClick={() => onClick(product.id)}
        className="relative h-32 w-full cursor-pointer"
        data-action="view-product"
        data-id={product.id}
      >
        <div
          className={cn(
            'h-full w-full bg-gradient-to-br',
            product.color || 'from-gray-400 to-gray-600'
          )}
        />
        <div className="absolute inset-0 bg-black/10" />

        {/* Badges overlay */}
        <div className="absolute left-2 top-2 flex gap-1">
          {product.is_featured && (
            <Badge className="bg-yellow-500/90 text-white shadow-sm hover:bg-yellow-500/90">
              <Star className="mr-0.5 h-3 w-3" />
              Hit
            </Badge>
          )}
          {product.type === 'combo' && (
            <Badge className="bg-violet-500/90 text-white shadow-sm hover:bg-violet-500/90">
              Zestaw
            </Badge>
          )}
        </div>

        {/* Availability indicator */}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-medium text-white">
              Niedostepny
            </span>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex items-start justify-between gap-2">
          <button
            onClick={() => onClick(product.id)}
            className="text-left transition-colors hover:text-primary"
            data-action="view-product"
          >
            <h3 className="font-semibold leading-tight text-sm">{product.name}</h3>
          </button>
        </div>

        {categoryName && (
          <span className="mb-1.5 text-xs text-muted-foreground">{categoryName}</span>
        )}

        {product.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Allergens */}
        <div className="mb-2">
          <AllergenBadges allergens={product.allergens} />
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t">
          <div>
            <span className="text-sm font-bold text-foreground" data-field="price">
              {priceDisplay}
            </span>
            {foodCost && foodCost.totalCost > 0 && (
              <span
                className={cn(
                  'ml-2 text-xs font-medium',
                  foodCost.costPercentage < 25
                    ? 'text-green-600'
                    : foodCost.costPercentage < 35
                    ? 'text-yellow-600'
                    : 'text-red-600'
                )}
                data-field="food-cost"
              >
                FC {foodCost.costPercentage.toFixed(0)}%
              </span>
            )}
            {product.preparation_time_minutes != null && product.preparation_time_minutes > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {product.preparation_time_minutes} min
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {product.is_available ? (
              <Eye className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Switch
              checked={product.is_available}
              onCheckedChange={() => onToggleAvailability(product.id)}
              size="sm"
              data-action="toggle-availability"
              data-id={product.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
