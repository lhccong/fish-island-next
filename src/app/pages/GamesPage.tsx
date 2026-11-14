import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { GameCatalog } from '@/features/games';
import { useGameWindows } from '@/app/components/game-windows-context';
import { useNavigate } from 'react-router';
import styles from './GamesPage.module.css';

export function GamesPage() {
  const openGame = useGameWindows();
  const navigate = useNavigate();
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <h1>游戏</h1>
              <span>找点乐趣，轻松摸鱼</span>
            </div>
          </>
        ),
        content: (
          <GameCatalog
            onPlay={() => navigate('/game/life')}
            onStock={() => navigate('/game/stock')}
            onFarm={() => navigate('/game/farm')}
            onWindow={openGame}
          />
        ),
      }}
    />
  );
}
