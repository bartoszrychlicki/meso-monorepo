import { describe, expect, it } from 'vitest';
import { resolveInitialModifierGroupIds } from '../product-form.utils';

describe('resolveInitialModifierGroupIds', () => {
  it('uses legacy group ids only when relational ids are still undefined', () => {
    expect(resolveInitialModifierGroupIds(undefined, ['legacy-group'])).toEqual([
      'legacy-group',
    ]);
  });

  it('preserves an empty relational assignment', () => {
    expect(resolveInitialModifierGroupIds([], ['legacy-group'])).toEqual([]);
  });

  it('prefers relational group ids when they are present', () => {
    expect(resolveInitialModifierGroupIds(['group-1'], ['legacy-group'])).toEqual([
      'group-1',
    ]);
  });
});
