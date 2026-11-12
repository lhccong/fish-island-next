import { Aperture, Gamepad2, BookOpen, PawPrint, Info } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import styles from './DiscoveryNavigation.module.css';

export function DiscoveryNavigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? styles.mobile : styles.sidebar} aria-label="发现菜单">
      {!mobile && <h2>发现</h2>}
      <NavLink to="/moments/fish-circle">
        <Aperture size={19} aria-hidden="true" />
        朋友圈
      </NavLink>
      <DiscoveryGameLink />
      <DiscoveryReaderLink />
      <NavLink to="/about">
        <Info size={19} aria-hidden="true" />
        关于
      </NavLink>
      <NavLink to="/pet">
        <PawPrint size={19} aria-hidden="true" />
        伙伴
      </NavLink>
    </nav>
  );
}

export function DiscoveryReaderLink() {
  return (
    <NavLink to="/reader" className={styles.game ?? ''}>
      <BookOpen size={19} aria-hidden="true" />
      阅读
    </NavLink>
  );
}

export function DiscoveryGameLink() {
  const location = useLocation();
  return (
    <Link
      to="/discover/games"
      className={styles.game ?? ''}
      aria-current={
        location.pathname === '/game/life' || location.pathname === '/discover/games'
          ? 'page'
          : undefined
      }
    >
      <Gamepad2 size={19} aria-hidden="true" />
      游戏
    </Link>
  );
}
