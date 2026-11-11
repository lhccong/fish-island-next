import { Dialog } from '@/shared/ui/Dialog';
import { LoginPanel } from './LoginPanel';
import { AuthNotice } from './AuthNotice';
import styles from './ui/LoginDialog.module.css';

export function LoginDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="摸鱼岛"
      description="加入摸鱼岛一起来摸吧"
      showCloseAction={false}
      dismissLabel="关闭登录弹窗"
      className={styles.modal ?? ''}
      illustration={<img className={styles.logo} src="/moyu.png" alt="" aria-hidden="true" />}
    >
      <div className={styles.tab}>登录</div>
      <LoginPanel onSuccess={onSuccess} />
      <AuthNotice inline />
    </Dialog>
  );
}
