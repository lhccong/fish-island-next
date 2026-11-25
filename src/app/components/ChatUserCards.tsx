import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useCallback, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { UserCardProvider } from '@/features/chat';
import type { AuthUser } from '@/domain/auth';
import type { FollowListTarget } from '@/domain/account-tools';
import { FollowList } from '@/features/account-tools';
import { accountTools } from '@/app/config/account-tools';
import { petCardCollection, petService } from '@/app/config/pet';
import { Dialog } from '@/shared/ui/Dialog';
const UserPetCardCollection = lazy(() =>
  import('@/features/pet').then((m) => ({ default: m.UserPetCardCollection })),
);
const OtherCompanionPanel = lazy(() =>
  import('@/features/pet').then((m) => ({ default: m.OtherCompanionPanel })),
);

function renderFollowList(target: FollowListTarget, onBack: () => void) {
  return <FollowList port={accountTools} kind={target.kind} owner={target} onBack={onBack} />;
}

function renderCardCollection(target: { id: string; name: string }, onBack: () => void) {
  return (
    <Suspense fallback={<LoadingIndicator>正在读取卡片收藏…</LoadingIndicator>}>
      <UserPetCardCollection
        port={petCardCollection}
        userId={target.id}
        name={target.name}
        onBack={onBack}
      />
    </Suspense>
  );
}

export function ChatUserCards({
  user,
  children,
}: {
  user: AuthUser | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [pet, setPet] = useState('');
  const petReturnFocus = useRef<HTMLElement | null>(null);
  const onVisit = useCallback(
    (kind: 'pet' | 'farm' | 'moments', id: string) => {
      if (kind === 'pet') {
        petReturnFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setPet(id);
      } else
        navigate(
          `${kind === 'farm' ? '/game/farm' : '/moments/fish-circle'}?userId=${encodeURIComponent(id)}`,
        );
    },
    [navigate],
  );
  return (
    <UserCardProvider
      user={user}
      port={accountTools}
      onVisit={onVisit}
      renderFollowList={renderFollowList}
      renderCardCollection={renderCardCollection}
    >
      {children}
      {pet && (
        <Suspense
          fallback={
            <Dialog
              open
              title="伙伴资料"
              returnFocusRef={petReturnFocus}
              description="正在加载伙伴资料…"
              onOpenChange={(open) => {
                if (!open) setPet('');
              }}
              dismissLabel="关闭伙伴资料"
            >
              <LoadingIndicator>正在加载…</LoadingIndicator>
            </Dialog>
          }
        >
          <OtherCompanionPanel
            service={petService}
            userId={pet}
            viewerId={user?.id ?? ''}
            onClose={() => setPet('')}
            returnFocusRef={petReturnFocus}
          />
        </Suspense>
      )}
    </UserCardProvider>
  );
}
