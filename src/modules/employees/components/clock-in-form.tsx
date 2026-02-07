'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useEmployeeStore } from '../store';
import { useUserStore } from '@/modules/users/store';
import { PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClockInForm() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { employees, loadEmployees, clockIn, activeWorkTimes } = useEmployeeStore();
  const { locations, loadLocations } = useUserStore();

  useEffect(() => {
    loadEmployees();
    loadLocations();
  }, [loadEmployees, loadLocations]);

  const activeEmployeeIds = new Set(
    activeWorkTimes.map((wt) => wt.employee_id)
  );

  const availableEmployees = employees.filter(
    (emp) => emp.is_active && !activeEmployeeIds.has(emp.id)
  );

  const handleClockIn = async () => {
    if (!selectedEmployeeId || !selectedLocationId) return;
    setIsSubmitting(true);
    try {
      await clockIn(selectedEmployeeId, selectedLocationId);
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      toast.success(
        `${emp?.first_name} ${emp?.last_name} - zmiana rozpoczęta`
      );
      setSelectedEmployeeId('');
    } catch {
      toast.error('Nie udało się rozpocząć zmiany');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-component="clock-in-form">
      <CardHeader>
        <CardTitle className="text-lg">Rozpocznij zmianę</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Pracownik</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger data-field="employee-select">
              <SelectValue placeholder="Wybierz pracownika" />
            </SelectTrigger>
            <SelectContent>
              {availableEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} data-id={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Lokalizacja</Label>
          <Select
            value={selectedLocationId}
            onValueChange={setSelectedLocationId}
          >
            <SelectTrigger data-field="location-select">
              <SelectValue placeholder="Wybierz lokalizację" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id} data-id={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          disabled={!selectedEmployeeId || !selectedLocationId || isSubmitting}
          onClick={handleClockIn}
          data-action="clock-in"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Rozpocznij zmianę
        </Button>
      </CardContent>
    </Card>
  );
}
