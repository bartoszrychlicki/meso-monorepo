import { createRepository } from '@/lib/data/repository-factory';
import { supabase } from '@/lib/supabase/client';
import {
  InventoryCategory,
  InventoryCount,
  InventoryCountDetail,
  InventoryCountLine,
  InventoryCountScope,
  StockItem,
  StockItemComponent,
  StockItemComponentWithDetails,
  StockItemUsage,
  StockItemWarehouseAssignment,
  Warehouse,
  WarehouseStock,
  WarehouseStockItem,
} from '@/types/inventory';
import { Recipe, RecipeIngredient } from '@/types/recipe';

const stockItemRepo = createRepository<StockItem>('stock_items');
const warehouseRepo = createRepository<Warehouse>('warehouses');
const warehouseStockRepo = createRepository<WarehouseStock>('warehouse_stock');
const inventoryCountRepo = createRepository<InventoryCount>('inventory_counts');
const inventoryCountLineRepo = createRepository<InventoryCountLine>('inventory_count_lines');
const stockItemComponentRepo = createRepository<StockItemComponent>('stock_item_components');
const inventoryCategoryRepo = createRepository<InventoryCategory>('inventory_categories');
const recipesRepo = createRepository<Recipe>('recipes');

const USING_SUPABASE_BACKEND = process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';

function recipeUsesStockItem(ingredients: RecipeIngredient[], stockItemId: string): boolean {
  return ingredients.some((ingredient) => {
    if (ingredient.type === 'stock_item' && ingredient.reference_id === stockItemId) {
      return true;
    }

    // Backward compatibility with legacy ingredient shape (stock_item_id)
    const legacyIngredient = ingredient as unknown as { stock_item_id?: string };
    return legacyIngredient.stock_item_id === stockItemId;
  });
}

function formatRecipeNames(recipes: Recipe[]): string {
  const uniqueNames = Array.from(
    new Set(
      recipes
        .map((recipe) => recipe.name.trim())
        .filter((name) => name.length > 0)
    )
  );

  if (uniqueNames.length <= 5) {
    return uniqueNames.join(', ');
  }

  return `${uniqueNames.slice(0, 5).join(', ')} (+${uniqueNames.length - 5} wiecej)`;
}

function getWarehouseStockKey(warehouseId: string, stockItemId: string): string {
  return `${warehouseId}:${stockItemId}`;
}

function getWarehouseName(warehouseId: string, warehouseMap: Map<string, Warehouse>): string {
  return warehouseMap.get(warehouseId)?.name ?? 'Nieznany magazyn';
}

function compareInventoryCountLineRows(
  a: Pick<InventoryCountLine, 'warehouse_id' | 'sort_order' | 'stock_item_name'>,
  b: Pick<InventoryCountLine, 'warehouse_id' | 'sort_order' | 'stock_item_name'>,
  warehouseMap: Map<string, Warehouse>
): number {
  const warehouseCompare = getWarehouseName(a.warehouse_id, warehouseMap).localeCompare(
    getWarehouseName(b.warehouse_id, warehouseMap),
    'pl'
  );
  if (warehouseCompare !== 0) {
    return warehouseCompare;
  }

  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }

  return a.stock_item_name.localeCompare(b.stock_item_name, 'pl');
}

function enrichInventoryCount(
  count: InventoryCount,
  lines: InventoryCountLine[],
  warehouseMap: Map<string, Warehouse>
): InventoryCount {
  const totalLines = lines.length;
  const countedLines = lines.filter((line) => line.counted_quantity !== null).length;
  const differenceLines = lines.filter(
    (line) => line.counted_quantity !== null && line.counted_quantity !== line.expected_quantity
  ).length;

  return {
    ...count,
    warehouse_name: count.warehouse_id ? getWarehouseName(count.warehouse_id, warehouseMap) : 'Wszystkie',
    total_lines: totalLines,
    counted_lines: countedLines,
    difference_lines: differenceLines,
  };
}

function sortInventoryCounts(counts: InventoryCount[]): InventoryCount[] {
  return [...counts].sort((a, b) => {
    if (a.created_at === b.created_at) {
      return b.number.localeCompare(a.number, 'pl');
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

function sortInventoryCountLines(
  lines: InventoryCountLine[],
  warehouseMap: Map<string, Warehouse>
): InventoryCountLine[] {
  return [...lines].sort((a, b) => compareInventoryCountLineRows(a, b, warehouseMap));
}

function buildInventoryCountNumber(existingCounts: InventoryCount[]): string {
  const year = new Date().getFullYear();
  const prefix = `/${year}`;
  const currentYearSequence = existingCounts.reduce((maxValue, count) => {
    if (!count.number.endsWith(prefix)) {
      return maxValue;
    }

    const match = count.number.match(/INW\s+(\d+)\/(\d{4})$/);
    if (!match) {
      return maxValue;
    }

    return Math.max(maxValue, Number(match[1]));
  }, 0);

  return `INW ${currentYearSequence + 1}/${year}`;
}

function isInventoryCountNumberConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('inventory_counts_number_key') || message.includes('duplicate key value');
}

async function bulkCreateInventoryCountLines(
  lines: Omit<InventoryCountLine, 'id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  if (lines.length === 0) {
    return;
  }

  if (inventoryCountLineRepo.bulkCreate) {
    const now = new Date().toISOString();
    await inventoryCountLineRepo.bulkCreate(
      lines.map((line) => ({
        ...line,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }))
    );
    return;
  }

  await Promise.all(lines.map((line) => inventoryCountLineRepo.create(line)));
}

async function createInventoryCountRecord(
  scope: InventoryCountScope,
  warehouseId: string | null
): Promise<InventoryCount> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const existingCounts = await inventoryCountRepo.findMany(() => true);
      return await inventoryCountRepo.create({
        number: buildInventoryCountNumber(existingCounts),
        scope,
        warehouse_id: warehouseId,
        status: 'draft',
        comment: null,
        created_by: null,
        approved_at: null,
      });
    } catch (error) {
      lastError = error;
      if (!isInventoryCountNumberConflict(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Nie udalo sie nadac numeru inwentaryzacji');
}

async function ensureDraftInventoryCount(id: string): Promise<InventoryCount> {
  const count = await inventoryCountRepo.findById(id);

  if (!count) {
    throw new Error('Nie znaleziono inwentaryzacji');
  }

  if (count.status !== 'draft') {
    throw new Error('Mozna edytowac tylko robocza inwentaryzacje');
  }

  return count;
}

async function queryWarehouseStockItems(warehouseId?: string): Promise<WarehouseStockItem[]> {
  const [stockItems, warehouses, warehouseStockRows] = await Promise.all([
    stockItemRepo.findMany((item) => item.is_active),
    warehouseRepo.findMany((warehouse) => warehouse.is_active),
    warehouseId
      ? warehouseStockRepo.findMany({ warehouse_id: warehouseId } as Partial<WarehouseStock>)
      : warehouseStockRepo.findMany(() => true),
  ]);

  const itemMap = new Map(stockItems.map((item) => [item.id, item]));
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  const items: WarehouseStockItem[] = [];
  for (const warehouseStock of warehouseStockRows) {
    const item = itemMap.get(warehouseStock.stock_item_id);
    const warehouse = warehouseMap.get(warehouseStock.warehouse_id);
    if (!item || !warehouse) {
      continue;
    }

    items.push({
      ...item,
      warehouse_id: warehouseStock.warehouse_id,
      warehouse_name: warehouse.name,
      quantity: warehouseStock.quantity,
      min_quantity: warehouseStock.min_quantity,
      warehouse_stock_id: warehouseStock.id,
      storage_location: warehouseStock.storage_location ?? item.storage_location ?? null,
    });
  }

  return items;
}

async function createInventoryCountLines(
  count: InventoryCount
): Promise<Omit<InventoryCountLine, 'id' | 'created_at' | 'updated_at'>[]> {
  const [stockItems, warehouses, warehouseStockRows] = await Promise.all([
    stockItemRepo.findMany((item) => item.is_active),
    warehouseRepo.findMany((warehouse) => warehouse.is_active),
    count.scope === 'single' && count.warehouse_id
      ? warehouseStockRepo.findMany({ warehouse_id: count.warehouse_id } as Partial<WarehouseStock>)
      : warehouseStockRepo.findMany(() => true),
  ]);

  const itemMap = new Map(stockItems.map((item) => [item.id, item]));
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  const rows = warehouseStockRows
    .filter((row) => itemMap.has(row.stock_item_id))
    .filter((row) => warehouseMap.has(row.warehouse_id))
    .sort((a, b) => {
      const warehouseCompare = getWarehouseName(a.warehouse_id, warehouseMap).localeCompare(
        getWarehouseName(b.warehouse_id, warehouseMap),
        'pl'
      );

      if (warehouseCompare !== 0) {
        return warehouseCompare;
      }

      const itemA = itemMap.get(a.stock_item_id);
      const itemB = itemMap.get(b.stock_item_id);
      return (itemA?.name ?? '').localeCompare(itemB?.name ?? '', 'pl');
    });

  return rows.map((row, index) => {
    const item = itemMap.get(row.stock_item_id);

    return {
      inventory_count_id: count.id,
      warehouse_id: row.warehouse_id,
      stock_item_id: row.stock_item_id,
      stock_item_name: item?.name ?? 'Nieznana pozycja',
      stock_item_sku: item?.sku ?? '',
      stock_item_unit: item?.unit ?? '',
      expected_quantity: row.quantity,
      counted_quantity: null,
      note: null,
      edited_inventory_category_id: item?.inventory_category_id ?? null,
      edited_storage_location: row.storage_location ?? item?.storage_location ?? null,
      sort_order: index,
    };
  });
}

async function loadInventoryCountsWithContext(): Promise<{
  counts: InventoryCount[];
  lines: InventoryCountLine[];
  warehouseMap: Map<string, Warehouse>;
}> {
  const [counts, lines, warehouses] = await Promise.all([
    inventoryCountRepo.findMany(() => true),
    inventoryCountLineRepo.findMany(() => true),
    warehouseRepo.findMany(() => true),
  ]);

  return {
    counts,
    lines,
    warehouseMap: new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])),
  };
}

async function approveInventoryCountLocally(id: string): Promise<void> {
  await ensureDraftInventoryCount(id);

  const [lines, stockItems, warehouseStockRows] = await Promise.all([
    inventoryCountLineRepo.findMany({ inventory_count_id: id } as Partial<InventoryCountLine>),
    stockItemRepo.findMany(() => true),
    warehouseStockRepo.findMany(() => true),
  ]);

  if (lines.some((line) => line.counted_quantity === null)) {
    throw new Error('Uzupelnij wszystkie policzone stany przed zatwierdzeniem');
  }

  const stockItemMap = new Map(stockItems.map((item) => [item.id, item]));
  const warehouseStockMap = new Map(
    warehouseStockRows.map((row) => [getWarehouseStockKey(row.warehouse_id, row.stock_item_id), row])
  );

  for (const line of lines) {
    const stockItem = stockItemMap.get(line.stock_item_id);
    if (!stockItem) {
      continue;
    }

    const nextCategoryId = line.edited_inventory_category_id ?? null;
    if ((stockItem.inventory_category_id ?? null) !== nextCategoryId) {
      const updatedItem = await stockItemRepo.update(stockItem.id, {
        inventory_category_id: nextCategoryId,
      } as Partial<StockItem>);
      stockItemMap.set(stockItem.id, updatedItem);
    }

    const warehouseStockKey = getWarehouseStockKey(line.warehouse_id, line.stock_item_id);
    const existingStockRow = warehouseStockMap.get(warehouseStockKey);

    if (existingStockRow) {
      const updatedRow = await warehouseStockRepo.update(existingStockRow.id, {
        quantity: line.counted_quantity ?? existingStockRow.quantity,
        storage_location: line.edited_storage_location ?? null,
      } as Partial<WarehouseStock>);
      warehouseStockMap.set(warehouseStockKey, updatedRow);
      continue;
    }

    const createdRow = await warehouseStockRepo.create({
      warehouse_id: line.warehouse_id,
      stock_item_id: line.stock_item_id,
      quantity: line.counted_quantity ?? 0,
      min_quantity: stockItem.default_min_quantity,
      storage_location: line.edited_storage_location ?? null,
    });
    warehouseStockMap.set(warehouseStockKey, createdRow);
  }

  await inventoryCountRepo.update(id, {
    status: 'approved',
    approved_at: new Date().toISOString(),
  } as Partial<InventoryCount>);
}

export const inventoryRepository = {
  stockItems: stockItemRepo,
  inventoryCategories: inventoryCategoryRepo,
  warehouses: warehouseRepo,
  warehouseStock: warehouseStockRepo,
  inventoryCounts: inventoryCountRepo,
  inventoryCountLines: inventoryCountLineRepo,
  stockItemComponents: stockItemComponentRepo,

  async getAllStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany((item) => item.is_active);
  },

  async getAllInventoryCategories(): Promise<InventoryCategory[]> {
    const categories = await inventoryCategoryRepo.findMany((category) => category.is_active);
    return categories.sort((a, b) => {
      if (a.sort_order === b.sort_order) {
        return a.name.localeCompare(b.name, 'pl');
      }
      return a.sort_order - b.sort_order;
    });
  },

  async createInventoryCategory(
    data: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<InventoryCategory> {
    return inventoryCategoryRepo.create(data);
  },

  async updateInventoryCategory(id: string, data: Partial<InventoryCategory>): Promise<InventoryCategory> {
    return inventoryCategoryRepo.update(id, data);
  },

  async deleteInventoryCategory(id: string): Promise<void> {
    const assignedItems = await stockItemRepo.findMany(
      (item) => item.is_active && item.inventory_category_id === id
    );

    if (assignedItems.length > 0) {
      throw new Error('Nie mozna usunac kategorii z przypisanymi pozycjami');
    }

    await inventoryCategoryRepo.update(id, { is_active: false } as Partial<InventoryCategory>);
  },

  async getAllWarehouses(): Promise<Warehouse[]> {
    return warehouseRepo.findMany((warehouse) => warehouse.is_active);
  },

  async createWarehouse(data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
    return warehouseRepo.create(data);
  },

  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    return warehouseRepo.update(id, data);
  },

  async setDefaultWarehouse(id: string): Promise<void> {
    const allWarehouses = await warehouseRepo.findMany((warehouse) => warehouse.is_active);

    await Promise.all(
      allWarehouses.map((warehouse) =>
        warehouseRepo.update(warehouse.id, { is_default: false } as Partial<Warehouse>)
      )
    );

    await warehouseRepo.update(id, { is_default: true } as Partial<Warehouse>);
  },

  async deleteWarehouse(id: string): Promise<void> {
    const stockRows = await warehouseStockRepo.findMany({ warehouse_id: id } as Partial<WarehouseStock>);
    const hasStock = stockRows.some((row) => row.quantity > 0);

    if (hasStock) {
      throw new Error('Nie mozna usunac magazynu z przypisanymi pozycjami');
    }

    await warehouseRepo.update(id, { is_active: false } as Partial<Warehouse>);
  },

  async getWarehouseStockItems(warehouseId: string): Promise<WarehouseStockItem[]> {
    return queryWarehouseStockItems(warehouseId);
  },

  async getAllWarehouseStockItems(): Promise<WarehouseStockItem[]> {
    return queryWarehouseStockItems();
  },

  async getWarehouseAssignmentsForStockItem(stockItemId: string): Promise<StockItemWarehouseAssignment[]> {
    const [stockRows, warehouses] = await Promise.all([
      warehouseStockRepo.findMany({ stock_item_id: stockItemId } as Partial<WarehouseStock>),
      warehouseRepo.findMany(() => true),
    ]);

    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

    return stockRows
      .map((row) => ({
        id: row.id,
        warehouse_id: row.warehouse_id,
        warehouse_name: getWarehouseName(row.warehouse_id, warehouseMap),
        quantity: row.quantity,
        min_quantity: row.min_quantity,
        storage_location: row.storage_location ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
      .sort((a, b) => a.warehouse_name.localeCompare(b.warehouse_name, 'pl'));
  },

  async getLowStockItems(): Promise<WarehouseStockItem[]> {
    const items = await queryWarehouseStockItems();
    return items.filter((item) => item.quantity < item.min_quantity);
  },

  async adjustStock(
    warehouseId: string,
    stockItemId: string,
    quantity: number,
    _reason: string
  ): Promise<WarehouseStock> {
    const rows = await warehouseStockRepo.findMany({
      warehouse_id: warehouseId,
      stock_item_id: stockItemId,
    } as Partial<WarehouseStock>);

    if (rows.length === 0) {
      throw new Error('Pozycja nie znaleziona w tym magazynie');
    }

    const row = rows[0];
    return warehouseStockRepo.update(row.id, {
      quantity: row.quantity + quantity,
    } as Partial<WarehouseStock>);
  },

  async transferStock(
    sourceWarehouseId: string,
    targetWarehouseId: string,
    stockItemId: string,
    quantity: number
  ): Promise<void> {
    const sourceRows = await warehouseStockRepo.findMany({
      warehouse_id: sourceWarehouseId,
      stock_item_id: stockItemId,
    } as Partial<WarehouseStock>);

    if (sourceRows.length === 0) {
      throw new Error('Pozycja nie znaleziona w magazynie zrodlowym');
    }

    const sourceRow = sourceRows[0];
    if (sourceRow.quantity < quantity) {
      throw new Error('Niewystarczajaca ilosc w magazynie zrodlowym');
    }

    await warehouseStockRepo.update(sourceRow.id, {
      quantity: sourceRow.quantity - quantity,
    } as Partial<WarehouseStock>);

    const targetRows = await warehouseStockRepo.findMany({
      warehouse_id: targetWarehouseId,
      stock_item_id: stockItemId,
    } as Partial<WarehouseStock>);

    if (targetRows.length > 0) {
      await warehouseStockRepo.update(targetRows[0].id, {
        quantity: targetRows[0].quantity + quantity,
      } as Partial<WarehouseStock>);
      return;
    }

    await warehouseStockRepo.create({
      warehouse_id: targetWarehouseId,
      stock_item_id: stockItemId,
      quantity,
      min_quantity: 0,
      storage_location: null,
    });
  },

  async assignToWarehouse(
    warehouseId: string,
    stockItemId: string,
    quantity: number,
    minQuantity: number
  ): Promise<WarehouseStock> {
    return warehouseStockRepo.create({
      warehouse_id: warehouseId,
      stock_item_id: stockItemId,
      quantity,
      min_quantity: minQuantity,
      storage_location: null,
    });
  },

  async getInventoryCounts(): Promise<InventoryCount[]> {
    const { counts, lines, warehouseMap } = await loadInventoryCountsWithContext();

    return sortInventoryCounts(
      counts.map((count) =>
        enrichInventoryCount(
          count,
          lines.filter((line) => line.inventory_count_id === count.id),
          warehouseMap
        )
      )
    );
  },

  async createInventoryCount(scope: InventoryCountScope, warehouseId?: string): Promise<InventoryCountDetail> {
    const normalizedWarehouseId = scope === 'single' ? warehouseId ?? null : null;

    if (scope === 'single' && !normalizedWarehouseId) {
      throw new Error('Wybierz magazyn dla nowej inwentaryzacji');
    }

    const count = await createInventoryCountRecord(scope, normalizedWarehouseId);

    try {
      const lines = await createInventoryCountLines(count);
      await bulkCreateInventoryCountLines(lines);
    } catch (error) {
      const partialLines = await inventoryCountLineRepo.findMany({
        inventory_count_id: count.id,
      } as Partial<InventoryCountLine>);

      await Promise.all([
        ...partialLines.map((line) => inventoryCountLineRepo.delete(line.id)),
        inventoryCountRepo.delete(count.id),
      ]);

      throw error;
    }

    const detail = await this.getInventoryCountById(count.id);
    if (!detail) {
      throw new Error('Nie udalo sie zaladowac utworzonej inwentaryzacji');
    }

    return detail;
  },

  async getInventoryCountById(id: string): Promise<InventoryCountDetail | null> {
    const [count, lines, warehouses] = await Promise.all([
      inventoryCountRepo.findById(id),
      inventoryCountLineRepo.findMany({ inventory_count_id: id } as Partial<InventoryCountLine>),
      warehouseRepo.findMany(() => true),
    ]);

    if (!count) {
      return null;
    }

    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
    const enrichedLines = sortInventoryCountLines(
      lines.map((line) => ({
        ...line,
        warehouse_name: getWarehouseName(line.warehouse_id, warehouseMap),
      })),
      warehouseMap
    );

    return {
      count: enrichInventoryCount(count, enrichedLines, warehouseMap),
      lines: enrichedLines,
    };
  },

  async updateInventoryCount(id: string, data: Partial<InventoryCount>): Promise<InventoryCount> {
    await ensureDraftInventoryCount(id);
    return inventoryCountRepo.update(id, data);
  },

  async updateInventoryCountLine(id: string, patch: Partial<InventoryCountLine>): Promise<InventoryCountLine> {
    const line = await inventoryCountLineRepo.findById(id);
    if (!line) {
      throw new Error('Nie znaleziono pozycji inwentaryzacji');
    }

    await ensureDraftInventoryCount(line.inventory_count_id);

    if (patch.counted_quantity != null && patch.counted_quantity < 0) {
      throw new Error('Policzony stan nie moze byc ujemny');
    }

    return inventoryCountLineRepo.update(id, {
      ...patch,
      note: patch.note === '' ? null : patch.note,
      edited_storage_location:
        patch.edited_storage_location === '' ? null : patch.edited_storage_location,
    });
  },

  async addStockItemToInventoryCount(
    countId: string,
    warehouseId: string,
    stockItemId: string
  ): Promise<InventoryCountLine> {
    const count = await ensureDraftInventoryCount(countId);

    if (count.scope === 'single' && count.warehouse_id !== warehouseId) {
      throw new Error('Nie mozna dodac pozycji do innego magazynu w tej inwentaryzacji');
    }

    const [existingLines, stockItem, warehouseRows] = await Promise.all([
      inventoryCountLineRepo.findMany({ inventory_count_id: countId } as Partial<InventoryCountLine>),
      stockItemRepo.findById(stockItemId),
      warehouseStockRepo.findMany({
        warehouse_id: warehouseId,
        stock_item_id: stockItemId,
      } as Partial<WarehouseStock>),
    ]);

    if (!stockItem || !stockItem.is_active) {
      throw new Error('Wybrana pozycja magazynowa jest nieaktywna lub nie istnieje');
    }

    const alreadyExists = existingLines.some(
      (line) => line.warehouse_id === warehouseId && line.stock_item_id === stockItemId
    );
    if (alreadyExists) {
      throw new Error('Ta pozycja jest juz na liscie inwentaryzacji');
    }

    const nextSortOrder =
      existingLines
        .filter((line) => line.warehouse_id === warehouseId)
        .reduce((maxValue, line) => Math.max(maxValue, line.sort_order), -1) + 1;

    const warehouseRow = warehouseRows[0];

    return inventoryCountLineRepo.create({
      inventory_count_id: countId,
      warehouse_id: warehouseId,
      stock_item_id: stockItem.id,
      stock_item_name: stockItem.name,
      stock_item_sku: stockItem.sku,
      stock_item_unit: stockItem.unit,
      expected_quantity: warehouseRow?.quantity ?? 0,
      counted_quantity: null,
      note: null,
      edited_inventory_category_id: stockItem.inventory_category_id ?? null,
      edited_storage_location: warehouseRow?.storage_location ?? stockItem.storage_location ?? null,
      sort_order: nextSortOrder,
    });
  },

  async approveInventoryCount(id: string): Promise<InventoryCount> {
    if (USING_SUPABASE_BACKEND) {
      const { error } = await supabase.rpc('approve_inventory_count', { p_count_id: id });
      if (error) {
        throw new Error(error.message);
      }
    } else {
      await approveInventoryCountLocally(id);
    }

    const updatedCount = await inventoryCountRepo.findById(id);
    if (!updatedCount) {
      throw new Error('Nie udalo sie odswiezyc zatwierdzonej inwentaryzacji');
    }

    return updatedCount;
  },

  async cancelInventoryCount(id: string): Promise<InventoryCount> {
    await ensureDraftInventoryCount(id);
    return inventoryCountRepo.update(id, {
      status: 'cancelled',
      approved_at: null,
    } as Partial<InventoryCount>);
  },

  async deleteStockItem(id: string): Promise<void> {
    const blockingRecipes = await recipesRepo.findMany(
      (recipe) => recipe.is_active && recipeUsesStockItem(recipe.ingredients, id)
    );

    if (blockingRecipes.length > 0) {
      const recipeNames = formatRecipeNames(blockingRecipes);
      throw new Error(
        `Nie mozna usunac pozycji, bo jest uzywana w recepturach: ${recipeNames}. Aby usunac pozycje, najpierw zmodyfikuj te receptury.`
      );
    }

    const [warehouseRows, parentComponents, componentRows] = await Promise.all([
      warehouseStockRepo.findMany({ stock_item_id: id } as Partial<WarehouseStock>),
      stockItemComponentRepo.findMany({ parent_stock_item_id: id } as Partial<StockItemComponent>),
      stockItemComponentRepo.findMany({ component_stock_item_id: id } as Partial<StockItemComponent>),
    ]);

    const componentIdsToDelete = new Set([
      ...parentComponents.map((component) => component.id),
      ...componentRows.map((component) => component.id),
    ]);

    await Promise.all([
      ...warehouseRows.map((row) => warehouseStockRepo.delete(row.id)),
      ...Array.from(componentIdsToDelete).map((componentId) => stockItemComponentRepo.delete(componentId)),
    ]);

    await stockItemRepo.update(id, { is_active: false } as Partial<StockItem>);
  },

  async getStockItemById(id: string): Promise<StockItem | null> {
    return stockItemRepo.findById(id);
  },

  async getComponentsForItem(parentId: string): Promise<StockItemComponentWithDetails[]> {
    const components = await stockItemComponentRepo.findMany({
      parent_stock_item_id: parentId,
    } as Partial<StockItemComponent>);

    if (components.length === 0) {
      return [];
    }

    const [allItems, allWarehouseStock] = await Promise.all([
      stockItemRepo.findMany(() => true),
      warehouseStockRepo.findMany(() => true),
    ]);

    const itemMap = new Map(allItems.map((item) => [item.id, item]));

    return components.map((component) => {
      const item = itemMap.get(component.component_stock_item_id);
      const currentTotalStock = allWarehouseStock
        .filter((row) => row.stock_item_id === component.component_stock_item_id)
        .reduce((total, row) => total + row.quantity, 0);

      return {
        ...component,
        component_name: item?.name ?? 'Nieznany',
        component_sku: item?.sku ?? '',
        component_unit: item?.unit ?? '',
        current_total_stock: currentTotalStock,
      };
    });
  },

  async addComponent(parentId: string, componentId: string, quantity: number): Promise<StockItemComponent> {
    return stockItemComponentRepo.create({
      parent_stock_item_id: parentId,
      component_stock_item_id: componentId,
      quantity,
    });
  },

  async updateComponent(id: string, quantity: number): Promise<StockItemComponent> {
    return stockItemComponentRepo.update(id, { quantity } as Partial<StockItemComponent>);
  },

  async removeComponent(id: string): Promise<void> {
    return stockItemComponentRepo.delete(id);
  },

  async getStockItemUsage(stockItemId: string): Promise<StockItemUsage> {
    const [componentUsages, allItems, allRecipes] = await Promise.all([
      stockItemComponentRepo.findMany({
        component_stock_item_id: stockItemId,
      } as Partial<StockItemComponent>),
      stockItemRepo.findMany(() => true),
      recipesRepo.findMany((recipe) => recipe.is_active),
    ]);

    const itemMap = new Map(allItems.map((item) => [item.id, item]));

    const inComponents = componentUsages.map((component) => {
      const parent = itemMap.get(component.parent_stock_item_id);
      return {
        parent_id: component.parent_stock_item_id,
        parent_name: parent?.name ?? 'Nieznany',
        parent_sku: parent?.sku ?? '',
        quantity: component.quantity,
      };
    });

    const inRecipes = allRecipes
      .filter((recipe) => recipeUsesStockItem(recipe.ingredients, stockItemId))
      .map((recipe) => {
        const ingredient = recipe.ingredients.find(
          (entry) =>
            (entry.type === 'stock_item' && entry.reference_id === stockItemId) ||
            (entry as unknown as { stock_item_id?: string }).stock_item_id === stockItemId
        );

        return {
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          quantity: ingredient?.quantity ?? 0,
          unit: ingredient?.unit ?? '',
        };
      });

    return {
      in_components: inComponents,
      in_recipes: inRecipes,
    };
  },
};
