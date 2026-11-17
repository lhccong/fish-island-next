import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import base from './playwright.pixel-island.config';

const artifacts = join(tmpdir(), 'fish-island-ui-fixes-20261117');
export default defineConfig({
  ...base,
  expect: { timeout: 30000 },
  testMatch: [
    'chat-keyboard-viewport.spec.ts',
    'island-circle-refresh.spec.ts',
    'circle-notifications.spec.ts',
    'circle-notification-bulk.spec.ts',
  ],
  outputDir: join(artifacts, 'results'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4248' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4248 --strictPort',
    url: 'http://127.0.0.1:4248',
    reuseExistingServer: true,
  },
});
