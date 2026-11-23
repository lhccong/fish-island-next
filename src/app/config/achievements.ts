import { createAchievementClient } from '@/infrastructure/achievements';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from './api';
import { authController } from './auth';

const vault = createBrowserSessionVault(apiBaseUrl);
export const achievements = createAchievementClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
