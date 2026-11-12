import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { petService } from '@/app/config/pet';
import { useAuth } from '@/features/auth';
import { PetWorkspace } from '@/features/pet';
import styles from './GamesPage.module.css';

export function PetPage() {
  const { session } = useAuth();
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>伙伴</h1>
              <span>岛屿生活，有你相伴</span>
            </div>
            <DiscoveryNavigation mobile />
          </>
        ),
        content: (
          <PetWorkspace key={session.user.id} service={petService} userId={session.user.id} />
        ),
      }}
    />
  );
}
