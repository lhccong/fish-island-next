import { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { gomokuController, gomokuSocial } from '@/app/config/gomoku';
import { chatRealtime } from '@/app/config/chat';
import { GomokuWorkspace } from '@/features/gomoku';
import { useAuth } from '@/features/auth';

export function GomokuGame() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const room = location.pathname === '/game/piece' ? (params.get('roomId') ?? '') : '';
  const handled = useCallback(() => {
    setParams({}, { replace: true });
  }, [setParams]);
  if (session.status !== 'authenticated') return null;
  return (
    <GomokuWorkspace
      key={session.user.id}
      controller={gomokuController}
      social={gomokuSocial}
      initialRoom={room}
      onRoomHandled={handled}
      onReconnect={() => chatRealtime.retry()}
    />
  );
}
