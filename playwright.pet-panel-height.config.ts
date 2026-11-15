import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import base from './playwright.pet-pixel.config';

const taskRoot = join(tmpdir(), 'fish-island-pet-panel-height-20261115-v1');
const appRoot = join(taskRoot, 'app');

export default defineConfig({
  ...base,
  testMatch: 'pet-panel-height.spec.ts',
  outputDir: join(taskRoot, 'results'),
  timeout: 90000,
  retries: 1,
  use: {
    ...base.use,
    baseURL: 'http://127.0.0.1:4233',
    trace: 'off',
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js build --outDir "${appRoot}" && node node_modules/vite/bin/vite.js preview --outDir "${appRoot}" --host 127.0.0.1 --port 4233 --strictPort`,
    url: 'http://127.0.0.1:4233',
    reuseExistingServer: false,
  },
});
