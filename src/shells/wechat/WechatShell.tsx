import type { WorkspaceShellSlots } from '@/shells/contracts';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './WechatShell.module.css';

export function WechatShell({
  slots,
  sidebarLabel = '热榜来源',
  navigationLayout = 'rail',
  hideSidebar = false,
}: {
  slots: WorkspaceShellSlots;
  sidebarLabel?: string;
  navigationLayout?: 'rail' | 'ribbon';
  hideSidebar?: boolean;
}) {
  return (
    <div
      className={styles.shell}
      data-navigation-layout={navigationLayout}
      data-sidebar-hidden={hideSidebar}
    >
      <aside className={styles.rail} aria-label="应用导航">
        {slots.navigation}
      </aside>
      <aside className={styles.sidebar} aria-label={sidebarLabel} hidden={hideSidebar}>
        {slots.sidebar}
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>{slots.header}</header>
        <main className={styles.content} id="main-content">
          <ScrollArea key={slots.contentKey ?? 'workspace'} label="主内容滚动区">
            {slots.content}
          </ScrollArea>
        </main>
        {slots.footer && <footer className={styles.footer}>{slots.footer}</footer>}
      </div>
    </div>
  );
}
