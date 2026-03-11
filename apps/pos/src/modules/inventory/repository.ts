import {
  StockItem,
  Warehouse,
  WarehouseStock,
  WarehouseStockItem,
  StockItemComponent,
  StockItemComponentWithDetails,
  StockItemUsage,
  InventoryCategory,
} from '@/types/inventory';
import { Recipe, RecipeIngredient } from '@/types/recipe';
import { createRepository } from '@/lib/data/repository-factory';

const stockItemRepo = createRepository<StockItem>('stock_items');
const warehouseRepo = createRepository<Warehouse>('warehouses');
const warehouseStockRepo = createRepository<WarehouseStock>('warehouse_stock');
const stockItemComponentRepo = createRepository<StockItemComponent>('stock_item_components');
const inventoryCategoryRepo = createRepository<InventoryCategory>('inventory_categories');
const recipesRepo = createRepository<Recipe>('recipes');

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

// Join warehouse_stock rows with stock items and warehouses in JS
async function queryWarehouseStockItems(warehouseId?: string): Promise<WarehouseStockItem[]> {
  // Fetch all three collections in parallel
  const [stockItems, warehouses, warehouseStockRows] = await Promise.all([
    stockItemRepo.findMany((item) => item.is_active),
    warehouseRepo.findMany((w) => w.is_active),
    warehouseId
      ? warehouseStockRepo.findMany({ warehouse_id: warehouseId } as Partial<WarehouseStock>)
      : warehouseStockRepo.findMany(() => true),
  ]);

  const itemMap = new Map(stockItems.map((item) => [item.id, item]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  const result: WarehouseStockItem[] = [];
  for (const ws of warehouseStockRows) {
    const item = itemMap.get(ws.stock_item_id);
    const wh = whMap.get(ws.warehouse_id);
    if (!item || !wh) continue;

    result.push({
      ...item,
      warehouse_id: ws.warehouse_id,
      warehouse_name: wh.name,
      quantity: ws.quantity,
      min_quantity: ws.min_quantity,
      warehouse_stock_id: ws.id,
    });
  }

  return result;
}

export const inventoryRepository = {
  stockItems: stockItemRepo,
  inventoryCategories: inventoryCategoryRepo,
  warehouses: warehouseRepo,
  warehouseStock: warehouseStockRepo,
  stockItemComponents: stockItemComponentRepo,

  async getAllStockItems(): Promise<StockItem[]> {
    return stockItemRepo.findMany((item) => item.is_active);
  },

  async getAllInventoryCategories(): Promise<InventoryCategory[]> {
    const categories = await inventoryCategoryRepo.findMany((category) => category.is_active);
    return categories.sort((a, b) => {
      if (a.sort_order === b.sort_order) return a.name.localeCompare(b.name);
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
    return warehouseRepo.findMany((w) => w.is_active);
  },

  async createWarehouse(data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
    return warehouseRepo.create(data);
  },

  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    return warehouseRepo.update(id, data);
  },

  async setDefaultWarehouse(id: string): Promise<void> {
    const allWarehouses = await warehouseRepo.findMany((w) => w.is_active);
    await Promise.all(
      allWarehouses.map((w) => warehouseRepo.update(w.id, { is_default: false } as Partial<Warehouse>))
    );
    await warehouseRepo.update(id, { is_default: true } as Partial<Warehouse>);
  },

  async deleteWarehouse(id: string): Promise<void> {
    // Soft-delete: set is_active = false
    // First check no stock is assigned
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
    // Find the junction row
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
    // Find source row
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

    // Update source: subtract
    await warehouseStockRepo.update(sourceRow.id, {
      quantity: sourceRow.quantity - quantity,
    } as Partial<WarehouseStock>);

    // Find or create target row
    const targetRows = await warehouseStockRepo.findMany({
      warehouse_id: targetWarehouseId,
      stock_item_id: stockItemId,
    } as Partial<WarehouseStock>);

    if (targetRows.length > 0) {
      // Update target: add
      await warehouseStockRepo.update(targetRows[0].id, {
        quantity: targetRows[0].quantity + quantity,
      } as Partial<WarehouseStock>);
    } else {
      // Create new junction row in target
      await warehouseStockRepo.create({
        warehouse_id: targetWarehouseId,
        stock_item_id: stockItemId,
        quantity,
        min_quantity: 0,
      } as Omit<WarehouseStock, 'id' | 'created_at' | 'updated_at'>);
    }
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
    } as Omit<WarehouseStock, 'id' | 'created_at' | 'updated_at'>);
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

    // Soft-delete to preserve historical references (e.g. deliveries, usage logs).
    await stockItemRepo.update(id, { is_active: false } as Partial<StockItem>);
  },

  // --- Stock Item Detail methods ---

  async getStockItemById(id: string): Promise<StockItem | null> {
    return stockItemRepo.findById(id);
  },

  async getComponentsForItem(parentId: string): Promise<StockItemComponentWithDetails[]> {
    const components = await stockItemComponentRepo.findMany({
      parent_stock_item_id: parentId,
    } as Partial<StockItemComponent>);

    if (components.length === 0) return [];

    // Fetch stock items and warehouse stock for enrichment
    const [allItems, allWarehouseStock] = await Promise.all([
      stockItemRepo.findMany(() => true),
      warehouseStockRepo.findMany(() => true),
    ]);

    const itemMap = new Map(allItems.map((item) => [item.id, item]));

    return components.map((comp) => {
      const item = itemMap.get(comp.component_stock_item_id);
      const totalStock = allWarehouseStock
        .filter((ws) => ws.stock_item_id === comp.component_stock_item_id)
        .reduce((sum, ws) => sum + ws.quantity, 0);

      return {
        ...comp,
        component_name: item?.name ?? 'Nieznany',
        component_sku: item?.sku ?? '',
        component_unit: item?.unit ?? '',
        current_total_stock: totalStock,
      };
    });
  },

  async addComponent(
    parentId: string,
    componentId: string,
    quantity: number
  ): Promise<StockItemComponent> {
    return stockItemComponentRepo.create({
      parent_stock_item_id: parentId,
      component_stock_item_id: componentId,
      quantity,
    } as Omit<StockItemComponent, 'id' | 'created_at' | 'updated_at'>);
  },

  async updateComponent(id: string, quantity: number): Promise<StockItemComponent> {
    return stockItemComponentRepo.update(id, { quantity } as Partial<StockItemComponent>);
  },

  async removeComponent(id: string): Promise<void> {
    return stockItemComponentRepo.delete(id);
  },

  async getStockItemUsage(stockItemId: string): Promise<StockItemUsage> {
    // Find components where this item is used as a component
    const [componentUsages, allItems, allRecipes] = await Promise.all([
      stockItemComponentRepo.findMany({
        component_stock_item_id: stockItemId,
      } as Partial<StockItemComponent>),
      stockItemRepo.findMany(() => true),
      recipesRepo.findMany((r) => r.is_active),
    ]);

    const itemMap = new Map(allItems.map((item) => [item.id, item]));

    const in_components = componentUsages.map((comp) => {
      const parent = itemMap.get(comp.parent_stock_item_id);
      return {
        parent_id: comp.parent_stock_item_id,
        parent_name: parent?.name ?? 'Nieznany',
        parent_sku: parent?.sku ?? '',
        quantity: comp.quantity,
      };
    });

    // Find recipes that use this stock item as an ingredient
    const in_recipes = allRecipes
      .filter((recipe) => recipeUsesStockItem(recipe.ingredients, stockItemId))
      .map((recipe) => {
        const ingredient = recipe.ingredients.find(
          (ing) =>
            (ing.type === 'stock_item' && ing.reference_id === stockItemId) ||
            (ing as unknown as { stock_item_id?: string }).stock_item_id === stockItemId
        );
        return {
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          quantity: ingredient?.quantity ?? 0,
          unit: ingredient?.unit ?? '',
        };
      });

    return { in_components, in_recipes };
  },
};
