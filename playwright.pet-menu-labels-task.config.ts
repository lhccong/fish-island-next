import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pet-menu-labels-task.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 120000,
  use: { baseURL: 'http://127.0.0.1:4173', hasTouch: true, trace: 'off' },
  outputDir:
    'C:/Users/SEASUN/AppData/Local/Temp/fish-menu-labels-d3a938fec46e4145833e82a97f6c9c32/results',
});
