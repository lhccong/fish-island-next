import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-media.spec.ts',
  outputDir: 'test-results-chat-media-20261112',
});
