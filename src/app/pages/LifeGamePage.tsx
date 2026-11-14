import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { LifeGame } from '@/features/life';
import styles from './GamesPage.module.css';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';

export function LifeGamePage() {
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="life" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>人生重开模拟器</h1>
          </div>
        ),
        content: <LifeGame />,
      }}
    />
  );
}
