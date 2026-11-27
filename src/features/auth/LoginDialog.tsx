import { Dialog } from '@/shared/ui/Dialog';
import { useState } from 'react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { RegisterForm } from './RegisterForm';
import { LoginPanel } from './LoginPanel';
import { AuthNotice } from './AuthNotice';
import styles from './ui/LoginDialog.module.css';

export function LoginDialog({
  onClose,
  onSuccess,
  inviteCode = '',
}: {
  onClose: () => void;
  onSuccess: () => void;
  inviteCode?: string;
}) {
  const [mode, setMode] = useState<'login' | 'register'>(inviteCode ? 'register' : 'login');
  const [registeredEmail, setRegisteredEmail] = useState('');
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
      className={`${styles.modal} ${mode === 'register' ? styles.registerModal : ''}`}
      illustration={<img className={styles.logo} src="/moyu.png" alt="" aria-hidden="true" />}
    >
      <div className={styles.tabs} role="group" aria-label="账号操作">
        <button
          type="button"
          aria-label="切换到登录"
          aria-pressed={mode === 'login'}
          onClick={() => setMode('login')}
        >
          登录
        </button>
        <button
          type="button"
          aria-label="切换到注册"
          aria-pressed={mode === 'register'}
          onClick={() => setMode('register')}
        >
          注册
        </button>
      </div>
      <div className={styles.body}>
        <div hidden={mode !== 'login'} className={styles.loginBody}>
          <ScrollArea label="登录表单" gutter="reserved">
            {registeredEmail && (
              <p role="status" className={styles.success}>
                注册成功，请使用邮箱和密码登录。
              </p>
            )}
            <LoginPanel
              key={registeredEmail}
              initialAccount={registeredEmail}
              onSuccess={onSuccess}
            />
            <AuthNotice inline />
          </ScrollArea>
        </div>
        {mode === 'register' && (
          <RegisterForm
            initialInviteCode={inviteCode}
            onSuccess={(email) => {
              setRegisteredEmail(email);
              setMode('login');
            }}
          />
        )}
      </div>
    </Dialog>
  );
}
