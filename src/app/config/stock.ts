import { createStockClient } from '@/infrastructure/stock';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
export const stockService = createStockClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
