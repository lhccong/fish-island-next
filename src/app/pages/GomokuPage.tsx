import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { GomokuGame } from '@/app/components/GomokuGame';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import styles from './GamesPage.module.css';

export function GomokuPage() {
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="gomoku" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>五子棋</h1>
            <span>与岛友来一局</span>
          </div>
        ),
        content: <GomokuGame />,
      }}
    />
  );
}
