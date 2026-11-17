import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const preview = Boolean(process.env.FISH_CHAT_BOTTOM_PREVIEW);
const port = Number(process.env.FISH_CHAT_BOTTOM_PORT ?? (preview ? 4252 : 4251));
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  testMatch: [
    'chat-bottom.spec.ts',
    'chat-bottom-window.spec.ts',
    'chat-touch-scroll.spec.ts',
    'chat-image-history.spec.ts',
    'chat-image-scroll-stability.spec.ts',
    'chat-floating-presentation.spec.ts',
  ],
  outputDir: process.env.FISH_CHAT_BOTTOM_OUTPUT ?? join(tmpdir(), 'fish-chat-bottom-20261117'),
  projects: base.projects!.filter((project) => project.name !== 'mobile-chromium'),
  use: { ...base.use, baseURL: url },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${preview ? 'preview ' : ''}--host 127.0.0.1 --port ${port} --strictPort`,
    url,
    reuseExistingServer: Boolean(process.env.FISH_CHAT_BOTTOM_REUSE_SERVER),
  },
});
