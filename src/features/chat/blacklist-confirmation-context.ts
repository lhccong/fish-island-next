import { createContext, useContext, type RefObject } from 'react';
import type { BlockedUser } from '@/domain/account-tools';

export interface BlacklistTarget {
  user: BlockedUser;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export const BlacklistConfirmationContext = createContext<(target: BlacklistTarget) => void>(
  () => {},
);
export const useBlacklistConfirmation = () => useContext(BlacklistConfirmationContext);
