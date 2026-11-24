import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['pwa.spec.ts', 'pwa-update.spec.ts'],
  workers: 1,
  timeout: 60000,
  outputDir: '.tmp-pwa-20261116/results',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4293',
    browserName: 'chromium',
    trace: 'off',
    reducedMotion: 'reduce',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir .tmp-pwa-20261116/build && node node_modules/vite/bin/vite.js preview --outDir .tmp-pwa-20261116/build --host 127.0.0.1 --port 4293 --strictPort',
    url: 'http://127.0.0.1:4293',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
