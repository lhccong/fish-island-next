import { useLocation, useSearchParams } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { petCardCollection, petService } from '@/app/config/pet';
import { useAuth } from '@/features/auth';
import { PetWorkspace } from '@/features/pet';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './GamesPage.module.css';

export function PetPage() {
  const { session, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const { key } = useLocation();
  const challenge = params.get('challenge');
  const panel = params.get('panel');
  const shortcut =
    challenge === 'tower' || challenge === 'boss' || challenge === 'tournament'
      ? challenge
      : panel === 'supplies' || panel === 'bag' || panel === 'cards'
        ? panel
        : null;
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        contentScroll: false,
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>伙伴</h1>
              <span>岛屿生活，有你相伴</span>
            </div>
          </>
        ),
        content: (
          <ScrollArea label="主内容滚动区" fillContent>
            <PetWorkspace
              key={session.user.id}
              service={petService}
              cardCollection={session.user.role === 'admin' ? petCardCollection : null}
              onLotterySettled={refreshUser}
              userId={session.user.id}
              points={
                session.user.points === undefined
                  ? undefined
                  : session.user.points - (session.user.usedPoints ?? 0)
              }
              shortcut={shortcut ? { key, target: shortcut } : null}
            />
          </ScrollArea>
        ),
      }}
    />
  );
}
