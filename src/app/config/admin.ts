import { createAdminClient } from '@/infrastructure/admin';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { apiBaseUrl } from './api';
import { authController } from './auth';
import type { AdminPort } from '@/domain/admin';
const vault = createBrowserSessionVault(apiBaseUrl);
const client = createAdminClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    const session = authController.store.getState().session;
    return session.status === 'authenticated' && session.user.role === 'admin';
  },
  () => {
    void authController.restore(true);
  },
  (signal) => {
    void authController.refreshUser(signal).catch(() => {});
  },
);
export const adminPort: AdminPort = {
  ...client,
  async saveUser(value, signal) {
    await client.saveUser(value, signal);
    const session = authController.store.getState().session;
    if (session.status === 'authenticated' && session.user.id === value.id)
      await authController.refreshUser(signal);
  },
  async remove(section, id, signal) {
    await client.remove(section, id, signal);
    const session = authController.store.getState().session;
    if (section === 'user' && session.status === 'authenticated' && session.user.id === id)
      void authController.restore(true);
  },
};
