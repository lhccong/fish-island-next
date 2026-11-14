import { defineConfig } from '@playwright/test';
const preview = process.env.DRAW_PREVIEW_DIR;
const port = preview ? 4177 : 4175;
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'draw*.spec.ts',
  outputDir: './test-results-draw-20261114/results',
  workers: 2,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    channel: 'msedge',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: preview
      ? `npx vite preview --outDir "${preview}" --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
