import { useAuth } from '@/features/auth';
import { SignInLauncher } from '@/features/sign-in';
import { signInPort } from '@/app/config/sign-in';

export function WorkspaceSignIn({
  className,
  label,
  presentation = 'default',
}: {
  className: string;
  label?: string | undefined;
  presentation?: 'default' | 'classic';
}) {
  const { session } = useAuth();
  if (session.status !== 'authenticated') return null;
  return (
    <SignInLauncher
      key={session.user.id}
      port={signInPort}
      navigationClassName={className}
      navigationLabel={label}
      navigationPresentation={presentation}
    />
  );
}
