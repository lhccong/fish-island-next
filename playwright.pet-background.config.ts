import { defineConfig } from '@playwright/test';
import base from './playwright.pet-pixel.config';

export default defineConfig({
  ...base,
  testMatch: 'pet-background.spec.ts',
  outputDir: 'test-results-pet-background-task/results',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4199' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-pet-background-task/app && node node_modules/vite/bin/vite.js preview --outDir test-results-pet-background-task/app --host 127.0.0.1 --port 4199 --strictPort',
    url: 'http://127.0.0.1:4199',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
