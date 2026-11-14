import { defineConfig } from '@playwright/test';
import base from './playwright.chat-realtime.config';
export default defineConfig({
  ...base,
  testMatch: ['chat-lucky-bag.spec.ts', 'chat-lucky-bag-badge.spec.ts'],
  outputDir: 'test-results-lucky-bag',
});
