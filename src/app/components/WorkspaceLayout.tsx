import { useAppearanceStore } from '@/features/appearance';
import type { ShellId, WorkspaceShellSlots } from '@/shells/contracts';
import { WechatShell } from '@/shells/wechat';
import { WorkspaceNavigation } from './WorkspaceNavigation';
import { Link, useLocation } from 'react-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import styles from './WorkspaceLayout.module.css';
import { WorkspaceAccount } from './WorkspaceAccount';
import type { ReactNode } from 'react';
import { AccountToolsHost } from './AccountToolsHost';

export function WorkspaceLayout({
  slots,
  sidebarLabel,
  hideSidebar = false,
  centerContent = false,
  mobileNavigation,
  sidebarVariant,
  sidebarPosition = 'left',
  hideMobileHeader = false,
  hideDesktopHeader = false,
  mobileHeader = 'full',
  headerAction,
}: {
  slots: Omit<WorkspaceShellSlots, 'navigation'>;
  sidebarLabel?: string;
  hideSidebar?: boolean;
  centerContent?: boolean;
  mobileNavigation?: 'tabs' | 'hidden';
  sidebarVariant?: 'default' | 'chat';
  sidebarPosition?: 'left' | 'right';
  hideMobileHeader?: boolean;
  hideDesktopHeader?: boolean;
  mobileHeader?: 'full' | 'back-only';
  headerAction?: ReactNode;
}) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const { pathname } = useLocation();
  const gamePage = pathname.startsWith('/game/');
  const adminPage = pathname.startsWith('/admin/');
  const backTo = adminPage
    ? '/admin'
    : pathname.startsWith('/game/stock/')
      ? '/game/stock'
      : gamePage
        ? '/discover/games'
        : pathname === '/chat'
          ? '/'
          : '/discover';
  const backLabel = adminPage
    ? '返回管理页'
    : pathname.startsWith('/game/stock/')
      ? '返回股市概览'
      : gamePage
        ? '返回游戏'
        : pathname === '/chat'
          ? '返回热榜'
          : '返回发现';
  const mobileRoot = pathname === '/' || pathname === '/discover' || pathname === '/user/login';
  const shellId: ShellId =
    skinId === 'moyu-island'
      ? 'moyu-island'
      : skinId === 'wps'
        ? 'wps'
        : skinId === 'pixel-island'
          ? 'pixel-island'
          : 'wechat';
  const mobileNavigationMode = mobileNavigation ?? (mobileRoot ? 'tabs' : 'hidden');
  return (
    <WechatShell
      {...(sidebarLabel ? { sidebarLabel } : {})}
      navigationLayout={
        shellId === 'moyu-island' ? 'topbar' : shellId === 'wps' ? 'ribbon' : 'rail'
      }
      presentation={
        shellId === 'moyu-island' ? 'classic' : shellId === 'pixel-island' ? 'island' : 'default'
      }
      showScene={pathname === '/' || pathname === '/chat' || pathname === '/discover'}
      hideSidebar={
        hideSidebar ||
        (skinId === 'moyu-island' && !adminPage && pathname !== '/admin' && pathname !== '/chat')
      }
      centerContent={
        centerContent ||
        (skinId === 'moyu-island' &&
          pathname !== '/' &&
          pathname !== '/chat' &&
          !adminPage &&
          pathname !== '/admin')
      }
      {...(sidebarVariant ? { sidebarVariant } : {})}
      sidebarPosition={sidebarPosition}
      hideMobileHeader={hideMobileHeader}
      hideDesktopHeader={hideDesktopHeader}
      mainContentId={sidebarVariant === 'chat' && pathname !== '/chat' ? null : 'main-content'}
      mobileNavigation={mobileNavigationMode}
      slots={{
        ...slots,
        status: slots.status === undefined ? <AccountToolsHost /> : slots.status,
        header: (
          <div
            className={styles.header}
            data-mobile-header={mobileHeader}
            data-island={shellId === 'pixel-island'}
          >
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
