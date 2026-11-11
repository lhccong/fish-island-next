import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import type { LoginCredentials } from '@/domain/auth';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSubmit: (values: LoginCredentials, remember: boolean) => Promise<void>;
  pending: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, pending, error }: LoginFormProps) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    await onSubmit({ account: account.trim(), password }, remember);
    setPassword('');
  }
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        void submit(event);
      }}
      aria-busy={pending}
    >
      <label htmlFor="login-account">账号或邮箱</label>
      <div className={styles.field}>
        <UserRound size={18} aria-hidden="true" />
        <input
          id="login-account"
          name="username"
          autoComplete="username"
          required
          maxLength={254}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          placeholder="请输入原摸鱼岛账号或邮箱"
          disabled={pending}
        />
      </div>
      <label htmlFor="login-password">密码</label>
      <div className={styles.field}>
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id="login-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="请输入密码"
          disabled={pending}
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? '隐藏密码' : '显示密码'}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      <label className={styles.remember}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          disabled={pending}
        />
        保持登录
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? '正在登录…' : '登录'}
      </button>
      <p className={styles.note}>与原摸鱼岛共用账号，邮箱同样使用密码登录。</p>
    </form>
  );
}
