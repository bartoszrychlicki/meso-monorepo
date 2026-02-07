import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export const PinLoginSchema = z.object({
  employee_code: z.string().min(1, 'Kod pracownika jest wymagany'),
  pin: z.string().length(4, 'PIN musi mieć 4 cyfry').regex(/^\d{4}$/, 'PIN musi składać się z cyfr'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type PinLoginInput = z.infer<typeof PinLoginSchema>;
