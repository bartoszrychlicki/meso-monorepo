'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeForm } from '@/modules/employees/components/employee-form';
import { TimeLogTable } from '@/modules/employees/components/time-log-table';
import { ManualTimeLogDialog } from '@/modules/employees/components/manual-timelog-dialog';
import { useEmployeeStore } from '@/modules/employees/store';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Employee } from '@/types/employee';
import type { CreateEmployeeInput } from '@/schemas/employee';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { employeesRepository } from '@/modules/employees/repository';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const defaultTab = searchParams.get('tab') === 'time' ? 'time' : 'data';

  const {
    employees,
    workTimeLogs,
    loadEmployees,
    updateEmployee,
    loadWorkTimeLogs,
  } = useEmployeeStore();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (employees.length === 0) await loadEmployees();
      const emp = await employeesRepository.findById(id);
      setEmployee(emp);
      await loadWorkTimeLogs(id);
      setIsLoading(false);
    };
    load();
  }, [id, employees.length, loadEmployees, loadWorkTimeLogs]);

  const handleSubmit = async (data: CreateEmployeeInput) => {
    setIsSubmitting(true);
    try {
      await updateEmployee(id, {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
      });
      toast.success('Dane pracownika zaktualizowane');
    } catch {
      toast.error('Nie udało się zaktualizować danych');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-page="employee-detail">
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6" data-page="employee-detail">
        <PageHeader title="Pracownik nie znaleziony" />
        <Button variant="outline" onClick={() => router.push('/employees')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-page="employee-detail" data-id={id}>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={employee.employee_code}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/employees')}
            data-action="back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
        }
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="data" data-action="tab-data">
            Dane
          </TabsTrigger>
          <TabsTrigger value="time" data-action="tab-time">
            Czas pracy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-6">
          <div className="max-w-2xl">
            <EmployeeForm
              employee={employee}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </TabsContent>

        <TabsContent value="time" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <ManualTimeLogDialog
              preselectedEmployeeId={id}
              onSuccess={() => loadWorkTimeLogs(id)}
            />
          </div>
          <TimeLogTable
            workTimes={workTimeLogs}
            employees={employees.length > 0 ? employees : employee ? [employee] : []}
            showEmployeeName={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
