import { describe, expect, it } from 'vitest';
import { ProductCategory } from '@/types/enums';
import { formatRecipeFoodCostDisplay } from '../recipe-calculator';

describe('formatRecipeFoodCostDisplay', () => {
  it('returns "Nie dotyczy" for semi-finished recipes without FC percentage', () => {
    expect(
      formatRecipeFoodCostDisplay(null, ProductCategory.SEMI_FINISHED)
    ).toMatchObject({
      text: 'Nie dotyczy',
      color: 'muted',
    });
  });

  it('returns "Brak ceny" for finished goods without FC percentage', () => {
    expect(
      formatRecipeFoodCostDisplay(null, ProductCategory.FINISHED_GOOD)
    ).toMatchObject({
      text: 'Brak ceny',
      color: 'yellow',
    });
  });

  it('formats percentage normally when FC is available', () => {
    expect(
      formatRecipeFoodCostDisplay(24.7, ProductCategory.FINISHED_GOOD)
    ).toMatchObject({
      text: '24.7%',
      color: 'green',
    });
  });
});
