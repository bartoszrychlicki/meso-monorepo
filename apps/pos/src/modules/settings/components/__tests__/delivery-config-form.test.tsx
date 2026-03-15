import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('keeps pickup and pay-on-pickup controls enabled when delivery is inactive', () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    expect(screen.getByLabelText('Promien dostawy (km)')).toBeDisabled();
    expect(screen.getByLabelText('Data wznowienia zamowien online')).toBeEnabled();
    expect(screen.getByLabelText('Godzina wznowienia')).toBeDisabled();
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

    expect(screen.getByLabelText('Data wznowienia zamowien online')).toHaveValue('2026-03-20');
    expect(screen.getByLabelText('Godzina wznowienia')).toHaveValue('11:30');
  });

  it('saves explicit reopen date and time', async () => {
    render(<DeliveryConfigForm locationId="loc-1" />);

    fireEvent.change(screen.getByLabelText('Data wznowienia zamowien online'), {
      target: { value: '2026-03-20' },
    });

    expect(screen.getByLabelText('Godzina wznowienia')).toHaveValue('11:00');

    fireEvent.change(screen.getByLabelText('Godzina wznowienia'), {
      target: { value: '12:15' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz ustawienia' }));

    await waitFor(() => {
      expect(mockSaveDeliveryConfig).toHaveBeenCalledWith(
        'loc-1',
        expect.objectContaining({
          ordering_paused_until_date: '2026-03-20',
          ordering_paused_until_time: '12:15',
        })
      );
    });
  });
});
