'use client';

import { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { BreadcrumbProvider } from '@/components/layout/breadcrumb-context';
import { seedAll } from '@/seed';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    seedAll();
  }, []);

  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <div className="flex h-svh min-h-svh w-full">
          <AppSidebar />
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <Header />
            <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}
