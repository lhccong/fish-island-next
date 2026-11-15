import { defineConfig } from '@playwright/test';
import base from './playwright.pixel-island.config';

export default defineConfig({
  ...base,
  testMatch: 'pixel-island-icons.spec.ts',
  outputDir: './test-results-pixel-icons-20261115/results',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4219' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-pixel-icons-20261115/app && node node_modules/vite/bin/vite.js preview --outDir test-results-pixel-icons-20261115/app --host 127.0.0.1 --port 4219 --strictPort',
    url: 'http://127.0.0.1:4219',
    reuseExistingServer: true,
  },
});
