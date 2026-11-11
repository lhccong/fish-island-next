import { useEffect, useRef, useState } from 'react';
import type { LoginCredentials } from '@/domain/auth';
import { useAuth } from './use-auth';
import { LoginForm } from './ui/LoginForm';

export function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const { login, pending } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit(values: LoginCredentials, remember: boolean) {
    setError(null);
    try {
      if ((await login(values, remember)) && active.current) onSuccess();
    } catch (failure) {
      if (active.current)
        setError(failure instanceof Error ? failure.message : '登录失败，请稍后重试');
    }
  }
  return <LoginForm onSubmit={submit} pending={pending !== null} error={error} />;
}
