import { Aperture, Gamepad2, BookOpen, PawPrint } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import styles from './DiscoveryNavigation.module.css';
import { AboutMenu } from './AboutMenu';
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
      <DiscoveryGameLink />
      <DiscoveryReaderLink />
      <AboutMenu />
      <NavLink to="/pet">
        <PawPrint size={19} aria-hidden="true" />
        伙伴
      </NavLink>
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
