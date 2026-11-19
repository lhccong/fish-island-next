import { createContext, useContext, type RefObject } from 'react';

export interface UserCardTarget {
  id: string;
  name: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  level?: number | undefined;
  titleId?: string | undefined;
  region?: string | undefined;
}
export const UserCardContext = createContext<(target: UserCardTarget) => void>(() => {});
export function useUserCard() {
  return useContext(UserCardContext);
}
