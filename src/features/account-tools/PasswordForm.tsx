import { useEffect, useState } from 'react';
import type { AccountToolsPort } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useOperation } from './use-operation';
import { Feedback } from './Feedback';
import styles from './Tools.module.css';

export function PasswordForm({
  port,
  email: initial,
  onReset,
}: {
  port: AccountToolsPort;
  email: string;
  onReset: () => void;
}) {
  const [email, setEmail] = useState(initial);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const operation = useOperation();
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const checkEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('请输入正确的邮箱地址');
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void operation.run(async (signal) => {
          checkEmail();
          if (!code.trim()) throw new Error('请输入邮箱验证码');
          if (password.length < 8) throw new Error('密码至少需要 8 个字符');
          if (password !== confirm) throw new Error('两次输入的密码不一致');
          await port.resetPassword(
            {
              email: email.trim(),
              code: code.trim(),
              userPassword: password,
              checkPassword: confirm,
            },
            signal,
          );
          if (!signal.aborted) {
            setPassword('');
            setConfirm('');
            onReset();
          }
        });
      }}
    >
      <ScrollArea label="找回密码内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          <label className={styles.field}>
            邮箱
            <input
              type="email"
              placeholder="用于接收验证码的邮箱"
              autoComplete="email"
              value={email}
              disabled={operation.busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className={styles.codeRow}>
            <label className={styles.field}>
              验证码
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="输入邮箱验证码"
                value={code}
                disabled={operation.busy}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <Button
              variant="secondary"
              disabled={operation.busy || seconds > 0}
              onClick={() => {
                void operation.run(async (signal) => {
                  checkEmail();
                  await port.sendCode(email.trim(), signal);
                  if (!signal.aborted) {
                    setRetryAt(Date.now() + 60000);
                    setNow(Date.now());
                    operation.setNotice('验证码已发送到邮箱');
                  }
                });
              }}
            >
              {seconds > 0 ? `${seconds}秒后重发` : '获取验证码'}
            </Button>
          </div>
          <label className={styles.field}>
            新密码
            <input
              type="password"
              placeholder="至少 8 个字符"
              autoComplete="new-password"
              value={password}
              disabled={operation.busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            确认密码
            <input
              type="password"
              placeholder="再次输入新密码"
              autoComplete="new-password"
              value={confirm}
              disabled={operation.busy}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        </div>
      </ScrollArea>
      <Feedback {...operation} />
      <div className={styles.actions}>
        <Button type="submit" disabled={operation.busy}>
          重置密码
        </Button>
      </div>
    </form>
  );
}
