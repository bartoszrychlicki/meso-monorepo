import { z } from 'zod';

const MappingTypeSchema = z.enum(['product', 'variant', 'modifier']);
const PosbistroProductTypeSchema = z.enum(['SIMPLE', 'DELIVERY', 'PACKAGE', 'SET', 'PIZZA']);

export const PosbistroMenuMappingSchema = z.object({
  mapping_type: MappingTypeSchema,
  meso_product_id: z.string().uuid().nullable().optional(),
  meso_variant_id: z.string().uuid().nullable().optional(),
  meso_modifier_id: z.string().uuid().nullable().optional(),
  posbistro_product_type: PosbistroProductTypeSchema.nullable().optional().default('SIMPLE'),
  posbistro_variation_id: z.string().uuid().nullable().optional(),
  posbistro_variation_sku: z.number().int().positive().nullable().optional(),
  posbistro_addon_id: z.string().uuid().nullable().optional(),
  posbistro_addon_sku: z.number().int().positive().nullable().optional(),
  posbistro_name: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
  is_active: z.boolean().optional().default(true),
}).superRefine((value, ctx) => {
  if (value.mapping_type === 'product') {
    if (!value.meso_product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meso_product_id'],
        message: 'meso_product_id jest wymagane dla mapowania produktu',
      });
    }
    if (!value.posbistro_variation_id && !value.posbistro_variation_sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posbistro_variation_id'],
        message: 'Podaj posbistro_variation_id albo posbistro_variation_sku',
      });
    }
  }

  if (value.mapping_type === 'variant') {
    if (!value.meso_product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meso_product_id'],
        message: 'meso_product_id jest wymagane dla mapowania wariantu',
      });
    }
    if (!value.meso_variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meso_variant_id'],
        message: 'meso_variant_id jest wymagane dla mapowania wariantu',
      });
    }
    if (!value.posbistro_variation_id && !value.posbistro_variation_sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posbistro_variation_id'],
        message: 'Podaj posbistro_variation_id albo posbistro_variation_sku',
      });
    }
  }

  if (value.mapping_type === 'modifier') {
    if (!value.meso_modifier_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meso_modifier_id'],
        message: 'meso_modifier_id jest wymagane dla mapowania modyfikatora',
      });
    }
    if (!value.posbistro_addon_id && !value.posbistro_addon_sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posbistro_addon_id'],
        message: 'Podaj posbistro_addon_id albo posbistro_addon_sku',
      });
    }
  }
});

export type PosbistroMenuMappingInput = z.infer<typeof PosbistroMenuMappingSchema>;
