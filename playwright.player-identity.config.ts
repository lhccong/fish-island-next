import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const artifacts = process.env.PLAYER_IDENTITY_ARTIFACTS || join(tmpdir(), 'fish-player-identity');
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'player-identity.spec.ts',
  outputDir: join(artifacts, 'results'),
  fullyParallel: true,
  workers: 3,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4195',
    channel: 'msedge',
    hasTouch: true,
    reducedMotion: 'reduce',
    trace: 'off',
    actionTimeout: 15000,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4195 --strictPort',
    url: 'http://127.0.0.1:4195',
    reuseExistingServer: false,
  },
});
