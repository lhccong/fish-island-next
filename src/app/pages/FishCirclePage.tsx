import { FishCircleWorkspace } from '@/features/fish-circle';
import { useAuth } from '@/features/auth';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { fishCircleService } from '@/app/config/fish-circle';
import { DiscoveryGameLink, DiscoveryNavigation } from '@/app/components/DiscoveryNavigation';
export function FishCirclePage() {
  const { session } = useAuth();
  if (session.status !== 'authenticated') return null;
  return (
    <FishCircleWorkspace
      key={session.user.id}
      user={session.user}
      service={fishCircleService}
      discoveryLinks={<DiscoveryGameLink />}
      renderLayout={(slots) => (
        <WorkspaceLayout
          sidebarLabel="鱼小圈导航"
          slots={{
            ...slots,
            header: (
              <>
                {slots.header}
                <DiscoveryNavigation mobile />
              </>
            ),
          }}
        />
      )}
    />
  );
}
