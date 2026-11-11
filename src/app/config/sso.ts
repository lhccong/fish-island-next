import { createSsoClient } from '@/infrastructure/sso';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from '@/app/config/api';

const vault = createBrowserSessionVault(apiBaseUrl);
export const ssoService = createSsoClient(apiBaseUrl, () => vault.read());
