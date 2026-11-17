import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: [
    'music.spec.ts',
    'music-lifecycle.spec.ts',
    'music-message.spec.ts',
    'music-mini.spec.ts',
  ],
  outputDir: 'test-results-music-task',
  projects: [{ name: 'music-chromium', use: { browserName: 'chromium' } }],
  use: { ...base.use, serviceWorkers: 'block', baseURL: 'http://127.0.0.1:4201', trace: 'off' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4201 --strictPort',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: true,
  },
});
