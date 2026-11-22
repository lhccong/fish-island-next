import { useNavigate, useParams } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { DrawGame } from '@/app/components/DrawGame';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import styles from './GamesPage.module.css';
export function DrawPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="draw" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        status: roomId ? null : undefined,
        header: (
          <div className={styles.header}>
            <h1>你画我猜</h1>
            <span>画出灵感，一起猜中快乐</span>
          </div>
        ),
        content: (
          <DrawGame
            roomId={roomId ?? null}
            onRoom={(id) => navigate(id ? `/game/draw/${encodeURIComponent(id)}` : '/game/draw')}
          />
        ),
      }}
    />
  );
}
