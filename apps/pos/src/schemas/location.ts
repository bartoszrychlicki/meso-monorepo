import { z } from 'zod';
import { LocationType } from '@/types/enums';

// --- Address ---

export const AddressSchema = z.object({
  street: z.string().min(1, 'Ulica jest wymagana'),
  city: z.string().min(1, 'Miasto jest wymagane'),
  postal_code: z.string().min(1, 'Kod pocztowy jest wymagany'),
  country: z.string().default('PL'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

// --- Location CRUD ---

export const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Nazwa lokalizacji jest wymagana'),
  type: z.nativeEnum(LocationType, { message: 'Wybierz typ lokalizacji' }),
  address: AddressSchema,
  phone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();

// --- Delivery Config ---

export const UpdateDeliveryConfigSchema = z.object({
  delivery_radius_km: z.number().min(0.1, 'Min. 0.1 km').max(100, 'Max. 100 km'),
  delivery_fee: z.number().min(0, 'Nie może być ujemna'),
  min_order_amount: z.number().min(0, 'Nie może być ujemna'),
  estimated_delivery_minutes: z.number().int().min(1, 'Min. 1 minuta'),
  is_delivery_active: z.boolean(),
  is_pickup_active: z.boolean(),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  pickup_time_min: z.number().int().min(1),
  pickup_time_max: z.number().int().min(1),
  pickup_buffer_after_open: z.number().int().min(0),
  pickup_buffer_before_close: z.number().int().min(0),
  pay_on_pickup_enabled: z.boolean(),
  pay_on_pickup_fee: z.number().min(0),
  pay_on_pickup_max_order: z.number().min(0),
  ordering_paused_until_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format RRRR-MM-DD').nullable(),
  ordering_paused_until_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM').nullable(),
}).partial().superRefine((data, ctx) => {
  const hasPauseDate = Object.prototype.hasOwnProperty.call(data, 'ordering_paused_until_date');
  const hasPauseTime = Object.prototype.hasOwnProperty.call(data, 'ordering_paused_until_time');

  if (!hasPauseDate && !hasPauseTime) {
    return;
  }

  const isPauseDateSet = data.ordering_paused_until_date != null;
  const isPauseTimeSet = data.ordering_paused_until_time != null;

  if (hasPauseDate !== hasPauseTime || isPauseDateSet !== isPauseTimeSet) {
    if (!isPauseDateSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ordering_paused_until_date'],
        message: 'Data wznowienia jest wymagana razem z godzina',
      });
    }

    if (!isPauseTimeSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ordering_paused_until_time'],
        message: 'Godzina wznowienia jest wymagana razem z data',
      });
    }
  }
});

// --- Receipt Config ---

export const UpdateReceiptConfigSchema = z.object({
  receipt_header: z.string().nullable(),
  receipt_footer: z.string().nullable(),
  print_automatically: z.boolean().nullable(),
  show_logo: z.boolean().nullable(),
});

// --- KDS Config ---

export const UpdateKdsConfigSchema = z.object({
  alert_time_minutes: z.number().int().min(1).nullable(),
  auto_accept_orders: z.boolean().nullable(),
  sound_enabled: z.boolean().nullable(),
  display_priority: z.boolean().nullable(),
});

// --- Global Defaults ---

export const UpdateReceiptDefaultsSchema = z.object({
  header: z.string().min(1, 'Nagłówek jest wymagany'),
  footer: z.string().min(1, 'Stopka jest wymagana'),
  print_automatically: z.boolean(),
  show_logo: z.boolean(),
});

export const UpdateKdsDefaultsSchema = z.object({
  alert_time_minutes: z.number().int().min(1, 'Min. 1 minuta'),
  auto_accept_orders: z.boolean(),
  sound_enabled: z.boolean(),
  display_priority: z.boolean(),
});

// --- Type exports ---

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
export type UpdateDeliveryConfigInput = z.infer<typeof UpdateDeliveryConfigSchema>;
export type UpdateReceiptConfigInput = z.infer<typeof UpdateReceiptConfigSchema>;
export type UpdateKdsConfigInput = z.infer<typeof UpdateKdsConfigSchema>;
export type UpdateReceiptDefaultsInput = z.infer<typeof UpdateReceiptDefaultsSchema>;
export type UpdateKdsDefaultsInput = z.infer<typeof UpdateKdsDefaultsSchema>;
