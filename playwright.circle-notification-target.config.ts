import { defineConfig } from '@playwright/test';
import base from './playwright.circle-detail.config';

export default defineConfig({
  ...base,
  testMatch: 'circle-notification-target.spec.ts',
  outputDir: 'test-results-circle-notification-target',
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir node_modules/.cache/circle-notification-target-preview && node node_modules/vite/bin/vite.js preview --outDir node_modules/.cache/circle-notification-target-preview --host 127.0.0.1 --port 43129 --strictPort',
    url: 'http://127.0.0.1:43129',
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:43129' },
});
