import { defineConfig } from '@playwright/test';
import base from './playwright.chat-history.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-composer-focus.spec.ts',
  outputDir: 'test-results-chat-composer-focus',
});
