import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'chat-member-order.spec.ts',
  outputDir: process.env.MEMBER_ORDER_ARTIFACTS || join(tmpdir(), 'fish-chat-member-order'),
  fullyParallel: true,
  workers: 3,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4209',
    channel: 'msedge',
    reducedMotion: 'reduce',
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4209 --strictPort',
    url: 'http://127.0.0.1:4209',
    reuseExistingServer: false,
  },
});
