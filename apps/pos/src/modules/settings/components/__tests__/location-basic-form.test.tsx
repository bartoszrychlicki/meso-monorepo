import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LocationType } from '@/types/enums';
import { Location } from '@/types/common';
import { LocationBasicForm } from '../location-basic-form';

// --- Polyfill for Radix / shadcn components ---
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Radix Select calls scrollIntoView on option focus, which jsdom doesn't support
  Element.prototype.scrollIntoView = vi.fn();
});

// --- Factory ---
function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Test Location',
    type: LocationType.FOOD_TRUCK,
    address: {
      street: 'ul. Testowa 1',
      city: 'Warszawa',
      postal_code: '00-001',
      country: 'PL',
    },
    phone: '+48 500 000 000',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// --- Tests ---
describe('LocationBasicForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields (name, type, address, phone)', () => {
    render(<LocationBasicForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText('Nazwa lokalizacji')).toBeInTheDocument();
    expect(screen.getByText('Typ lokalizacji')).toBeInTheDocument();
    expect(screen.getByLabelText('Ulica')).toBeInTheDocument();
    expect(screen.getByLabelText('Miasto')).toBeInTheDocument();
    expect(screen.getByLabelText('Kod pocztowy')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefon (opcjonalnie)')).toBeInTheDocument();
  });

  it('shows "Dodaj lokalizację" button text when no location prop', () => {
    render(<LocationBasicForm onSubmit={mockOnSubmit} />);

    expect(
      screen.getByRole('button', { name: /dodaj lokalizację/i })
    ).toBeInTheDocument();
  });

  it('shows "Zapisz" button text when location prop provided', () => {
    const location = makeLocation();
    render(<LocationBasicForm location={location} onSubmit={mockOnSubmit} />);

    expect(
      screen.getByRole('button', { name: /zapisz/i })
    ).toBeInTheDocument();
  });

  it('pre-fills form with existing location data', () => {
    const location = makeLocation({
      name: 'Food Truck Centrum',
      phone: '+48 123 456 789',
      address: {
        street: 'ul. Marszałkowska 10',
        city: 'Kraków',
        postal_code: '30-001',
        country: 'PL',
      },
    });

    render(<LocationBasicForm location={location} onSubmit={mockOnSubmit} />);

    expect(screen.getByDisplayValue('Food Truck Centrum')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ul. Marszałkowska 10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kraków')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+48 123 456 789')).toBeInTheDocument();
  });

  it('validates required fields (name, type, street, city, postal_code)', async () => {
    render(<LocationBasicForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /dodaj lokalizację/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    // Zod validation should produce error messages for empty required fields
    await waitFor(() => {
      const errors = screen.getAllByText(/jest wymagan[aey]|wybierz typ/i);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calls onSubmit with correct data on valid submission', async () => {
    // Use an existing location so the type is already set (avoids complex Radix Select interaction in jsdom)
    const location = makeLocation({
      name: 'Original Name',
      type: LocationType.FOOD_TRUCK,
      address: {
        street: 'ul. Stara 1',
        city: 'Poznań',
        postal_code: '60-001',
        country: 'PL',
      },
      phone: '+48 111 222 333',
    });

    render(<LocationBasicForm location={location} onSubmit={mockOnSubmit} />);

    // Modify text fields
    const nameInput = screen.getByLabelText('Nazwa lokalizacji');
    fireEvent.change(nameInput, { target: { value: 'Updated Location' } });

    const streetInput = screen.getByLabelText('Ulica');
    fireEvent.change(streetInput, { target: { value: 'ul. Nowa 5' } });

    const cityInput = screen.getByLabelText('Miasto');
    fireEvent.change(cityInput, { target: { value: 'Gdańsk' } });

    const postalInput = screen.getByLabelText('Kod pocztowy');
    fireEvent.change(postalInput, { target: { value: '80-001' } });

    const phoneInput = screen.getByLabelText('Telefon (opcjonalnie)');
    fireEvent.change(phoneInput, { target: { value: '+48 600 000 000' } });

    const submitButton = screen.getByRole('button', { name: /zapisz/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Updated Location');
    expect(submittedData.type).toBe(LocationType.FOOD_TRUCK);
    expect(submittedData.address.street).toBe('ul. Nowa 5');
    expect(submittedData.address.city).toBe('Gdańsk');
    expect(submittedData.address.postal_code).toBe('80-001');
    expect(submittedData.phone).toBe('+48 600 000 000');
  });

  it('shows status card only for existing locations', () => {
    // Without location prop, no status card
    const { unmount } = render(<LocationBasicForm onSubmit={mockOnSubmit} />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Lokalizacja aktywna')).not.toBeInTheDocument();
    unmount();

    // With location prop, status card is shown
    const location = makeLocation();
    render(<LocationBasicForm location={location} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Lokalizacja aktywna')).toBeInTheDocument();
  });
});
