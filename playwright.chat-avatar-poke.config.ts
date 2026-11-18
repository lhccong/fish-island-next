import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: ['chat-avatar-poke.spec.ts', 'chat-avatar-gesture.spec.ts'],
  outputDir: 'test-results-avatar-poke-20261118',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4221', trace: 'off' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4221 --strictPort',
    url: 'http://127.0.0.1:4221',
    reuseExistingServer: true,
  },
});
