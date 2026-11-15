import { defineConfig } from '@playwright/test';
import base from './playwright.pixel-island.config';
export default defineConfig({
  ...base,
  testMatch: 'pixel-hot-detail.spec.ts',
  outputDir: './test-results-pixel-hot-20261115/results',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4220' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-pixel-hot-20261115/app && node node_modules/vite/bin/vite.js preview --outDir test-results-pixel-hot-20261115/app --host 127.0.0.1 --port 4220 --strictPort',
    url: 'http://127.0.0.1:4220',
    reuseExistingServer: true,
  },
});
