import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pet-rankings.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:4199', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [{ name: 'pet-rankings', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  outputDir: 'test-results-pet-rankings',
  webServer: {
    command: 'node scripts/pet-test-server.mjs 4199',
    url: 'http://127.0.0.1:4199',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
