import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'chat-realtime.spec.ts',
  outputDir: 'test-results-chat-realtime-20261112',
  projects: base.projects?.filter((project) =>
    ['desktop-chromium', 'mobile-375', 'mobile-390'].includes(project.name ?? ''),
  ),
});
