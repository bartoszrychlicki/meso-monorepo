import { describe, expect, it } from 'vitest';
import { POS_MESSAGES } from '../messages';

describe('POS i18n messages', () => {
  it('keeps English dictionary in sync with Polish keys', () => {
    expect(Object.keys(POS_MESSAGES.en).sort()).toEqual(Object.keys(POS_MESSAGES.pl).sort());
  });
});
