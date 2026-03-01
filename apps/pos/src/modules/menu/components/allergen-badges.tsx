'use client';

import { Allergen } from '@/types/enums';
import { ALLERGEN_LABELS } from '@/lib/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ALLERGEN_COLORS: Record<Allergen, string> = {
  [Allergen.GLUTEN]: 'bg-amber-500',
  [Allergen.CRUSTACEANS]: 'bg-red-500',
  [Allergen.EGGS]: 'bg-yellow-400',
  [Allergen.FISH]: 'bg-blue-500',
  [Allergen.PEANUTS]: 'bg-orange-600',
  [Allergen.SOYBEANS]: 'bg-green-600',
  [Allergen.MILK]: 'bg-sky-300',
  [Allergen.NUTS]: 'bg-amber-700',
  [Allergen.CELERY]: 'bg-lime-500',
  [Allergen.MUSTARD]: 'bg-yellow-600',
  [Allergen.SESAME]: 'bg-stone-400',
  [Allergen.SULPHITES]: 'bg-purple-500',
  [Allergen.LUPIN]: 'bg-indigo-400',
  [Allergen.MOLLUSCS]: 'bg-teal-500',
};

interface AllergenBadgesProps {
  allergens: Allergen[];
  size?: 'sm' | 'md';
}

export function AllergenBadges({ allergens, size = 'sm' }: AllergenBadgesProps) {
  if (allergens.length === 0) return null;

  const dotSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1" data-component="allergen-badges">
        {allergens.map((allergen) => (
          <Tooltip key={allergen}>
            <TooltipTrigger asChild>
              <span
                className={`${dotSize} inline-block rounded-full ${ALLERGEN_COLORS[allergen]} ring-1 ring-white/20 cursor-help`}
                data-allergen={allergen}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{ALLERGEN_LABELS[allergen]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
