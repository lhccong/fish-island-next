import { Compass, MessageCircle } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { AccountControl } from '@/features/auth';
import { ThemePicker } from '@/features/appearance';
import styles from './WorkspaceNavigation.module.css';

export function WorkspaceNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className={styles.navigation}>
      <AccountControl
        onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
      />
      <nav className={styles.items} aria-label="主要功能">
        <NavLink to="/chat" className={styles.item ?? ''} aria-label="聊天">
          <MessageCircle size={23} aria-hidden="true" />
          <span>聊天</span>
        </NavLink>
        <NavLink to="/" end className={styles.item ?? ''} aria-label="热榜">
          <Compass size={23} aria-hidden="true" />
          <span>热榜</span>
        </NavLink>
      </nav>
      <div className={styles.bottom}>
        <ThemePicker />
      </div>
    </div>
  );
}
