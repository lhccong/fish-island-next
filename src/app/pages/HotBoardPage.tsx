import { HotBoardWorkspace } from '@/features/hot-board';
import { createHotBoardClient } from '@/infrastructure/hot-board';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { apiBaseUrl } from '@/app/config/api';
import { useAppearanceStore } from '@/features/appearance';
import { useAuth } from '@/features/auth';

const hotBoardClient = createHotBoardClient(apiBaseUrl);

export function HotBoardPage() {
  const { session } = useAuth();
  const skinId = useAppearanceStore((state) => state.skinId);
  const isTable = skinId === 'wps';
  return (
    <HotBoardWorkspace
      service={hotBoardClient}
      currentUser={session.status === 'authenticated' ? session.user : null}
      presentation={isTable ? 'table' : skinId === 'pixel-island' ? 'island' : 'cards'}
      renderLayout={(slots) => (
        <WorkspaceLayout
          slots={slots}
          hideSidebar={isTable}
          mobileNavigation={slots.contentKey === 'all' || isTable ? 'tabs' : 'hidden'}
        />
      )}
    />
  );
}
