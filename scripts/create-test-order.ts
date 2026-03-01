/**
 * E2E Test: Create a test order via the API
 *
 * Creates a realistic POS order with multiple items and modifiers,
 * then verifies it can be retrieved. The order will be visible
 * in the POS dashboard at /orders.
 *
 * Usage:
 *   npx tsx scripts/create-test-order.ts
 *   BASE_URL=https://mesopos.vercel.app npx tsx scripts/create-test-order.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown[] };
}

async function api<T = unknown>(
  path: string,
  options?: RequestInit & { apiKey?: string }
): Promise<ApiResponse<T>> {
  const { apiKey, ...fetchOptions } = options || {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  const text = await res.text();
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: { code: `HTTP_${res.status}`, message: text.slice(0, 200) },
    };
  }
}

// ── Types ──────────────────────────────────────────────────

interface ProductFromApi {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  variants: { id: string; name: string; price: number; is_available: boolean }[];
}

// ── Helpers ────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label: string, detail?: string) {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail?: string) {
  failed++;
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 E2E: Tworzenie zamówienia testowego`);
  console.log(`   Base URL: ${BASE_URL}\n`);

  // 1. Create API key
  console.log('── Setup: API Key ──');
  const keyRes = await api<{ raw_key: string; key_prefix: string }>(
    '/api/v1/api-keys',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `e2e-test-${Date.now()}`,
        permissions: ['orders:read', 'orders:write', 'orders:status', 'menu:read'],
      }),
    }
  );

  if (!keyRes.success || !keyRes.data?.raw_key) {
    fail('Utworzenie API key', JSON.stringify(keyRes.error));
    console.log('\n💡 Upewnij się, że serwer działa: npm run dev\n');
    process.exit(1);
  }

  const apiKey = keyRes.data.raw_key;
  ok('Utworzenie API key', keyRes.data.key_prefix);

  // 2. Fetch real products from menu
  console.log('\n── Setup: Pobranie produktów z menu ──');
  const menuRes = await api<ProductFromApi[]>(
    '/api/v1/menu/products',
    { apiKey }
  );

  if (!menuRes.success || !menuRes.data || menuRes.data.length === 0) {
    fail('Pobranie produktów', JSON.stringify(menuRes.error));
    console.log('\n💡 Upewnij się, że seed data zostały załadowane\n');
    process.exit(1);
  }

  const products = menuRes.data;
  ok('Pobrano produkty z menu', `${products.length} produktów`);

  // Pick real products for the order
  const burger = products.find((p) => p.name.toLowerCase().includes('cheeseburger'));
  const fries = products.find((p) => p.name.toLowerCase().includes('frytki klasyczne'));
  const cola = products.find((p) => p.name.toLowerCase().includes('cola'));

  if (!burger || !fries || !cola) {
    fail('Produkty testowe', 'Nie znaleziono wymaganych produktów (burger, frytki, cola)');
    process.exit(1);
  }

  ok('Produkty testowe znalezione', `${burger.name}, ${fries.name}, ${cola.name}`);

  // 3. Test negative: order with fake product_id → 422
  console.log('\n── Test: Zamówienie z fałszywym product_id → 422 ──');
  const fakeOrderRes = await api<unknown>(
    '/api/v1/orders',
    {
      method: 'POST',
      apiKey,
      body: JSON.stringify({
        channel: 'pos',
        source: 'dine_in',
        location_id: '11111111-1111-1111-1111-111111111002',
        customer_name: 'Test Negatywny',
        payment_method: 'card',
        items: [
          {
            product_id: '00000000-0000-0000-0000-000000000000',
            product_name: 'Nieistniejący produkt',
            quantity: 1,
            unit_price: 9.99,
            modifiers: [],
          },
        ],
      }),
    }
  );

  if (!fakeOrderRes.success && fakeOrderRes.error?.code === 'VALIDATION_ERROR') {
    ok('Odrzucone z kodem 422', fakeOrderRes.error.message);
  } else {
    fail('Oczekiwano 422 dla fałszywego product_id', JSON.stringify(fakeOrderRes));
  }

  // 4. Create order with real products
  console.log('\n── Test: Tworzenie zamówienia POS (prawdziwe produkty) ──');
  const TEST_ORDER = {
    channel: 'pos' as const,
    source: 'dine_in' as const,
    location_id: '11111111-1111-1111-1111-111111111002',
    customer_name: 'Anna Testowa',
    customer_phone: '+48 600 111 222',
    payment_method: 'card' as const,
    notes: 'Zamówienie testowe e2e',
    discount: 5.0,
    items: [
      {
        product_id: burger.id,
        product_name: burger.name,
        quantity: 2,
        unit_price: burger.price,
        modifiers: [
          {
            modifier_id: 'mod-extra-cheese',
            name: 'Dodatkowy ser',
            price: 3.0,
            quantity: 1,
            modifier_action: 'add' as const,
          },
        ],
      },
      {
        product_id: fries.id,
        product_name: fries.name,
        quantity: 1,
        unit_price: fries.price,
        modifiers: [],
      },
      {
        product_id: cola.id,
        product_name: cola.name,
        quantity: 2,
        unit_price: cola.price,
        modifiers: [],
      },
    ],
  };

  const orderRes = await api<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    items: { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    customer_name: string;
    notes: string;
    status_history: { status: string; timestamp: string; note?: string }[];
  }>('/api/v1/orders', {
    method: 'POST',
    apiKey,
    body: JSON.stringify(TEST_ORDER),
  });

  if (!orderRes.success || !orderRes.data) {
    fail('POST /api/v1/orders', JSON.stringify(orderRes.error));
    process.exit(1);
  }

  const order = orderRes.data;
  ok('Zamówienie utworzone', `#${order.order_number} (id: ${order.id})`);

  // 5. Verify status
  if (order.status === 'pending') {
    ok('Status = pending');
  } else {
    fail('Status = pending', `got: ${order.status}`);
  }

  // 6. Verify totals
  const modifiersTotal = 3.0; // extra cheese
  const expectedSubtotal =
    2 * (burger.price + modifiersTotal) + 1 * fries.price + 2 * cola.price;
  const roundedExpectedSubtotal = Math.round(expectedSubtotal * 100) / 100;
  const expectedTax = Math.round(roundedExpectedSubtotal * 0.08 * 100) / 100;
  const expectedTotal = Math.round((roundedExpectedSubtotal + expectedTax - 5.0) * 100) / 100;

  if (Math.abs(order.subtotal - roundedExpectedSubtotal) < 0.01) {
    ok('Subtotal', `${order.subtotal} PLN`);
  } else {
    fail('Subtotal', `expected ${roundedExpectedSubtotal}, got ${order.subtotal}`);
  }

  if (Math.abs(order.tax - expectedTax) < 0.01) {
    ok('VAT 8%', `${order.tax} PLN`);
  } else {
    fail('VAT 8%', `expected ${expectedTax}, got ${order.tax}`);
  }

  if (Math.abs(order.total - expectedTotal) < 0.01) {
    ok('Total (po rabacie 5 PLN)', `${order.total} PLN`);
  } else {
    fail('Total', `expected ${expectedTotal}, got ${order.total}`);
  }

  // 7. Verify items count
  if (order.items.length === 3) {
    ok('3 pozycje w zamówieniu');
  } else {
    fail('3 pozycje', `got ${order.items.length}`);
  }

  // 8. Verify customer info
  if (order.customer_name === 'Anna Testowa') {
    ok('Dane klienta', order.customer_name);
  } else {
    fail('Dane klienta', `got ${order.customer_name}`);
  }

  // 9. Verify status history
  if (order.status_history?.length === 1 && order.status_history[0].status === 'pending') {
    ok('Historia statusów', '1 wpis (pending)');
  } else {
    fail('Historia statusów', JSON.stringify(order.status_history));
  }

  // 10. Fetch order back via GET
  console.log('\n── Test: Pobranie zamówienia ──');
  const getRes = await api<{ id: string; order_number: string; status: string }>(
    `/api/v1/orders/${order.id}`,
    { apiKey }
  );

  if (getRes.success && getRes.data?.id === order.id) {
    ok('GET /api/v1/orders/:id', `#${getRes.data.order_number}`);
  } else {
    fail('GET /api/v1/orders/:id', JSON.stringify(getRes.error));
  }

  // 11. Verify order appears in list
  const listRes = await api<{ order_number: string }[]>(
    '/api/v1/orders?status=pending',
    { apiKey }
  );

  if (listRes.success && Array.isArray(listRes.data)) {
    const found = listRes.data.some((o) => o.order_number === order.order_number);
    if (found) {
      ok('Widoczne w liście (status=pending)');
    } else {
      fail('Widoczne w liście', 'zamówienie nie znalezione w filtrze pending');
    }
  } else {
    fail('GET /api/v1/orders?status=pending', JSON.stringify(listRes.error));
  }

  // 12. Update status to confirmed
  console.log('\n── Test: Zmiana statusu → confirmed ──');
  const statusRes = await api<{ id: string; status: string }>(
    `/api/v1/orders/${order.id}/status`,
    {
      method: 'PATCH',
      apiKey,
      body: JSON.stringify({ status: 'confirmed', note: 'e2e: potwierdzono' }),
    }
  );

  if (statusRes.success && statusRes.data?.status === 'confirmed') {
    ok('Status → confirmed');
  } else {
    fail('Status → confirmed', JSON.stringify(statusRes.error || statusRes.data));
  }

  // ── Summary ──
  console.log(`\n${'─'.repeat(45)}`);
  console.log(`  Wynik: ${passed} passed, ${failed} failed / ${passed + failed} total`);
  console.log(`${'─'.repeat(45)}`);

  if (failed === 0) {
    console.log(`\n🎉 Wszystkie testy przeszły!`);
    console.log(`\n📋 Zamówienie do sprawdzenia w POS:`);
    console.log(`   Numer:  ${order.order_number}`);
    console.log(`   ID:     ${order.id}`);
    console.log(`   Status: confirmed`);
    console.log(`   Total:  ${order.total} PLN`);
    console.log(`   URL:    ${BASE_URL}/orders/${order.id}\n`);
  } else {
    console.log(`\n⚠️  ${failed} test(ów) nie przeszło.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n💥 Nieoczekiwany błąd:', err.message);
  console.log('💡 Upewnij się, że serwer działa: npm run dev\n');
  process.exit(1);
});
