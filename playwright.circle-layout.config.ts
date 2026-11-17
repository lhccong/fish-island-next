import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import base from './playwright.pixel-island.config';

const app = join(tmpdir(), 'fish-circle-layout-20261117', 'app');
export default defineConfig({
  ...base,
  workers: 1,
  testMatch: ['circle-layout.spec.ts'],
  outputDir: join(tmpdir(), 'fish-circle-layout-20261117', 'results'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4260', trace: 'off' },
  webServer: {
    command: `node node_modules/vite/bin/vite.js build --outDir "${app}" && node node_modules/vite/bin/vite.js preview --outDir "${app}" --host 127.0.0.1 --port 4260 --strictPort`,
    url: 'http://127.0.0.1:4260',
    reuseExistingServer: true,
  },
});
