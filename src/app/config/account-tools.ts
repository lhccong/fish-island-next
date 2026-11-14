import { createAccountToolsClient, createBlacklistStorage } from '@/infrastructure/account-tools';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from '@/app/config/api';
import { authController } from '@/app/config/auth';
const vault = createBrowserSessionVault(apiBaseUrl);
export const accountTools = createAccountToolsClient(apiBaseUrl, () => vault.read(), () => { void authController.restore(true); });
export const blacklist = createBlacklistStorage();
