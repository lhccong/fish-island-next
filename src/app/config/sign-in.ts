import { createSignInClient } from '@/infrastructure/sign-in';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';

const vault = createBrowserSessionVault(apiBaseUrl);
export const signInPort = createSignInClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
