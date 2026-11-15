import { useLocation, useNavigate } from 'react-router';
import { ForumWorkspace } from '@/features/forum';
import { useAuth } from '@/features/auth';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { forumService } from '@/app/config/forum';
import styles from './GamesPage.module.css';
export function ForumPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = session.status === 'authenticated' ? session.user : null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>文章</h1>
          </div>
        ),
        contentScroll: false,
        content: (
          <ForumWorkspace
            key={user?.id || 'guest'}
            service={forumService}
            user={user}
            path={location.pathname.replace(/^\/post\/?/, '')}
            onNavigate={navigate}
            onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
          />
        ),
      }}
    />
  );
}
