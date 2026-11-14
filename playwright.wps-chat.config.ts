import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: [
    'chat-worksheet.spec.ts',
    'chat-history.spec.ts',
    'chat-mobile-composer.spec.ts',
    'wps-ribbon.spec.ts',
  ],
  outputDir: 'test-results-wps-chat-20261114',
  projects: base.projects?.filter((project) =>
    ['desktop-chromium', 'mobile-375', 'mobile-390'].includes(project.name ?? ''),
  ),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4196' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4196 --strictPort',
    url: 'http://127.0.0.1:4196',
    reuseExistingServer: false,
  },
});
