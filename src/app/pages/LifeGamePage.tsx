import { Link } from 'react-router';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { LifeGame } from '@/features/life';
import styles from './GamesPage.module.css';

export function LifeGamePage() {
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <Link to="/discover/games">← 返回游戏</Link>
            <span>人生重开模拟器</span>
          </div>
        ),
        content: <LifeGame />,
      }}
    />
  );
}
