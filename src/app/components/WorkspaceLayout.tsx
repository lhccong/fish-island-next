import { useAppearanceStore } from '@/features/appearance';
import type { ShellId, WorkspaceShellSlots } from '@/shells/contracts';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import { Link, useLocation } from 'react-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import styles from './WorkspaceLayout.module.css';
import { WorkspaceAccount } from './WorkspaceAccount';
import type { ReactNode } from 'react';

export function WorkspaceLayout({
  slots,
  sidebarLabel,
  hideSidebar = false,
  mobileNavigation,
  sidebarVariant,
  hideMobileHeader = false,
  hideDesktopHeader = false,
  mobileHeader = 'full',
  headerAction,
}: {
  slots: Omit<WorkspaceShellSlots, 'navigation'>;
  sidebarLabel?: string;
  hideSidebar?: boolean;
  mobileNavigation?: 'tabs' | 'hidden';
  sidebarVariant?: 'default' | 'chat';
  hideMobileHeader?: boolean;
  hideDesktopHeader?: boolean;
  mobileHeader?: 'full' | 'back-only';
  headerAction?: ReactNode;
}) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const { pathname } = useLocation();
  const gamePage = pathname.startsWith('/game/');
  const backTo = pathname.startsWith('/game/stock/')
    ? '/game/stock'
    : gamePage
      ? '/discover/games'
      : pathname === '/chat'
        ? '/'
        : '/discover';
  const backLabel = pathname.startsWith('/game/stock/')
    ? '返回股市概览'
    : gamePage
      ? '返回游戏'
      : pathname === '/chat'
        ? '返回热榜'
        : '返回发现';
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
      hideDesktopHeader={hideDesktopHeader}
      mobileNavigation={mobileNavigationMode}
      slots={{
        ...slots,
        header: (
          <div className={styles.header} data-mobile-header={mobileHeader}>
            {!mobileRoot && (
              <Link
                className={styles.back}
                data-game={gamePage}
                to={backTo}
                aria-label={backLabel}
                title={backLabel}
              >
                {gamePage ? (
                  <ArrowLeft size={18} aria-hidden="true" />
                ) : (
                  <ChevronLeft size={24} aria-hidden="true" />
                )}
              </Link>
            )}
            {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
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
