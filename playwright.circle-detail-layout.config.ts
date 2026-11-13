import { defineConfig } from '@playwright/test';
import base from './playwright.circle-detail.config';

export default defineConfig({
  ...base,
  testMatch: 'circle-detail-layout.spec.ts',
  outputDir: 'test-results-circle-detail-layout',
  projects: base.projects?.map((project) =>
    project.name === 'desktop-chromium'
      ? { ...project, use: { ...project.use, viewport: { width: 1920, height: 1080 } } }
      : project,
  ),
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir node_modules/.cache/circle-detail-layout-preview && node node_modules/vite/bin/vite.js preview --outDir node_modules/.cache/circle-detail-layout-preview --host 127.0.0.1 --port 43131 --strictPort',
    url: 'http://127.0.0.1:43131',
    reuseExistingServer: false,
    timeout: 120000,
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:43131' },
});
