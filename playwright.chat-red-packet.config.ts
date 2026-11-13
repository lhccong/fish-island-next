import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';

export default defineConfig({
  ...base,
  testMatch: ['chat-red-packet.spec.ts', 'chat-red-packet-stability.spec.ts'],
  outputDir: 'test-results-red-packet',
});
