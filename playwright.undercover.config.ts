import { defineConfig } from '@playwright/test';
const port = Number(process.env.UNDERCOVER_TEST_PORT ?? 4189);
const baseURL = `http://127.0.0.1:${port}`;
const preview = process.env.UNDERCOVER_PREVIEW_DIR;
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'undercover*.spec.ts',
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 10000 },
  outputDir: process.env.UNDERCOVER_TEST_OUTPUT ?? 'test-results-undercover',
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 20000,
  },
  webServer: {
    command: preview
      ? `node node_modules/vite/bin/vite.js preview --outDir "${preview}" --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !preview && !process.env.CI,
  },
});
