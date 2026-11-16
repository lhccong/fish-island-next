import {
  Compass,
  MessageCircle,
  ContactRound,
  BookOpen,
  Heart,
  Gamepad2,
  Store,
  Info,
} from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import { ThemePicker } from '@/features/appearance';
import type { ShellId } from '@/shells/contracts';
import { WpsChrome } from './WpsChrome';
import { WpsOfficeTools } from './WpsOfficeTools';
import styles from './WorkspaceNavigation.module.css';
import { WorkspaceAccount } from './WorkspaceAccount';
import { NotificationBadge } from '@/features/fish-circle/notifications';
import { PixelIcon } from '@/shared/ui/PixelIcon';
import { AdminEntry } from './AdminEntry';
import { WorkspaceSignIn } from './WorkspaceSignIn';

export function WorkspaceNavigation({ shellId = 'wechat' }: { shellId?: ShellId }) {
  const location = useLocation();
  return (
    <div className={styles.navigation} data-shell={shellId}>
      {shellId === 'moyu-island' && (
        <Link to="/" className={styles.classicBrand}>
          <img src="/skins/moyu-island/logo.png" alt="" />
          摸鱼岛
        </Link>
      )}
      {shellId === 'wps' && <WpsChrome />}
      <div className={styles.account}>
        <WorkspaceAccount />
      </div>
      <nav className={styles.items} aria-label="主要功能">
        <NavLink to="/" end className={styles.item ?? ''} aria-label="热榜">
          {shellId === 'pixel-island' ? (
            <PixelIcon name="flame" />
          ) : (
            <ContactRound size={23} aria-hidden="true" />
          )}
          <span>{shellId === 'moyu-island' ? '最新' : '热榜'}</span>
        </NavLink>
        <NavLink to="/chat" className={styles.item ?? ''} aria-label="聊天">
          {shellId === 'pixel-island' ? (
            <PixelIcon name="message" />
          ) : (
            <MessageCircle size={23} aria-hidden="true" />
          )}
          <span>{shellId === 'moyu-island' ? '鱼窝' : '聊天'}</span>
        </NavLink>
        <Link
          to="/moments/fish-circle"
          className={`${styles.item} ${styles.desktopEntry}`}
          aria-label="鱼小圈"
          aria-current={
            (shellId !== 'moyu-island' &&
              (location.pathname.startsWith('/discover/') ||
                location.pathname === '/discover' ||
                location.pathname === '/reader' ||
                location.pathname.startsWith('/post') ||
                location.pathname === '/about' ||
                location.pathname.startsWith('/rank/') ||
                location.pathname === '/pet' ||
                location.pathname.startsWith('/game/'))) ||
            location.pathname === '/moments/fish-circle'
              ? 'page'
              : undefined
          }
        >
          {shellId === 'pixel-island' ? (
            <PixelIcon name="palm" />
          ) : (
            <Compass size={23} aria-hidden="true" />
          )}
          <span>鱼小圈</span>
          <NotificationBadge />
        </Link>
        <NavLink
          to="/discover"
          className={`${styles.item} ${styles.mobileEntry}`}
          aria-label="发现"
        >
          {shellId === 'pixel-island' ? (
            <PixelIcon name="palm" />
          ) : (
            <Compass size={23} aria-hidden="true" />
          )}
          <span>发现</span>
          <NotificationBadge />
        </NavLink>
        <AdminEntry placement="rail" />
        {shellId === 'moyu-island' && (
          <div className={styles.classicLinks}>
            {[
              { to: '/reader', name: '阅读', icon: BookOpen },
              { to: '/pet', name: '宠物', icon: Heart },
              { to: '/discover/games', name: '游戏', icon: Gamepad2 },
              { to: '/utils/avatar-frames', name: '商店', icon: Store },
              { to: '/rank/reward', name: '关于', icon: Info },
            ].map(({ to, name, icon: Icon }) => (
              <NavLink key={to} to={to} className={styles.item ?? ''}>
                <Icon size={16} aria-hidden="true" />
                <span>{name}</span>
              </NavLink>
            ))}
          </div>
        )}
        <WorkspaceSignIn
          presentation={shellId === 'moyu-island' ? 'classic' : 'default'}
          className={styles.item ?? ''}
          label={shellId === 'pixel-island' ? '签到' : undefined}
        />
      </nav>
      <div className={styles.bottom}>
        <ThemePicker presentation={shellId === 'wps' ? 'ribbon' : 'rail'} />
      </div>
      {shellId === 'wps' && <WpsOfficeTools />}
    </div>
  );
}
