import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'profile-rename.spec.ts',
  timeout: 60_000,
  outputDir: 'test-results-profile-rename-20261117',
  projects: base.projects?.filter((project) =>
    ['desktop-chromium', 'mobile-375', 'mobile-390'].includes(project.name ?? ''),
  ),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4297', trace: 'off' },
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4297 --strictPort`,
    url: 'http://127.0.0.1:4297',
    reuseExistingServer: false,
  },
});
