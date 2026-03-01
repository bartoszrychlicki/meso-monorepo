import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'line',
    use: {
        baseURL: 'http://localhost:3003',
        trace: 'on-first-retry',
    },
    webServer: [
        {
            // POS API — delivery's checkout server action calls this
            command: 'npm run dev -- -p 3000',
            url: 'http://localhost:3000',
            cwd: path.resolve(__dirname, '../pos'),
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
        {
            // Delivery app under test
            command: 'npm run dev -- -p 3003',
            url: 'http://localhost:3003',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
    ],
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],
});
