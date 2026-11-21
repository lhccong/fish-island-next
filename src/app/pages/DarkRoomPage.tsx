import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { DarkRoomGame } from '@/app/components/DarkRoomGame';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import { useIsGameWindowOpen } from '@/app/components/game-windows-context';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import styles from './GamesPage.module.css';

export function DarkRoomPage() {
  const windowOpen = useIsGameWindowOpen('dark-room');
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="dark-room" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        contentScroll: false,
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>小黑屋模拟器</h1>
          </div>
        ),
        content: windowOpen ? (
          <p className={styles.windowNotice}>游戏在独立窗口中运行</p>
        ) : (
          <DarkRoomGame />
        ),
      }}
    />
  );
}
