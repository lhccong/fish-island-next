import { defineConfig } from '@playwright/test';
import petConfig from './playwright.pet.config';

export default defineConfig(petConfig, {
  testMatch: 'pet-battle*.spec.ts',
  outputDir: 'test-results-pet-battles',
  use: {
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
});
