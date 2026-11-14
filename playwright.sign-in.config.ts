import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  timeout: 60000,
  workers: 2,
  use: { ...base.use, trace: 'off', baseURL: 'http://127.0.0.1:4211' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4211 --strictPort',
    url: 'http://127.0.0.1:4211',
    reuseExistingServer: false,
  },
  testMatch: '**/sign-in.spec.ts',
  outputDir: 'test-results-sign-in',
  projects: [{ name: 'sign-in-chromium', use: { browserName: 'chromium' } }],
});
