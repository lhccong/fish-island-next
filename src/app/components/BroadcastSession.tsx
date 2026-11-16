import { useAuth } from '@/features/auth';
import { GlobalBroadcast } from '@/features/broadcast';
import { broadcastChannel } from '@/app/config/broadcast';

export function BroadcastSession() {
  const { session } = useAuth();
  return session.status === 'authenticated' ? (
    <GlobalBroadcast key={session.user.id} port={broadcastChannel} />
  ) : null;
}
