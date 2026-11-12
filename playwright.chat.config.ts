import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: /(?:chat-online|chat-group-name|auth|wps-ribbon|color-mode)\.spec\.ts/,
  outputDir: 'test-results-chat',
  workers: 1,
  timeout: 30000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4182', launchOptions: { timeout: 30000 } },
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4182 --strictPort',
    url: 'http://127.0.0.1:4182',
    reuseExistingServer: !process.env.CI,
  },
});
