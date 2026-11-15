import { useNavigate, useSearchParams } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { farmService } from '@/app/config/farm';
import { useAuth } from '@/features/auth';
import { FarmWorkspace } from '@/features/farm';
import styles from './GamesPage.module.css';
import { GameWindowLauncher } from '@/app/components/GameWindowLauncher';
export function FarmPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  if (session.status !== 'authenticated') return null;
  return (
    <WorkspaceLayout
      headerAction={<GameWindowLauncher game="farm" />}
      sidebarLabel="发现导航"
      mobileHeader="back-only"
      slots={{
        sidebar: <DiscoveryNavigation />,
        header: (
          <div className={styles.header}>
            <h1>摸鱼农场</h1>
            <span>种点喜欢，收点快乐</span>
          </div>
        ),
        content: (
          <FarmWorkspace
            key={`${session.user.id}:${params.get('userId') || ''}`}
            initialFriend={
              params.get('userId') && params.get('userId') !== session.user.id
                ? { id: params.get('userId')!, name: '岛友', avatar: '' }
                : null
            }
            service={farmService}
            onPet={() => navigate('/pet')}
          />
        ),
      }}
    />
  );
}
