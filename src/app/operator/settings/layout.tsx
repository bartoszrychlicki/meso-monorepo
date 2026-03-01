'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/operator/settings', label: 'PIN' },
  { href: '/operator/settings/location', label: 'Lokalizacja' },
  { href: '/operator/settings/loyalty', label: 'Lojalność' },
  { href: '/operator/settings/banners', label: 'Banery' },
]

export default function OperatorSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div>
      {/* Horizontal scrollable tabs */}
      <div className="container mx-auto px-4 pt-6">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-meso-red-500 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div>{children}</div>
    </div>
  )
}
