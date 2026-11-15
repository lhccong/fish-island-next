import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'loading-indicator.spec.ts',
  workers: 1,
  timeout: 90000,
  outputDir: '.tmp-loading-20261115/results',
  reporter: 'list',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4283', trace: 'off', reducedMotion: 'reduce' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4283 --strictPort',
    url: 'http://127.0.0.1:4283',
    reuseExistingServer: false,
  },
});
