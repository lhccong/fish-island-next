import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'chat-paste.spec.ts',
  outputDir: join(tmpdir(), 'fish-island-paste-20261113-b83e', 'playwright'),
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4206' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4206 --strictPort',
    url: 'http://127.0.0.1:4206',
    reuseExistingServer: true,
  },
});
