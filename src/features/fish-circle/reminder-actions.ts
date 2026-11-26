import type { RefObject } from 'react';
import type { UserCardPort } from '@/domain/account-tools';

export interface ReminderActions {
  followPort: Pick<UserCardPort, 'followRelationship' | 'addFollow'>;
  openUserCard: (target: {
    id: string;
    name: string;
    returnFocusRef: RefObject<HTMLElement | null>;
    onClose: () => void;
  }) => void;
  releaseScriptMark: (id: string, signal: AbortSignal) => Promise<void>;
}
