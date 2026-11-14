import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'landlords.spec.ts',
  outputDir: join(tmpdir(), 'fish-island-landlords-20261114', 'results'),
  workers: 2,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    headless: true,
    channel: 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: true,
  },
});
