import type { BaseRepository } from '@/lib/data/base-repository';
import { createServerRepository } from '@/lib/data/server-repository-factory';
import type { Order } from '@/types/order';
import type {
  PosbistroMenuMapping,
  PosbistroMenuMappingType,
  PosbistroProductType,
} from './types';

type MenuMappingRepo = Pick<
  BaseRepository<PosbistroMenuMapping>,
  'findAll' | 'findById' | 'create' | 'update' | 'delete'
>;

export interface PosbistroResolvedModifierMapping {
  addonId?: string;
  addonSku?: number;
}

export interface PosbistroResolvedItemMapping {
  productType: PosbistroProductType;
  variationId?: string;
  variationSku?: number;
  modifierMappings: Record<string, PosbistroResolvedModifierMapping>;
}

export interface PosbistroResolvedOrderMappings {
  itemMappings: Record<string, PosbistroResolvedItemMapping>;
}

export class PosbistroMenuMappingError extends Error {
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PosbistroMenuMappingError';
    this.details = details;
  }
}

function createMenuMappingRepo(): MenuMappingRepo {
  return createServerRepository<PosbistroMenuMapping>('posbistro_menu_mappings');
}

function matchesMappingEntity(
  mapping: PosbistroMenuMapping,
  input: {
    mapping_type: PosbistroMenuMappingType;
    meso_product_id?: string | null;
    meso_variant_id?: string | null;
    meso_modifier_id?: string | null;
  }
): boolean {
  if (mapping.mapping_type !== input.mapping_type) return false;

  if (input.mapping_type === 'product') {
    return mapping.meso_product_id === (input.meso_product_id ?? null);
  }

  if (input.mapping_type === 'variant') {
    return (
      mapping.meso_product_id === (input.meso_product_id ?? null) &&
      mapping.meso_variant_id === (input.meso_variant_id ?? null)
    );
  }

  return mapping.meso_modifier_id === (input.meso_modifier_id ?? null);
}

async function getAllMenuMappings(
  mappingRepo: MenuMappingRepo
): Promise<PosbistroMenuMapping[]> {
  const page = await mappingRepo.findAll({
    page: 1,
    per_page: 1000,
    sort_by: 'created_at',
    sort_order: 'asc',
  });
  return page.data;
}

export async function listPosbistroMenuMappings(filters?: {
  mapping_type?: PosbistroMenuMappingType | null;
  meso_product_id?: string | null;
  meso_variant_id?: string | null;
  meso_modifier_id?: string | null;
  is_active?: boolean;
}, deps?: {
  mappingRepo?: MenuMappingRepo;
}): Promise<PosbistroMenuMapping[]> {
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  const mappings = await getAllMenuMappings(mappingRepo);

  return mappings.filter((mapping) => {
    if (filters?.mapping_type && mapping.mapping_type !== filters.mapping_type) return false;
    if (filters?.meso_product_id && mapping.meso_product_id !== filters.meso_product_id) return false;
    if (filters?.meso_variant_id && mapping.meso_variant_id !== filters.meso_variant_id) return false;
    if (filters?.meso_modifier_id && mapping.meso_modifier_id !== filters.meso_modifier_id) return false;
    if (typeof filters?.is_active === 'boolean' && mapping.is_active !== filters.is_active) return false;
    return true;
  });
}

export async function getPosbistroMenuMappingById(
  id: string,
  deps?: {
    mappingRepo?: MenuMappingRepo;
  }
): Promise<PosbistroMenuMapping | null> {
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  return mappingRepo.findById(id);
}

export async function deletePosbistroMenuMapping(
  id: string,
  deps?: {
    mappingRepo?: MenuMappingRepo;
  }
): Promise<void> {
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  await mappingRepo.delete(id);
}

export async function upsertPosbistroMenuMapping(
  input: Omit<PosbistroMenuMapping, 'id' | 'created_at' | 'updated_at'>,
  deps?: {
    mappingRepo?: MenuMappingRepo;
  }
): Promise<PosbistroMenuMapping> {
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  const mappings = await getAllMenuMappings(mappingRepo);
  const existing = mappings.find((mapping) =>
    matchesMappingEntity(mapping, input)
  );

  if (existing) {
    return mappingRepo.update(existing.id, input);
  }

  return mappingRepo.create(input);
}

function findProductOrVariantMapping(
  mappings: PosbistroMenuMapping[],
  item: Order['items'][number]
): PosbistroMenuMapping | undefined {
  if (item.variant_id) {
    return mappings.find((mapping) =>
      mapping.is_active &&
      mapping.mapping_type === 'variant' &&
      mapping.meso_product_id === item.product_id &&
      mapping.meso_variant_id === item.variant_id
    );
  }

  return mappings.find((mapping) =>
    mapping.is_active &&
    mapping.mapping_type === 'product' &&
    mapping.meso_product_id === item.product_id
  );
}

function ensureResolvedItemMapping(
  item: Order['items'][number],
  mapping: PosbistroMenuMapping | undefined
): PosbistroResolvedItemMapping {
  if (!mapping) {
    throw new PosbistroMenuMappingError(
      item.variant_id
        ? `Missing POSBistro variant mapping for "${item.product_name}" (${item.variant_id})`
        : `Missing POSBistro product mapping for "${item.product_name}" (${item.product_id})`,
      {
        order_item_id: item.id,
        meso_product_id: item.product_id,
        meso_variant_id: item.variant_id ?? null,
      }
    );
  }

  return {
    productType: mapping.posbistro_product_type || 'SIMPLE',
    variationId: mapping.posbistro_variation_id || undefined,
    variationSku: mapping.posbistro_variation_sku || undefined,
    modifierMappings: {},
  };
}

function resolveModifierMapping(
  mappings: PosbistroMenuMapping[],
  modifier: NonNullable<Order['items'][number]['modifiers']>[number]
): PosbistroResolvedModifierMapping {
  const mapping = mappings.find((candidate) =>
    candidate.is_active &&
    candidate.mapping_type === 'modifier' &&
    candidate.meso_modifier_id === modifier.modifier_id
  );

  if (!mapping) {
    throw new PosbistroMenuMappingError(
      `Missing POSBistro modifier mapping for "${modifier.name}" (${modifier.modifier_id})`,
      {
        meso_modifier_id: modifier.modifier_id,
      }
    );
  }

  return {
    addonId: mapping.posbistro_addon_id || undefined,
    addonSku: mapping.posbistro_addon_sku || undefined,
  };
}

export async function resolvePosbistroMappingsForOrder(
  order: Pick<Order, 'items'>,
  deps?: {
    mappingRepo?: MenuMappingRepo;
  }
): Promise<PosbistroResolvedOrderMappings> {
  const mappingRepo = deps?.mappingRepo ?? createMenuMappingRepo();
  const mappings = await getAllMenuMappings(mappingRepo);
  const itemMappings: Record<string, PosbistroResolvedItemMapping> = {};

  for (const item of order.items) {
    const itemMapping = ensureResolvedItemMapping(
      item,
      findProductOrVariantMapping(mappings, item)
    );

    for (const modifier of item.modifiers || []) {
      itemMapping.modifierMappings[modifier.modifier_id] = resolveModifierMapping(
        mappings,
        modifier
      );
    }

    itemMappings[item.id] = itemMapping;
  }

  return {
    itemMappings,
  };
}
