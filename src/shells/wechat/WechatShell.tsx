import type { WorkspaceShellSlots } from '@/shells/contracts';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './WechatShell.module.css';
import { PixelIslandScene } from './PixelIslandScene';

export function WechatShell({
  slots,
  sidebarLabel = '热榜来源',
  navigationLayout = 'rail',
  hideSidebar = false,
  mobileNavigation = 'tabs',
  hideMobileHeader = false,
  hideDesktopHeader = false,
  sidebarVariant = 'default',
  presentation = 'default',
  showScene = false,
}: {
  slots: WorkspaceShellSlots;
  sidebarLabel?: string;
  navigationLayout?: 'rail' | 'ribbon';
  hideSidebar?: boolean;
  mobileNavigation?: 'tabs' | 'hidden';
  hideMobileHeader?: boolean;
  hideDesktopHeader?: boolean;
  sidebarVariant?: 'default' | 'chat';
  presentation?: 'default' | 'island';
  showScene?: boolean;
}) {
  return (
    <div
      className={styles.shell}
      data-navigation-layout={navigationLayout}
      data-sidebar-hidden={hideSidebar}
      data-mobile-navigation={mobileNavigation}
      data-mobile-header-hidden={hideMobileHeader}
      data-desktop-header-hidden={hideDesktopHeader}
      data-sidebar-variant={sidebarVariant}
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
          id="main-content"
          data-island-backdrop={presentation === 'island' && showScene}
        >
          {slots.contentScroll === false ? (
            slots.content
          ) : (
            <ScrollArea key={slots.contentKey ?? 'workspace'} label="主内容滚动区">
              {slots.content}
            </ScrollArea>
          )}
        </main>
        {slots.footer && <footer className={styles.footer}>{slots.footer}</footer>}
      </div>
    </div>
  );
}
