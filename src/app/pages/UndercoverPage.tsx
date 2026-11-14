import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { UndercoverGame } from '@/app/components/UndercoverGame';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import styles from './GamesPage.module.css';
export function UndercoverPage() {
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="undercover" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>谁是卧底</h1>
            <span>同屏推理与联机房间</span>
          </div>
        ),
        content: <UndercoverGame />,
      }}
    />
  );
}
