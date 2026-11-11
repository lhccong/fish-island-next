import { useAppearanceStore } from '@/features/appearance';
import type { ShellId, WorkspaceShellSlots } from '@/shells/contracts';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from './WorkspaceNavigation';

export function WorkspaceLayout({
  slots,
  sidebarLabel,
  hideSidebar = false,
}: {
  slots: Omit<WorkspaceShellSlots, 'navigation'>;
  sidebarLabel?: string;
  hideSidebar?: boolean;
}) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const shellId: ShellId = skinId === 'wps' ? 'wps' : 'wechat';
  return (
    <WechatShell
      {...(sidebarLabel ? { sidebarLabel } : {})}
      navigationLayout={shellId === 'wps' ? 'ribbon' : 'rail'}
      hideSidebar={hideSidebar}
      slots={{ ...slots, navigation: <WorkspaceNavigation shellId={shellId} /> }}
    />
  );
}
