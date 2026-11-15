import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { SignInStatusProvider } from '@/features/sign-in';
import { signInPort } from '@/app/config/sign-in';

export function SignInSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return (
    <SignInStatusProvider
      port={signInPort}
      accountId={session.status === 'authenticated' ? session.user.id : ''}
    >
      {children}
    </SignInStatusProvider>
  );
}
