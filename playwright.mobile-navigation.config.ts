import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: /(?:chat-online|mobile-navigation|wps-ribbon)\.spec\.ts/,
  outputDir: 'test-results-mobile-navigation',
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4185 --strictPort',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    ...base.use,
    baseURL: 'http://127.0.0.1:4185',
    trace: 'off',
    launchOptions: { timeout: 30000 },
  },
});
