import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type { FollowListTarget } from '@/domain/account-tools';

export type RenderFollowList = (target: FollowListTarget, onBack: () => void) => ReactNode;
export type UserCardDestination = 'pet' | 'farm' | 'moments';
export type RenderCardCollection = (
  target: { id: string; name: string },
  onBack: () => void,
) => ReactNode;

export interface UserCardTarget {
  id: string;
  name: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  level?: number | undefined;
  titleId?: string | undefined;
  titleIds?: readonly string[] | undefined;
  region?: string | undefined;
}
export const UserCardContext = createContext<(target: UserCardTarget) => void>(() => {});
export function useUserCard() {
  return useContext(UserCardContext);
}
