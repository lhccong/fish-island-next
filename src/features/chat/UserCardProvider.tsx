import { useState, type ReactNode } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
import { UserCardContext, type UserCardTarget } from './user-card-context';
import { UserCardDialog } from './UserCardDialog';

export function UserCardProvider({
  children,
  port,
  user,
  onVisit,
}: {
  children: ReactNode;
  port: UserCardPort;
  user: AuthUser | undefined;
  onVisit: (kind: 'pet' | 'farm' | 'moments', id: string) => void;
}) {
  const [target, setTarget] = useState<UserCardTarget | null>(null);
  return (
    <UserCardContext.Provider value={setTarget}>
      {children}
      {user && target && (
        <UserCardDialog
          key={target.id}
          target={target}
          user={user}
          port={port}
          onClose={() => setTarget(null)}
          onVisit={onVisit}
        />
      )}
    </UserCardContext.Provider>
  );
}
