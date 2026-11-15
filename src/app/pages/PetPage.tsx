import { useSearchParams } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { petService } from '@/app/config/pet';
import { useAuth } from '@/features/auth';
import { PetWorkspace } from '@/features/pet';
import styles from './GamesPage.module.css';

export function PetPage() {
  const { session, refreshUser } = useAuth();
  const [params] = useSearchParams();
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        contentFill: true,
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
          <PetWorkspace
            key={session.user.id}
            service={petService}
            onLotterySettled={refreshUser}
            userId={session.user.id}
            points={
              session.user.points === undefined
                ? undefined
                : session.user.points - (session.user.usedPoints ?? 0)
            }
            openTournament={params.get('challenge') === 'tournament'}
          />
        ),
      }}
    />
  );
}
