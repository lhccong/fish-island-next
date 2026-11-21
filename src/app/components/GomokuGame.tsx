import { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { gomokuController, gomokuSocial } from '@/app/config/gomoku';
import { chatRealtime } from '@/app/config/chat';
import { GomokuWorkspace } from '@/features/gomoku';
import { useAuth } from '@/features/auth';
import { GameInvitation } from '@/features/chat';
import { accountTools } from '@/app/config/account-tools';

const renderInvitation = (roomId: string) => <GameInvitation game="chess" roomId={roomId} />;

export function GomokuGame() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const room = location.pathname === '/game/piece' ? (params.get('roomId') ?? '') : '';
  const mode = params.get('mode');
  const handled = useCallback(() => {
    setParams({}, { replace: true });
  }, [setParams]);
  if (session.status !== 'authenticated') return null;
  return (
    <GomokuWorkspace
      key={session.user.id}
      controller={gomokuController}
      user={session.user}
      profiles={accountTools}
      social={gomokuSocial}
      initialRoom={room}
      initialIntent={mode === 'spectator' ? 'watch' : mode === 'join' ? 'join' : 'enter'}
      renderInvitation={renderInvitation}
      onRoomHandled={handled}
      onReconnect={() => chatRealtime.retry()}
    />
  );
}
