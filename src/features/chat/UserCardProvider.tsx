import { useState, type ReactNode } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
import { UserCardContext, type RenderFollowList, type UserCardTarget } from './user-card-context';
import { UserCardDialog } from './UserCardDialog';

export function UserCardProvider({
  children,
  port,
  user,
  onVisit,
  renderFollowList,
}: {
  children: ReactNode;
  port: UserCardPort;
  user: AuthUser | undefined;
  onVisit: (kind: 'pet' | 'farm' | 'moments', id: string) => void;
  renderFollowList: RenderFollowList;
}) {
  const [target, setTarget] = useState<UserCardTarget | null>(null);
  return (
    <UserCardContext.Provider value={setTarget}>
      {children}
      {user && target && (
        <UserCardDialog
          key={`${user.id}:${target.id}`}
          target={target}
          user={user}
          port={port}
          onClose={() => setTarget(null)}
          onVisit={onVisit}
          renderFollowList={renderFollowList}
        />
      )}
    </UserCardContext.Provider>
  );
}
