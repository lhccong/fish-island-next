import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useCallback, useState, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { UserCardProvider } from '@/features/chat';
import type { AuthUser } from '@/domain/auth';
import { accountTools } from '@/app/config/account-tools';
import { petService } from '@/app/config/pet';
import { Dialog } from '@/shared/ui/Dialog';
const OtherCompanionPanel = lazy(() =>
  import('@/features/pet').then((m) => ({ default: m.OtherCompanionPanel })),
);

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
    <UserCardProvider user={user} port={accountTools} onVisit={onVisit}>
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
            onClose={() => setPet('')}
            returnFocusRef={petReturnFocus}
          />
        </Suspense>
      )}
    </UserCardProvider>
  );
}
