import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useAuth } from './use-auth';
import styles from './ui/Profile.module.css';

export function EmailBinding({ boundEmail, disabled }: { boundEmail: string; disabled: boolean }) {
  const { sendEmailCode, bindEmail, emailCodeRetryAt, emailCodeTarget } = useAuth();
  const [email, setEmail] = useState(emailCodeTarget);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!emailCodeRetryAt) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= emailCodeRetryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCodeRetryAt]);
  const remaining = Math.max(0, Math.ceil((emailCodeRetryAt - now) / 1000));
  const valid = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请输入正确的邮箱地址');
      return false;
    }
    return true;
  };
  if (boundEmail)
    return (
      <div className={styles.label}>
        绑定邮箱
        <div className={styles.confirmed}>
          <Check size={14} aria-hidden="true" />
          <span>{boundEmail}</span>
        </div>
      </div>
    );
  return (
    <section className={styles.emailSection} aria-label="邮箱绑定">
      <label className={styles.label}>
        绑定邮箱
        <input
          type="email"
          value={email}
          autoComplete="email"
          placeholder="请输入要绑定的邮箱地址"
          disabled={disabled || sending}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
        />
      </label>
      <div className={styles.emailActions}>
        <Button
          variant="secondary"
          disabled={disabled || sending || remaining > 0}
          onClick={async () => {
            setError('');
            setMessage('');
            if (!valid()) return;
            const controller = new AbortController();
            request.current = controller;
            setSending(true);
            try {
              await sendEmailCode(email.trim(), controller.signal);
              if (!controller.signal.aborted) {
                setNow(Date.now());
                setMessage('验证码已发送到邮箱');
              }
            } catch (reason) {
              if (!controller.signal.aborted)
                setError(reason instanceof Error ? reason.message : '发送验证码失败');
            } finally {
              if (!controller.signal.aborted) setSending(false);
            }
          }}
        >
          {sending ? '发送中…' : remaining ? `${remaining}秒后重发` : '获取验证码'}
        </Button>
        <input
          aria-label="邮箱验证码"
          placeholder="验证码"
          value={code}
          autoComplete="one-time-code"
          disabled={disabled || sending}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button
          disabled={disabled || sending}
          onClick={async () => {
            setError('');
            setMessage('');
            if (!valid()) return;
            if (!code.trim()) {
              setError('请输入验证码');
              return;
            }
            try {
              if (await bindEmail(email.trim(), code.trim())) setMessage('邮箱绑定成功');
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : '邮箱绑定失败');
            }
          }}
        >
          绑定邮箱
        </Button>
      </div>
      {message && (
        <p className={styles.hint} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.hint}>邮箱绑定成功后立即生效。</p>
    </section>
  );
}
