import { createFarmClient } from '@/infrastructure/farm';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
export const farmService = createFarmClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
