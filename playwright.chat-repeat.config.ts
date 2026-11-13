import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'chat-repeat.spec.ts',
  outputDir: join(tmpdir(), 'fish-island-repeat-20261113-a731', 'playwright'),
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4203' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4203 --strictPort',
    url: 'http://127.0.0.1:4203',
    reuseExistingServer: true,
  },
});
