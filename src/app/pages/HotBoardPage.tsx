import { HotBoardWorkspace } from '@/features/hot-board';
import { createHotBoardClient } from '@/infrastructure/hot-board';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { apiBaseUrl } from '@/app/config/api';
import { useAppearanceStore } from '@/features/appearance';

const hotBoardClient = createHotBoardClient(apiBaseUrl);

export function HotBoardPage() {
  const isTable = useAppearanceStore((state) => state.skinId === 'wps');
  return (
    <HotBoardWorkspace
      service={hotBoardClient}
      presentation={isTable ? 'table' : 'cards'}
      renderLayout={(slots) => <WorkspaceLayout slots={slots} hideSidebar={isTable} />}
    />
  );
}
