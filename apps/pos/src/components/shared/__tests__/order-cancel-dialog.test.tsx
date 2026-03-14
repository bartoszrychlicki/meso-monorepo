import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OrderCancelDialog } from '../order-cancel-dialog';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('OrderCancelDialog', () => {
  it('disables confirm until a predefined reason or custom text is provided', () => {
    render(
      <OrderCancelDialog
        open
        onOpenChange={() => undefined}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        orderNumber="ORD-1"
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Anuluj zamówienie' });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByText('Brak składników'));
    expect(confirmButton).toBeEnabled();
  });

  it('enables confirm when only custom reason is entered and shows customer warning', () => {
    render(
      <OrderCancelDialog
        open
        onOpenChange={() => undefined}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        orderNumber="ORD-2"
      />
    );

    fireEvent.change(screen.getByLabelText('Lub wpisz własny opis'), {
      target: { value: 'Kurier nie odbierze zamówienia' },
    });

    expect(screen.getByRole('button', { name: 'Anuluj zamówienie' })).toBeEnabled();
    expect(
      screen.getByText('Ten powód będzie widoczny dla klienta w aplikacji delivery.')
    ).toBeInTheDocument();
  });
});
