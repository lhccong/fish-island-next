import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth';
import { UndercoverWorkspace } from '@/features/undercover';
import { undercoverService, undercoverChannel } from '@/app/config/undercover';
export function UndercoverGame() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <UndercoverWorkspace
      service={undercoverService}
      realtime={undercoverChannel.port}
      user={session.status === 'authenticated' ? session.user : null}
      onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
    />
  );
}
