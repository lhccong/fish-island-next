import { useContext, useEffect } from 'react';
import { useStore } from 'zustand';
import { AuthContext } from './context';

export function useInvitation() {
  const controller = useContext(AuthContext);
  if (!controller) throw new Error('AuthProvider is missing');
  const { invitationStore, loadInvitation } = controller;
  const state = useStore(invitationStore);

  useEffect(() => {
    if (invitationStore.getState().kind === 'idle') void loadInvitation();
  }, [invitationStore, loadInvitation]);

  return { state, retry: loadInvitation };
}
