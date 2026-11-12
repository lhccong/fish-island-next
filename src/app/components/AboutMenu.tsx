import { Info } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import styles from './DiscoveryNavigation.module.css';

export function AboutMenu() {
  const { pathname } = useLocation();
  return (
    <Link
      to="/rank/reward"
      className={styles.about}
      data-active={pathname.startsWith('/rank/') || pathname === '/about'}
    >
      <Info size={19} aria-hidden="true" />
      关于
    </Link>
  );
}
