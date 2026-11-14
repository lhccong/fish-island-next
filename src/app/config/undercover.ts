import { createUndercoverClient, createUndercoverChannel } from '@/infrastructure/undercover';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
export const undercoverChannel = createUndercoverChannel();
export const undercoverService = createUndercoverClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
