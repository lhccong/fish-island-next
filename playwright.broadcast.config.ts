import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: ['broadcast.spec.ts', 'broadcast-appearance.spec.ts'],
  projects: base.projects?.filter((project) =>
    ['desktop-chromium', 'mobile-375', 'mobile-390'].includes(project.name ?? ''),
  ),
  use: { ...base.use, trace: 'off', baseURL: 'http://127.0.0.1:4293' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4293 --strictPort',
    url: 'http://127.0.0.1:4293',
    reuseExistingServer: false,
  },
});
