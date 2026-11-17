import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-poke.spec.ts',
  outputDir: 'test-results-poke-20261117',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4217', trace: 'off' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4217 --strictPort',
    url: 'http://127.0.0.1:4217',
    reuseExistingServer: true,
  },
});
