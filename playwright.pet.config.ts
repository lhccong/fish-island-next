import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pet*.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  expect: { timeout: 30000 },
  use: { baseURL: 'http://127.0.0.1:4197', trace: 'retain-on-failure' },
  projects: [{ name: 'pet-matrix', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  outputDir: 'test-results-pet-final',
  webServer: {
    command: 'node scripts/pet-test-server.mjs 4197',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
