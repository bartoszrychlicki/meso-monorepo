'use client';

import { useEffect } from 'react';
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
import { useUserStore } from '@/modules/users/store';
import { signOut } from '@/app/(auth)/login/actions';

export function Header() {
  const { currentUser, currentLocation, locations, isLoading, loadUser, setCurrentLocation } =
    useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
              <span className="hidden sm:inline">
                {currentLocation?.name || 'Wybierz lokalizacje'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {locations.map((loc) => (
              <DropdownMenuItem
                key={loc.id}
                data-id={loc.id}
                onClick={() => setCurrentLocation(loc.id)}
              >
                {loc.name}
              </DropdownMenuItem>
            ))}
            {locations.length === 0 && (
              <DropdownMenuItem disabled>Brak lokalizacji</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">
          {!isLoading && currentUser && (
            <>
              <span className="text-sm font-medium hidden sm:inline">
                {currentUser.name}
              </span>
              <Badge variant="secondary" className="text-xs capitalize">
                {currentUser.role}
              </Badge>
            </>
          )}
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-action="logout"
            aria-label="Wyloguj sie"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
