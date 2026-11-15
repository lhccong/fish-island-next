import { MyIslandLauncher } from '@/features/my-island';
import { IslandSidebar } from './IslandSidebar';
import { useIslandSidebar } from './island-sidebar-context';
export function IslandSidebarLauncher() {
  const { activate } = useIslandSidebar();
  return (
    <MyIslandLauncher onOpen={activate}>
      <IslandSidebar />
    </MyIslandLauncher>
  );
}
