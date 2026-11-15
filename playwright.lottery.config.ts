import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'lottery.spec.ts',
  outputDir: 'test-results-lottery-079/results',
  fullyParallel: true,
  workers: 2,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4209',
    channel: 'chrome',
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-lottery-079/app && node node_modules/vite/bin/vite.js preview --outDir test-results-lottery-079/app --host 127.0.0.1 --port 4209 --strictPort',
    url: 'http://127.0.0.1:4209',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
