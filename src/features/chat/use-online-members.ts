import { useStore } from 'zustand';
import type { MembersController } from './members-controller';

export function useOnlineMembers(controller: MembersController) {
  const state = useStore(controller.store, (value) => value.state);
  return { state, refresh: controller.refresh };
}
