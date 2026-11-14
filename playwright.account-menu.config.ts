import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  timeout: 90000,
  workers: 2,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4212', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4212 --strictPort',
    url: 'http://127.0.0.1:4212',
    reuseExistingServer: false,
  },
  testMatch: '**/account-menu.spec.ts',
  outputDir: 'test-results-account-menu-20261114',
  projects: [{ name: 'account-menu-chromium', use: { browserName: 'chromium' } }],
});
