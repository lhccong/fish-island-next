import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const node = `"${process.execPath}"`;
const buildDir =
  process.env.PLAYWRIGHT_SHORTCUTS_ISOLATED === '1'
    ? 'node_modules/.cache/chat-game-shortcuts-validation-final'
    : 'dist';

export default defineConfig({
  ...base,
  testMatch: 'chat-game-shortcuts.spec.ts',
  expect: { timeout: 20000 },
  outputDir: 'test-results-chat-game-shortcuts-task',
  projects: [{ name: 'shortcuts-chromium', use: { hasTouch: true } }],
  use: {
    ...base.use,
    trace: 'off',
    launchOptions: { args: ['--disable-gpu'] },
    baseURL: 'http://127.0.0.1:4283',
  },
  webServer: {
    command: `${node} node_modules/vite/bin/vite.js preview --outDir ${buildDir} --host 127.0.0.1 --port 4283 --strictPort`,
    url: 'http://127.0.0.1:4283',
    reuseExistingServer: false,
  },
});
