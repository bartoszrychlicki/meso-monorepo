'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Button } from '@/components/ui/button';
import { EmployeeList } from '@/modules/employees/components/employee-list';
import { ManualTimeLogDialog } from '@/modules/employees/components/manual-timelog-dialog';
import { useEmployeeStore } from '@/modules/employees/store';
import { useUserStore } from '@/modules/users/store';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Users, UserCheck, Clock, DollarSign, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const router = useRouter();
  const {
    employees,
    activeWorkTimes,
    isLoading,
    loadEmployees,
    loadActiveWorkTimes,
    loadWorkTimeLogs,
    deactivateEmployee,
    getTodayTotalHours,
    getTodayLaborCost,
  } = useEmployeeStore();
  const { locations, loadLocations } = useUserStore();

  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [manualTimeLogEmployeeId, setManualTimeLogEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    loadActiveWorkTimes();
    loadLocations();
    // Load today's logs for stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    loadWorkTimeLogs(undefined, [
      today.toISOString(),
      tomorrow.toISOString(),
    ]);
  }, [loadEmployees, loadActiveWorkTimes, loadLocations, loadWorkTimeLogs]);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await deactivateEmployee(deactivateId);
      toast.success('Pracownik dezaktywowany');
    } catch {
      toast.error('Nie udało się dezaktywować pracownika');
    }
    setDeactivateId(null);
  };

  const activeCount = employees.filter((e) => e.is_active).length;

  if (isLoading && employees.length === 0) {
    return (
      <div className="space-y-6" data-page="employees">
        <PageHeader title="Pracownicy" description="Zarządzaj zespołem" />
        <LoadingSkeleton variant="page" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="employees">
      <PageHeader
        title="Pracownicy"
        description="Zarządzaj zespołem"
        actions={
          <Button
            onClick={() => router.push('/employees/new')}
            data-action="add-employee"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nowy pracownik
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Pracownicy"
          value={activeCount}
          className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20"
        />
        <KpiCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Aktywni dziś"
          value={activeWorkTimes.length}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Godziny dziś"
          value={`${getTodayTotalHours()} h`}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
        />
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Koszt pracy dziś"
          value={formatCurrency(getTodayLaborCost())}
          className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
        />
      </div>

      <EmployeeList
        employees={employees}
        locations={locations}
        isLoading={isLoading}
        onDeactivate={(id) => setDeactivateId(id)}
        onAddManualTimeLog={(id) => setManualTimeLogEmployeeId(id)}
      />

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title="Dezaktywuj pracownika"
        description="Czy na pewno chcesz dezaktywować tego pracownika? Nie będzie mógł się logować ani rejestrować czasu pracy."
        confirmLabel="Dezaktywuj"
        onConfirm={handleDeactivate}
        variant="destructive"
      />

      <ManualTimeLogDialog
        open={!!manualTimeLogEmployeeId}
        onOpenChange={(open) => {
          if (!open) setManualTimeLogEmployeeId(null);
        }}
        preselectedEmployeeId={manualTimeLogEmployeeId ?? undefined}
      />
    </div>
  );
}
