import { defineConfig } from '@playwright/test';
import base from './playwright.chat-menu.config';
export default defineConfig({
  ...base,
  use: { ...base.use, channel: 'msedge', baseURL: 'http://127.0.0.1:4297' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4297 --strictPort',
    url: 'http://127.0.0.1:4297',
    reuseExistingServer: false,
  },
});
