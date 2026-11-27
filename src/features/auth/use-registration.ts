import { useEffect, useRef, useState } from 'react';
import { invitationCodePattern, type RegistrationValues } from '@/domain/auth';
import { useAuth } from './use-auth';

export function useRegistration(onSuccess: (email: string) => void) {
  const { register, sendRegistrationCode } = useAuth();
  const [pending, setPending] = useState<'code' | 'register' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));

  async function run(kind: 'code' | 'register', values: RegistrationValues) {
    if (request.current || (kind === 'code' && retryAt > Date.now())) return;
    setError('');
    setNotice('');
    const email = values.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址');
      return;
    }
    if (kind === 'register' && values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    const inviteCode = values.inviteCode?.trim() ?? '';
    if (kind === 'register' && inviteCode && !invitationCodePattern.test(inviteCode)) {
      setError('请输入有效的邀请码，或清空后继续注册');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(kind);
    try {
      if (kind === 'code') {
        await sendRegistrationCode(email, controller.signal);
        if (controller.signal.aborted) return;
        setNow(Date.now());
        setRetryAt(Date.now() + 60_000);
        setNotice(`验证码已发送至 ${email}，请查收邮件`);
      } else {
        await register(
          { ...values, email, account: values.account.trim(), code: values.code.trim() },
          controller.signal,
        );
        if (!controller.signal.aborted) onSuccess(email);
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : '操作失败，请稍后重试');
    } finally {
      if (!controller.signal.aborted) setPending(null);
      if (request.current === controller) request.current = null;
    }
  }
  return { pending, error, notice, remaining, run };
}
