import { useNavigate, useParams } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { LandlordsGame } from '@/app/components/LandlordsGame';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
import styles from './GamesPage.module.css';
export function LandlordsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="landlords" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>斗地主</h1>
            <span>好牌慢打，和岛友切磋一局</span>
          </div>
        ),
        content: (
          <LandlordsGame
            roomId={roomId ?? null}
            onRoom={(id) =>
              navigate(id ? `/game/landlords/${encodeURIComponent(id)}` : '/game/landlords')
            }
          />
        ),
      }}
    />
  );
}
