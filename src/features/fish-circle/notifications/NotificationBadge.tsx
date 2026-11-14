import { useNotifications } from './notification-context';
import styles from './NotificationBadge.module.css';

export function NotificationBadge() {
  const { count } = useNotifications();
  if (count === null || count === 0) return null;
  return (
    <span className={styles.badge} aria-label={`${count} 条未读通知`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
