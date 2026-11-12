import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pet*.spec.ts',
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:4197', trace: 'retain-on-failure' },
  projects: [{ name: 'pet-matrix', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  outputDir: 'test-results-pet-final',
  webServer: {
    command:
      'npx vite build --outDir test-results-pet-build && npx vite preview --outDir test-results-pet-build --host 127.0.0.1 --port 4197 --strictPort',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
