import { z } from 'zod';
import { StockMovementType } from '@/types/enums';

export const AdjustStockSchema = z.object({
  stock_item_id: z.string().min(1, 'Pozycja magazynowa jest wymagana'),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().min(0.01, 'Ilość musi być większa od 0'),
  reason: z.string().optional(),
  performed_by: z.string().min(1, 'Osoba wykonująca jest wymagana'),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
