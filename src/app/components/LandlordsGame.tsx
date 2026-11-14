import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { LandlordsWorkspace } from '@/features/landlords';
import { landlordsChannel, landlordsRanking } from '@/app/config/landlords';
export function LandlordsGame({
  roomId,
  onRoom,
}: {
  roomId?: string | null;
  onRoom?: (id: string | null) => void;
}) {
  const { session } = useAuth();
  const [localRoom, setLocalRoom] = useState<string | null>(null);
  if (session.status !== 'authenticated') return <p>登录后进入斗地主。</p>;
  return (
    <LandlordsWorkspace
      key={session.user.id}
      port={landlordsChannel.port}
      ranking={landlordsRanking}
      userId={session.user.id}
      roomId={roomId === undefined ? localRoom : roomId}
      onRoom={onRoom ?? setLocalRoom}
    />
  );
}
