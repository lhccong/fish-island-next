import { useAuth } from '@/features/auth';
import { WorkTime, useWorkTimeVisibility } from '@/features/account-tools';
export function AccountToolsHost() {
  const { session } = useAuth();
  const visible = useWorkTimeVisibility((state) => state.visible);
  return session.status === 'authenticated' ? <WorkTime visible={visible} /> : null;
}
