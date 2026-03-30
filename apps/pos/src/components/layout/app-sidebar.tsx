'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Warehouse,
  Users,
  UserCheck,
  Settings,
  ExternalLink,
  Truck,
  Shield,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { usePosI18n } from '@/lib/i18n/provider';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Warehouse,
  Users,
  UserCheck,
  Settings,
  Truck,
  Shield,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = usePosI18n();

  const mainNavItems = [
    { title: t('nav.dashboard'), href: '/dashboard', icon: 'LayoutDashboard' },
    { title: t('nav.orders'), href: '/orders', icon: 'ShoppingCart' },
    { title: t('nav.menu'), href: '/menu', icon: 'UtensilsCrossed' },
    { title: t('nav.recipes'), href: '/recipes', icon: 'ChefHat' },
    { title: t('nav.inventory'), href: '/inventory', icon: 'Warehouse' },
    { title: t('nav.deliveries'), href: '/deliveries', icon: 'Truck' },
    { title: t('nav.customers'), href: '/crm', icon: 'UserCheck' },
    { title: t('nav.employees'), href: '/employees', icon: 'Users' },
  ];

  const secondaryNavItems = [
    { title: t('nav.users'), href: '/admin/users', icon: 'Shield' },
    { title: t('nav.settings'), href: '/settings', icon: 'Settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar data-component="app-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            M
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">MESOpos</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-action="navigate"
                      data-id={item.href}
                    >
                      <Link href={item.href}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/kitchen')}
                  data-action="navigate"
                  data-id="/kitchen"
                >
                    <a href="/kitchen" target="_blank" rel="noopener noreferrer">
                      <ChefHat className="h-4 w-4" />
                    <span>{t('nav.kitchen')}</span>
                    <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-action="navigate"
                      data-id={item.href}
                    >
                      <Link href={item.href}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-xs text-muted-foreground">
          {t('nav.version')}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
