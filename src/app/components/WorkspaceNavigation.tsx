import { Compass, MessageCircle, Camera } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { AccountControl } from '@/features/auth';
import { ThemePicker } from '@/features/appearance';
import type { ShellId } from '@/shells/contracts';
import { WpsChrome } from './WpsChrome';
import { WpsOfficeTools } from './WpsOfficeTools';
import styles from './WorkspaceNavigation.module.css';

export function WorkspaceNavigation({ shellId = 'wechat' }: { shellId?: ShellId }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className={styles.navigation} data-shell={shellId}>
      {shellId === 'wps' && <WpsChrome />}
      <div className={styles.account}>
        <AccountControl
          onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
        />
      </div>
      <nav className={styles.items} aria-label="主要功能">
        <NavLink to="/chat" className={styles.item ?? ''} aria-label="聊天">
          <MessageCircle size={23} aria-hidden="true" />
          <span>聊天</span>
        </NavLink>
        <NavLink to="/" end className={styles.item ?? ''} aria-label="热榜">
          <Camera size={23} aria-hidden="true" />
          <span>热榜</span>
        </NavLink>
        <NavLink
          to="/moments/fish-circle"
          className={styles.item ?? ''}
          aria-label="鱼小圈"
          aria-current={
            location.pathname.startsWith('/discover/') || location.pathname === '/game/life'
              ? 'page'
              : undefined
          }
        >
          <Compass size={23} aria-hidden="true" />
          <span>鱼小圈</span>
        </NavLink>
      </nav>
      <div className={styles.bottom}>
        <ThemePicker presentation={shellId === 'wps' ? 'ribbon' : 'rail'} />
      </div>
      {shellId === 'wps' && <WpsOfficeTools />}
    </div>
  );
}
