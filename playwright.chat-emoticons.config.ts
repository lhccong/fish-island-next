import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-emoticons.spec.ts',
  expect: { timeout: 15000 },
  outputDir: 'test-results-chat-emoticons/results',
  reporter: 'list',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4201' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js build --outDir test-results-chat-emoticons/build && node node_modules/vite/bin/vite.js preview --outDir test-results-chat-emoticons/build --host 127.0.0.1 --port 4201 --strictPort',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: false,
  },
});
