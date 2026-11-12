import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 15000 },
  testMatch: 'pet-direction.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4198', trace: 'retain-on-failure' },
  projects: [{ name: 'pet-direction', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  outputDir: 'test-results-pet-direction',
  webServer: {
    command:
      'npx vite build --outDir test-results-pet-direction-build && npx vite preview --outDir test-results-pet-direction-build --host 127.0.0.1 --port 4198 --strictPort',
    url: 'http://127.0.0.1:4198',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
