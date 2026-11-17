import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'music-performance.spec.ts',
  workers: 1,
  projects: base.projects?.filter((project) => project.name === 'desktop-chromium'),
  outputDir: 'test-results-music-performance-task',
  use: { ...base.use, serviceWorkers: 'block', baseURL: 'http://127.0.0.1:4199', trace: 'off' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4199 --strictPort',
    url: 'http://127.0.0.1:4199',
    reuseExistingServer: true,
  },
});
