import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = process.env.E2E_POS_PORT || '4010';
const BASE_URL = process.env.E2E_POS_BASE_URL || `http://127.0.0.1:${PORT}`;
const HARNESS_PATH = '/test-integration/pos-regression';
const HARNESS_URL = `${BASE_URL}${HARNESS_PATH}`;
const APP_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const OUTPUT_DIR = path.join(APP_DIR, 'test-results', 'playwright');
const HEADED = process.argv.includes('--headed');

function log(message) {
  console.log(`[e2e] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
    });
    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) {
      return;
    }
    await delay(1_000);
  }
  fail(`Timed out waiting for server at ${url}`);
}

async function startServer() {
  if (await isServerReady(HARNESS_URL)) {
    log(`Reusing existing server at ${BASE_URL}`);
    return { owned: false, stop: async () => {} };
  }

  log(`Starting Next dev server on ${BASE_URL}`);
  const server = spawn('pnpm', ['exec', 'next', 'dev', '--port', PORT], {
    cwd: APP_DIR,
    env: {
      ...process.env,
      NEXT_PUBLIC_DATA_BACKEND: 'localStorage',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[web] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[web] ${chunk}`);
  });

  server.on('exit', (code) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`[web] dev server exited with code ${code}\n`);
    }
  });

  await waitForServer(HARNESS_URL);

  return {
    owned: true,
    stop: async () => {
      if (server.killed) return;
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => server.once('exit', resolve)),
        delay(5_000),
      ]);
      if (!server.killed) {
        server.kill('SIGKILL');
      }
    },
  };
}

async function gotoHarness(page) {
  await page.goto(HARNESS_URL, { waitUntil: 'networkidle' });
  await expectVisible(page.locator('[data-testid="pos-regression-harness"]'));
}

async function expectVisible(locator, message) {
  await locator.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
    fail(message || 'Expected locator to be visible');
  });
}

async function expectText(locator, expectedSubstring, message) {
  const timeoutMs = 10_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const text = (await locator.textContent()) || '';
    if (text.includes(expectedSubstring)) {
      return text;
    }
    await delay(200);
  }

  const current = (await locator.textContent()) || '';
  fail(
    message ||
      `Expected text to include "${expectedSubstring}", got "${current}"`
  );
}

async function expectValue(locator, expectedValue, message) {
  const timeoutMs = 10_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await locator.inputValue();
    if (value === expectedValue) {
      return;
    }
    await delay(200);
  }

  fail(
    message ||
      `Expected value "${expectedValue}", got "${await locator.inputValue()}"`
  );
}

async function expectCount(locator, expectedCount, message) {
  const actual = await locator.count();
  if (actual !== expectedCount) {
    fail(message || `Expected count ${expectedCount}, got ${actual}`);
  }
}

async function fillDecimal(locator, value) {
  await locator.click();
  await locator.fill(value);
  await locator.blur();
}

async function runScenario(browser, name, callback) {
  log(`Running: ${name}`);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await callback(page);
    log(`Passed: ${name}`);
  } catch (error) {
    const screenshotPath = path.join(
      OUTPUT_DIR,
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    log(`Failed: ${name}`);
    log(`Screenshot: ${screenshotPath}`);
    throw error;
  } finally {
    await context.close();
  }
}

async function recipeScenario(page) {
  await gotoHarness(page);

  const section = page.locator('[data-testid="recipe-section"]');
  await section.locator('[data-action="tab-recipes"]').click();

  await expectVisible(section.getByText('Patty E2E'));
  await expectCount(section.getByText('Sos pochodny E2E'), 0);

  await section.getByText('Patty E2E').click();
  await expectText(
    section.locator('[data-field="estimated-cost"]'),
    '4.80'
  );

  const yieldQuantity = section.locator('[data-field="yield-quantity"]');
  await fillDecimal(yieldQuantity, '1.5');
  await expectValue(yieldQuantity, '1,5');

  await section.locator('[data-action="save-recipe"]').click();

  const output = page.locator('[data-testid="recipe-submit-output"]');
  await expectText(output, '"yield_quantity": 1.5');
  await expectText(output, '"yield_unit": "kg"');
  await expectText(
    output,
    '"reference_id": "55555555-5555-4555-8555-555555555553"'
  );
}

async function stockScenario(page) {
  await gotoHarness(page);

  await page.locator('[data-testid="open-stock-item-form"]').click();
  const dialog = page.locator('[data-component="stock-item-form"]');

  await expectVisible(dialog);
  await expectVisible(dialog.getByText('Cena za kg (PLN) *'));

  await dialog.locator('[data-field="name"]').fill('Mieso testowe E2E');
  await fillDecimal(dialog.locator('[data-field="cost-per-unit"]'), '1.5');
  await fillDecimal(
    dialog.locator('[data-field="purchase-unit-weight-kg"]'),
    '2.5'
  );
  await fillDecimal(dialog.locator('[data-field="quantity"]'), '3');
  await fillDecimal(dialog.locator('[data-field="min-quantity"]'), '1');

  await expectValue(dialog.locator('[data-field="cost-per-unit"]'), '1,5');
  await expectValue(
    dialog.locator('[data-field="purchase-unit-weight-kg"]'),
    '2,5'
  );

  await dialog.getByRole('button', { name: 'Dodaj pozycje' }).click();

  const output = page.locator('[data-testid="stock-item-submit-output"]');
  await expectText(output, '"cost_per_unit": 1.5');
  await expectText(output, '"purchase_unit_weight_kg": 2.5');
  await expectText(output, '"quantity": 3');
  await expectText(output, '"minQuantity": 1');
}

async function deliveryScenario(page) {
  await gotoHarness(page);

  const section = page.locator('[data-testid="delivery-section"]');
  const productInput = section.locator('[data-row="0"] [data-field="product"]');
  await productInput.fill('Wolowina E2E');
  await productInput.press('Enter');

  await fillDecimal(
    section.locator('[data-row="0"] [data-field="quantity-received"]'),
    '10'
  );
  await section
    .locator('[data-row="0"] [data-field="supplier-unit"]')
    .fill('op');
  await fillDecimal(
    section.locator('[data-row="0"] [data-field="unit-price-net"]'),
    '45'
  );

  await expectVisible(section.getByText('mag.: 25 kg'));
  await expectVisible(section.getByText('18.00 PLN/kg'));

  await section.locator('[data-action="complete-delivery"]').click();

  const output = page.locator('[data-testid="delivery-submit-output"]');
  await expectText(output, '"mode": "complete"');
  await expectText(output, '"supplier_quantity_received": 10');
  await expectText(output, '"supplier_unit": "op"');
  await expectText(output, '"quantity_received": 25');
  await expectText(output, '"price_per_kg_net": 18');
}

async function productScenario(page) {
  await gotoHarness(page);

  const section = page.locator('[data-testid="product-section"]');

  await fillDecimal(section.locator('[data-field="product-price"]'), '29.9');
  await section.locator('[data-field="promotion-enabled"]').click();
  await fillDecimal(
    section.locator('[data-field="product-promo-price"]'),
    '24.5'
  );
  await expectValue(section.locator('[data-field="product-price"]'), '29,9');
  await expectValue(
    section.locator('[data-field="product-promo-price"]'),
    '24,5'
  );

  await section.locator('[data-action="go-to-step"][data-id="2"]').click();
  await section.locator('[data-action="add-variant"]').click();
  await section.locator('[data-field="variant-name"]').fill('Lunch');
  await fillDecimal(section.locator('[data-field="variant-price"]'), '-1.5');

  await expectValue(section.locator('[data-field="variant-price"]'), '-1,5');

  await section.locator('[data-action="submit-product"]').click();

  const output = page.locator('[data-testid="product-submit-output"]');
  await expectText(output, '"original_price": 29.9');
  await expectText(output, '"price": 24.5');
  await expectText(output, '"name": "Lunch"');
  await expectText(output, '"price": -1.5');
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const server = await startServer();
  const browser = await chromium.launch({ headless: !HEADED });

  try {
    await runScenario(browser, 'recipe-form', recipeScenario);
    await runScenario(browser, 'stock-item-form', stockScenario);
    await runScenario(browser, 'delivery-form', deliveryScenario);
    await runScenario(browser, 'product-form', productScenario);
    log('All E2E scenarios passed');
  } finally {
    await browser.close();
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
