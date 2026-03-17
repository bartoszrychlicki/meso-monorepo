'use client';

import { useState } from 'react';
import { Product } from '@/types/menu';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Clock, Star, Eye, EyeOff, ImageIcon, ShoppingCart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AllergenBadges } from './allergen-badges';
import { getProductPromotionPricing } from '@/modules/menu/utils/pricing';

const PRODUCT_PLACEHOLDER_IMAGE = '/images/product-placeholder.svg';

interface ProductCardProps {
  product: Product;
  categoryName?: string;
  foodCost?: { totalCost: number; costPercentage: number } | null;
  onToggleAvailability: (id: string) => void;
  onToggleMenuVisibility: (id: string) => void;
  onClick: (id: string) => void;
}

export function ProductCard({
  product,
  categoryName,
  foodCost,
  onToggleAvailability,
  onToggleMenuVisibility,
  onClick,
}: ProductCardProps) {
  const hasVariants = product.variants.length > 0;
  const [imgError, setImgError] = useState(false);
  const promotionPricing = getProductPromotionPricing(product);
  const basePrice = promotionPricing.currentPrice;
  const baseOriginalPrice = promotionPricing.originalPrice;
  const isHiddenInMenu = product.is_hidden_in_menu === true;

  const mainImage = product.images?.length > 0 ? product.images[0] : null;
  const hasRealImage = mainImage && !imgError;
  const imageCount = product.images?.length ?? 0;

  // Warianty przechowują modyfikacje ceny (+/- PLN), nie ceny absolutne
  const priceDisplay = hasVariants
    ? (() => {
        const modifiers = product.variants.map((v) => v.price);
        const minMod = Math.min(...modifiers);
        const maxMod = Math.max(...modifiers);

        if (minMod === maxMod && minMod === 0) {
          return formatCurrency(basePrice);
        }

        const formatMod = (mod: number) => (mod >= 0 ? `+${mod.toFixed(2)}` : mod.toFixed(2));
        return `${formatCurrency(basePrice)} (${formatMod(minMod)} do ${formatMod(maxMod)} PLN)`;
      })()
    : formatCurrency(basePrice);

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
        !product.is_available && 'opacity-60',
        isHiddenInMenu && 'ring-1 ring-amber-300'
      )}
      data-component="product-card"
      data-id={product.id}
    >
      {/* Product image */}
      <button
        onClick={() => onClick(product.id)}
        className="relative h-40 w-full cursor-pointer"
        data-action="view-product"
        data-id={product.id}
      >
        {hasRealImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainImage.url}
            alt={mainImage.alt || product.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={cn(
              'h-full w-full bg-gradient-to-br',
              product.color || 'from-gray-400 to-gray-600'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PRODUCT_PLACEHOLDER_IMAGE}
              alt="Brak zdjecia"
              className="h-full w-full object-contain opacity-40"
            />
          </div>
        )}
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
          {promotionPricing.isPromotionActive && (
            <Badge className="bg-emerald-600/90 text-white shadow-sm hover:bg-emerald-600/90">
              {promotionPricing.promoLabel || 'Promocja'}
            </Badge>
          )}
          {isHiddenInMenu && (
            <Badge className="bg-amber-500/90 text-white shadow-sm hover:bg-amber-500/90">
              Ukryty
            </Badge>
          )}
        </div>

        {/* Image count badge */}
        {imageCount > 1 && (
          <div className="absolute right-2 top-2">
            <Badge variant="secondary" className="bg-black/50 text-white text-xs hover:bg-black/50">
              <ImageIcon className="mr-0.5 h-3 w-3" />
              {imageCount}
            </Badge>
          </div>
        )}

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
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <button
            onClick={() => onClick(product.id)}
            className="text-left transition-colors hover:text-primary"
            data-action="view-product"
          >
            <h3 className="font-semibold leading-tight text-base">{product.name}</h3>
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

        {isHiddenInMenu && (
          <p className="mb-2 text-xs font-medium text-amber-700">
            Ukryty w menu Delivery
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
            {!hasVariants && baseOriginalPrice != null && (
              <span className="ml-2 text-xs text-muted-foreground line-through">
                {formatCurrency(baseOriginalPrice)}
              </span>
            )}
            {foodCost && foodCost.totalCost > 0 && (
              <span
                className={cn(
                  'ml-2 text-sm font-semibold',
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

          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShoppingCart
                  className={cn(
                    'h-3.5 w-3.5',
                    product.is_available ? 'text-green-500' : 'text-muted-foreground'
                  )}
                />
                <span>Dostepny</span>
              </div>
              <Switch
                checked={product.is_available}
                onCheckedChange={() => onToggleAvailability(product.id)}
                size="sm"
                data-action="toggle-availability"
                data-id={product.id}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {isHiddenInMenu ? (
                  <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-green-500" />
                )}
                <span>W menu</span>
              </div>
              <Switch
                checked={!isHiddenInMenu}
                onCheckedChange={() => onToggleMenuVisibility(product.id)}
                size="sm"
                data-action="toggle-menu-visibility"
                data-id={product.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
