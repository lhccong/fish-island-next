import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pet*.spec.ts',
  outputDir: 'test-results-pet-pixel-task/results',
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:4198',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--disable-gpu'] },
  },
  projects: [{ name: 'pet-pixel', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-pet-pixel-task/app && node node_modules/vite/bin/vite.js preview --outDir test-results-pet-pixel-task/app --host 127.0.0.1 --port 4198 --strictPort',
    url: 'http://127.0.0.1:4198',
    reuseExistingServer: process.env.PET_PIXEL_REUSE_SERVER === '1',
    timeout: 180000,
  },
});
