import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'circle-navigation.spec.ts',
  outputDir: 'test-results-circle-navigation',
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4194 --strictPort',
    url: 'http://127.0.0.1:4194',
    reuseExistingServer: !process.env.CI,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:4194', trace: 'retain-on-failure' },
});
