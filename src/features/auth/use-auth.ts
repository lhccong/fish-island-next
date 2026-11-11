import { useContext } from 'react';
import { useStore } from 'zustand';
import { AuthContext } from './context';

export function useAuth() {
  const controller = useContext(AuthContext);
  if (!controller) throw new Error('AuthProvider is missing');
  const session = useStore(controller.store, (state) => state.session);
  const pending = useStore(controller.store, (state) => state.pending);
  const notice = useStore(controller.store, (state) => state.notice);
  return {
    notice,
    notify: controller.notify,
    session,
    pending,
    restore: controller.restore,
    login: controller.login,
    logout: controller.logout,
  };
}
