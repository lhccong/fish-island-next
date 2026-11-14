import { useLocation, useNavigate } from 'react-router';
import { AccountControl, useAuth } from '@/features/auth';
import { lazy, Suspense } from 'react';
import { signInPort } from '@/app/config/sign-in';

const SignInLauncher = lazy(() =>
  import('@/features/sign-in').then((module) => ({ default: module.SignInLauncher })),
);

export function WorkspaceAccount() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <AccountControl
      accountActions={
        session.status === 'authenticated' ? (
          <Suspense>
            <SignInLauncher key={session.user.id} port={signInPort} />
          </Suspense>
        ) : null
      }
      onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
    />
  );
}
