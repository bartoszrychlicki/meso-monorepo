'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/modules/users/components/role-badge';
import { Employee, WorkTime } from '@/types/employee';
import { Location } from '@/types/common';
import { WorkTimeStatus } from '@/types/enums';
import { formatTime } from '@/lib/utils';
import { StopCircle, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ActiveEmployeesCardProps {
  activeWorkTimes: WorkTime[];
  employees: Employee[];
  locations: Location[];
  onClockOut?: (workTimeId: string) => Promise<void>;
}

function LiveTimer({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(clockIn).getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${hours}h ${minutes.toString().padStart(2, '0')}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [clockIn]);

  return <span className="font-mono text-sm">{elapsed}</span>;
}

export function ActiveEmployeesCard({
  activeWorkTimes,
  employees,
  locations,
  onClockOut,
}: ActiveEmployeesCardProps) {
  const employeeMap = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    locations.forEach((l) => {
      map[l.id] = l.name;
    });
    return map;
  }, [locations]);

  const handleClockOut = async (workTimeId: string, empName: string) => {
    if (!onClockOut) return;
    try {
      await onClockOut(workTimeId);
      toast.success(`${empName} - zmiana zakończona`);
    } catch {
      toast.error('Nie udało się zakończyć zmiany');
    }
  };

  return (
    <Card data-component="active-employees-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Aktywni pracownicy
        </CardTitle>
        <Badge variant="secondary" className="text-sm">
          {activeWorkTimes.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {activeWorkTimes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak aktywnych pracowników
          </p>
        ) : (
          <div className="space-y-3">
            {activeWorkTimes.map((wt) => {
              const emp = employeeMap[wt.employee_id];
              if (!emp) return null;
              const empName = `${emp.first_name} ${emp.last_name}`;

              return (
                <div
                  key={wt.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  data-id={wt.id}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                        wt.status === WorkTimeStatus.ON_BREAK
                          ? 'bg-yellow-500'
                          : 'bg-green-500 animate-pulse'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{empName}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <RoleBadge role={emp.role} showIcon={false} />
                        <span className="text-xs text-muted-foreground">
                          {locationMap[wt.location_id] ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="h-3 w-3" />
                        {formatTime(wt.clock_in)}
                      </div>
                      <LiveTimer clockIn={wt.clock_in} />
                    </div>
                    {onClockOut && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClockOut(wt.id, empName)}
                        data-action="clock-out"
                        data-id={wt.id}
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
