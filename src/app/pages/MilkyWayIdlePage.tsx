import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import { useIsGameWindowOpen } from '@/app/components/game-windows-context';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { MilkyWayIdle } from '@/features/milky-way-idle';
import styles from './GamesPage.module.css';

export function MilkyWayIdlePage() {
  const windowOpen = useIsGameWindowOpen('milky-way-idle');

  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="milky-way-idle" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        contentScroll: false,
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>奶牛放置</h1>
          </div>
        ),
        content: windowOpen ? (
          <p className={styles.windowNotice}>游戏在独立窗口中运行</p>
        ) : (
          <MilkyWayIdle />
        ),
      }}
    />
  );
}
