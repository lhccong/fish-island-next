import { defineConfig } from '@playwright/test';
import base from './playwright.pixel-island.config';
export default defineConfig({
  ...base,
  testMatch: 'island-circle.spec.ts',
  outputDir: './test-results-island-circle-20261115/results',
  expect: { timeout: 30000 },
  use: { ...base.use, baseURL: 'http://127.0.0.1:4221' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-island-circle-20261115/app && node node_modules/vite/bin/vite.js preview --outDir test-results-island-circle-20261115/app --host 127.0.0.1 --port 4221 --strictPort',
    url: 'http://127.0.0.1:4221',
    reuseExistingServer: true,
  },
});
