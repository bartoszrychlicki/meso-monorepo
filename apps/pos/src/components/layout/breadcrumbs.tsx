'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbLabels } from './breadcrumb-context';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Zamówienia',
  kitchen: 'Kuchnia KDS',
  menu: 'Menu',
  inventory: 'Magazyn',
  employees: 'Pracownicy',
  settings: 'Ustawienia',
  new: 'Nowy',
  'time-tracking': 'Czas pracy',
  login: 'Logowanie',
  'clock-in': 'Rejestracja',
  recipes: 'Receptury',
  crm: 'Klienci',
  edit: 'Edytuj',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const dynamicLabels = useBreadcrumbLabels();
  const segments = pathname.split('/').filter(Boolean);

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
