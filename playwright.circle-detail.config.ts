import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  timeout: 60000,
  testMatch: 'circle-detail.spec.ts',
  outputDir: 'test-results-circle-detail',
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir node_modules/.cache/circle-detail-inline-preview && node node_modules/vite/bin/vite.js preview --outDir node_modules/.cache/circle-detail-inline-preview --host 127.0.0.1 --port 43128 --strictPort',
    url: 'http://127.0.0.1:43128',
    reuseExistingServer: !process.env.CI,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:43128' },
});
