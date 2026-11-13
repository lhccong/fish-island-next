import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { LifeGame } from '@/features/life';
import styles from './LifeGamePage.module.css';

export function LifeGamePage() {
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <>
            <div className={styles.header}>
              <Link className={styles.back ?? ''} to="/discover/games">
                <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                返回游戏
              </Link>
              <h1>人生重开模拟器</h1>
            </div>
          </>
        ),
        content: <LifeGame />,
      }}
    />
  );
}
