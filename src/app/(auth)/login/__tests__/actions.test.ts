import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
    },
  }),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

// ---- import after mocks ----
import { signIn, signOut } from '@/app/(auth)/login/actions';

// ---- helpers ----

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

// ---- tests ----

describe('signIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls signInWithPassword with email and password from FormData', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'user@example.com', password: 'secret123' });
    await signIn(fd);

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = makeFormData({ email: 'user@example.com', password: 'secret123' });
    await signIn(fd);

    expect(mockRedirect).toHaveBeenCalled();
  });

  it('returns error object when credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const fd = makeFormData({ email: 'bad@example.com', password: 'wrong' });
    const result = await signIn(fd);

    expect(result).toEqual({ error: 'Nieprawidlowy email lub haslo' });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('uses redirect param from FormData when present', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = makeFormData({
      email: 'user@example.com',
      password: 'secret123',
      redirect: '/admin/users',
    });
    await signIn(fd);

    expect(mockRedirect).toHaveBeenCalledWith('/admin/users');
  });
});

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase auth.signOut and redirects to /login', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
