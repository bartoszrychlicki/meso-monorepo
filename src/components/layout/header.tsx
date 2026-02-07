'use client';

import { LogOut, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from './breadcrumbs';

export function Header() {
  return (
    <header
      className="flex h-14 items-center gap-4 border-b bg-background px-4"
      data-component="header"
    >
      <SidebarTrigger className="-ml-1" data-action="toggle-sidebar" />
      <Separator orientation="vertical" className="h-6" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-action="select-location"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kuchnia Centralna</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem data-id="loc-central">
              Kuchnia Centralna
            </DropdownMenuItem>
            <DropdownMenuItem data-id="loc-foodtruck">
              Food Truck Mokotów
            </DropdownMenuItem>
            <DropdownMenuItem data-id="loc-punkt">
              Punkt Centrum
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium hidden sm:inline">Admin</span>
          <Badge variant="secondary" className="text-xs">
            Administrator
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          data-action="logout"
          aria-label="Wyloguj się"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
