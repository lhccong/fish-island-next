import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/Button';
import { DrawWorkspace } from '@/features/draw';
import { drawService, drawChannel } from '@/app/config/draw';
export function DrawGame({
  roomId,
  onRoom,
}: {
  roomId?: string | null;
  onRoom?: (id: string | null) => void;
}) {
  const { session, restore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localRoom, setLocalRoom] = useState<string | null>(null);
  if (session.status === 'checking') return <p role="status">正在恢复登录状态…</p>;
  if (session.status === 'error')
    return (
      <div role="alert">
        <p>{session.message}</p>
        <Button onClick={() => void restore()}>重试恢复登录</Button>
      </div>
    );
  return (
    <DrawWorkspace
      key={`${session.status === 'authenticated' ? session.user.id : 'guest'}:${roomId === undefined ? (localRoom ?? 'lobby') : (roomId ?? 'lobby')}`}
      service={drawService}
      realtime={drawChannel.port}
      user={session.status === 'authenticated' ? session.user : null}
      roomId={roomId === undefined ? localRoom : roomId}
      onRoom={onRoom ?? setLocalRoom}
      onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
    />
  );
}
