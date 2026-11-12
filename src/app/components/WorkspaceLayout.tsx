import { useAppearanceStore } from '@/features/appearance';
import type { ShellId, WorkspaceShellSlots } from '@/shells/contracts';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import { Link, useLocation } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import styles from './WorkspaceLayout.module.css';
import { WorkspaceAccount } from './WorkspaceAccount';

export function WorkspaceLayout({
  slots,
  sidebarLabel,
  hideSidebar = false,
  mobileNavigation,
  sidebarVariant,
  hideMobileHeader = false,
}: {
  slots: Omit<WorkspaceShellSlots, 'navigation'>;
  sidebarLabel?: string;
  hideSidebar?: boolean;
  mobileNavigation?: 'tabs' | 'hidden';
  sidebarVariant?: 'default' | 'chat';
  hideMobileHeader?: boolean;
}) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const { pathname } = useLocation();
  const mobileRoot = pathname === '/' || pathname === '/discover' || pathname === '/user/login';
  const shellId: ShellId = skinId === 'wps' ? 'wps' : 'wechat';
  const mobileNavigationMode = mobileNavigation ?? (mobileRoot ? 'tabs' : 'hidden');
  return (
    <WechatShell
      {...(sidebarLabel ? { sidebarLabel } : {})}
      navigationLayout={shellId === 'wps' ? 'ribbon' : 'rail'}
      hideSidebar={hideSidebar}
      {...(sidebarVariant ? { sidebarVariant } : {})}
      hideMobileHeader={hideMobileHeader}
      mobileNavigation={mobileNavigationMode}
      slots={{
        ...slots,
        header: (
          <div className={styles.header}>
            {!mobileRoot && (
              <Link
                className={styles.back}
                to={pathname === '/chat' ? '/' : '/discover'}
                aria-label={pathname === '/chat' ? '返回热榜' : '返回发现'}
              >
                <ChevronLeft size={24} aria-hidden="true" />
              </Link>
            )}
            <div className={styles.title}>
              {slots.header ?? (mobileRoot && <h1 className={styles.mobileHeading}>今日热榜</h1>)}
            </div>
            {mobileRoot && mobileNavigationMode === 'tabs' && (
              <div className={styles.mobileAccount}>
                <WorkspaceAccount />
              </div>
            )}
          </div>
        ),
        navigation: <WorkspaceNavigation shellId={shellId} />,
      }}
    />
  );
}
