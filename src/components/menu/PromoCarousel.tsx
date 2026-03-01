'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from '@/lib/utils'

interface PromoBanner {
  id: string
  image_url: string
  title: string
  subtitle: string | null
  href: string | null
}

// Fallback banners used only when no DB banners are provided
const FALLBACK_BANNERS: PromoBanner[] = [
  {
    id: 'promo-ramen',
    image_url: '/images/promos/promo-ramen.jpg',
    title: 'Nowy Spicy Miso 🔥',
    subtitle: 'Sprawdź nasz najostrzejszy ramen w historii!',
    href: '/',
  },
  {
    id: 'promo-delivery',
    image_url: '/images/promos/promo-delivery.jpg',
    title: 'Darmowa dostawa',
    subtitle: 'Przy zamówieniu powyżej 60 zł – tylko dziś!',
    href: '/',
  },
  {
    id: 'promo-gyoza',
    image_url: '/images/promos/promo-gyoza.jpg',
    title: 'Gyoza Festival 🥟',
    subtitle: 'Zestaw 12 szt. w cenie 8 – weekendowa oferta',
    href: '/',
  },
]

interface PromoCarouselProps {
  className?: string
  banners?: PromoBanner[]
}

export function PromoCarousel({ className, banners }: PromoCarouselProps) {
  const displayBanners = banners && banners.length > 0 ? banners : FALLBACK_BANNERS
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [activeIndex, setActiveIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setActiveIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect() // eslint-disable-line react-hooks/set-state-in-effect
    emblaApi.on('select', onSelect)

    // Autoplay
    const interval = setInterval(() => emblaApi.scrollNext(), 5000)
    return () => {
      clearInterval(interval)
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className={cn('mb-6', className)}>
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {displayBanners.map((banner) => (
            <div key={banner.id} className="min-w-0 shrink-0 grow-0 basis-full">
              <Link href={banner.href || '#'} className="block">
                <div className="relative aspect-[2.2/1] lg:aspect-[3.5/1] overflow-hidden rounded-2xl neon-border">
                  <Image
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 800px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 lg:bottom-6 lg:left-6">
                    <h3 className="font-display text-lg lg:text-xl font-bold text-foreground neon-text">
                      {banner.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {banner.subtitle}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {displayBanners.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === activeIndex
                ? 'w-6 bg-primary neon-glow-sm'
                : 'w-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  )
}
