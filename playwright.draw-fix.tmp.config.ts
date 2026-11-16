import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: /draw(?:-navigation)?\.spec\.ts/,
  outputDir: './test-results-draw-fix-20261116-2027/browser',
  reporter: [['line']],
  workers: 2,
  projects: [{ name: 'draw-chromium', use: { browserName: 'chromium', channel: 'chrome' } }],
});
