import { Crown } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/features/auth';
import styles from './DiscoveryNavigation.module.css';
import navigationStyles from './WorkspaceNavigation.module.css';
export function AdminEntry({ placement = 'sidebar' }: { placement?: 'sidebar' | 'rail' }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  if (session.status !== 'authenticated' || session.user.role !== 'admin') return null;
  return (
    <Link
      to={placement === 'rail' ? '/admin/user' : '/admin'}
      className={
        placement === 'rail'
          ? `${navigationStyles.item} ${navigationStyles.desktopEntry}`
          : `${styles.about} ${styles.mobileAdmin}`
      }
      aria-label="管理页"
      title="管理页"
      aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
    >
      <Crown size={placement === 'rail' ? 23 : 19} aria-hidden="true" />
      <span>管理页</span>
    </Link>
  );
}
