import { HotBoardWorkspace } from '@/features/hot-board';
import { createHotBoardClient } from '@/infrastructure/hot-board';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from '@/app/components/WorkspaceNavigation';
import { apiBaseUrl } from '@/app/config/api';

const hotBoardClient = createHotBoardClient(apiBaseUrl);

export function HotBoardPage() {
  return (
    <HotBoardWorkspace
      service={hotBoardClient}
      renderLayout={(slots) => (
        <WechatShell slots={{ ...slots, navigation: <WorkspaceNavigation /> }} />
      )}
    />
  );
}
