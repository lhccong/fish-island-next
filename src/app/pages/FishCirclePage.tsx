import { FishCircleWorkspace } from '@/features/fish-circle';
import { useAuth } from '@/features/auth';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { fishCircleService } from '@/app/config/fish-circle';
import { DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
import { useNavigate } from 'react-router';
export function FishCirclePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  if (session.status !== 'authenticated') return null;
  return (
    <FishCircleWorkspace
      key={session.user.id}
      user={session.user}
      service={fishCircleService}
      onExit={() => navigate('/discover')}
      renderDiscoveryNavigation={(circleEntry) => <DiscoveryNavigation circleEntry={circleEntry} />}
      renderLayout={(slots) => (
        <WorkspaceLayout sidebarLabel="鱼小圈导航" hideMobileHeader slots={slots} />
      )}
    />
  );
}
