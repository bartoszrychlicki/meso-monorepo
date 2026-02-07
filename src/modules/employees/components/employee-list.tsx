'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/modules/users/components/role-badge';
import { Employee } from '@/types/employee';
import { Location } from '@/types/common';
import { formatCurrency } from '@/lib/utils';
import { Search, MoreHorizontal, Pencil, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';

interface EmployeeListProps {
  employees: Employee[];
  locations: Location[];
  isLoading?: boolean;
  onDeactivate?: (id: string) => void;
}

export function EmployeeList({
  employees,
  locations,
  isLoading = false,
  onDeactivate,
}: EmployeeListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    locations.forEach((l) => {
      map[l.id] = l.name;
    });
    return map;
  }, [locations]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const code = emp.employee_code.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        code.includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesLocation =
        locationFilter === 'all' || emp.location_id === locationFilter;
      return matchesSearch && matchesRole && matchesLocation;
    });
  }, [employees, search, roleFilter, locationFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-component="employee-list-skeleton">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-component="employee-list">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nazwisku lub kodzie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-field="search"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-field="role-filter">
            <SelectValue placeholder="Rola" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie role</SelectItem>
            <SelectItem value="chef">Szef kuchni</SelectItem>
            <SelectItem value="cook">Kucharz</SelectItem>
            <SelectItem value="cashier">Kasjer</SelectItem>
            <SelectItem value="delivery">Dostawa</SelectItem>
            <SelectItem value="manager">Kierownik</SelectItem>
            <SelectItem value="warehouse">Magazynier</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-field="location-filter">
            <SelectValue placeholder="Lokalizacja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie lokalizacje</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          title="Brak pracowników"
          description="Nie znaleziono pracowników spełniających kryteria."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead className="hidden md:table-cell">Lokalizacja</TableHead>
                <TableHead className="hidden sm:table-cell">Stawka/h</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/employees/${emp.id}`)}
                  data-id={emp.id}
                >
                  <TableCell className="font-medium">
                    {emp.first_name} {emp.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {emp.employee_code}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={emp.role} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {locationMap[emp.location_id] ?? '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatCurrency(emp.hourly_rate)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        emp.is_active
                          ? 'border-0 bg-green-100 text-green-800'
                          : 'border-0 bg-gray-100 text-gray-500'
                      }
                      data-status={emp.is_active ? 'active' : 'inactive'}
                    >
                      {emp.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-action="actions-menu">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/employees/${emp.id}`);
                          }}
                          data-action="edit"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edytuj
                        </DropdownMenuItem>
                        {emp.is_active && onDeactivate && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeactivate(emp.id);
                            }}
                            className="text-destructive"
                            data-action="deactivate"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Dezaktywuj
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
