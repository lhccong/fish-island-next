import { useLocation, useNavigate } from 'react-router';
import { AccountControl } from '@/features/auth';

export function WorkspaceAccount() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <AccountControl
      onLogin={() => navigate('/user/login', { state: { backgroundLocation: location } })}
    />
  );
}
