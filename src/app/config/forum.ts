import { createForumClient } from '@/infrastructure/forum';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from './api';
import { authController } from './auth';
const vault = createBrowserSessionVault(apiBaseUrl);
export const forumService = createForumClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
