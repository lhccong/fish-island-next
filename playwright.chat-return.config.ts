import { defineConfig } from '@playwright/test';
import base from './playwright.chat-history.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-return.spec.ts',
  outputDir: 'test-results-chat-return',
});
