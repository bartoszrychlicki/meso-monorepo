import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock the server action
vi.mock('@/app/(auth)/login/actions', () => ({
  signIn: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { LoginForm } from '../login-form';
import { signIn } from '@/app/(auth)/login/actions';

const mockSignIn = vi.mocked(signIn);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs and submit button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/has[lł]o/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /zaloguj/i })
    ).toBeInTheDocument();
  });

  it('shows validation error when submitting empty form', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /zaloguj/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Zod validation should display error messages for empty email/password
      const errorMessages = screen.getAllByText(/wymagane|nieprawidłowy/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    // signIn should NOT have been called
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with FormData containing email and password on valid submit', async () => {
    mockSignIn.mockResolvedValue(undefined as never);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/has[lł]o/i);
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    const callArg = mockSignIn.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(FormData);
    expect((callArg as FormData).get('email')).toBe('test@example.com');
    expect((callArg as FormData).get('password')).toBe('password123');
  });

  it('displays error message when signIn returns { error: "..." }', async () => {
    mockSignIn.mockResolvedValue({ error: 'Nieprawidłowe dane logowania' });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/has[lł]o/i);
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Nieprawidłowe dane logowania')
      ).toBeInTheDocument();
    });
  });

  it('shows "Nie pamietasz hasla?" link with href="/forgot-password"', () => {
    render(<LoginForm />);

    const forgotLink = screen.getByText(/nie pami[eę]tasz has[lł]a/i);
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('submit button shows loading state during submission', async () => {
    // signIn never resolves during this test to keep loading state active
    let resolveSignIn: (value: { error: string }) => void;
    mockSignIn.mockImplementation(
      () =>
        new Promise<{ error: string }>((resolve) => {
          resolveSignIn = resolve;
        })
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/has[lł]o/i);
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /zaloguj|ładowanie|logowanie/i });
      expect(button).toBeDisabled();
    });

    // Clean up: resolve the pending promise
    resolveSignIn!({ error: '' });
  });

  it('passes redirectTo prop to signIn when provided', async () => {
    mockSignIn.mockResolvedValue(undefined as never);

    render(<LoginForm redirectTo="/dashboard" />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/has[lł]o/i);
    const submitButton = screen.getByRole('button', { name: /zaloguj/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    const callArg = mockSignIn.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(FormData);
    expect((callArg as FormData).get('redirectTo')).toBe('/dashboard');
  });
});
