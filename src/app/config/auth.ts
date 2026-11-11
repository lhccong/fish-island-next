import { createAuthController } from '@/features/auth';
import { createAuthClient, createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from '@/app/config/api';

export const authController = createAuthController(
  createAuthClient(apiBaseUrl),
  createBrowserSessionVault(apiBaseUrl),
);
