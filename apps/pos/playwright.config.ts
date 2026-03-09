import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const storageStatePath = path.resolve(
  __dirname,
  'output/playwright/.auth/remote-user.json'
);
const baseURL = process.env.E2E_POS_BASE_URL || 'http://127.0.0.1:4010';
const parsedBaseUrl = new URL(baseURL);
const isLocalBaseUrl = ['127.0.0.1', 'localhost'].includes(parsedBaseUrl.hostname);
const localPort = parsedBaseUrl.port || '4010';

export default defineConfig({
  testDir: './tests',
  outputDir: './output/playwright/test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  globalSetup: path.resolve(__dirname, 'playwright/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'playwright/global-teardown.ts'),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: isLocalBaseUrl
    ? {
        command: `pnpm exec next dev --port ${localPort}`,
        env: {
          ...process.env,
          E2E_DISABLE_SENTRY: '1',
          NEXT_PUBLIC_E2E_DISABLE_SENTRY: '1',
        },
        url: `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`,
        cwd: __dirname,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      }
    : undefined,
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'remote-chromium',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: storageStatePath,
      },
    },
  ],
});
