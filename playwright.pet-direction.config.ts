import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  expect: { timeout: 15000 },
  testMatch: 'pet-direction.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4198', trace: 'retain-on-failure' },
  projects: [{ name: 'pet-direction', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  outputDir: 'test-results-pet-direction',
  webServer: {
    command: 'node scripts/pet-test-server.mjs 4198',
    url: 'http://127.0.0.1:4198',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
