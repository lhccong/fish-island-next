import { AccountDialog } from './AccountDialog';
import { useAuth } from './use-auth';
import styles from './ui/AccountControl.module.css';

export function AccountControl({ onLogin }: { onLogin: () => void }) {
  const { session, pending, logout, notify } = useAuth();
  async function leave() {
    try {
      if (!(await logout())) notify('已退出本机，但未能确认服务器注销，请稍后重新登录。');
    } catch (error) {
      notify(error instanceof Error ? error.message : '退出失败，请重试');
    }
  }
  return (
    <div className={styles.account}>
      {session.status === 'authenticated' ? (
        <AccountDialog
          user={session.user}
          onLogout={() => {
            void leave();
          }}
        />
      ) : (
        <button
          className={styles.trigger}
          type="button"
          aria-label={session.status === 'checking' ? '检查登录状态' : '登录'}
          onClick={onLogin}
          disabled={session.status === 'checking' || pending !== null}
        >
          <span className={styles.guest} aria-hidden="true">
            鱼
          </span>
        </button>
      )}
    </div>
  );
}
