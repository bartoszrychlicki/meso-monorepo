import { describe, expect, it } from 'vitest';
import { DELIVERY_MESSAGES } from '../messages';

describe('Delivery i18n messages', () => {
  it('keeps English dictionary in sync with Polish keys', () => {
    expect(Object.keys(DELIVERY_MESSAGES.en).sort()).toEqual(
      Object.keys(DELIVERY_MESSAGES.pl).sort()
    );
  });
});
