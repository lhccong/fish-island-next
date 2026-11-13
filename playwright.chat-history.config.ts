import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: [
    'chat-history.spec.ts',
    'chat-image-history.spec.ts',
    'chat-realtime.spec.ts',
    'chat-media.spec.ts',
  ],
  outputDir: 'test-results-chat-history-20261112',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: true,
  },
});
