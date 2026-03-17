import { describe, expect, it } from 'vitest';
import { formatCustomerPickupTime, getPickupTimeDetails } from '../pickup-time';

describe('pickup-time helpers', () => {
  it('returns current and previous pickup times for adjusted pickup orders', () => {
    expect(
      getPickupTimeDetails({
        delivery_type: 'pickup',
        scheduled_time: '2026-03-17T12:30:00.000Z',
        estimated_ready_at: '2026-03-17T12:45:00.000Z',
        metadata: {
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-17T12:30:00.000Z',
              new_time: '2026-03-17T12:45:00.000Z',
              changed_at: '2026-03-17T12:10:00.000Z',
              source: 'kds',
            },
          ],
        },
      })
    ).toEqual({
      currentTime: '2026-03-17T12:45:00.000Z',
      previousTime: '2026-03-17T12:30:00.000Z',
      isAdjusted: true,
    });
  });

  it('returns no pickup details for delivery orders', () => {
    expect(
      getPickupTimeDetails({
        delivery_type: 'delivery',
        scheduled_time: '2026-03-17T12:30:00.000Z',
      })
    ).toEqual({
      currentTime: null,
      previousTime: null,
      isAdjusted: false,
    });
  });

  it('formats same-day pickup time as hour and minute', () => {
    expect(
      formatCustomerPickupTime(
        '2026-03-17T12:45:00.000Z',
        new Date('2026-03-17T09:00:00.000Z')
      )
    ).toBe('13:45');
  });
});
