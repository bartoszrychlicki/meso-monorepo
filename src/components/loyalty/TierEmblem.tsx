'use client'

import type { LoyaltyTier } from '@/types/customer'

interface TierEmblemProps {
  tier: LoyaltyTier
  className?: string
}

/**
 * Cyberpunk-styled SVG emblem for each loyalty tier.
 * Bronze = warm copper circuits, Silver = cold steel grid, Gold = radiant neon crown.
 */
export function TierEmblem({ tier, className = '' }: TierEmblemProps) {
  switch (tier) {
    case 'bronze':
      return <BronzeEmblem className={className} />
    case 'silver':
      return <SilverEmblem className={className} />
    case 'gold':
      return <GoldEmblem className={className} />
    default:
      return <BronzeEmblem className={className} />
  }
}

function BronzeEmblem({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="bronze-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#cd7f32" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#cd7f32" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bronze-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cd7f32" />
          <stop offset="100%" stopColor="#8b5e3c" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <circle cx="60" cy="60" r="58" fill="url(#bronze-glow)" />

      {/* Outer hexagon */}
      <polygon
        points="60,6 106,30 106,90 60,114 14,90 14,30"
        fill="none"
        stroke="url(#bronze-stroke)"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Inner hexagon */}
      <polygon
        points="60,22 92,40 92,80 60,98 28,80 28,40"
        fill="#cd7f32"
        fillOpacity="0.08"
        stroke="#cd7f32"
        strokeWidth="1"
        opacity="0.8"
      />

      {/* Circuit lines */}
      <line x1="60" y1="6" x2="60" y2="22" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />
      <line x1="106" y1="30" x2="92" y2="40" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />
      <line x1="106" y1="90" x2="92" y2="80" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="30" x2="28" y2="40" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="90" x2="28" y2="80" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />
      <line x1="60" y1="114" x2="60" y2="98" stroke="#cd7f32" strokeWidth="0.8" opacity="0.5" />

      {/* Circuit nodes */}
      <circle cx="60" cy="6" r="2" fill="#cd7f32" opacity="0.7" />
      <circle cx="106" cy="30" r="2" fill="#cd7f32" opacity="0.7" />
      <circle cx="106" cy="90" r="2" fill="#cd7f32" opacity="0.7" />
      <circle cx="14" cy="30" r="2" fill="#cd7f32" opacity="0.7" />
      <circle cx="14" cy="90" r="2" fill="#cd7f32" opacity="0.7" />
      <circle cx="60" cy="114" r="2" fill="#cd7f32" opacity="0.7" />

      {/* Ramen bowl icon — simplified */}
      <ellipse cx="60" cy="66" rx="18" ry="10" fill="none" stroke="#cd7f32" strokeWidth="1.5" opacity="0.9" />
      <path d="M44 62 Q52 56 60 62 Q68 56 76 62" stroke="#cd7f32" strokeWidth="1" fill="none" opacity="0.6" />

      {/* Steam wisps */}
      <path d="M52 52 Q50 47 52 42" stroke="#cd7f32" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M60 50 Q58 45 60 40" stroke="#cd7f32" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M68 52 Q70 47 68 42" stroke="#cd7f32" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function SilverEmblem({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="silver-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a0aec0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a0aec0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="silver-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="silver-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background glow */}
      <circle cx="60" cy="60" r="58" fill="url(#silver-glow)" />

      {/* Outer octagon */}
      <polygon
        points="60,4 85,14 104,36 104,84 85,106 60,116 35,106 16,84 16,36 35,14"
        fill="none"
        stroke="url(#silver-stroke)"
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Inner octagon */}
      <polygon
        points="60,18 78,26 92,42 92,78 78,94 60,102 42,94 28,78 28,42 42,26"
        fill="url(#silver-fill)"
        stroke="#94a3b8"
        strokeWidth="1"
        opacity="0.7"
      />

      {/* Cross-hatch grid lines */}
      <line x1="28" y1="60" x2="92" y2="60" stroke="#94a3b8" strokeWidth="0.5" opacity="0.2" />
      <line x1="60" y1="18" x2="60" y2="102" stroke="#94a3b8" strokeWidth="0.5" opacity="0.2" />
      <line x1="42" y1="26" x2="78" y2="94" stroke="#94a3b8" strokeWidth="0.5" opacity="0.15" />
      <line x1="78" y1="26" x2="42" y2="94" stroke="#94a3b8" strokeWidth="0.5" opacity="0.15" />

      {/* Circuit connectors outer→inner */}
      <line x1="60" y1="4" x2="60" y2="18" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      <line x1="104" y1="36" x2="92" y2="42" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      <line x1="104" y1="84" x2="92" y2="78" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      <line x1="16" y1="36" x2="28" y2="42" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      <line x1="16" y1="84" x2="28" y2="78" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />
      <line x1="60" y1="116" x2="60" y2="102" stroke="#94a3b8" strokeWidth="0.8" opacity="0.4" />

      {/* Corner nodes */}
      <circle cx="60" cy="4" r="2.5" fill="#94a3b8" opacity="0.6" />
      <circle cx="104" cy="36" r="2.5" fill="#94a3b8" opacity="0.6" />
      <circle cx="104" cy="84" r="2.5" fill="#94a3b8" opacity="0.6" />
      <circle cx="16" cy="36" r="2.5" fill="#94a3b8" opacity="0.6" />
      <circle cx="16" cy="84" r="2.5" fill="#94a3b8" opacity="0.6" />
      <circle cx="60" cy="116" r="2.5" fill="#94a3b8" opacity="0.6" />

      {/* Scanning lines — digital feel */}
      <line x1="34" y1="50" x2="46" y2="50" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.3" />
      <line x1="74" y1="50" x2="86" y2="50" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.3" />
      <line x1="34" y1="70" x2="46" y2="70" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.3" />
      <line x1="74" y1="70" x2="86" y2="70" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.3" />

      {/* Ramen bowl — sharper style */}
      <ellipse cx="60" cy="66" rx="18" ry="10" fill="none" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.85" />
      <path d="M44 62 Q52 56 60 62 Q68 56 76 62" stroke="#cbd5e1" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M46 64 Q53 58 60 64 Q67 58 74 64" stroke="#e2e8f0" strokeWidth="0.7" fill="none" opacity="0.35" />

      {/* Steam — sharper */}
      <path d="M52 52 Q50 46 53 40" stroke="#cbd5e1" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M60 50 Q58 44 61 38" stroke="#cbd5e1" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M68 52 Q70 46 67 40" stroke="#cbd5e1" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />

      {/* Chopsticks — subtle */}
      <line x1="70" y1="44" x2="56" y2="70" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="74" y1="46" x2="60" y2="72" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

function GoldEmblem({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <radialGradient id="gold-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#eab308" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="gold-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.05" />
        </linearGradient>
        <filter id="gold-neon">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <circle cx="60" cy="60" r="58" fill="url(#gold-glow)" />

      {/* Outer 12-pointed star border (dodecagon) */}
      <polygon
        points="60,2 72,12 88,8 94,24 110,30 108,48 118,60 108,72 110,90 94,96 88,112 72,108 60,118 48,108 32,112 26,96 10,90 12,72 2,60 12,48 10,30 26,24 32,8 48,12"
        fill="none"
        stroke="url(#gold-stroke)"
        strokeWidth="1.2"
        opacity="0.5"
      />

      {/* Inner circle with fill */}
      <circle cx="60" cy="60" r="38" fill="url(#gold-fill)" stroke="#facc15" strokeWidth="1" opacity="0.6" />

      {/* Radiating lines */}
      <line x1="60" y1="22" x2="60" y2="32" stroke="#facc15" strokeWidth="0.8" opacity="0.4" />
      <line x1="60" y1="88" x2="60" y2="98" stroke="#facc15" strokeWidth="0.8" opacity="0.4" />
      <line x1="22" y1="60" x2="32" y2="60" stroke="#facc15" strokeWidth="0.8" opacity="0.4" />
      <line x1="88" y1="60" x2="98" y2="60" stroke="#facc15" strokeWidth="0.8" opacity="0.4" />
      <line x1="33" y1="33" x2="40" y2="40" stroke="#facc15" strokeWidth="0.6" opacity="0.3" />
      <line x1="87" y1="33" x2="80" y2="40" stroke="#facc15" strokeWidth="0.6" opacity="0.3" />
      <line x1="33" y1="87" x2="40" y2="80" stroke="#facc15" strokeWidth="0.6" opacity="0.3" />
      <line x1="87" y1="87" x2="80" y2="80" stroke="#facc15" strokeWidth="0.6" opacity="0.3" />

      {/* Crown element above bowl */}
      <path
        d="M42 42 L48 34 L54 40 L60 30 L66 40 L72 34 L78 42"
        fill="none"
        stroke="#fef08a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#gold-neon)"
        opacity="0.9"
      />
      {/* Crown base */}
      <line x1="42" y1="42" x2="78" y2="42" stroke="#facc15" strokeWidth="1" opacity="0.7" />
      {/* Crown jewel dots */}
      <circle cx="48" cy="34" r="1.5" fill="#fef08a" opacity="0.8" />
      <circle cx="60" cy="30" r="2" fill="#fef08a" opacity="0.9" />
      <circle cx="72" cy="34" r="1.5" fill="#fef08a" opacity="0.8" />

      {/* Ramen bowl — golden */}
      <ellipse cx="60" cy="68" rx="20" ry="11" fill="none" stroke="#facc15" strokeWidth="1.5" opacity="0.9" filter="url(#gold-neon)" />
      <path d="M42 64 Q51 57 60 64 Q69 57 78 64" stroke="#fef08a" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M44 66 Q52 59 60 66 Q68 59 76 66" stroke="#facc15" strokeWidth="0.7" fill="none" opacity="0.35" />

      {/* Steam — glowing */}
      <path d="M52 54 Q49 48 52 42" stroke="#fef08a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M60 52 Q57 46 60 40" stroke="#fef08a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M68 54 Q71 48 68 42" stroke="#fef08a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* Chopsticks — golden */}
      <line x1="72" y1="46" x2="56" y2="74" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="76" y1="48" x2="60" y2="76" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

      {/* Orbit ring — premium feel */}
      <ellipse cx="60" cy="60" rx="48" ry="12" fill="none" stroke="#facc15" strokeWidth="0.5" opacity="0.2" transform="rotate(-20 60 60)" />

      {/* Corner pulse dots */}
      <circle cx="60" cy="2" r="2" fill="#facc15" opacity="0.7" />
      <circle cx="110" cy="30" r="2" fill="#facc15" opacity="0.5" />
      <circle cx="110" cy="90" r="2" fill="#facc15" opacity="0.5" />
      <circle cx="10" cy="30" r="2" fill="#facc15" opacity="0.5" />
      <circle cx="10" cy="90" r="2" fill="#facc15" opacity="0.5" />
      <circle cx="60" cy="118" r="2" fill="#facc15" opacity="0.7" />
    </svg>
  )
}
