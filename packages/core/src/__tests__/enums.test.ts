import { describe, it, expect } from 'vitest';
import {
  OrderStatus,
  OrderChannel,
  PaymentMethod,
  PaymentStatus,
  ModifierAction,
  LoyaltyTier,
} from '../index';

describe('@meso/core enums', () => {
  it('exports OrderStatus with all values', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.DELIVERED).toBe('delivered');
    expect(OrderStatus.CANCELLED).toBe('cancelled');
  });

  it('exports OrderChannel with delivery_app', () => {
    expect(OrderChannel.DELIVERY_APP).toBe('delivery_app');
  });

  it('exports ModifierAction with all values', () => {
    expect(ModifierAction.ADD).toBe('add');
    expect(ModifierAction.REMOVE).toBe('remove');
    expect(ModifierAction.SUBSTITUTE).toBe('substitute');
    expect(ModifierAction.PREPARATION).toBe('preparation');
  });

  it('exports LoyaltyTier', () => {
    expect(LoyaltyTier.BRONZE).toBe('bronze');
    expect(LoyaltyTier.GOLD).toBe('gold');
  });
});
