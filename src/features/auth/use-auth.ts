import { useContext } from 'react';
import { useStore } from 'zustand';
import { AuthContext } from './context';

export function useAuth() {
  const controller = useContext(AuthContext);
  if (!controller) throw new Error('AuthProvider is missing');
  const session = useStore(controller.store, (state) => state.session);
  const pending = useStore(controller.store, (state) => state.pending);
  const notice = useStore(controller.store, (state) => state.notice);
  const emailCodeRetryAt = useStore(controller.store, (state) => state.emailCodeRetryAt);
  const emailCodeTarget = useStore(controller.store, (state) => state.emailCodeTarget);
  return {
    emailCodeRetryAt,
    emailCodeTarget,
    notice,
    notify: controller.notify,
    session,
    pending,
    restore: controller.restore,
    login: controller.login,
    logout: controller.logout,
    updateProfile: controller.updateProfile,
    uploadProfileImage: controller.uploadProfileImage,
    titles: controller.titles,
    membership: controller.membership,
    sendEmailCode: controller.sendEmailCode,
    bindEmail: controller.bindEmail,
    setTitle: controller.setTitle,
  };
}
