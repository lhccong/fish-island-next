import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: ['stock-market.spec.ts', 'stock-controls.spec.ts', 'stock-chart-zoom.spec.ts'],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
  },
  expect: { timeout: 15000 },
  workers: 1,
  outputDir: 'node_modules/.cache/stock-market-e2e',
  reporter: 'list',
  projects: [{ name: 'stock-matrix', use: { browserName: 'chromium' } }],
});
