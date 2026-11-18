import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  timeout: 45000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4247', trace: 'off' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4247 --strictPort',
    url: 'http://127.0.0.1:4247',
    reuseExistingServer: false,
  },
  testMatch: '**/work-time-holiday.spec.ts',
  outputDir: 'test-results-holiday-20261118',
  projects: [{ name: 'holiday-chromium', use: { browserName: 'chromium' } }],
});
