import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  CreateStaffUserSchema,
} from '@/schemas/user';

describe('LoginSchema', () => {
  const validData = {
    email: 'user@example.com',
    password: 'password123',
  };

  it('accepts valid login data', () => {
    const result = LoginSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('password123');
    }
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ ...validData, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue).toBeDefined();
      expect(emailIssue!.message).toBe('Nieprawidłowy adres email');
    }
  });

  it('rejects empty email', () => {
    const result = LoginSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = LoginSchema.safeParse({ password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({ ...validData, password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path.includes('password'));
      expect(passwordIssue).toBeDefined();
      expect(passwordIssue!.message).toBe('Hasło jest wymagane');
    }
  });

  it('rejects missing password', () => {
    const result = LoginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });

  it('accepts password with single character (min 1)', () => {
    const result = LoginSchema.safeParse({ ...validData, password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    const result = LoginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ForgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = ForgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = ForgotPasswordSchema.safeParse({ email: 'not-valid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue).toBeDefined();
      expect(emailIssue!.message).toBe('Nieprawidłowy adres email');
    }
  });

  it('rejects empty email', () => {
    const result = ForgotPasswordSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = ForgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ResetPasswordSchema', () => {
  const validData = {
    password: 'securePass1',
    confirmPassword: 'securePass1',
  };

  it('accepts valid matching passwords', () => {
    const result = ResetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe('securePass1');
      expect(result.data.confirmPassword).toBe('securePass1');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = ResetPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path.includes('password'));
      expect(passwordIssue).toBeDefined();
    }
  });

  it('accepts password with exactly 8 characters', () => {
    const result = ResetPasswordSchema.safeParse({
      password: '12345678',
      confirmPassword: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = ResetPasswordSchema.safeParse({
      password: 'securePass1',
      confirmPassword: 'differentPass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatchIssue = result.error.issues.find(
        (i) => i.path.includes('confirmPassword')
      );
      expect(mismatchIssue).toBeDefined();
    }
  });

  it('rejects empty password', () => {
    const result = ResetPasswordSchema.safeParse({
      password: '',
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing confirmPassword', () => {
    const result = ResetPasswordSchema.safeParse({ password: 'securePass1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = ResetPasswordSchema.safeParse({ confirmPassword: 'securePass1' });
    expect(result.success).toBe(false);
  });
});

describe('CreateStaffUserSchema', () => {
  const validData = {
    name: 'Jan Kowalski',
    email: 'jan@example.com',
    password: 'securePass1',
  };

  it('accepts valid staff user data', () => {
    const result = CreateStaffUserSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jan Kowalski');
      expect(result.data.email).toBe('jan@example.com');
      expect(result.data.password).toBe('securePass1');
    }
  });

  it('rejects empty name', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'));
      expect(nameIssue).toBeDefined();
    }
  });

  it('accepts name with single character (min 1)', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, name: 'A' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, email: 'bad-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'));
      expect(emailIssue).toBeDefined();
      expect(emailIssue!.message).toBe('Nieprawidłowy adres email');
    }
  });

  it('rejects empty email', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path.includes('password'));
      expect(passwordIssue).toBeDefined();
    }
  });

  it('accepts password with exactly 8 characters', () => {
    const result = CreateStaffUserSchema.safeParse({ ...validData, password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = CreateStaffUserSchema.safeParse({
      email: 'jan@example.com',
      password: 'securePass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = CreateStaffUserSchema.safeParse({
      name: 'Jan Kowalski',
      password: 'securePass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = CreateStaffUserSchema.safeParse({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty object', () => {
    const result = CreateStaffUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
