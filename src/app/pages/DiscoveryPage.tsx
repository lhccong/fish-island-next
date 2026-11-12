import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import styles from './DiscoveryPage.module.css';

export function DiscoveryPage() {
  return (
    <WorkspaceLayout
      hideSidebar
      slots={{
        sidebar: null,
        header: <h1 className={styles.heading}>发现</h1>,
        content: (
          <div className={styles.menu}>
            <DiscoveryNavigation hideMobileHeading />
          </div>
        ),
      }}
    />
  );
}
