import { describe, it, expect } from 'vitest';
import { MenuModifierSchema } from '../menu';

describe('MenuModifierSchema', () => {
  const validData = {
    name: 'Extra Cheese',
    price: 3.5,
    modifier_action: 'add' as const,
    is_available: true,
    sort_order: 1,
  };

  it('validates correct modifier data', () => {
    const result = MenuModifierSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty name (min 1 char)', () => {
    const data = { ...validData, name: '' };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name: _name, ...dataWithoutName } = validData;
    const result = MenuModifierSchema.safeParse(dataWithoutName);
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const data = { ...validData, price: -1 };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts price of 0 (free modifiers like sauces)', () => {
    const data = { ...validData, price: 0 };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(0);
    }
  });

  it('defaults modifier_action to add', () => {
    const { modifier_action: _action, ...dataWithoutAction } = validData;
    const result = MenuModifierSchema.safeParse(dataWithoutAction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifier_action).toBe('add');
    }
  });

  it('accepts modifier_action of remove', () => {
    const data = { ...validData, modifier_action: 'remove' as const };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifier_action).toBe('remove');
    }
  });

  it('rejects invalid modifier_action', () => {
    const data = { ...validData, modifier_action: 'invalid' };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts recipe_id as valid UUID', () => {
    const data = { ...validData, recipe_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    }
  });

  it('accepts recipe_id as null', () => {
    const data = { ...validData, recipe_id: null };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBeNull();
    }
  });

  it('accepts missing recipe_id (optional)', () => {
    const result = MenuModifierSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipe_id).toBeUndefined();
    }
  });

  it('rejects invalid recipe_id (not a UUID)', () => {
    const data = { ...validData, recipe_id: 'not-a-uuid' };
    const result = MenuModifierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('defaults is_available to true', () => {
    const { is_available: _avail, ...dataWithoutAvail } = validData;
    const result = MenuModifierSchema.safeParse(dataWithoutAvail);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_available).toBe(true);
    }
  });

  it('defaults sort_order to 0', () => {
    const { sort_order: _order, ...dataWithoutOrder } = validData;
    const result = MenuModifierSchema.safeParse(dataWithoutOrder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
    }
  });
});
