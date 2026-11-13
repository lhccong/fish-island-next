import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: ['chat-red-packet-send.spec.ts', 'red-packet-design.spec.ts'],
  workers: 2,
  outputDir: 'node_modules/.cache/red-packet-design-20261113',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4188' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188',
    reuseExistingServer: false,
  },
  projects: base.projects?.filter((p) =>
    ['desktop-chromium', 'mobile-375', 'mobile-390'].includes(p.name ?? ''),
  ),
});
