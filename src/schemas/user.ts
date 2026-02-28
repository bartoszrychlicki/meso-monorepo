import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
});

export const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są identyczne',
  path: ['confirmPassword'],
});

export const CreateStaffUserSchema = z.object({
  name: z.string().min(1, 'Imię i nazwisko jest wymagane'),
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  is_admin: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type CreateStaffUserInput = z.input<typeof CreateStaffUserSchema>;
