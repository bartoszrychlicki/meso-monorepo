import {
  Soup,
  Utensils,
  Drumstick,
  Plus,
  GlassWater,
  UtensilsCrossed,
  Salad,
  Coffee,
  IceCreamCone,
  Beef,
  Fish,
  type LucideProps,
} from 'lucide-react'
import type { FC } from 'react'

const iconMap: Record<string, FC<LucideProps>> = {
  Soup,
  Utensils,
  Drumstick,
  Plus,
  GlassWater,
  UtensilsCrossed,
  Salad,
  Coffee,
  IceCreamCone,
  Beef,
  Fish,
}

interface CategoryIconProps extends LucideProps {
  name?: string
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  if (!name) return null

  const Icon = iconMap[name]

  // If no matching Lucide icon, treat as emoji/text
  if (!Icon) {
    if (process.env.NODE_ENV === 'development' && name.match(/^[A-Z]/)) {
      console.warn(`[CategoryIcon] Unknown Lucide icon: "${name}". Add it to iconMap.`)
    }
    return <span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{name}</span>
  }

  return <Icon {...props} />
}
