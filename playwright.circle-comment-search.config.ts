import { defineConfig } from '@playwright/test';
import base from './playwright.circle-notification-target.config';

export default defineConfig({
  ...base,
  testMatch: 'circle-comment-search.spec.ts',
  outputDir: 'test-results-circle-comment-search',
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir node_modules/.cache/circle-comment-search-preview && node node_modules/vite/bin/vite.js preview --outDir node_modules/.cache/circle-comment-search-preview --host 127.0.0.1 --port 43130 --strictPort',
    url: 'http://127.0.0.1:43130',
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:43130' },
});
