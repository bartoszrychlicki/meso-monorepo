# Deliveries (Przyjecia magazynowe) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Deliveries tab to inventory that lets warehouse staff receive goods via AI document scanning or manual Excel-like entry.

**Architecture:** New `deliveries` module following existing inventory module patterns (types, Zod schemas, repository, Zustand store, components, pages). AI scanning uses OpenAI GPT-4o Vision via a Next.js API route. Fuzzy string matching done server-side with Levenshtein distance. All data persisted via existing repository-factory (localStorage/Supabase backends).

**Tech Stack:** TypeScript, Next.js App Router, Zustand, Zod, OpenAI SDK (new dep), Vitest, shadcn/ui, lucide-react

**Design doc:** `docs/plans/2026-02-26-deliveries-design.md`

---

### Task 1: Types and Enums

**Files:**
- Modify: `src/types/enums.ts` — add `DeliveryStatus` and `DeliverySource` enums
- Create: `src/types/delivery.ts` — Delivery, DeliveryItem, Supplier interfaces

**Step 1: Add enums to `src/types/enums.ts`**

At the end of the file (before the closing line), add:

```typescript
// Delivery enums
export enum DeliveryStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

export enum DeliverySource {
  AI_SCAN = 'ai_scan',
  MANUAL = 'manual',
}
```

**Step 2: Create `src/types/delivery.ts`**

```typescript
import { BaseEntity } from './common';
import { DeliveryStatus, DeliverySource, VatRate } from './enums';

export interface Supplier extends BaseEntity {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface Delivery extends BaseEntity {
  delivery_number: string;
  warehouse_id: string;
  supplier_id: string | null;
  document_number: string | null;
  document_date: string | null;
  source: DeliverySource;
  source_image_url: string | null;
  notes: string | null;
  status: DeliveryStatus;
}

export interface DeliveryItem extends BaseEntity {
  delivery_id: string;
  stock_item_id: string;
  quantity_ordered: number | null;
  quantity_received: number;
  unit_price_net: number | null;
  vat_rate: VatRate | null;
  expiry_date: string | null;
  ai_matched_name: string | null;
  ai_confidence: number | null;
  notes: string | null;
}

/** Enriched delivery item with stock item details for display */
export interface DeliveryItemWithDetails extends DeliveryItem {
  stock_item_name: string;
  stock_item_sku: string;
  stock_item_unit: string;
}

/** Enriched delivery with computed fields for list display */
export interface DeliveryWithDetails extends Delivery {
  supplier_name: string | null;
  warehouse_name: string;
  item_count: number;
  total_net: number | null;
}

/** AI scan result for a single line item */
export interface AIScanLineItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price_net: number | null;
  vat_rate: string | null;
  expiry_date: string | null;
}

/** AI scan result from document */
export interface AIScanResult {
  document_number: string | null;
  document_date: string | null;
  supplier_name: string | null;
  items: AIScanLineItem[];
}

/** Matched AI scan item with stock item suggestion */
export interface AIScanMatchedItem extends AIScanLineItem {
  matched_stock_item_id: string | null;
  matched_stock_item_name: string | null;
  confidence: number;
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 4: Commit**

```bash
git add src/types/enums.ts src/types/delivery.ts
git commit -m "feat(deliveries): add types, enums, and interfaces"
```

---

### Task 2: Zod Schemas and Schema Tests

**Files:**
- Create: `src/schemas/delivery.ts`
- Create: `src/schemas/__tests__/delivery.test.ts`

**Step 1: Create `src/schemas/delivery.ts`**

```typescript
import { z } from 'zod';
import { DeliveryStatus, DeliverySource, VatRate } from '@/types/enums';

export const CreateSupplierSchema = z.object({
  name: z.string()
    .min(1, 'Nazwa dostawcy wymagana')
    .max(100, 'Nazwa za dluga')
    .describe('Supplier name'),
  phone: z.string().max(20).optional().nullable().describe('Phone number'),
  email: z.string().email('Niepoprawny email').optional().nullable().describe('Email'),
  notes: z.string().max(500).optional().nullable().describe('Notes'),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export const DeliveryItemSchema = z.object({
  stock_item_id: z.string().uuid('Niepoprawne ID pozycji').describe('Stock item ID'),
  quantity_ordered: z.number().min(0).optional().nullable().describe('Quantity ordered'),
  quantity_received: z.number().min(0.001, 'Ilosc musi byc wieksza niz 0').describe('Quantity received'),
  unit_price_net: z.number().min(0).optional().nullable().describe('Net unit price'),
  vat_rate: z.nativeEnum(VatRate).optional().nullable().describe('VAT rate'),
  expiry_date: z.string().optional().nullable().describe('Expiry date'),
  ai_matched_name: z.string().optional().nullable().describe('Original name from AI scan'),
  ai_confidence: z.number().min(0).max(1).optional().nullable().describe('AI match confidence'),
  notes: z.string().max(500).optional().nullable().describe('Notes'),
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
```

**Step 2: Create `src/schemas/__tests__/delivery.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  CreateSupplierSchema,
  DeliveryItemSchema,
  CreateDeliverySchema,
} from '../delivery';

describe('CreateSupplierSchema', () => {
  const validSupplier = { name: 'Hurtownia ABC' };

  it('accepts valid supplier', () => {
    expect(CreateSupplierSchema.safeParse(validSupplier).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateSupplierSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = CreateSupplierSchema.safeParse({
      ...validSupplier,
      phone: '+48123456789',
      email: 'abc@test.com',
      notes: 'Staly dostawca',
    });
    expect(result.success).toBe(true);
  });
});

describe('DeliveryItemSchema', () => {
  const validItem = {
    stock_item_id: '550e8400-e29b-41d4-a716-446655440000',
    quantity_received: 10,
  };

  it('accepts valid item with required fields only', () => {
    expect(DeliveryItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects zero quantity_received', () => {
    expect(DeliveryItemSchema.safeParse({ ...validItem, quantity_received: 0 }).success).toBe(false);
  });

  it('rejects missing stock_item_id', () => {
    expect(DeliveryItemSchema.safeParse({ quantity_received: 10 }).success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = DeliveryItemSchema.safeParse({
      ...validItem,
      quantity_ordered: 12,
      unit_price_net: 32.50,
      vat_rate: 'PTU_B',
      expiry_date: '2026-04-01',
      ai_matched_name: 'Wolowina mielona',
      ai_confidence: 0.95,
      notes: '2kg odrzucone',
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidence outside 0-1', () => {
    expect(DeliveryItemSchema.safeParse({ ...validItem, ai_confidence: 1.5 }).success).toBe(false);
  });
});

describe('CreateDeliverySchema', () => {
  const validDelivery = {
    warehouse_id: '550e8400-e29b-41d4-a716-446655440000',
    items: [
      {
        stock_item_id: '550e8400-e29b-41d4-a716-446655440001',
        quantity_received: 10,
      },
    ],
  };

  it('accepts valid delivery with required fields only', () => {
    expect(CreateDeliverySchema.safeParse(validDelivery).success).toBe(true);
  });

  it('rejects empty items array', () => {
    expect(CreateDeliverySchema.safeParse({ ...validDelivery, items: [] }).success).toBe(false);
  });

  it('rejects missing warehouse_id', () => {
    expect(CreateDeliverySchema.safeParse({ items: validDelivery.items }).success).toBe(false);
  });

  it('defaults source to manual', () => {
    const result = CreateDeliverySchema.safeParse(validDelivery);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('manual');
    }
  });

  it('accepts full delivery with all optional fields', () => {
    const result = CreateDeliverySchema.safeParse({
      ...validDelivery,
      supplier_id: '550e8400-e29b-41d4-a716-446655440002',
      document_number: 'FV/2026/001',
      document_date: '2026-02-26',
      source: 'ai_scan',
      notes: 'Dostawa tygodniowa',
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/schemas/__tests__/delivery.test.ts`
Expected: ALL PASS

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/schemas/delivery.ts src/schemas/__tests__/delivery.test.ts
git commit -m "feat(deliveries): add Zod schemas and schema tests"
```

---

### Task 3: Constants and Supplier Entity

**Files:**
- Create: `src/lib/constants/delivery.ts`
- Create: `src/modules/deliveries/repository.ts` (supplier part only)

**Step 1: Create `src/lib/constants/delivery.ts`**

```typescript
import { DeliveryStatus, DeliverySource } from '@/types/enums';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.DRAFT]: 'Szkic',
  [DeliveryStatus.COMPLETED]: 'Przyjeta',
};

export const DELIVERY_SOURCE_LABELS: Record<DeliverySource, string> = {
  [DeliverySource.AI_SCAN]: 'AI Skan',
  [DeliverySource.MANUAL]: 'Reczna',
};
```

**Step 2: Create `src/modules/deliveries/repository.ts`**

```typescript
import { createRepository } from '@/lib/data/repository-factory';
import { Supplier, Delivery, DeliveryItem, DeliveryWithDetails, DeliveryItemWithDetails } from '@/types/delivery';
import { DeliveryStatus, DeliverySource } from '@/types/enums';
import { inventoryRepository } from '@/modules/inventory/repository';

const supplierRepo = createRepository<Supplier>('suppliers');
const deliveryRepo = createRepository<Delivery>('deliveries');
const deliveryItemRepo = createRepository<DeliveryItem>('delivery_items');

export const deliveryRepository = {
  suppliers: supplierRepo,
  deliveries: deliveryRepo,
  deliveryItems: deliveryItemRepo,

  // ── Suppliers ──

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
    // Soft delete
    await supplierRepo.update(id, { is_active: false, updated_at: new Date().toISOString() } as Partial<Supplier>);
  },

  // ── Deliveries ──

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
          if (i.unit_price_net != null) {
            return sum + i.unit_price_net * i.quantity_received;
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
      unit_price_net?: number | null;
      vat_rate?: string | null;
      expiry_date?: string | null;
      ai_matched_name?: string | null;
      ai_confidence?: number | null;
      notes?: string | null;
    }[]
  ): Promise<Delivery> {
    const deliveryNumber = await this.generateDeliveryNumber();

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
      await deliveryItemRepo.create({
        delivery_id: delivery.id,
        stock_item_id: item.stock_item_id,
        quantity_ordered: item.quantity_ordered ?? null,
        quantity_received: item.quantity_received,
        unit_price_net: item.unit_price_net ?? null,
        vat_rate: (item.vat_rate as Delivery['status']) ?? null,
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

    // Increase stock levels
    for (const item of items) {
      await inventoryRepository.adjustStock(
        delivery.warehouse_id,
        item.stock_item_id,
        item.quantity_received,
        `Dostawa ${delivery.delivery_number}`
      );
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
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/constants/delivery.ts src/modules/deliveries/repository.ts
git commit -m "feat(deliveries): add constants and repository with supplier/delivery CRUD"
```

---

### Task 4: Repository Tests

**Files:**
- Create: `src/modules/deliveries/__tests__/repository.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupplierRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn(),
};

const mockDeliveryRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn(),
};

const mockDeliveryItemRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn(),
};

let repoCallCount = 0;
vi.mock('@/lib/data/repository-factory', () => ({
  createRepository: () => {
    repoCallCount++;
    if (repoCallCount === 1) return mockSupplierRepo;
    if (repoCallCount === 2) return mockDeliveryRepo;
    return mockDeliveryItemRepo;
  },
}));

vi.mock('@/modules/inventory/repository', () => ({
  inventoryRepository: {
    getAllWarehouses: vi.fn().mockResolvedValue([
      { id: 'wh-1', name: 'Main stock', is_active: true },
    ]),
    getAllStockItems: vi.fn().mockResolvedValue([
      { id: 'si-1', name: 'Wolowina', sku: 'WOL-001', unit: 'kg' },
    ]),
    adjustStock: vi.fn().mockResolvedValue(undefined),
  },
}));

import { deliveryRepository } from '../repository';
import { inventoryRepository } from '@/modules/inventory/repository';

describe('deliveryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSuppliers', () => {
    it('returns active suppliers sorted by name', async () => {
      mockSupplierRepo.findMany.mockResolvedValue([
        { id: 's-2', name: 'Zeelandia', is_active: true },
        { id: 's-1', name: 'Ardo', is_active: true },
      ]);

      const result = await deliveryRepository.getAllSuppliers();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ardo');
      expect(result[1].name).toBe('Zeelandia');
    });
  });

  describe('generateDeliveryNumber', () => {
    it('generates PZ number with year', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([]);
      const num = await deliveryRepository.generateDeliveryNumber();
      const year = new Date().getFullYear();
      expect(num).toBe(`PZ 1/${year}`);
    });

    it('increments based on existing deliveries', async () => {
      const year = new Date().getFullYear();
      mockDeliveryRepo.findMany.mockResolvedValue([
        { delivery_number: `PZ 1/${year}` },
        { delivery_number: `PZ 2/${year}` },
      ]);
      const num = await deliveryRepository.generateDeliveryNumber();
      expect(num).toBe(`PZ 3/${year}`);
    });
  });

  describe('createDelivery', () => {
    it('creates delivery with items', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([]);
      mockDeliveryRepo.create.mockResolvedValue({
        id: 'del-1',
        delivery_number: 'PZ 1/2026',
        status: 'draft',
      });
      mockDeliveryItemRepo.create.mockResolvedValue({ id: 'di-1' });

      const result = await deliveryRepository.createDelivery(
        { warehouse_id: 'wh-1', source: 'manual' as never },
        [{ stock_item_id: 'si-1', quantity_received: 10 }]
      );

      expect(result.id).toBe('del-1');
      expect(mockDeliveryItemRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeDelivery', () => {
    it('increases stock and sets status to completed', async () => {
      mockDeliveryRepo.findById.mockResolvedValue({
        id: 'del-1',
        warehouse_id: 'wh-1',
        delivery_number: 'PZ 1/2026',
        status: 'draft',
      });
      mockDeliveryItemRepo.findMany.mockResolvedValue([
        { delivery_id: 'del-1', stock_item_id: 'si-1', quantity_received: 10 },
      ]);
      mockDeliveryRepo.update.mockResolvedValue({});

      await deliveryRepository.completeDelivery('del-1');

      expect(inventoryRepository.adjustStock).toHaveBeenCalledWith(
        'wh-1', 'si-1', 10, 'Dostawa PZ 1/2026'
      );
      expect(mockDeliveryRepo.update).toHaveBeenCalledWith(
        'del-1',
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('throws if delivery already completed', async () => {
      mockDeliveryRepo.findById.mockResolvedValue({
        id: 'del-1',
        status: 'completed',
      });

      await expect(deliveryRepository.completeDelivery('del-1'))
        .rejects.toThrow('Delivery already completed');
    });
  });

  describe('getAllDeliveries', () => {
    it('returns deliveries with enriched details', async () => {
      mockDeliveryRepo.findMany.mockResolvedValue([{
        id: 'del-1',
        delivery_number: 'PZ 1/2026',
        warehouse_id: 'wh-1',
        supplier_id: 's-1',
        created_at: '2026-02-26T10:00:00Z',
      }]);
      mockSupplierRepo.findMany.mockResolvedValue([
        { id: 's-1', name: 'Ardo' },
      ]);
      mockDeliveryItemRepo.findMany.mockResolvedValue([
        { delivery_id: 'del-1', stock_item_id: 'si-1', quantity_received: 10, unit_price_net: 32.50 },
      ]);

      const result = await deliveryRepository.getAllDeliveries();
      expect(result).toHaveLength(1);
      expect(result[0].supplier_name).toBe('Ardo');
      expect(result[0].warehouse_name).toBe('Main stock');
      expect(result[0].item_count).toBe(1);
      expect(result[0].total_net).toBe(325);
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/modules/deliveries/__tests__/repository.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/modules/deliveries/__tests__/repository.test.ts
git commit -m "test(deliveries): add repository unit tests"
```

---

### Task 5: Zustand Store

**Files:**
- Create: `src/modules/deliveries/store.ts`

**Step 1: Create store**

```typescript
'use client';

import { create } from 'zustand';
import { Supplier, DeliveryWithDetails, Delivery } from '@/types/delivery';
import { DeliverySource } from '@/types/enums';
import { deliveryRepository } from './repository';

interface DeliveryStore {
  // State
  deliveries: DeliveryWithDetails[];
  suppliers: Supplier[];
  isLoading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  loadSuppliers: () => Promise<void>;

  // Supplier CRUD
  createSupplier: (data: { name: string; phone?: string | null; email?: string | null; notes?: string | null }) => Promise<Supplier>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Delivery CRUD
  createDelivery: (
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
      unit_price_net?: number | null;
      vat_rate?: string | null;
      expiry_date?: string | null;
      ai_matched_name?: string | null;
      ai_confidence?: number | null;
      notes?: string | null;
    }[]
  ) => Promise<Delivery>;
  completeDelivery: (id: string) => Promise<void>;
  updateDelivery: (id: string, data: Partial<Delivery>) => Promise<void>;
}

export const useDeliveryStore = create<DeliveryStore>()((set, get) => ({
  deliveries: [],
  suppliers: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [deliveries, suppliers] = await Promise.all([
        deliveryRepository.getAllDeliveries(),
        deliveryRepository.getAllSuppliers(),
      ]);
      set({ deliveries, suppliers });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSuppliers: async () => {
    const suppliers = await deliveryRepository.getAllSuppliers();
    set({ suppliers });
  },

  createSupplier: async (data) => {
    const supplier = await deliveryRepository.createSupplier({
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      is_active: true,
    });
    set({ suppliers: [...get().suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name)) });
    return supplier;
  },

  updateSupplier: async (id, data) => {
    await deliveryRepository.updateSupplier(id, data);
    set({
      suppliers: get().suppliers.map((s) => (s.id === id ? { ...s, ...data } : s)),
    });
  },

  deleteSupplier: async (id) => {
    await deliveryRepository.deleteSupplier(id);
    set({ suppliers: get().suppliers.filter((s) => s.id !== id) });
  },

  createDelivery: async (data, items) => {
    const delivery = await deliveryRepository.createDelivery(data, items);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
    return delivery;
  },

  completeDelivery: async (id) => {
    await deliveryRepository.completeDelivery(id);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
  },

  updateDelivery: async (id, data) => {
    await deliveryRepository.updateDelivery(id, data);
    const deliveries = await deliveryRepository.getAllDeliveries();
    set({ deliveries });
  },
}));
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/modules/deliveries/store.ts
git commit -m "feat(deliveries): add Zustand store"
```

---

### Task 6: AI Scan - Fuzzy Matching Utility

**Files:**
- Create: `src/modules/deliveries/utils/fuzzy-match.ts`
- Create: `src/modules/deliveries/__tests__/fuzzy-match.test.ts`

**Step 1: Create `src/modules/deliveries/utils/fuzzy-match.ts`**

```typescript
/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1).
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export interface MatchCandidate {
  id: string;
  name: string;
  sku: string;
}

export interface MatchResult {
  candidate_id: string | null;
  candidate_name: string | null;
  confidence: number;
}

/**
 * Find best matching stock item for a given name from AI scan.
 * Returns match with confidence score.
 *
 * - Exact SKU match = 1.0
 * - Fuzzy name match normalized and compared
 * - Threshold: 0.5 minimum to return a match
 */
export function findBestMatch(
  scanName: string,
  candidates: MatchCandidate[],
  threshold = 0.5
): MatchResult {
  const normalized = scanName.toLowerCase().trim();

  // Try exact SKU match first
  const skuMatch = candidates.find(
    (c) => c.sku.toLowerCase() === normalized
  );
  if (skuMatch) {
    return { candidate_id: skuMatch.id, candidate_name: skuMatch.name, confidence: 1.0 };
  }

  let bestMatch: MatchResult = { candidate_id: null, candidate_name: null, confidence: 0 };

  for (const candidate of candidates) {
    const nameSim = similarity(normalized, candidate.name.toLowerCase().trim());
    // Also try matching against SKU with lower weight
    const skuSim = similarity(normalized, candidate.sku.toLowerCase().trim()) * 0.8;
    const score = Math.max(nameSim, skuSim);

    if (score > bestMatch.confidence) {
      bestMatch = { candidate_id: candidate.id, candidate_name: candidate.name, confidence: Math.round(score * 100) / 100 };
    }
  }

  if (bestMatch.confidence < threshold) {
    return { candidate_id: null, candidate_name: null, confidence: bestMatch.confidence };
  }

  return bestMatch;
}

/**
 * Match a supplier name from AI scan to existing suppliers.
 */
export function findBestSupplierMatch(
  scanName: string,
  suppliers: { id: string; name: string }[],
  threshold = 0.6
): { id: string | null; confidence: number } {
  const normalized = scanName.toLowerCase().trim();

  let bestId: string | null = null;
  let bestScore = 0;

  for (const supplier of suppliers) {
    const score = similarity(normalized, supplier.name.toLowerCase().trim());
    if (score > bestScore) {
      bestScore = score;
      bestId = supplier.id;
    }
  }

  if (bestScore < threshold) return { id: null, confidence: bestScore };
  return { id: bestId, confidence: Math.round(bestScore * 100) / 100 };
}
```

**Step 2: Create `src/modules/deliveries/__tests__/fuzzy-match.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { findBestMatch, findBestSupplierMatch } from '../utils/fuzzy-match';

const stockItems = [
  { id: 'si-1', name: 'Wolowina mielona', sku: 'WOL-001' },
  { id: 'si-2', name: 'Bulka hamburgerowa', sku: 'BUL-001' },
  { id: 'si-3', name: 'Ser cheddar', sku: 'SER-001' },
  { id: 'si-4', name: 'Salatka mieszana', sku: 'SAL-001' },
];

describe('findBestMatch', () => {
  it('exact name match returns high confidence', () => {
    const result = findBestMatch('Wolowina mielona', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBe(1);
  });

  it('exact SKU match returns confidence 1.0', () => {
    const result = findBestMatch('WOL-001', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBe(1.0);
  });

  it('fuzzy name match works for similar names', () => {
    const result = findBestMatch('Wolowina miel. 80/20', stockItems);
    expect(result.candidate_id).toBe('si-1');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns null for completely unrelated name', () => {
    const result = findBestMatch('Komputer stacjonarny', stockItems);
    expect(result.candidate_id).toBeNull();
  });

  it('is case insensitive', () => {
    const result = findBestMatch('WOLOWINA MIELONA', stockItems);
    expect(result.candidate_id).toBe('si-1');
  });

  it('respects threshold parameter', () => {
    const result = findBestMatch('Wol miel', stockItems, 0.9);
    expect(result.candidate_id).toBeNull();
  });
});

describe('findBestSupplierMatch', () => {
  const suppliers = [
    { id: 'sup-1', name: 'Hurtownia ABC' },
    { id: 'sup-2', name: 'Ardo Polska' },
  ];

  it('matches similar supplier name', () => {
    const result = findBestSupplierMatch('Hurtownia ABC Sp. z o.o.', suppliers);
    expect(result.id).toBe('sup-1');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('returns null for unknown supplier', () => {
    const result = findBestSupplierMatch('Firma XYZ', suppliers);
    expect(result.id).toBeNull();
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/modules/deliveries/__tests__/fuzzy-match.test.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/modules/deliveries/utils/fuzzy-match.ts src/modules/deliveries/__tests__/fuzzy-match.test.ts
git commit -m "feat(deliveries): add fuzzy matching utility with tests"
```

---

### Task 7: AI Scan API Route

**Files:**
- Install: `openai` npm package
- Create: `src/app/api/v1/deliveries/scan/route.ts`

**Step 1: Install OpenAI SDK**

Run: `npm install openai`

**Step 2: Create `src/app/api/v1/deliveries/scan/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AIScanResult } from '@/types/delivery';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCAN_PROMPT = `You are analyzing a delivery document (invoice or delivery note) for a restaurant/food service business.

Extract the following information from the image:
1. document_number - invoice or delivery note number (null if not found)
2. document_date - date on the document in YYYY-MM-DD format (null if not found)
3. supplier_name - name of the supplier/company (null if not found)
4. items - array of line items, each with:
   - name: product name as written on document
   - quantity: numeric quantity (null if unclear)
   - unit: unit of measurement like kg, szt, l, op (null if not shown)
   - unit_price_net: net price per unit in PLN (null if not shown, e.g. on delivery notes)
   - vat_rate: VAT rate as percentage string like "8%", "23%", "5%" (null if not shown)
   - expiry_date: expiry date in YYYY-MM-DD format (null if not shown)

Important:
- This is a Polish document. Prices are in PLN.
- Return ONLY valid JSON matching the schema below.
- If the document is not a delivery/invoice document, return empty items array.
- Do your best to extract quantities and prices even if formatting is unusual.

Return JSON schema:
{
  "document_number": string | null,
  "document_date": string | null,
  "supplier_name": string | null,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price_net": number | null,
      "vat_rate": string | null,
      "expiry_date": string | null
    }
  ]
}`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: { code: 'CONFIG_ERROR', message: 'OpenAI API key not configured' } },
      { status: 500 }
    );
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_IMAGE', message: 'No image provided' } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    imageBase64 = buffer.toString('base64');
    mimeType = file.type || 'image/jpeg';
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Could not read image from request' } },
      { status: 400 }
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: { code: 'AI_ERROR', message: 'No response from AI' } },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scanResult: AIScanResult = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, data: scanResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'AI_SCAN_FAILED', message } },
      { status: 500 }
    );
  }
}
```

**Step 3: Add OPENAI_API_KEY to `.env.local`**

Add line: `OPENAI_API_KEY=sk-...` (user must provide their own key)

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/v1/deliveries/scan/route.ts package.json package-lock.json
git commit -m "feat(deliveries): add AI scan API route with GPT-4o Vision"
```

---

### Task 8: Navigation and Deliveries List Page

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx` — add Dostawy nav item
- Create: `src/app/(dashboard)/deliveries/page.tsx`
- Create: `src/modules/deliveries/components/delivery-table.tsx`
- Create: `src/modules/deliveries/components/supplier-manager.tsx`

**Step 1: Add nav item to `src/components/layout/app-sidebar.tsx`**

Add `Truck` to the lucide-react import and to `iconMap`. Add nav item after Magazyn:

```typescript
{ title: 'Dostawy', href: '/deliveries', icon: 'Truck' },
```

**Step 2: Create `src/modules/deliveries/components/supplier-manager.tsx`**

Follow the pattern from `src/modules/inventory/components/warehouse-manager.tsx`. Dialog with list of suppliers, add/edit/delete. Fields: name (required), phone, email, notes. Data attributes: `data-component="supplier-manager"`, `data-action="add-supplier"`, etc.

**Step 3: Create `src/modules/deliveries/components/delivery-table.tsx`**

Table component showing deliveries list. Columns: Nr dostawy, Dostawca, Magazyn, Pozycji, Suma netto, Data, Zrodlo. Uses `<Table>`, `<Badge>` for source/status. EmptyState when no deliveries. Each row is a `<Link>` to `/deliveries/{id}` for future detail view.

Filters: supplier dropdown, date range (2 date inputs).

**Step 4: Create `src/app/(dashboard)/deliveries/page.tsx`**

```
'use client' page with:
- data-page="deliveries"
- PageHeader with title "Dostawy" and actions: "Nowa dostawa" button, "Dostawcy" button
- useDeliveryStore for data loading
- useEffect loadAll on mount
- DeliveryTable component
- SupplierManager dialog
- "Nowa dostawa" links to /deliveries/new
```

**Step 5: Run type check and verify in browser**

Run: `npx tsc --noEmit`
Open: `http://localhost:3000/deliveries`
Expected: Empty state page with navigation working

**Step 6: Commit**

```bash
git add src/components/layout/app-sidebar.tsx src/app/\\(dashboard\\)/deliveries/page.tsx src/modules/deliveries/components/
git commit -m "feat(deliveries): add deliveries list page, nav item, supplier manager"
```

---

### Task 9: New Delivery Form - Excel-like Table

**Files:**
- Create: `src/modules/deliveries/components/delivery-line-table.tsx`
- Create: `src/modules/deliveries/components/delivery-form.tsx`
- Create: `src/app/(dashboard)/deliveries/new/page.tsx`

**Step 1: Create `src/modules/deliveries/components/delivery-line-table.tsx`**

This is the core Excel-like component. Key behaviors:
- Array of line items managed via `useState`
- Always one empty row at bottom
- Product column: `<Input>` with type-ahead dropdown filtering stock items. Enter/click selects item
- Quantity column: `<Input type="number">`
- Price column: `<Input type="number">` pre-filled from `cost_per_unit`
- Notes column: `<Input>`
- Tab from last column of a row auto-adds new row and focuses Product field
- X button to remove row
- `onKeyDown` handler on Notes input: if Tab and last row, add new row
- Props: `items` (the line array), `onItemsChange` callback, `stockItems` (for dropdown)
- Data attributes: `data-component="delivery-line-table"`, `data-row={index}`, `data-field="product"` etc.

**Step 2: Create `src/modules/deliveries/components/delivery-form.tsx`**

Full form layout:
- Header fields: warehouse (required select), supplier (optional select), document number (optional input), document date (optional input), notes (optional textarea)
- "Zrob zdjecie" button + file upload input (calls AI scan API)
- `<DeliveryLineTable>` component
- Footer: item count, total net (computed), "Zapisz szkic" button, "Przyjmij dostawe" button
- "Przyjmij dostawe" validates via `CreateDeliverySchema`, creates delivery, then completes it
- "Zapisz szkic" creates delivery in draft status

**Step 3: Create `src/app/(dashboard)/deliveries/new/page.tsx`**

```
'use client' page with:
- data-page="delivery-new"
- PageHeader with title "Nowa dostawa" and back button
- DeliveryForm component
- useDeliveryStore + useInventoryStore for data
- useRouter for navigation after save
```

**Step 4: Run type check, test in browser**

Run: `npx tsc --noEmit`
Open: `http://localhost:3000/deliveries/new`
Expected: Form with Excel-like table, manual entry working

**Step 5: Commit**

```bash
git add src/modules/deliveries/components/delivery-line-table.tsx src/modules/deliveries/components/delivery-form.tsx src/app/\\(dashboard\\)/deliveries/new/page.tsx
git commit -m "feat(deliveries): add new delivery form with Excel-like line table"
```

---

### Task 10: AI Scan Integration in Form

**Files:**
- Modify: `src/modules/deliveries/components/delivery-form.tsx` — wire up AI scan button
- Create: `src/modules/deliveries/components/ai-scan-review.tsx`

**Step 1: Create `src/modules/deliveries/components/ai-scan-review.tsx`**

Review component shown after AI scan:
- Receives `AIScanResult` + `stockItems` + `suppliers` as props
- Runs `findBestMatch` for each scanned item against stock items
- Runs `findBestSupplierMatch` for supplier name
- Displays table: Document name | -> | Matched product (dropdown) | Confidence badge | Quantity | Price
- Confidence badge: green >= 0.8, yellow >= 0.6, red < 0.6
- Unmatched items show dropdown to select stock item manually
- "Potwierdz" button converts to delivery line items and populates the form
- "Anuluj" closes the review

**Step 2: Modify `delivery-form.tsx`**

- Add file input (hidden) + "Skanuj dokument" button triggering it
- On file select: upload to `/api/v1/deliveries/scan`, show loading spinner
- On success: show `<AIScanReview>` overlay/dialog
- On confirm from review: populate header fields (supplier, document_number, document_date) + line table items
- Set source to `ai_scan`

**Step 3: Test in browser with a sample invoice photo**

Open: `http://localhost:3000/deliveries/new`
Click: "Skanuj dokument", upload an invoice image
Expected: AI processes image, shows review table with matches

**Step 4: Commit**

```bash
git add src/modules/deliveries/components/ai-scan-review.tsx src/modules/deliveries/components/delivery-form.tsx
git commit -m "feat(deliveries): integrate AI document scanning with review step"
```

---

### Task 11: Delivery Detail / Edit Page

**Files:**
- Create: `src/app/(dashboard)/deliveries/[id]/page.tsx`

**Step 1: Create detail page**

```
'use client' page with:
- data-page="delivery-detail"
- Load delivery by ID + delivery items
- Show delivery header info (read-only for completed, editable for draft)
- Show items table (read-only for completed)
- For draft: "Przyjmij dostawe" button to complete
- For completed: badge showing "Przyjeta" status
- Optional fields editable even after completion (supplier, document_number, notes etc.)
- Back button to /deliveries
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/\\(dashboard\\)/deliveries/\\[id\\]/page.tsx
git commit -m "feat(deliveries): add delivery detail/edit page"
```

---

### Task 12: Full Test Suite and CI Check

**Files:**
- Verify all existing tests still pass
- Run lint, typecheck, build

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (149 existing + new delivery tests)

**Step 2: Run lint**

Run: `npx eslint --max-warnings 85`
Expected: PASS (warnings only, no errors)

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Run build**

Run: `npm run build`
Expected: PASS

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(deliveries): complete deliveries module with AI scanning"
```
