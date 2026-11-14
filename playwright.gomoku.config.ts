import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const artifacts = join(tmpdir(), 'fish-island-gomoku-20261114');

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /gomoku.*\.spec\.ts|game-catalog-layout\.spec\.ts/,
  outputDir: join(artifacts, 'results'),
  fullyParallel: true,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4186',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 20000,
    reducedMotion: 'reduce',
    launchOptions: { args: ['--disable-gpu', '--disable-features=CalculateNativeWinOcclusion'] },
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [{ name: 'gomoku-chromium', use: { ...devices['Desktop Chrome'], hasTouch: true } }],
  webServer: {
    command: `npx vite build --outDir "${join(artifacts, 'build')}" && npm run preview -- --outDir "${join(artifacts, 'build')}" --host 127.0.0.1 --port 4186 --strictPort`,
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
