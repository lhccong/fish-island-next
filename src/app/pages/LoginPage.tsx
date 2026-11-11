import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { LoginDialog, useAuth } from '@/features/auth';
import { safeLoginRedirect } from '@/app/lib/login-redirect';

export function LoginPage() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const background = (location.state as { backgroundLocation?: unknown } | null)
    ?.backgroundLocation;
  const hasBackground = !!background;
  const target = params.has('redirect') ? safeLoginRedirect(params.get('redirect')) : null;
  const finished = useRef(false);
  const close = useCallback(() => {
    if (hasBackground) navigate(-1);
    else navigate('/', { replace: true });
  }, [hasBackground, navigate]);
  const complete = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (target) navigate(target, { replace: true });
    else close();
  }, [target, navigate, close]);
  useEffect(() => {
    if (session.status === 'authenticated') complete();
  }, [session.status, complete]);
  return session.status === 'authenticated' ? null : (
    <LoginDialog onClose={close} onSuccess={complete} />
  );
}
