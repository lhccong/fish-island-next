import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';
export default defineConfig({
  ...base,
  testMatch: 'chat-red-packet-send.spec.ts',
  outputDir: 'test-results-red-packet-send',
});
