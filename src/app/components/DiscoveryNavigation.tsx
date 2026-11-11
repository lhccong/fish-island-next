import { Aperture, Gamepad2 } from 'lucide-react';
import { NavLink } from 'react-router';
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
    </nav>
  );
}

export function DiscoveryGameLink() {
  return (
    <NavLink to="/discover/games" className={styles.game ?? ''}>
      <Gamepad2 size={19} aria-hidden="true" />
      游戏
    </NavLink>
  );
}
