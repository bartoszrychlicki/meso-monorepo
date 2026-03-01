'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ManualTimeLogSchema, type ManualTimeLogInput } from '@/schemas/employee';
import { useEmployeeStore } from '@/modules/employees/store';
import { formatCurrency } from '@/lib/utils';
import { Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ManualTimeLogDialogProps {
  /** Pre-selected employee (when opened from employee detail page or context menu) */
  preselectedEmployeeId?: string;
  onSuccess?: () => void;
  /** Controlled mode: externally manage open/close state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManualTimeLogDialog({
  preselectedEmployeeId,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ManualTimeLogDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  const { employees, addManualTimeLog } = useEmployeeStore();
  const activeEmployees = employees.filter((e) => e.is_active);

  const form = useForm<ManualTimeLogInput>({
    resolver: zodResolver(ManualTimeLogSchema),
    defaultValues: {
      employee_id: preselectedEmployeeId ?? '',
      date: new Date().toISOString().split('T')[0],
      time_from: '',
      time_to: '',
      notes: '',
    },
  });

  // Reset form when dialog opens with a new preselected employee
  useEffect(() => {
    if (open) {
      form.reset({
        employee_id: preselectedEmployeeId ?? '',
        date: new Date().toISOString().split('T')[0],
        time_from: '',
        time_to: '',
        notes: '',
      });
    }
  }, [open, preselectedEmployeeId, form]);

  const watchedEmployeeId = form.watch('employee_id');
  const watchedDate = form.watch('date');
  const watchedFrom = form.watch('time_from');
  const watchedTo = form.watch('time_to');

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === watchedEmployeeId),
    [employees, watchedEmployeeId]
  );

  const costPreview = useMemo(() => {
    if (!selectedEmployee || !watchedDate || !watchedFrom || !watchedTo) return null;
    const from = new Date(`${watchedDate}T${watchedFrom}`);
    const to = new Date(`${watchedDate}T${watchedTo}`);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return null;

    const hours = (to.getTime() - from.getTime()) / 3600000;
    const cost = hours * selectedEmployee.hourly_rate;
    return { hours: Math.round(hours * 100) / 100, cost };
  }, [selectedEmployee, watchedDate, watchedFrom, watchedTo]);

  const handleSubmit = async (data: ManualTimeLogInput) => {
    try {
      const employee = employees.find((e) => e.id === data.employee_id);
      if (!employee) throw new Error('Pracownik nie znaleziony');

      const clockIn = `${data.date}T${data.time_from}:00`;
      const clockOut = `${data.date}T${data.time_to}:00`;

      await addManualTimeLog(
        data.employee_id,
        employee.location_id,
        clockIn,
        clockOut,
        data.notes || undefined
      );

      toast.success('Wpis czasu pracy dodany');
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error('Nie udało się dodać wpisu');
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-md" data-component="manual-timelog-dialog">
      <DialogHeader>
        <DialogTitle>Dodaj wpis czasu pracy</DialogTitle>
        <DialogDescription>
          Ręczne dodanie wpisu do ewidencji czasu pracy pracownika.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {!preselectedEmployeeId && (
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pracownik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-field="employee_id">
                        <SelectValue placeholder="Wybierz pracownika" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-field="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="time_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Godzina od</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-field="time_from" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Godzina do</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-field="time_to" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Opis <span className="text-muted-foreground font-normal">(opcjonalny)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="np. zastępstwo za kolegę, dodatkowa zmiana..."
                    rows={2}
                    {...field}
                    data-field="notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {costPreview && (
            <div className="rounded-lg border bg-muted/50 p-3 flex items-center gap-3" data-value="cost-preview">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <span className="text-muted-foreground">Czas: </span>
                <span className="font-medium">{costPreview.hours} h</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-muted-foreground">Koszt: </span>
                <span className="font-medium">{formatCurrency(costPreview.cost)}</span>
                {selectedEmployee && (
                  <>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span className="text-muted-foreground text-xs">
                      Stawka: {formatCurrency(selectedEmployee.hourly_rate)}/h
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" data-action="submit-manual-timelog">
              Dodaj wpis
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );

  // Controlled mode: no trigger, parent manages open state
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode: renders its own trigger button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-action="add-manual-timelog">
          <Plus className="mr-2 h-4 w-4" />
          Dodaj wpis ręcznie
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
