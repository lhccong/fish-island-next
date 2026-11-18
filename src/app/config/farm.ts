import { createFarmClient } from '@/infrastructure/farm';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
const vault = createBrowserSessionVault(apiBaseUrl);
const client = createFarmClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
const changes = new EventTarget();

export function subscribeToFarmChanges(listener: () => void) {
  changes.addEventListener('crops', listener);
  return () => changes.removeEventListener('crops', listener);
}

export const farmService: typeof client = {
  ...client,
  async act(action, ids, cropId, signal) {
    const result = await client.act(action, ids, cropId, signal);
    if (!signal.aborted && action !== 'steal' && action !== 'unlock')
      changes.dispatchEvent(new Event('crops'));
    return result;
  },
};
