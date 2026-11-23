import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { achievements } from '@/app/config/achievements';
import { Achievements } from '@/features/achievements';
import { useAuth } from '@/features/auth';
import styles from './GamesPage.module.css';

export default function AchievementsPage() {
  const { session, refreshUser } = useAuth();
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        status: null,
        header: (
          <div className={styles.header}>
            <h1>成就</h1>
          </div>
        ),
        contentScroll: false,
        content: (
          <Achievements key={session.user.id} service={achievements} refreshUser={refreshUser} />
        ),
      }}
    />
  );
}
