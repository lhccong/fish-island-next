import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { RequireAuth } from './RequireAuth';
import { WorkspaceLayout } from './WorkspaceLayout';
import { Button } from '@/shared/ui/Button';
import { useNavigate } from 'react-router';
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  return (
    <RequireAuth>
      {session.status === 'authenticated' &&
        (session.user.role === 'admin' ? (
          children
        ) : (
          <WorkspaceLayout
            hideSidebar
            slots={{
              sidebar: null,
              header: <h1>无法访问管理页</h1>,
              content: (
                <section role="alert">
                  <p>仅管理员可以访问此页面</p>
                  <Button variant="secondary" onClick={() => navigate('/discover')}>
                    返回发现
                  </Button>
                </section>
              ),
            }}
          />
        ))}
    </RequireAuth>
  );
}
