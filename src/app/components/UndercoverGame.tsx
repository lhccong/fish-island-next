import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/features/auth';
import { UndercoverWorkspace } from '@/features/undercover';
import { undercoverService, undercoverChannel } from '@/app/config/undercover';
export function UndercoverGame() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const requestedRoom = params.get('roomId') ?? '';
  const initialRoom = /^[a-z0-9_-]{1,100}$/i.test(requestedRoom) ? requestedRoom : null;
  return (
    <UndercoverWorkspace
      service={undercoverService}
      realtime={undercoverChannel.port}
      initialRoom={initialRoom}
      user={session.status === 'authenticated' ? session.user : null}
      onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
    />
  );
}
