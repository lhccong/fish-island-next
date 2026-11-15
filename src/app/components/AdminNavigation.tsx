import { NavLink } from 'react-router';
import { adminSections } from './admin-sections';
import styles from './DiscoveryNavigation.module.css';
export function AdminNavigation({ hideHeading = false }: { hideHeading?: boolean }) {
  return (
    <nav className={styles.sidebar} aria-label="管理导航">
      {!hideHeading && <h2>管理页</h2>}
      {adminSections.map((s) => (
        <NavLink key={s.id} to={s.path}>
          {s.label}
        </NavLink>
      ))}
    </nav>
  );
}
