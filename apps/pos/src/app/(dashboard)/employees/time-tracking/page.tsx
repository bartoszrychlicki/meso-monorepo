'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ActiveEmployeesCard } from '@/modules/employees/components/active-employees-card';
import { ClockInForm } from '@/modules/employees/components/clock-in-form';
import { TimeLogTable } from '@/modules/employees/components/time-log-table';
import { ManualTimeLogDialog } from '@/modules/employees/components/manual-timelog-dialog';
import { useEmployeeStore } from '@/modules/employees/store';
import { useUserStore } from '@/modules/users/store';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

export default function TimeTrackingPage() {
  const {
    employees,
    activeWorkTimes,
    workTimeLogs,
    isLoading,
    loadEmployees,
    loadActiveWorkTimes,
    loadWorkTimeLogs,
    clockOut,
  } = useEmployeeStore();
  const { locations, loadLocations } = useUserStore();

  useEffect(() => {
    loadEmployees();
    loadActiveWorkTimes();
    loadLocations();
    // Load today's logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    loadWorkTimeLogs(undefined, [
      today.toISOString(),
      tomorrow.toISOString(),
    ]);
  }, [loadEmployees, loadActiveWorkTimes, loadLocations, loadWorkTimeLogs]);

  if (isLoading && employees.length === 0) {
    return (
      <div className="space-y-6" data-page="time-tracking">
        <PageHeader title="Czas pracy" description="Rejestracja i przegląd" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="time-tracking">
      <PageHeader
        title="Czas pracy"
        description="Rejestracja i przegląd"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveEmployeesCard
          activeWorkTimes={activeWorkTimes}
          employees={employees}
          locations={locations}
          onClockOut={async (id) => { await clockOut(id); }}
        />
        <ClockInForm />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Dzisiejsze wpisy</h2>
          <ManualTimeLogDialog
            onSuccess={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              loadWorkTimeLogs(undefined, [today.toISOString(), tomorrow.toISOString()]);
            }}
          />
        </div>
        <TimeLogTable
          workTimes={[...activeWorkTimes, ...workTimeLogs]}
          employees={employees}
        />
      </div>
    </div>
  );
}
