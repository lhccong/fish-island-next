import { useRef } from 'react';
import { Link } from 'react-router';
import { AvatarFramesPanel, useAuth } from '@/features/auth';
import { PointsShop } from '@/features/points-shop';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { pointsShop } from '@/app/config/points-shop';
import styles from './GamesPage.module.css';

export function PointsShopPage() {
  const { session, refreshUser } = useAuth();
  const focus = useRef<HTMLElement | null>(null);
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      sidebarLabel="发现导航"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>店铺</h1>
          </div>
        ),
        contentScroll: false,
        content: (
          <PointsShop
            key={session.user.id}
            service={pointsShop}
            points={session.user.points}
            usedPoints={session.user.usedPoints}
            onPurchased={refreshUser}
            frames={
              <AvatarFramesPanel
                user={session.user}
                embedded
                returnFocusRef={focus}
                onClose={() => {}}
              />
            }
            support={<Link to="/rank/reward">前往支持</Link>}
          />
        ),
      }}
    />
  );
}
