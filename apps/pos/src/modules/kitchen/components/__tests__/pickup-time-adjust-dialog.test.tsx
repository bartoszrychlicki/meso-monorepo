import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { PickupTimeAdjustDialog } from '../pickup-time-adjust-dialog';
import { formatKitchenScheduledTime } from '../../formatting';

describe('PickupTimeAdjustDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates preview time only inside the dialog until confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const currentPickupDate = new Date();
    currentPickupDate.setHours(12, 30, 0, 0);
    const currentPickupTime = currentPickupDate.toISOString();
    const nextPickupTime = new Date(currentPickupDate.getTime() + 15 * 60_000).toISOString();

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={vi.fn()}
        currentPickupTime={currentPickupTime}
        onConfirm={onConfirm}
        openedAtTimestamp={currentPickupDate.getTime()}
      />
    );

    expect(
      document.querySelector('[data-field="current-pickup-time"]')?.textContent
    ).toBe(formatKitchenScheduledTime(currentPickupTime));
    expect(
      document.querySelector('[data-field="next-pickup-time"]')?.textContent
    ).toBe(formatKitchenScheduledTime(currentPickupTime));

    await user.click(screen.getByRole('button', { name: '+15 min' }));
    expect(
      document.querySelector('[data-field="next-pickup-time"]')?.textContent
    ).toBe(formatKitchenScheduledTime(nextPickupTime));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(onConfirm).toHaveBeenCalledWith(nextPickupTime);
  });

  it('does not call confirm when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={onOpenChange}
        currentPickupTime="2026-03-17T12:30:00.000Z"
        onConfirm={onConfirm}
        openedAtTimestamp={new Date('2026-03-17T12:30:00.000Z').getTime()}
      />
    );

    await user.click(screen.getByRole('button', { name: '+10 min' }));
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('adds larger positive adjustments when the current pickup time is already overdue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'));

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={vi.fn()}
        currentPickupTime="2026-03-17T11:30:00.000Z"
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        openedAtTimestamp={new Date('2026-03-17T12:00:00.000Z').getTime()}
      />
    );

    expect(screen.getByRole('button', { name: '+35 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+45 min' })).toBeInTheDocument();
  });

  it('hides adjustments that would still keep the pickup time in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'));

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={vi.fn()}
        currentPickupTime="2026-03-17T11:52:00.000Z"
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        openedAtTimestamp={new Date('2026-03-17T12:00:00.000Z').getTime()}
      />
    );

    expect(screen.queryByRole('button', { name: '-10 min' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '-5 min' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+5 min' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+10 min' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+15 min' })).toBeInTheDocument();
  });

  it('does not re-enable negative adjustments after reaching the first safe future time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'));

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={vi.fn()}
        currentPickupTime="2026-03-17T11:52:00.000Z"
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        openedAtTimestamp={new Date('2026-03-17T12:00:00.000Z').getTime()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+15 min' }));

    expect(screen.queryByRole('button', { name: '-10 min' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '-5 min' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+5 min' })).toBeInTheDocument();
  });

  it('submits pickup time adjustment only once while the request is pending', async () => {
    const user = userEvent.setup();
    let resolveConfirm: (() => void) | null = null;
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );

    render(
      <PickupTimeAdjustDialog
        open
        onOpenChange={vi.fn()}
        currentPickupTime="2026-03-17T12:30:00.000Z"
        onConfirm={onConfirm}
        openedAtTimestamp={new Date('2026-03-17T12:30:00.000Z').getTime()}
      />
    );

    await user.click(screen.getByRole('button', { name: '+10 min' }));
    const confirmButton = screen.getByRole('button', { name: 'Zapisz' });

    await user.click(confirmButton);
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirmButton).toBeDisabled();

    await act(async () => {
      resolveConfirm?.();
    });
  });
});
