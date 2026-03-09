import { test, expect } from '@playwright/test';
import {
  SEEDED_WAREHOUSE,
  buildTaggedValue,
  readRunContext,
} from '../playwright/support/run-context';
import { createAdminClient } from '../playwright/support/supabase-admin';
import {
  createStockItemViaUi,
  selectRadixOption,
} from '../playwright/support/ui-helpers';

test('creates a stock item, adjusts stock, edits options, and completes a delivery', async ({
  page,
}) => {
  const admin = createAdminClient();
  const runContext = await readRunContext();
  const stockName = buildTaggedValue(runContext, 'stock-flour');
  const stockSku = buildTaggedValue(runContext, 'SKU-FLOUR');
  const initialStorageLocation = buildTaggedValue(runContext, 'rack-a1');
  const updatedStorageLocation = buildTaggedValue(runContext, 'rack-b2');
  const adjustReason = buildTaggedValue(runContext, 'manual-adjust');
  const documentNumber = buildTaggedValue(runContext, 'delivery-doc');
  const deliveryNotes = buildTaggedValue(runContext, 'delivery-notes');

  await createStockItemViaUi(page, {
    name: stockName,
    sku: stockSku,
    unit: 'kg',
    costPerUnit: 12,
    purchaseUnitWeightKg: 2.5,
    warehouseName: SEEDED_WAREHOUSE.name,
    quantity: 10,
    minQuantity: 2,
    storageLocation: initialStorageLocation,
  });

  await page.locator('[data-field="stock-search"]').fill(stockSku);
  await expect(page.locator(`tr[data-id]`, { hasText: stockSku }).first()).toBeVisible();

  const { data: stockItem, error: stockItemError } = await admin
    .from('inventory_stock_items')
    .select('*')
    .eq('sku', stockSku)
    .maybeSingle();

  expect(stockItemError).toBeNull();
  expect(stockItem).not.toBeNull();

  const stockItemId = String(stockItem?.id);

  const { data: initialWarehouseStock, error: initialWarehouseStockError } = await admin
    .from('inventory_warehouse_stock')
    .select('*')
    .eq('warehouse_id', SEEDED_WAREHOUSE.id)
    .eq('stock_item_id', stockItemId)
    .maybeSingle();

  expect(initialWarehouseStockError).toBeNull();
  expect(Number(initialWarehouseStock?.quantity)).toBe(10);

  await page.locator(`tr[data-id="${stockItemId}"] [data-action="adjust-stock-plus"]`).click();
  await expect(page.locator('[data-component="adjust-stock-dialog"]')).toBeVisible();
  await page.locator('[data-field="adjust-quantity"]').fill('3');
  await page.locator('[data-field="adjust-reason"]').fill(adjustReason);
  await page.locator('[data-action="confirm-adjust"]').click();
  await expect(page.locator('[data-component="adjust-stock-dialog"]')).toBeHidden();

  const { data: adjustedWarehouseStock, error: adjustedWarehouseStockError } = await admin
    .from('inventory_warehouse_stock')
    .select('*')
    .eq('warehouse_id', SEEDED_WAREHOUSE.id)
    .eq('stock_item_id', stockItemId)
    .maybeSingle();

  expect(adjustedWarehouseStockError).toBeNull();
  expect(Number(adjustedWarehouseStock?.quantity)).toBe(13);

  await page.goto(`/inventory/${stockItemId}?tab=opcje`);
  await expect(page.locator('[data-component="options-tab"]')).toBeVisible();
  await page.locator('[data-field="cost-per-unit"]').fill('15');
  await page.locator('[data-field="default-min-quantity"]').fill('4');
  await page.locator('[data-field="storage-location"]').fill(updatedStorageLocation);
  await page.locator('[data-action="save-options"]').click();

  await page.reload();
  await expect(page.locator('[data-field="storage-location"]')).toHaveValue(updatedStorageLocation);

  const { data: updatedStockItem, error: updatedStockItemError } = await admin
    .from('inventory_stock_items')
    .select('*')
    .eq('id', stockItemId)
    .maybeSingle();

  expect(updatedStockItemError).toBeNull();
  expect(Number(updatedStockItem?.cost_per_unit)).toBe(15);
  expect(Number(updatedStockItem?.default_min_quantity)).toBe(4);
  expect(updatedStockItem?.storage_location).toBe(updatedStorageLocation);

  await page.goto('/deliveries/new');
  await expect(page.locator('[data-component="delivery-form"]')).toBeVisible();

  await selectRadixOption(
    page,
    page.locator('[data-field="warehouse"]'),
    SEEDED_WAREHOUSE.name
  );
  await page.locator('[data-field="document-number"]').fill(documentNumber);
  await page.locator('[data-field="notes"]').first().fill(deliveryNotes);

  const firstRow = page.locator('[data-component="delivery-line-table"] tbody tr').first();
  await firstRow.locator('[data-field="product"]').fill(stockName);
  await page.locator(`[data-action="select-stock-item"][data-id="${stockItemId}"]`).click();
  await firstRow.locator('[data-field="quantity-received"]').fill('2');
  await firstRow.locator('[data-field="supplier-unit"]').fill('karton');
  await firstRow.locator('[data-field="unit-price-net"]').fill('40');
  await firstRow.locator('[data-field="notes"]').fill(deliveryNotes);
  await page.locator('[data-action="complete-delivery"]').click();

  await page.waitForURL(/\/deliveries$/);

  const { data: delivery, error: deliveryError } = await admin
    .from('deliveries')
    .select('*')
    .eq('document_number', documentNumber)
    .maybeSingle();

  expect(deliveryError).toBeNull();
  expect(delivery).not.toBeNull();
  expect(delivery?.notes).toBe(deliveryNotes);
  expect(delivery?.status).toBe('completed');

  const { data: deliveryItems, error: deliveryItemsError } = await admin
    .from('delivery_items')
    .select('*')
    .eq('delivery_id', delivery?.id);

  expect(deliveryItemsError).toBeNull();
  expect(deliveryItems).toHaveLength(1);
  expect(Number(deliveryItems?.[0].quantity_received)).toBe(5);
  expect(Number(deliveryItems?.[0].supplier_quantity_received)).toBe(2);
  expect(deliveryItems?.[0].supplier_unit).toBe('karton');
  expect(Number(deliveryItems?.[0].price_per_kg_net)).toBe(16);

  const { data: warehouseStockAfterDelivery, error: warehouseStockAfterDeliveryError } = await admin
    .from('inventory_warehouse_stock')
    .select('*')
    .eq('warehouse_id', SEEDED_WAREHOUSE.id)
    .eq('stock_item_id', stockItemId)
    .maybeSingle();

  expect(warehouseStockAfterDeliveryError).toBeNull();
  expect(Number(warehouseStockAfterDelivery?.quantity)).toBe(18);

  const { data: stockItemAfterDelivery, error: stockItemAfterDeliveryError } = await admin
    .from('inventory_stock_items')
    .select('*')
    .eq('id', stockItemId)
    .maybeSingle();

  expect(stockItemAfterDeliveryError).toBeNull();
  expect(Number(stockItemAfterDelivery?.cost_per_unit)).toBe(16);
});
