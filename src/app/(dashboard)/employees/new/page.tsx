'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmployeeForm } from '@/modules/employees/components/employee-form';
import { useEmployeeStore } from '@/modules/employees/store';
import type { CreateEmployeeInput } from '@/schemas/employee';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewEmployeePage() {
  const router = useRouter();
  const { createEmployee } = useEmployeeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateEmployeeInput) => {
    setIsSubmitting(true);
    try {
      await createEmployee({
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        is_active: true,
      });
      toast.success('Pracownik został dodany');
      router.push('/employees');
    } catch {
      toast.error('Nie udało się dodać pracownika');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-page="employee-new">
      <PageHeader
        title="Nowy pracownik"
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
      <div className="max-w-2xl">
        <EmployeeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
