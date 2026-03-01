import { z } from 'zod';
import { EmploymentType } from '@/types/enums';

export const CreateEmployeeSchema = z.object({
  first_name: z.string().min(1, 'Imię jest wymagane'),
  last_name: z.string().min(1, 'Nazwisko jest wymagane'),
  email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
  phone: z.string().optional(),
  employee_code: z.string().min(1, 'Kod pracownika jest wymagany'),
  pin: z.string().length(4, 'PIN musi mieć 4 cyfry').regex(/^\d{4}$/, 'PIN musi składać się z cyfr'),
  role: z.string().min(1, 'Rola jest wymagana'),
  employment_type: z.nativeEnum(EmploymentType),
  hourly_rate: z.number().min(0, 'Stawka nie może być ujemna'),
  overtime_rate: z.number().min(0, 'Stawka za nadgodziny nie może być ujemna').optional(),
  location_id: z.string().min(1, 'Lokalizacja jest wymagana'),
  is_active: z.boolean(),
});

export const ClockInSchema = z.object({
  employee_id: z.string().min(1),
  location_id: z.string().min(1, 'Lokalizacja jest wymagana'),
  pin: z.string().length(4, 'PIN musi mieć 4 cyfry'),
});

export const ManualTimeLogSchema = z.object({
  employee_id: z.string().min(1, 'Pracownik jest wymagany'),
  date: z.string().min(1, 'Data jest wymagana'),
  time_from: z.string().min(1, 'Godzina rozpoczęcia jest wymagana'),
  time_to: z.string().min(1, 'Godzina zakończenia jest wymagana'),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (!data.date || !data.time_from || !data.time_to) return true;
    const from = new Date(`${data.date}T${data.time_from}`);
    const to = new Date(`${data.date}T${data.time_to}`);
    return to > from;
  },
  { message: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia', path: ['time_to'] }
);

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type ClockInInput = z.infer<typeof ClockInSchema>;
export type ManualTimeLogInput = z.infer<typeof ManualTimeLogSchema>;
