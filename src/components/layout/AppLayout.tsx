'use client'

import { DesktopNav } from './DesktopNav'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  hideBottomNav?: boolean
  hideFooter?: boolean
  className?: string
}

export function AppLayout({
  children,
  hideBottomNav = false,
  hideFooter = false,
  className,
}: AppLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background text-foreground flex flex-col', className)}>
      <DesktopNav />

      <main className={cn(
        'flex-1 lg:pt-16',
        !hideBottomNav && 'pb-20 lg:pb-0'
      )}>
        {children}
      </main>

      {!hideFooter && <div className="hidden lg:block"><Footer /></div>}

      {!hideBottomNav && <MobileNav />}
    </div>
  )
}
