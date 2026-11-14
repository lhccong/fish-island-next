import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { NotificationProvider } from '@/features/fish-circle/notifications';
import { fishCircleService } from '@/app/config/fish-circle';

export function NotificationSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return (
    <NotificationProvider
      service={fishCircleService}
      accountId={session.status === 'authenticated' ? session.user.id : ''}
    >
      {children}
    </NotificationProvider>
  );
}
