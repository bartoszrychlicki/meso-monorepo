import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('includes refund checkbox only when refundable amount is provided', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <OrderCancelDialog
        open
        onOpenChange={() => undefined}
        onConfirm={onConfirm}
        orderNumber="ORD-3"
        refundableAmount={42}
      />
    );

    expect(screen.getByText(/Czy od razu zlecić zwrot płatności/)).toBeInTheDocument();

    await user.click(screen.getByText('Brak składników'));
    await user.click(screen.getByLabelText('Zlec dodatkowo automatyczny zwrot platnosci'));
    await user.click(screen.getByRole('button', { name: 'Anuluj zamówienie' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        requestRefund: true,
      })
    );
  });
});
