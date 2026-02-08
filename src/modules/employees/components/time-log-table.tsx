'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { WorkTime } from '@/types/employee';
import { Employee } from '@/types/employee';
import { WorkTimeStatus } from '@/types/enums';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { Clock } from 'lucide-react';

const STATUS_CONFIG: Record<WorkTimeStatus, { label: string; color: string }> = {
  [WorkTimeStatus.CLOCKED_IN]: { label: 'Pracuje', color: 'bg-green-100 text-green-800' },
  [WorkTimeStatus.ON_BREAK]: { label: 'Przerwa', color: 'bg-yellow-100 text-yellow-800' },
  [WorkTimeStatus.CLOCKED_OUT]: { label: 'Zakończone', color: 'bg-gray-100 text-gray-600' },
};

interface TimeLogTableProps {
  workTimes: WorkTime[];
  employees: Employee[];
  showEmployeeName?: boolean;
}

export function TimeLogTable({
  workTimes,
  employees,
  showEmployeeName = true,
}: TimeLogTableProps) {
  const employeeMap = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);

  const sortedWorkTimes = useMemo(
    () =>
      [...workTimes].sort(
        (a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
      ),
    [workTimes]
  );

  const totalHours = useMemo(() => {
    return sortedWorkTimes.reduce((total, wt) => {
      if (wt.total_work_minutes) return total + wt.total_work_minutes / 60;
      if (wt.status !== WorkTimeStatus.CLOCKED_OUT) {
        const now = new Date();
        const clockIn = new Date(wt.clock_in);
        return total + (now.getTime() - clockIn.getTime()) / 3600000 - wt.total_break_minutes / 60;
      }
      return total;
    }, 0);
  }, [sortedWorkTimes]);

  const totalCost = useMemo(() => {
    return sortedWorkTimes.reduce((total, wt) => {
      const emp = employeeMap[wt.employee_id];
      if (!emp) return total;
      let hours = 0;
      if (wt.total_work_minutes) {
        hours = wt.total_work_minutes / 60;
      } else if (wt.status !== WorkTimeStatus.CLOCKED_OUT) {
        const now = new Date();
        const clockIn = new Date(wt.clock_in);
        hours = (now.getTime() - clockIn.getTime()) / 3600000 - wt.total_break_minutes / 60;
      }
      return total + hours * emp.hourly_rate;
    }, 0);
  }, [sortedWorkTimes, employeeMap]);

  if (sortedWorkTimes.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="Brak wpisów czasu pracy"
        description="Nie znaleziono wpisów dla wybranych kryteriów."
      />
    );
  }

  return (
    <div className="space-y-2" data-component="time-log-table">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployeeName && <TableHead>Pracownik</TableHead>}
              <TableHead>Data</TableHead>
              <TableHead>Wejście</TableHead>
              <TableHead>Wyjście</TableHead>
              <TableHead className="hidden sm:table-cell">Przerwa</TableHead>
              <TableHead>Godziny</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Opis</TableHead>
              <TableHead className="hidden md:table-cell text-right">Koszt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkTimes.map((wt) => {
              const emp = employeeMap[wt.employee_id];
              const statusConfig = STATUS_CONFIG[wt.status];

              let hours = 0;
              if (wt.total_work_minutes) {
                hours = wt.total_work_minutes / 60;
              } else if (wt.status !== WorkTimeStatus.CLOCKED_OUT) {
                const now = new Date();
                const clockIn = new Date(wt.clock_in);
                hours =
                  (now.getTime() - clockIn.getTime()) / 3600000 -
                  wt.total_break_minutes / 60;
              }

              const cost = emp ? hours * emp.hourly_rate : 0;

              return (
                <TableRow key={wt.id} data-id={wt.id}>
                  {showEmployeeName && (
                    <TableCell className="font-medium">
                      {emp ? `${emp.first_name} ${emp.last_name}` : '-'}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(wt.clock_in)}</TableCell>
                  <TableCell>{formatTime(wt.clock_in)}</TableCell>
                  <TableCell>
                    {wt.clock_out ? formatTime(wt.clock_out) : '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {wt.total_break_minutes > 0
                      ? `${wt.total_break_minutes} min`
                      : '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {hours > 0 ? `${hours.toFixed(1)} h` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-0 ${statusConfig.color}`}
                      data-status={wt.status}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                    {wt.notes || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    {cost > 0 ? formatCurrency(cost) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-6 px-4 py-2 text-sm font-medium text-muted-foreground">
        <span>
          Razem godzin: <span className="text-foreground">{totalHours.toFixed(1)} h</span>
        </span>
        <span>
          Razem koszt: <span className="text-foreground">{formatCurrency(totalCost)}</span>
        </span>
      </div>
    </div>
  );
}
