import { defineConfig } from '@playwright/test';
import base from './playwright.chat-history.config';

export default defineConfig({
  ...base,
  expect: { timeout: 15000 },
  testMatch: [
    'chat-menu.spec.ts',
    'chat-history.spec.ts',
    'chat-media.spec.ts',
    'chat-realtime.spec.ts',
  ],
  outputDir: 'test-results-chat-menu-20261112',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4196' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4196 --strictPort',
    url: 'http://127.0.0.1:4196',
    reuseExistingServer: true,
  },
});
