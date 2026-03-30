'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbLabels } from './breadcrumb-context';
import { usePosI18n } from '@/lib/i18n/provider';

export function Breadcrumbs() {
  const pathname = usePathname();
  const dynamicLabels = useBreadcrumbLabels();
  const { t } = usePosI18n();
  const segments = pathname.split('/').filter(Boolean);

  const routeLabels: Record<string, string> = {
    dashboard: t('breadcrumbs.dashboard'),
    orders: t('breadcrumbs.orders'),
    kitchen: t('breadcrumbs.kitchen'),
    menu: t('breadcrumbs.menu'),
    inventory: t('breadcrumbs.inventory'),
    employees: t('breadcrumbs.employees'),
    settings: t('breadcrumbs.settings'),
    new: t('breadcrumbs.new'),
    'time-tracking': t('breadcrumbs.timeTracking'),
    login: t('breadcrumbs.login'),
    'clock-in': t('breadcrumbs.clockIn'),
    recipes: t('breadcrumbs.recipes'),
    crm: t('breadcrumbs.crm'),
    edit: t('breadcrumbs.edit'),
  };

  if (segments.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
      aria-label="Breadcrumbs"
      data-component="breadcrumbs"
    >
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
        data-action="navigate"
        data-id="home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || dynamicLabels[segment] || segment;

        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
                data-action="navigate"
                data-id={segment}
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
