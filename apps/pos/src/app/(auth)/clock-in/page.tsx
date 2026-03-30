'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployeeStore } from '@/modules/employees/store';
import { useUserStore } from '@/modules/users/store';
import { RoleBadge } from '@/modules/users/components/role-badge';
import { formatTime } from '@/lib/utils';
import { seedAll } from '@/seed';
import { Delete, LogIn, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { usePosI18n } from '@/lib/i18n/provider';
import { INTL_LOCALES } from '@meso/core';

export default function ClockInPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { locale, t } = usePosI18n();

  const {
    employees,
    activeWorkTimes,
    loadEmployees,
    loadActiveWorkTimes,
    clockIn,
  } = useEmployeeStore();
  const { locations, loadLocations } = useUserStore();

  useEffect(() => {
    seedAll();
    loadEmployees();
    loadActiveWorkTimes();
    loadLocations();
  }, [loadEmployees, loadActiveWorkTimes, loadLocations]);

  const employeeMap = useMemo(() => {
    const map: Record<string, (typeof employees)[0]> = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        setError('');
        // Auto-submit on 4th digit
        if (newPin.length === 4 && employeeCode && locationId) {
          setTimeout(() => {
            const submitBtn = document.querySelector('[data-action="clock-in-submit"]') as HTMLButtonElement;
            submitBtn?.click();
          }, 150);
        }
      }
    },
    [pin, employeeCode, locationId]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!employeeCode || pin.length !== 4 || !locationId) return;

    setIsSubmitting(true);
    setError('');

    try {
      const employee = employees.find(
        (e) => e.employee_code === employeeCode && e.pin === pin
      );

      if (!employee) {
        setError(t('clockIn.error.invalidCredentials'));
        setPin('');
        setIsSubmitting(false);
        return;
      }

      const alreadyClockedIn = activeWorkTimes.some(
        (wt) => wt.employee_id === employee.id
      );

      if (alreadyClockedIn) {
        setError(t('clockIn.error.alreadyClockedIn'));
        setPin('');
        setIsSubmitting(false);
        return;
      }

      await clockIn(employee.id, locationId);
      toast.success(
        t('clockIn.success', { name: `${employee.first_name} ${employee.last_name}` })
      );
      setEmployeeCode('');
      setPin('');
    } catch {
      setError(t('clockIn.error.generic'));
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  }, [employeeCode, pin, locationId, employees, activeWorkTimes, clockIn, t]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="space-y-4" data-page="clock-in">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            data-action="back-to-login"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('clockIn.backToLogin')}
          </Link>
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono">
              {new Date().toLocaleTimeString(INTL_LOCALES[locale], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <Card className="border-0 shadow-2xl backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg shadow-lg">
              M
            </div>
            <CardTitle className="text-xl">{t('clockIn.title')}</CardTitle>
            <CardDescription>{t('clockIn.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('clockIn.employeeCode')}</Label>
              <Input
                value={employeeCode}
                onChange={(e) => {
                  setEmployeeCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="EMP001"
                className="text-center text-lg font-mono"
                data-field="employee-code"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('clockIn.location')}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger data-field="location">
                  <SelectValue placeholder={t('clockIn.locationPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('clockIn.pin')}</Label>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-colors ${
                      pin.length > i
                        ? 'border-primary bg-primary/5'
                        : 'border-muted'
                    }`}
                  >
                    {pin.length > i ? '\u2022' : ''}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-center text-sm text-destructive font-medium" data-status="error">
                {error}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {digits.map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-16 text-2xl font-semibold hover:bg-primary/10 active:bg-primary/20 transition-colors"
                  onClick={() => handleDigit(digit)}
                  disabled={isSubmitting}
                  data-action="digit"
                  data-value={digit}
                >
                  {digit}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-16"
                onClick={handleBackspace}
                disabled={isSubmitting || pin.length === 0}
                data-action="backspace"
                aria-label="Usun ostatnia cyfre"
              >
                <Delete className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                className="h-16 text-2xl font-semibold hover:bg-primary/10 active:bg-primary/20 transition-colors"
                onClick={() => handleDigit('0')}
                disabled={isSubmitting}
                data-action="digit"
                data-value="0"
              >
                0
              </Button>
              <Button
                className="h-16 text-lg font-semibold"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || pin.length !== 4 || !employeeCode || !locationId
                }
                data-action="clock-in-submit"
              >
                <LogIn className="mr-1 h-5 w-5" />
                OK
              </Button>
            </div>
          </CardContent>
        </Card>

        {activeWorkTimes.length > 0 && (
          <Card className="border-0 shadow-lg backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {t('clockIn.activeShifts')}
                <Badge variant="secondary">{activeWorkTimes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeWorkTimes.map((wt) => {
                  const emp = employeeMap[wt.employee_id];
                  if (!emp) return null;
                  return (
                    <div
                      key={wt.id}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                      data-id={wt.id}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">
                          {emp.first_name} {emp.last_name}
                        </span>
                        <RoleBadge role={emp.role} showIcon={false} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t('clockIn.from', { time: formatTime(wt.clock_in, locale) })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
