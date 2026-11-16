import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4195' },
  webServer: {
    command:
      'npx vite preview --host 127.0.0.1 --port 4195 --strictPort --outDir node_modules/.cache/floating-excel-build-20261116-grid',
    url: 'http://127.0.0.1:4195',
    reuseExistingServer: false,
  },
});
