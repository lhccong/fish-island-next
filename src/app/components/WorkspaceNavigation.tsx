import { Compass, MessageCircle, ContactRound } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import { ThemePicker } from '@/features/appearance';
import type { ShellId } from '@/shells/contracts';
import { WpsChrome } from './WpsChrome';
import { WpsOfficeTools } from './WpsOfficeTools';
import styles from './WorkspaceNavigation.module.css';
import { WorkspaceAccount } from './WorkspaceAccount';

export function WorkspaceNavigation({ shellId = 'wechat' }: { shellId?: ShellId }) {
  const location = useLocation();
  return (
    <div className={styles.navigation} data-shell={shellId}>
      {shellId === 'wps' && <WpsChrome />}
      <div className={styles.account}>
        <WorkspaceAccount />
      </div>
      <nav className={styles.items} aria-label="主要功能">
        <NavLink to="/" end className={styles.item ?? ''} aria-label="热榜">
          <ContactRound size={23} aria-hidden="true" />
          <span>热榜</span>
        </NavLink>
        <NavLink to="/chat" className={styles.item ?? ''} aria-label="聊天">
          <MessageCircle size={23} aria-hidden="true" />
          <span>聊天</span>
        </NavLink>
        <Link
          to="/moments/fish-circle"
          className={`${styles.item} ${styles.desktopEntry}`}
          aria-label="鱼小圈"
          aria-current={
            location.pathname.startsWith('/discover/') ||
            location.pathname === '/discover' ||
            location.pathname === '/reader' ||
            location.pathname === '/about' ||
            location.pathname.startsWith('/rank/') ||
            location.pathname === '/pet' ||
            location.pathname === '/game/life' ||
            location.pathname === '/moments/fish-circle'
              ? 'page'
              : undefined
          }
        >
          <Compass size={23} aria-hidden="true" />
          <span>鱼小圈</span>
        </Link>
        <NavLink
          to="/discover"
          className={`${styles.item} ${styles.mobileEntry}`}
          aria-label="发现"
        >
          <Compass size={23} aria-hidden="true" />
          <span>发现</span>
        </NavLink>
      </nav>
      <div className={styles.bottom}>
        <ThemePicker presentation={shellId === 'wps' ? 'ribbon' : 'rail'} />
      </div>
      {shellId === 'wps' && <WpsOfficeTools />}
    </div>
  );
}
