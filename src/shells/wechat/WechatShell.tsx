import type { WorkspaceNavigationLayout, WorkspaceShellSlots } from '@/shells/contracts';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './WechatShell.module.css';
import { PixelIslandScene } from './PixelIslandScene';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';

export function WechatShell({
  slots,
  sidebarLabel = '热榜来源',
  navigationLayout = 'rail',
  hideSidebar = false,
  centerContent = false,
  mobileNavigation = 'tabs',
  hideMobileHeader = false,
  hideDesktopHeader = false,
  sidebarVariant = 'default',
  sidebarPosition = 'left',
  presentation = 'default',
  showScene = false,
  mainContentId = 'main-content',
}: {
  slots: WorkspaceShellSlots;
  sidebarLabel?: string;
  navigationLayout?: WorkspaceNavigationLayout;
  hideSidebar?: boolean;
  centerContent?: boolean;
  mobileNavigation?: 'tabs' | 'hidden';
  hideMobileHeader?: boolean;
  hideDesktopHeader?: boolean;
  sidebarVariant?: 'default' | 'chat';
  sidebarPosition?: 'left' | 'right';
  presentation?: 'default' | 'island' | 'classic';
  showScene?: boolean;
  mainContentId?: string | null;
}) {
  return (
    <div
      className={styles.shell}
      data-navigation-layout={navigationLayout}
      data-sidebar-hidden={hideSidebar}
      data-content-centered={centerContent}
      data-mobile-navigation={mobileNavigation}
      data-mobile-header-hidden={hideMobileHeader}
      data-desktop-header-hidden={hideDesktopHeader}
      data-sidebar-variant={sidebarVariant}
      data-sidebar-position={sidebarPosition}
      data-presentation={presentation}
    >
      <aside className={styles.rail} aria-label="应用导航">
        {slots.navigation}
      </aside>
      <aside className={styles.sidebar} aria-label={sidebarLabel} hidden={hideSidebar}>
        {slots.sidebar}
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>
          {presentation === 'island' && showScene && <PixelIslandScene />}
          {slots.header}
        </header>
        {slots.status}
        <main
          className={styles.content}
          id={mainContentId ?? undefined}
          data-island-backdrop={presentation === 'island' && showScene}
        >
          {slots.contentScroll === false ? (
            slots.content
          ) : (
            <ScrollArea
              key={slots.contentKey ?? 'workspace'}
              label="主内容滚动区"
              fillContent={slots.contentFill ?? false}
            >
              {slots.content}
              <PageFooterOutlet />
            </ScrollArea>
          )}
        </main>
        {slots.footer && <footer className={styles.footer}>{slots.footer}</footer>}
      </div>
      {presentation === 'classic' && (!hideSidebar || sidebarVariant === 'chat') && (
        <div className={styles.classicFooter}>
          <PageFooterOutlet />
        </div>
      )}
    </div>
  );
}
