import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: [
    'chat-image-scroll-stability.spec.ts',
    'chat-image-history.spec.ts',
    'chat-media.spec.ts',
    'chat-red-packet-stability.spec.ts',
    'chat-image-collapse.spec.ts',
    'chat-touch-scroll.spec.ts',
  ],
  outputDir: 'test-results-chat-image-stability',
  projects: [
    ...base.projects!,
    { name: 'video-desktop', use: { viewport: { width: 1282, height: 624 } } },
  ],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4219' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4219 --strictPort',
    url: 'http://127.0.0.1:4219',
    reuseExistingServer: false,
  },
});
