/**
 * Allergen Badges Component
 *
 * Displays allergen badges for a recipe.
 */

import { Allergen } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
import {
  getAllergenDisplayName,
  getAllergenIcon,
} from '../utils/recipe-calculator';

interface AllergenBadgesProps {
  allergens: Allergen[];
  size?: 'sm' | 'md' | 'lg';
}

export function AllergenBadges({ allergens, size = 'md' }: AllergenBadgesProps) {
  if (allergens.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Brak alergenów</span>
    );
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-wrap gap-2" data-component="allergen-badges">
      {allergens.map((allergen) => (
        <Badge
          key={allergen}
          variant="secondary"
          className={sizeClasses[size]}
          data-allergen={allergen}
        >
          <span className="mr-1">{getAllergenIcon(allergen)}</span>
          {getAllergenDisplayName(allergen)}
        </Badge>
      ))}
    </div>
  );
}
