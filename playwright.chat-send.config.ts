import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';
export default defineConfig({
  ...base,
  testMatch: 'chat-send.spec.ts',
  outputDir: join(tmpdir(), 'fish-island-http-send-20261113-8c46', 'playwright'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4197' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4197 --strictPort',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: true,
  },
});
