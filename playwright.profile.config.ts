import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4192', trace: 'off' },
  outputDir: 'node_modules/.cache/profile-verification',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4192 --strictPort',
    url: 'http://127.0.0.1:4192',
    reuseExistingServer: false,
  },
});
