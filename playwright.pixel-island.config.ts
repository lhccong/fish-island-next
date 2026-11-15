import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['pixel-island.spec.ts', 'my-island.spec.ts'],
  outputDir: './test-results-pixel-island-20261115/results',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:4218',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone SE'],
        defaultBrowserType: 'chromium',
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-pixel-island-20261115/app && node node_modules/vite/bin/vite.js preview --outDir test-results-pixel-island-20261115/app --host 127.0.0.1 --port 4218 --strictPort',
    url: 'http://127.0.0.1:4218',
    reuseExistingServer: true,
  },
});
