import { useLocation, useNavigate } from 'react-router';
import { apiBaseUrl } from '@/app/config/api';
import { authController } from '@/app/config/auth';
import { useAuth } from '@/features/auth';
import { TodoPanel } from '@/features/todo';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { createTodoClient } from '@/infrastructure/todo';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './ToolsRoute.module.css';

const vault = createBrowserSessionVault(apiBaseUrl);
const todo = createTodoClient(
  apiBaseUrl,
  () => vault.read(),
  () => void authController.restore(true),
);

export default function TodoTool() {
  const { session, restore } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (session.status === 'authenticated') {
    return <TodoPanel key={session.user.id} service={todo} />;
  }
  if (session.status === 'checking') {
    return (
      <div className={styles.loading}>
        <LoadingIndicator>正在恢复登录状态…</LoadingIndicator>
      </div>
    );
  }
  return (
    <div className={styles.notice}>
      {session.status === 'error' ? (
        <>
          <p role="alert">{session.message}</p>
          <Button variant="secondary" onClick={() => void restore()}>
            重试恢复登录
          </Button>
        </>
      ) : (
        <>
          <p>登录后查看和管理账号待办</p>
          <Button
            onClick={() => {
              const redirect = encodeURIComponent(
                location.pathname + location.search + location.hash,
              );
              void navigate(`/user/login?redirect=${redirect}`, {
                state: { backgroundLocation: location },
              });
            }}
          >
            登录
          </Button>
        </>
      )}
    </div>
  );
}
