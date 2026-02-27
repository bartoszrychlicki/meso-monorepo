import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock server actions for admin users page
vi.mock('../actions', () => ({
  getStaffUsers: vi.fn(),
  createStaffUser: vi.fn(),
  resetStaffPassword: vi.fn(),
  toggleStaffActive: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import AdminUsersPage from '../page';
import {
  getStaffUsers,
  createStaffUser,
} from '../actions';
import { toast } from 'sonner';

const mockGetStaffUsers = vi.mocked(getStaffUsers);
const mockCreateStaffUser = vi.mocked(createStaffUser);
const mockToast = vi.mocked(toast);

const mockUsers = [
  {
    id: '1',
    name: 'Jan Kowalski',
    email: 'jan@mesopos.pl',
    role: 'admin',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Anna Nowak',
    email: 'anna@mesopos.pl',
    role: 'manager',
    is_active: false,
    created_at: '2025-02-01T00:00:00Z',
  },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially, then renders user table', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: mockUsers });

    render(<AdminUsersPage />);

    // Should show loading indicator initially
    expect(screen.getByRole('status') || screen.getByText(/ładowanie|loading/i)).toBeTruthy();

    // After loading, the table should appear with user data
    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });
  });

  it('renders user list with name, email, role, status columns', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: mockUsers });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Verify all user data is rendered
    expect(screen.getByText('jan@mesopos.pl')).toBeInTheDocument();
    expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
    expect(screen.getByText('anna@mesopos.pl')).toBeInTheDocument();

    // Verify role and status indicators exist
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/manager/i)).toBeInTheDocument();
  });

  it('shows empty state message when no users', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: [] });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/brak użytkowników|nie znaleziono|no users/i)
      ).toBeInTheDocument();
    });
  });

  it('"Dodaj uzytkownika" button opens dialog', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: mockUsers });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', {
      name: /dodaj użytkownika|dodaj uzytkownika/i,
    });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);

    await waitFor(() => {
      // Dialog should be visible with form fields
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('create user form validates required fields', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: mockUsers });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Open the dialog
    const addButton = screen.getByRole('button', {
      name: /dodaj użytkownika|dodaj uzytkownika/i,
    });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Try to submit the form without filling fields
    const submitButton = screen.getByRole('button', { name: /zapisz|utwórz|dodaj$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Should show validation errors for required fields
      const errors = screen.getAllByText(/wymagane|required|nieprawidłowy/i);
      expect(errors.length).toBeGreaterThan(0);
    });

    // createStaffUser should NOT have been called
    expect(mockCreateStaffUser).not.toHaveBeenCalled();
  });

  it('successful user creation closes dialog and reloads list', async () => {
    mockGetStaffUsers.mockResolvedValue({ data: mockUsers });
    mockCreateStaffUser.mockResolvedValue({ success: true });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Open the dialog
    const addButton = screen.getByRole('button', {
      name: /dodaj użytkownika|dodaj uzytkownika/i,
    });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill the form
    fireEvent.change(screen.getByLabelText(/imi[eę] i nazwisko|nazwa|name/i), {
      target: { value: 'Nowy Pracownik' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nowy@mesopos.pl' },
    });
    fireEvent.change(screen.getByLabelText(/has[lł]o|password/i), {
      target: { value: 'securePass1' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /zapisz|utwórz|dodaj$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateStaffUser).toHaveBeenCalledTimes(1);
    });

    // Dialog should close after success
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Should show success toast
    expect(mockToast.success).toHaveBeenCalled();

    // Staff list should be reloaded (getStaffUsers called again)
    expect(mockGetStaffUsers).toHaveBeenCalledTimes(2);
  });
});
