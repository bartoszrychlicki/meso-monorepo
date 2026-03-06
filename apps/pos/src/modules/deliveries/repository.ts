import { createRepository } from '@/lib/data/repository-factory';
import { Supplier, Delivery, DeliveryItem, DeliveryWithDetails, DeliveryItemWithDetails } from '@/types/delivery';
import { DeliveryStatus, DeliverySource } from '@/types/enums';
import { inventoryRepository } from '@/modules/inventory/repository';
import { normalizeDeliveryValues } from './utils/normalization';

const supplierRepo = createRepository<Supplier>('suppliers');
const deliveryRepo = createRepository<Delivery>('deliveries');
const deliveryItemRepo = createRepository<DeliveryItem>('delivery_items');

export const deliveryRepository = {
  suppliers: supplierRepo,
  deliveries: deliveryRepo,
  deliveryItems: deliveryItemRepo,

  async getAllSuppliers(): Promise<Supplier[]> {
    const suppliers = await supplierRepo.findMany((s) => s.is_active);
    return suppliers.sort((a, b) => a.name.localeCompare(b.name));
  },

  async createSupplier(data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    return supplierRepo.create(data);
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return supplierRepo.update(id, { ...data, updated_at: new Date().toISOString() });
  },

  async deleteSupplier(id: string): Promise<void> {
    await supplierRepo.update(id, { is_active: false, updated_at: new Date().toISOString() } as Partial<Supplier>);
  },

  async generateDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const all = await deliveryRepo.findMany(() => true);
    const thisYear = all.filter((d) => d.delivery_number.endsWith(`/${year}`));
    const nextNum = thisYear.length + 1;
    return `PZ ${nextNum}/${year}`;
  },

  async getAllDeliveries(): Promise<DeliveryWithDetails[]> {
    const [deliveries, suppliers, warehouses, items] = await Promise.all([
      deliveryRepo.findMany(() => true),
      supplierRepo.findMany(() => true),
      inventoryRepository.getAllWarehouses(),
      deliveryItemRepo.findMany(() => true),
    ]);

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

    return deliveries
      .map((d) => {
        const deliveryItems = items.filter((i) => i.delivery_id === d.id);
        const totalNet = deliveryItems.reduce((sum, i) => {
          const supplierQuantity = i.supplier_quantity_received ?? i.quantity_received;
          if (i.unit_price_net != null && supplierQuantity != null) {
            return sum + i.unit_price_net * supplierQuantity;
          }
          return sum;
        }, 0);
        const hasAnyPrice = deliveryItems.some((i) => i.unit_price_net != null);

        return {
          ...d,
          supplier_name: d.supplier_id ? supplierMap.get(d.supplier_id) ?? null : null,
          warehouse_name: warehouseMap.get(d.warehouse_id) ?? 'Nieznany',
          item_count: deliveryItems.length,
          total_net: hasAnyPrice ? Math.round(totalNet * 100) / 100 : null,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getDeliveryById(id: string): Promise<Delivery | null> {
    return deliveryRepo.findById(id);
  },

  async getDeliveryItems(deliveryId: string): Promise<DeliveryItemWithDetails[]> {
    const [items, stockItems] = await Promise.all([
      deliveryItemRepo.findMany((i) => i.delivery_id === deliveryId),
      inventoryRepository.getAllStockItems(),
    ]);

    const stockMap = new Map(stockItems.map((s) => [s.id, s]));

    return items.map((item) => {
      const stock = stockMap.get(item.stock_item_id);
      return {
        ...item,
        stock_item_name: stock?.name ?? 'Nieznana pozycja',
        stock_item_sku: stock?.sku ?? '',
        stock_item_unit: stock?.unit ?? '',
      };
    });
  },

  async createDelivery(
    data: {
      warehouse_id: string;
      supplier_id?: string | null;
      document_number?: string | null;
      document_date?: string | null;
      source: DeliverySource;
      source_image_url?: string | null;
      notes?: string | null;
    },
    items: {
      stock_item_id: string;
      quantity_ordered?: number | null;
      quantity_received: number;
      supplier_quantity_received?: number | null;
      supplier_unit?: string | null;
      unit_price_net?: number | null;
      price_per_kg_net?: number | null;
      vat_rate?: string | null;
      expiry_date?: string | null;
      ai_matched_name?: string | null;
      ai_confidence?: number | null;
      notes?: string | null;
    }[]
  ): Promise<Delivery> {
    const deliveryNumber = await this.generateDeliveryNumber();
    const stockItems = await inventoryRepository.getAllStockItems();
    const stockItemMap = new Map(stockItems.map((stockItem) => [stockItem.id, stockItem]));

    const delivery = await deliveryRepo.create({
      delivery_number: deliveryNumber,
      warehouse_id: data.warehouse_id,
      supplier_id: data.supplier_id ?? null,
      document_number: data.document_number ?? null,
      document_date: data.document_date ?? null,
      source: data.source,
      source_image_url: data.source_image_url ?? null,
      notes: data.notes ?? null,
      status: DeliveryStatus.DRAFT,
    });

    for (const item of items) {
      const stockItem = stockItemMap.get(item.stock_item_id);
      const supplierQuantityReceived =
        item.supplier_quantity_received ?? item.quantity_received;
      const supplierUnit = item.supplier_unit ?? stockItem?.unit ?? null;
      const normalized =
        stockItem && supplierQuantityReceived != null && supplierUnit
          ? normalizeDeliveryValues(
              stockItem,
              supplierQuantityReceived,
              supplierUnit,
              item.unit_price_net ?? null
            )
          : {
              quantity_received: item.quantity_received,
              price_per_kg_net: item.price_per_kg_net ?? null,
            };

      await deliveryItemRepo.create({
        delivery_id: delivery.id,
        stock_item_id: item.stock_item_id,
        quantity_ordered: item.quantity_ordered ?? null,
        quantity_received:
          normalized.quantity_received ?? item.quantity_received,
        supplier_quantity_received: supplierQuantityReceived ?? null,
        supplier_unit: supplierUnit,
        unit_price_net: item.unit_price_net ?? null,
        price_per_kg_net:
          normalized.price_per_kg_net ?? item.price_per_kg_net ?? null,
        vat_rate: (item.vat_rate as DeliveryItem['vat_rate']) ?? null,
        expiry_date: item.expiry_date ?? null,
        ai_matched_name: item.ai_matched_name ?? null,
        ai_confidence: item.ai_confidence ?? null,
        notes: item.notes ?? null,
      } as Omit<DeliveryItem, 'id' | 'created_at' | 'updated_at'>);
    }

    return delivery;
  },

  async completeDelivery(deliveryId: string): Promise<void> {
    const delivery = await deliveryRepo.findById(deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    if (delivery.status === DeliveryStatus.COMPLETED) throw new Error('Delivery already completed');

    const items = await deliveryItemRepo.findMany((i) => i.delivery_id === deliveryId);
    const stockItems = await inventoryRepository.getAllStockItems();
    const stockItemMap = new Map(stockItems.map((stockItem) => [stockItem.id, stockItem]));

    for (const item of items) {
      await inventoryRepository.adjustStock(
        delivery.warehouse_id,
        item.stock_item_id,
        item.quantity_received,
        `Dostawa ${delivery.delivery_number}`
      );

      const stockItem = stockItemMap.get(item.stock_item_id);
      if (!stockItem) continue;

      if (stockItem.unit === 'kg' && item.price_per_kg_net != null) {
        await inventoryRepository.stockItems.update(item.stock_item_id, {
          cost_per_unit: item.price_per_kg_net,
        });
        continue;
      }

      const supplierUnit = item.supplier_unit ?? stockItem.unit;
      if (
        item.unit_price_net != null &&
        supplierUnit === stockItem.unit &&
        stockItem.unit !== 'kg'
      ) {
        await inventoryRepository.stockItems.update(item.stock_item_id, {
          cost_per_unit: item.unit_price_net,
        });
      }
    }

    await deliveryRepo.update(deliveryId, {
      status: DeliveryStatus.COMPLETED,
      updated_at: new Date().toISOString(),
    } as Partial<Delivery>);
  },

  async updateDelivery(id: string, data: Partial<Delivery>): Promise<Delivery> {
    return deliveryRepo.update(id, { ...data, updated_at: new Date().toISOString() });
  },
};

export default deliveryRepository;
