import { describe, expect, it } from 'vitest';
import {
  appendPickupTimeAdjustment,
  getLatestPickupTimeAdjustment,
  readPickupTimeAdjustments,
} from '../pickup-time-adjustments';

describe('pickup-time-adjustments', () => {
  it('returns only valid pickup time adjustments', () => {
    expect(
      readPickupTimeAdjustments({
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-17T12:30:00.000Z',
            new_time: '2026-03-17T12:45:00.000Z',
            changed_at: '2026-03-17T12:05:00.000Z',
            source: 'kds',
          },
          {
            previous_time: '2026-03-17T12:45:00.000Z',
            changed_at: '2026-03-17T12:10:00.000Z',
          },
        ],
      })
    ).toEqual([
      {
        previous_time: '2026-03-17T12:30:00.000Z',
        new_time: '2026-03-17T12:45:00.000Z',
        changed_at: '2026-03-17T12:05:00.000Z',
        source: 'kds',
      },
    ]);
  });

  it('appends a new pickup time adjustment while preserving existing metadata', () => {
    expect(
      appendPickupTimeAdjustment(
        {
          foo: 'bar',
          pickup_time_adjustments: [
            {
              previous_time: '2026-03-17T12:30:00.000Z',
              new_time: '2026-03-17T12:45:00.000Z',
              changed_at: '2026-03-17T12:05:00.000Z',
              source: 'kds',
            },
          ],
        },
        {
          previous_time: '2026-03-17T12:45:00.000Z',
          new_time: '2026-03-17T12:55:00.000Z',
          changed_at: '2026-03-17T12:10:00.000Z',
          source: 'kds',
        }
      )
    ).toEqual({
      foo: 'bar',
      pickup_time_adjustments: [
        {
          previous_time: '2026-03-17T12:30:00.000Z',
          new_time: '2026-03-17T12:45:00.000Z',
          changed_at: '2026-03-17T12:05:00.000Z',
          source: 'kds',
        },
        {
          previous_time: '2026-03-17T12:45:00.000Z',
          new_time: '2026-03-17T12:55:00.000Z',
          changed_at: '2026-03-17T12:10:00.000Z',
          source: 'kds',
        },
      ],
    });
  });

  it('returns the latest pickup time adjustment', () => {
    expect(
      getLatestPickupTimeAdjustment({
        pickup_time_adjustments: [
          {
            previous_time: '2026-03-17T12:30:00.000Z',
            new_time: '2026-03-17T12:45:00.000Z',
            changed_at: '2026-03-17T12:05:00.000Z',
            source: 'kds',
          },
          {
            previous_time: '2026-03-17T12:45:00.000Z',
            new_time: '2026-03-17T12:55:00.000Z',
            changed_at: '2026-03-17T12:10:00.000Z',
            source: 'kds',
          },
        ],
      })
    ).toEqual({
      previous_time: '2026-03-17T12:45:00.000Z',
      new_time: '2026-03-17T12:55:00.000Z',
      changed_at: '2026-03-17T12:10:00.000Z',
      source: 'kds',
    });
  });
});
