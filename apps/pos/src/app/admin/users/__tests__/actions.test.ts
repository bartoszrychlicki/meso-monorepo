import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----

const mockSelectAll = vi.fn();
const mockSelectEq = vi.fn();
const mockSelectIlike = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn((_table: string) => ({
  select: (columns: string) => {
    if (columns === '*') {
      return mockSelectAll();
    }

    return {
      eq: mockSelectEq,
      ilike: mockSelectIlike,
      maybeSingle: mockMaybeSingle,
    };
  },
  update: mockUpdate,
  delete: () => mockDelete(),
  upsert: mockUpsert,
}));

const mockCreateUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockUpdateUserById = vi.fn();
const mockDeleteUser = vi.fn();
const mockListUsers = vi.fn();

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
        listUsers: (params: unknown) => mockListUsers(params),
        updateUserById: (id: string, attrs: unknown) => mockUpdateUserById(id, attrs),
        deleteUser: (id: string) => mockDeleteUser(id),
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

function resetQueryMocks() {
  mockSelectAll.mockReturnValue({ data: [], error: null });
  mockSelectEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelectIlike.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockUpdateEq.mockReturnValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockDelete.mockReturnValue({ eq: mockUpdateEq });
  mockUpsert.mockResolvedValue({ error: null });
  mockListUsers.mockResolvedValue({
    data: { users: [], nextPage: null },
    error: null,
  });
}

// ---- tests ----

describe('getStaffUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
  });

  it('returns list of users from users_users table', async () => {
    const users = [
      { id: '1', email: 'alice@test.com', name: 'Alice', is_active: true },
      { id: '2', email: 'bob@test.com', name: 'Bob', is_active: true },
    ];
    mockSelectAll.mockReturnValue({ data: users, error: null });

    const result = await getStaffUsers();

    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(result).toEqual({ data: users });
  });

  it('returns empty array on error', async () => {
    mockSelectAll.mockReturnValue({
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
    resetQueryMocks();
  });

  it('calls auth.admin.createUser with normalized email and returns success', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    const fd = makeFormData({
      email: ' New@Test.com ',
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

  it('returns error when staff record already exists in users_users', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'staff-1' },
      error: null,
    });

    const fd = makeFormData({
      email: 'existing@test.com',
      password: 'Secure123!',
      name: 'Duplicate',
    });

    const result = await createStaffUser(fd);

    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Konto pracownika'),
      })
    );
  });

  it('returns specific error when email belongs to another account type', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'customer-auth-id',
            email: 'existing@test.com',
            user_metadata: { app_role: 'customer' },
          },
        ],
        nextPage: null,
      },
      error: null,
    });

    const fd = makeFormData({
      email: 'existing@test.com',
      password: 'Secure123!',
      name: 'Delivery Customer',
    });

    const result = await createStaffUser(fd);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('konta klienta'),
      })
    );
  });

  it('recovers orphaned auth staff user without users_users row', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'staffauth1',
            email: 'existing@test.com',
            user_metadata: { app_role: 'staff', role: 'cashier' },
          },
        ],
        nextPage: null,
      },
      error: null,
    });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockUpdateUserById.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const fd = makeFormData({
      email: 'existing@test.com',
      password: 'Secure123!',
      name: 'Recovered Staff',
      is_admin: 'true',
    });

    const result = await createStaffUser(fd);

    expect(mockUpdateUserById).toHaveBeenCalledWith('staffauth1', {
      password: 'Secure123!',
      email_confirm: true,
      user_metadata: {
        app_role: 'staff',
        role: 'admin',
        name: 'Recovered Staff',
      },
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'staffauth1',
        email: 'existing@test.com',
        name: 'Recovered Staff',
        username: 'existing-staffaut',
        role: 'admin',
        is_active: true,
      }),
      { onConflict: 'id' }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
    expect(result).toEqual(expect.objectContaining({ success: true }));
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
    resetQueryMocks();
  });

  it('sets a new password via admin.updateUserById', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await resetStaffPassword('user-1', 'newpass123');

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'newpass123' });
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('returns error when password is too short', async () => {
    const result = await resetStaffPassword('user-1', '123');

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });
});

describe('toggleStaffActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryMocks();
  });

  it('sets is_active to false for an active user', async () => {
    const result = await toggleStaffActive('user-1', false);

    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('sets is_active to true for an inactive user', async () => {
    const result = await toggleStaffActive('user-2', true);

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: true });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-2');
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
    resetQueryMocks();
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
    resetQueryMocks();
  });

  it('promotes user to admin — updates both auth metadata and users_users', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });

    const result = await toggleStaffAdmin('user-1', true);

    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { role: 'admin' },
    });
    expect(mockFrom).toHaveBeenCalledWith('users_users');
    expect(mockUpdate).toHaveBeenCalledWith({ role: 'admin' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1');
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
