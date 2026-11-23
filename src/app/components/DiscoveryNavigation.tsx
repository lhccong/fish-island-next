import {
  Aperture,
  Gamepad2,
  BookOpen,
  PawPrint,
  ShoppingBag,
  MessagesSquare,
  Wrench,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { defaultToolPath } from '@/app/config/tools';
import styles from './DiscoveryNavigation.module.css';
import { AboutMenu } from './AboutMenu';
import { AdminEntry } from './AdminEntry';
import { NotificationBadge } from '@/features/fish-circle/notifications';

export function DiscoveryNavigation({
  circleEntry,
  hideMobileHeading = false,
}: {
  circleEntry?: ReactNode;
  hideMobileHeading?: boolean;
}) {
  return (
    <nav className={styles.sidebar} aria-label="发现菜单">
      <h2 className={hideMobileHeading ? styles.desktopHeading : undefined}>发现</h2>
      {circleEntry ?? (
        <NavLink to="/moments/fish-circle" style={{ position: 'relative' }}>
          <Aperture size={19} aria-hidden="true" />
          朋友圈
          <NotificationBadge />
        </NavLink>
      )}
      <NavLink to="/pet">
        <PawPrint size={19} aria-hidden="true" />
        伙伴
      </NavLink>
      <NavLink to="/post">
        <MessagesSquare size={19} aria-hidden="true" />
        文章
      </NavLink>
      <DiscoveryGameLink />
      <DiscoveryReaderLink />
      <NavLink to="/utils/avatar-frames">
        <ShoppingBag size={19} aria-hidden="true" />
        店铺
      </NavLink>
      <NavLink to="/discover/achievements">
        <Trophy size={19} aria-hidden="true" />
        成就
      </NavLink>
      <NavLink to={defaultToolPath}>
        <Wrench size={19} aria-hidden="true" />
        工具
      </NavLink>
      <AboutMenu />
      <AdminEntry />
    </nav>
  );
}

function DiscoveryReaderLink() {
  return (
    <NavLink to="/reader" className={styles.game ?? ''}>
      <BookOpen size={19} aria-hidden="true" />
      阅读
    </NavLink>
  );
}

function DiscoveryGameLink() {
  const location = useLocation();
  return (
    <Link
      to="/discover/games"
      className={styles.game ?? ''}
      aria-current={
        location.pathname.startsWith('/game/') || location.pathname === '/discover/games'
          ? 'page'
          : undefined
      }
    >
      <Gamepad2 size={19} aria-hidden="true" />
      游戏
    </Link>
  );
}
