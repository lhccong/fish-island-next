import { createPointsShopClient } from '@/infrastructure/points-shop';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from './api';
import { authController } from './auth';
const vault = createBrowserSessionVault(apiBaseUrl);
export const pointsShop = createPointsShopClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
