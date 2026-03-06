'use client';

import { useEffect, useMemo, useState } from 'react';
import { Category, Product } from '@/types/menu';
import { CreateRecipeInput } from '@/schemas/recipe';
import { DeliverySource, ProductCategory } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { RecipeForm } from '@/modules/recipes/components/recipe-form';
import { StockItemForm } from '@/modules/inventory/components/stock-item-form';
import { DeliveryForm } from '@/modules/deliveries/components/delivery-form';
import { ProductForm } from '@/modules/menu/components/product-form';
import { useInventoryStore } from '@/modules/inventory/store';
import { useDeliveryStore } from '@/modules/deliveries/store';
import {
  createProductFixture,
  e2eCategories,
  e2eInventoryCategories,
  e2eRecipes,
  e2eStockItems,
  e2eSuppliers,
  e2eWarehouses,
  E2E_IDS,
} from './pos-regression-fixtures';

const STORAGE_PREFIX = 'mesopos_';

type StockItemSubmission = {
  data: Record<string, unknown>;
  minQuantity: number;
  quantity: number;
  warehouseId: string;
};

type DeliverySubmission = {
  data: unknown;
  items: unknown[];
  mode: 'complete' | 'draft';
};

function resetHarnessStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(
    `${STORAGE_PREFIX}stock_items`,
    JSON.stringify(e2eStockItems)
  );
  localStorage.setItem(
    `${STORAGE_PREFIX}warehouses`,
    JSON.stringify(e2eWarehouses)
  );
  localStorage.setItem(
    `${STORAGE_PREFIX}inventory_categories`,
    JSON.stringify(e2eInventoryCategories)
  );
  localStorage.setItem(`${STORAGE_PREFIX}recipes`, JSON.stringify(e2eRecipes));
}

function JsonPanel({
  data,
  testId,
}: {
  data: unknown;
  testId: string;
}) {
  return (
    <pre
      data-testid={testId}
      className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100"
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function HarnessSection({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section
      data-testid={testId}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function PosRegressionHarness() {
  const [isReady, setIsReady] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [recipeSubmission, setRecipeSubmission] =
    useState<CreateRecipeInput | null>(null);
  const [stockItemSubmission, setStockItemSubmission] =
    useState<StockItemSubmission | null>(null);
  const [deliverySubmission, setDeliverySubmission] =
    useState<DeliverySubmission | null>(null);
  const [productSubmission, setProductSubmission] = useState<{
    data: Omit<Product, 'created_at' | 'updated_at'>;
    modifierIds: string[];
  } | null>(null);

  const productFixture = useMemo(() => createProductFixture(), []);
  const recipeFixture = useMemo(
    () =>
      e2eRecipes.find((recipe) => recipe.id === E2E_IDS.recipeSauceBase) ?? null,
    []
  );

  useEffect(() => {
    resetHarnessStorage();

    useInventoryStore.setState({
      stockItems: e2eStockItems,
      warehouses: e2eWarehouses,
      inventoryCategories: e2eInventoryCategories,
      warehouseStockItems: [],
      selectedWarehouseId: e2eWarehouses[0].id,
      isLoading: false,
    });

    useDeliveryStore.setState({
      suppliers: e2eSuppliers,
      deliveries: [],
      isLoading: false,
    });

    setStockDialogOpen(false);
    setRecipeSubmission(null);
    setStockItemSubmission(null);
    setDeliverySubmission(null);
    setProductSubmission(null);
    setIsReady(true);
  }, []);

  if (!isReady || !recipeFixture) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Przygotowywanie harnessu E2E...
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="pos-regression-harness">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          POS Regression Harness
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Publiczny harness do przegladarkowych testow regresji formularzy
          receptur, magazynu, dostaw i cen. Dane sa lokalne i resetowane przy
          kazdym odswiezeniu strony.
        </p>
      </div>

      <HarnessSection
        testId="recipe-section"
        title="Recipe Form"
        description="Weryfikuje zagniezdzone polprodukty, blokade potomkow i pola dziesietne."
      >
        <RecipeForm
          recipeId={recipeFixture.id}
          defaultValues={{
            name: 'Nowa receptura E2E',
            description: 'Scenariusz regresyjny dla polproduktow',
            product_id: recipeFixture.product_id,
            created_by: 'system',
            product_category: ProductCategory.SEMI_FINISHED,
            ingredients: [],
            yield_quantity: 1,
            yield_unit: 'kg',
            preparation_time_minutes: 10,
            instructions: 'Instrukcja testowa',
          }}
          onSubmit={async (data) => {
            setRecipeSubmission(data);
          }}
        />
        <JsonPanel
          data={recipeSubmission}
          testId="recipe-submit-output"
        />
      </HarnessSection>

      <HarnessSection
        testId="stock-item-section"
        title="Stock Item Form"
        description="Weryfikuje cene za kg, wage jednostki zakupu i wartosci dziesietne."
      >
        <Button
          type="button"
          onClick={() => setStockDialogOpen(true)}
          data-testid="open-stock-item-form"
        >
          Otworz formularz magazynowy
        </Button>
        <StockItemForm
          open={stockDialogOpen}
          onOpenChange={setStockDialogOpen}
          warehouses={e2eWarehouses}
          inventoryCategories={e2eInventoryCategories}
          onSubmit={async (data, warehouseId, quantity, minQuantity) => {
            setStockItemSubmission({
              data,
              warehouseId,
              quantity,
              minQuantity,
            });
          }}
        />
        <JsonPanel
          data={stockItemSubmission}
          testId="stock-item-submit-output"
        />
      </HarnessSection>

      <HarnessSection
        testId="delivery-section"
        title="Delivery Form"
        description="Weryfikuje przeliczenie danych dostawcy do magazynu oraz wyliczenie PLN/kg."
      >
        <DeliveryForm
          onSaveDraft={async (data, items) => {
            setDeliverySubmission({
              data,
              items,
              mode: 'draft',
            });
          }}
          onComplete={async (data, items) => {
            setDeliverySubmission({
              data,
              items,
              mode: 'complete',
            });
          }}
        />
        <JsonPanel
          data={deliverySubmission}
          testId="delivery-submit-output"
        />
      </HarnessSection>

      <HarnessSection
        testId="product-section"
        title="Product Form"
        description="Weryfikuje pola cenowe z promocja i ujemna korekte ceny wariantu."
      >
        <ProductForm
          product={productFixture}
          categories={e2eCategories as Category[]}
          stockItems={e2eStockItems}
          recipes={e2eRecipes}
          onSubmit={(data, modifierIds) => {
            setProductSubmission({
              data,
              modifierIds,
            });
          }}
          onCancel={() => {}}
        />
        <JsonPanel
          data={productSubmission}
          testId="product-submit-output"
        />
      </HarnessSection>

      <div className="hidden" data-testid="harness-metadata">
        {JSON.stringify({
          deliverySource: DeliverySource.MANUAL,
          recipeIds: e2eRecipes.map((recipe) => recipe.id),
          stockItemIds: e2eStockItems.map((item) => item.id),
        })}
      </div>
    </div>
  );
}
