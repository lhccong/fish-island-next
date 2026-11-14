import { useNavigate, useParams, Navigate } from 'react-router';
import { indices } from '@/domain/stock';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { stockService } from '@/app/config/stock';
import { useAuth } from '@/features/auth';
import { StockWorkspace } from '@/features/stock';
import styles from './GamesPage.module.css';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
export function StockPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { indexCode } = useParams();
  if (indexCode && !indices.some((i) => i.value === indexCode))
    return <Navigate to="/game/stock" replace />;
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="stock" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>摸鱼股市</h1>
            <span>指数行情与积分交易</span>
          </div>
        ),
        content: (
          <StockWorkspace
            key={session.user.id}
            service={stockService}
            detailCode={indexCode ?? null}
            onDetail={(code) => navigate(`/game/stock/${code}`)}
            onBack={() => navigate('/game/stock')}
          />
        ),
      }}
    />
  );
}
