import { createAboutClient } from '@/infrastructure/about';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
export const aboutService = createAboutClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
