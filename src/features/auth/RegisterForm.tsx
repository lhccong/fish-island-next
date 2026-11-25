import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useRegistration } from './use-registration';
import { RegistrationPassword } from './ui/RegistrationPassword';
import styles from './ui/LoginForm.module.css';

function randomIslandName() {
  return `岛民${1000 + Math.floor(Math.random() * 9000)}`;
}

export function RegisterForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [values, setValues] = useState(() => ({
    account: '',
    name: randomIslandName(),
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
  }));
  const { pending, error, notice, remaining, run } = useRegistration(onSuccess);
  const update = (name: keyof typeof values, value: string) =>
    setValues((old) => ({ ...old, [name]: value }));

  function rerollName() {
    let name = randomIslandName();
    while (name === values.name) name = randomIslandName();
    update('name', name);
  }

  return (
    <form
      className={styles.registrationForm}
      aria-busy={!!pending}
      onSubmit={(event) => {
        event.preventDefault();
        void run('register', values);
      }}
    >
      <ScrollArea label="注册表单" gutter="reserved" className={styles.registrationFields ?? ''}>
        <div className={styles.form}>
          <label htmlFor="register-account">账号（选填）</label>
          <div className={styles.field}>
            <input
              id="register-account"
              autoComplete="username"
              value={values.account}
              disabled={!!pending}
              onChange={(event) => update('account', event.target.value)}
              placeholder="不填也可使用邮箱登录"
            />
          </div>
          <label htmlFor="register-name">昵称（选填）</label>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <input
                id="register-name"
                autoComplete="nickname"
                maxLength={10}
                value={values.name}
                disabled={!!pending}
                onChange={(event) => update('name', event.target.value)}
              />
            </div>
            <Button variant="secondary" disabled={!!pending} onClick={rerollName}>
              随机生成
            </Button>
          </div>
          <RegistrationPassword
            id="register-password"
            label="密码"
            value={values.password}
            disabled={!!pending}
            onChange={(value) => update('password', value)}
          />
          <RegistrationPassword
            id="register-confirm"
            label="确认密码"
            value={values.confirmPassword}
            disabled={!!pending}
            onChange={(value) => update('confirmPassword', value)}
          />
          <label htmlFor="register-email">邮箱</label>
          <div className={styles.field}>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={values.email}
              disabled={!!pending}
              onChange={(event) => update('email', event.target.value)}
              placeholder="请输入完整邮箱地址"
            />
          </div>
          <label htmlFor="register-code">邮箱验证码</label>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <input
                id="register-code"
                autoComplete="one-time-code"
                required
                value={values.code}
                disabled={!!pending}
                onChange={(event) => update('code', event.target.value)}
                placeholder="请输入验证码"
              />
            </div>
            <Button
              variant="secondary"
              disabled={!!pending || remaining > 0}
              onClick={() => void run('code', values)}
            >
              {pending === 'code' ? (
                <LoadingIndicator compact>正在发送…</LoadingIndicator>
              ) : remaining ? (
                `${remaining}秒后重试`
              ) : (
                '获取验证码'
              )}
            </Button>
          </div>
        </div>
      </ScrollArea>
      {notice && (
        <p className={styles.note} role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={!!pending}>
          {pending === 'register' ? <LoadingIndicator compact>正在注册…</LoadingIndicator> : '注册'}
        </Button>
      </div>
    </form>
  );
}
