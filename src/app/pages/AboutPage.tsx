import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { AboutWorkspace } from '@/features/about';
import styles from './GamesPage.module.css';

export function AboutPage() {
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>关于</h1>
              <span>一起共建摸鱼岛</span>
            </div>
            <DiscoveryNavigation mobile />
          </>
        ),
        content: <AboutWorkspace />,
      }}
    />
  );
}
