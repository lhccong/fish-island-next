import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: ['reader*.spec.ts', 'discover-games.spec.ts'],
  outputDir: 'node_modules/.cache/reader-test-results',
  projects: base.projects?.filter((project) => project.name !== 'mobile-chromium'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:4185' },
  webServer: {
    command:
      'npx vite build --outDir node_modules/.cache/reader-dist && npx vite preview --outDir node_modules/.cache/reader-dist --host 127.0.0.1 --port 4185 --strictPort',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: false,
    env: { VITE_READER_ACCESS_TOKEN: 'synthetic-reader-default' },
  },
});
