import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
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
        <Dialog
          title={session.user.name}
          description="已登录摸鱼岛，可在本设备退出账号。"
          trigger={
            <button className={styles.trigger} type="button" aria-label="用户菜单">
              <SourceAvatar name={session.user.name} src={session.user.avatarUrl} />
            </button>
          }
        >
          <p className={styles.id}>账号 ID：{session.user.id}</p>
          <Button
            variant="secondary"
            onClick={() => {
              void leave();
            }}
            disabled={pending !== null}
          >
            退出登录
          </Button>
        </Dialog>
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
