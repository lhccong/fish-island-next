import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testMatch: 'discovery-navigation.spec.ts',
  outputDir: 'test-results-discovery',
  use: { baseURL: 'http://127.0.0.1:4193', trace: 'off' },
  webServer: {
    command:
      'npm run preview -- --outDir node_modules/.cache/discovery-preview --host 127.0.0.1 --port 4193 --strictPort',
    url: 'http://127.0.0.1:4193',
    reuseExistingServer: false,
  },
});
