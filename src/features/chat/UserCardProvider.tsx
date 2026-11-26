import { useState, type ReactNode } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
import {
  UserCardContext,
  type RenderCardCollection,
  type RenderFollowList,
  type UserCardDestination,
  type UserCardTarget,
} from './user-card-context';
import { UserCardDialog } from './UserCardDialog';

export function UserCardProvider({
  children,
  port,
  user,
  onVisit,
  renderFollowList,
  renderCardCollection,
}: {
  children: ReactNode;
  port: UserCardPort;
  user: AuthUser | undefined;
  onVisit: (kind: UserCardDestination, id: string) => void;
  renderFollowList: RenderFollowList;
  renderCardCollection: RenderCardCollection;
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
          onClose={() => {
            setTarget(null);
            target.onClose?.();
          }}
          onVisit={onVisit}
          renderFollowList={renderFollowList}
          renderCardCollection={renderCardCollection}
        />
      )}
    </UserCardContext.Provider>
  );
}
