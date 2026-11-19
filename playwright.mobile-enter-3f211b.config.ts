import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  workers: 3,
  timeout: 60000,
  expect: { timeout: 12000 },
  use: { ...base.use, baseURL: 'http://127.0.0.1:4183', serviceWorkers: 'block' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4183 --strictPort --outDir "C:/Users/SEASUN/AppData/Local/Temp/fish-island-mobile-enter-3f211bfd8f7b42648b5a3e5b49d358ac/build"',
    url: 'http://127.0.0.1:4183',
    reuseExistingServer: false,
  },
});

