import { z } from 'zod';
import { DeliverySource, VatRate } from '@/types/enums';

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Nazwa dostawcy wymagana').max(100, 'Nazwa za dluga').describe('Supplier name'),
  phone: z.string().max(20).optional().nullable().describe('Phone number'),
  email: z.string().email('Niepoprawny email').optional().nullable().describe('Email'),
  notes: z.string().max(500).optional().nullable().describe('Notes'),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export const DeliveryItemSchema = z.object({
  stock_item_id: z.string().uuid('Niepoprawne ID pozycji').describe('Stock item ID'),
  quantity_ordered: z.number().min(0).optional().nullable().describe('Quantity ordered'),
  quantity_received: z.number().min(0.001, 'Ilosc musi byc wieksza niz 0').describe('Quantity received'),
  supplier_quantity_received: z.number().min(0.001, 'Ilosc dostawcy musi byc wieksza niz 0').optional().nullable().describe('Quantity received in supplier unit'),
  supplier_unit: z.string().min(1, 'Jednostka dostawcy jest wymagana').optional().nullable().describe('Supplier unit'),
  unit_price_net: z.number().min(0).optional().nullable().describe('Net unit price'),
  price_per_kg_net: z.number().min(0).optional().nullable().describe('Net price per kg'),
  vat_rate: z.nativeEnum(VatRate).optional().nullable().describe('VAT rate'),
  expiry_date: z.string().optional().nullable().describe('Expiry date'),
  ai_matched_name: z.string().optional().nullable().describe('Original name from AI scan'),
  ai_confidence: z.number().min(0).max(1).optional().nullable().describe('AI match confidence'),
  notes: z.string().max(500).optional().nullable().describe('Notes'),
}).superRefine((item, ctx) => {
  if (item.supplier_quantity_received != null && !item.supplier_unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supplier_unit'],
      message: 'Jednostka dostawcy jest wymagana',
    });
  }
});

export const CreateDeliverySchema = z.object({
  warehouse_id: z.string().uuid('Wybierz magazyn').describe('Target warehouse ID'),
  supplier_id: z.string().uuid().optional().nullable().describe('Supplier ID'),
  document_number: z.string().max(100).optional().nullable().describe('External document number'),
  document_date: z.string().optional().nullable().describe('Document date'),
  source: z.nativeEnum(DeliverySource).default(DeliverySource.MANUAL).describe('Delivery source'),
  source_image_url: z.string().optional().nullable().describe('Scanned document image URL'),
  notes: z.string().max(1000).optional().nullable().describe('Notes'),
  items: z.array(DeliveryItemSchema).min(1, 'Dodaj co najmniej jedna pozycje').describe('Delivery items'),
});

export const UpdateDeliverySchema = CreateDeliverySchema.partial().omit({ items: true });

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
export type DeliveryItemInput = z.infer<typeof DeliveryItemSchema>;
export type CreateDeliveryInput = z.infer<typeof CreateDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof UpdateDeliverySchema>;
