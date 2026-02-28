import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn((_table: string) => ({
  select: mockSelect,
  update: mockUpdate,
}));

const mockCreateUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => mockFrom(table),
  }),
  createServiceClient: vi.fn(() => ({
    from: (table: string) => mockFrom(table),
    auth: {
      admin: {
        createUser: (opts: unknown) => mockCreateUser(opts),
        getUserById: (id: string) => mockAdminGetUserById(id),
        updateUserById: (id: string, attrs: unknown) => mockUpdateUserById(id, attrs),
      },
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}));

const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// ---- import after mocks ----
import {
  getStaffUsers,
  createStaffUser,
  resetStaffPassword,
  toggleStaffActive,
  toggleStaffAdmin,
} from '@/app/admin/users/actions';

// ---- helpers ----

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

// ---- tests ----

describe('getStaffUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable mock defaults
    mockSelect.mockReturnValue({ data: [], error: null });
  });

  it('returns list of users from users_users table', async () => {
    const users = [
      { id: '1', email: 'alice@test.com', name: 'Alice', is_active: true },
      { id: '2', email: 'bob@test.com', name: 'Bob', is_active: true },
    ];
    mockSelect.mockReturnValue({ data: users, error: null });

    const result = await getStaffUsers();

    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(result).toEqual({ data: users });
  });

  it('returns empty array on error', async () => {
    mockSelect.mockReturnValue({
      data: null,
      error: { message: 'relation does not exist' },
    });

    const result = await getStaffUsers();

    expect(result).toEqual({ data: [] });
  });
});

describe('createStaffUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls auth.admin.createUser with correct metadata and returns success', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const fd = makeFormData({
      email: 'new@test.com',
      password: 'Secure123!',
      name: 'New Staff',
    });

    const result = await createStaffUser(fd);

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@test.com',
        password: 'Secure123!',
        user_metadata: expect.objectContaining({
          app_role: 'staff',
          name: 'New Staff',
          role: 'cashier',
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('returns error when email already exists', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const fd = makeFormData({
      email: 'existing@test.com',
      password: 'Secure123!',
      name: 'Duplicate',
    });

    const result = await createStaffUser(fd);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('exist'),
      })
    );
  });

  it('calls revalidatePath on success', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const fd = makeFormData({
      email: 'new2@test.com',
      password: 'Secure123!',
      name: 'Staff Two',
    });

    await createStaffUser(fd);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
  });
});

describe('resetStaffPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets user email and calls resetPasswordForEmail', async () => {
    mockAdminGetUserById.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'alice@test.com' } },
      error: null,
    });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await resetStaffPassword('user-1');

    expect(mockAdminGetUserById).toHaveBeenCalledWith('user-1');
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('alice@test.com');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('returns error when userId is invalid', async () => {
    mockAdminGetUserById.mockResolvedValue({
      data: { user: null },
      error: { message: 'User not found' },
    });

    const result = await resetStaffPassword('nonexistent');

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('toggleStaffActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain: from().update().eq()
    mockEq.mockReturnValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it('sets is_active to false for an active user', async () => {
    const result = await toggleStaffActive('user-1', false);

    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('sets is_active to true for an inactive user', async () => {
    const result = await toggleStaffActive('user-2', true);

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: true });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-2');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('calls revalidatePath on success', async () => {
    await toggleStaffActive('user-1', false);

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
  });
});

describe('createStaffUser — admin role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates user with admin role when is_admin is "true"', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    });

    const fd = makeFormData({
      email: 'admin@test.com',
      password: 'Secure123!',
      name: 'Admin User',
      is_admin: 'true',
    });

    const result = await createStaffUser(fd);

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          role: 'admin',
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('creates user with cashier role when is_admin is not set', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'cashier-user-id' } },
      error: null,
    });

    const fd = makeFormData({
      email: 'cashier@test.com',
      password: 'Secure123!',
      name: 'Cashier User',
    });

    const result = await createStaffUser(fd);

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          role: 'cashier',
        }),
      })
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });
});

describe('toggleStaffAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it('promotes user to admin — updates both auth metadata and users_users', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await toggleStaffAdmin('user-1', true);

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { role: 'admin' },
    });
    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('demotes user from admin — updates both auth metadata and users_users', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await toggleStaffAdmin('user-1', false);

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { role: 'cashier' },
    });
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'cashier' });
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('returns error when auth update fails', async () => {
    mockUpdateUserById.mockResolvedValue({
      error: { message: 'Auth update failed' },
    });

    const result = await toggleStaffAdmin('user-1', true);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });
});
