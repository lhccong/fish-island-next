import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const port = Number(process.env.SCROLL_TEST_PORT || 4197);
const preview = `node_modules/.cache/scroll-preview-${port}`;
export default defineConfig({
  ...base,
  testMatch: [
    'scroll-pagination.spec.ts',
    'reader-import.spec.ts',
    'fish-circle.spec.ts',
    'fish-circle-layout.spec.ts',
    'circle-notifications.spec.ts',
    'circle-notification-appearance.spec.ts',
    'about-navigation.spec.ts',
  ],
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  timeout: 90000,
  expect: { timeout: 10000 },
  outputDir: 'test-results-scroll-pagination',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npx vite build --outDir ${preview} && npm run preview -- --outDir ${preview} --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: { VITE_READER_ACCESS_TOKEN: 'synthetic-reader-default' },
  },
});
