import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DeliveryConfigForm } from '../delivery-config-form';

const mockSaveDeliveryConfig = vi.fn().mockResolvedValue(undefined);

vi.mock('@/modules/settings/store', () => ({
  useLocationSettingsStore: vi.fn(),
}));

import { useLocationSettingsStore } from '@/modules/settings/store';

const mockUseLocationSettingsStore = vi.mocked(useLocationSettingsStore);

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('DeliveryConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T10:00:00'));
    mockUseLocationSettingsStore.mockReturnValue({
      deliveryConfig: {
        id: 'cfg-1',
        location_id: 'loc-1',
        delivery_radius_km: 5,
        delivery_fee: 7.99,
        min_order_amount: 35,
        estimated_delivery_minutes: 40,
        is_delivery_active: false,
        is_pickup_active: true,
        opening_time: '11:00:00',
        closing_time: '22:00:00',
        pickup_time_min: 10,
        pickup_time_max: 30,
        pickup_buffer_after_open: 0,
        pickup_buffer_before_close: 0,
        pay_on_pickup_enabled: false,
        pay_on_pickup_fee: 0,
        pay_on_pickup_max_order: 0,
        ordering_paused_until_date: null,
        ordering_paused_until_time: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      saveDeliveryConfig: mockSaveDeliveryConfig,
    } as ReturnType<typeof useLocationSettingsStore>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps pickup and pay-on-pickup controls enabled when delivery is inactive', () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    expect(screen.getByLabelText('Promien dostawy (km)')).toBeDisabled();
    expect(screen.getByLabelText('Godzina otwarcia')).toBeEnabled();
    expect(screen.getByLabelText('Godzina zamkniecia')).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' })).not.toBeChecked();
    expect(screen.getByLabelText('Data ponownego otwarcia')).toBeDisabled();
    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Odbior osobisty aktywny' })).toBeEnabled();
    expect(screen.getByLabelText('Minimalny czas odbioru (min)')).toBeEnabled();
    expect(screen.getByLabelText('Maksymalny czas odbioru (min)')).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Platnosc przy odbiorze' })).toBeEnabled();
    expect(screen.getByLabelText('Oplata za platnosc przy odbiorze (PLN)')).toBeEnabled();
    expect(screen.getByLabelText('Max kwota zamowienia (PLN)')).toBeEnabled();
  });

  it('uses opening_time as default reopen time for legacy configs', () => {
    mockUseLocationSettingsStore.mockReturnValue({
      deliveryConfig: {
        id: 'cfg-1',
        location_id: 'loc-1',
        delivery_radius_km: 5,
        delivery_fee: 7.99,
        min_order_amount: 35,
        estimated_delivery_minutes: 40,
        is_delivery_active: false,
        is_pickup_active: true,
        opening_time: '11:30:00',
        closing_time: '22:00:00',
        pickup_time_min: 10,
        pickup_time_max: 30,
        pickup_buffer_after_open: 0,
        pickup_buffer_before_close: 0,
        pay_on_pickup_enabled: false,
        pay_on_pickup_fee: 0,
        pay_on_pickup_max_order: 0,
        ordering_paused_until_date: '2026-03-20',
        ordering_paused_until_time: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      saveDeliveryConfig: mockSaveDeliveryConfig,
    } as ReturnType<typeof useLocationSettingsStore>);

    render(<DeliveryConfigForm locationId="loc-1" />);

    expect(screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' })).toBeChecked();
    expect(screen.getByLabelText('Data ponownego otwarcia')).toHaveValue('2026-03-20');
    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toHaveValue('11:30');
  });

  it('saves explicit reopen date and time', async () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    fireEvent.click(screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' }));
    fireEvent.change(screen.getByLabelText('Data ponownego otwarcia'), {
      target: { value: '2026-03-20' },
    });

    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toHaveValue('11:00');

    fireEvent.change(screen.getByLabelText('Godzina ponownego otwarcia'), {
      target: { value: '12:15' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz ustawienia' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSaveDeliveryConfig).toHaveBeenCalledWith(
      'loc-1',
      expect.objectContaining({
        ordering_paused_until_date: '2026-03-20',
        ordering_paused_until_time: '12:15',
      })
    );
  });

  it('shows a clear warning when temporary closure is active', () => {
    mockUseLocationSettingsStore.mockReturnValue({
      deliveryConfig: {
        id: 'cfg-1',
        location_id: 'loc-1',
        delivery_radius_km: 5,
        delivery_fee: 7.99,
        min_order_amount: 35,
        estimated_delivery_minutes: 40,
        is_delivery_active: false,
        is_pickup_active: true,
        opening_time: '11:00:00',
        closing_time: '22:00:00',
        pickup_time_min: 10,
        pickup_time_max: 30,
        pickup_buffer_after_open: 0,
        pickup_buffer_before_close: 0,
        pay_on_pickup_enabled: false,
        pay_on_pickup_fee: 0,
        pay_on_pickup_max_order: 0,
        ordering_paused_until_date: '2099-03-20',
        ordering_paused_until_time: '12:15:00',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      saveDeliveryConfig: mockSaveDeliveryConfig,
    } as ReturnType<typeof useLocationSettingsStore>);

    render(<DeliveryConfigForm locationId="loc-1" />);

    expect(screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' })).toBeChecked();
    expect(screen.getByText('Tymczasowe zamkniecie lokalu jest aktywne')).toBeInTheDocument();
    expect(screen.getByText(/zamowienia online beda mozna skladac dopiero od/i)).toHaveTextContent(
      '20.03.2099 12:15'
    );
    expect(screen.getAllByText('Aktywne')).toHaveLength(2);
  });

  it('lets the operator quickly enable and disable temporary closure', () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    const toggle = screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' });

    act(() => {
      fireEvent.click(toggle);
    });

    expect(toggle).toBeChecked();
    expect(screen.getByLabelText('Data ponownego otwarcia')).toBeEnabled();
    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toBeEnabled();
    expect(screen.getByLabelText('Data ponownego otwarcia')).toHaveValue('2026-03-10');
    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toHaveValue('11:00');

    act(() => {
      fireEvent.click(toggle);
    });

    expect(toggle).not.toBeChecked();
    expect(screen.getByLabelText('Data ponownego otwarcia')).toHaveValue('');
    expect(screen.getByLabelText('Godzina ponownego otwarcia')).toHaveValue('');
    expect(screen.getByLabelText('Data ponownego otwarcia')).toBeDisabled();
  });

  it('blocks saving when reopen date is less than one hour in the future', async () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    fireEvent.click(screen.getByRole('switch', { name: 'Tymczasowe zamkniecie aktywne' }));
    fireEvent.change(screen.getByLabelText('Data ponownego otwarcia'), {
      target: { value: '2026-03-10' },
    });
    fireEvent.change(screen.getByLabelText('Godzina ponownego otwarcia'), {
      target: { value: '10:30' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz ustawienia' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(
      screen.getByText('Data ponownego otwarcia musi byc ustawiona przynajmniej godzine do przodu')
    ).toBeInTheDocument();
    expect(mockSaveDeliveryConfig).not.toHaveBeenCalled();
  });
});
