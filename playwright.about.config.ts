import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testMatch: 'about.spec.ts',
  expect: { timeout: 15_000 },
  outputDir: 'test-results-about',
  use: { baseURL: 'http://127.0.0.1:4189' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4189 --strictPort',
    url: 'http://127.0.0.1:4189',
    reuseExistingServer: false,
  },
});
