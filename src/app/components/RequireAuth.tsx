import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth';
import styles from '@/app/pages/LoginPage.module.css';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, restore } = useAuth();
  const location = useLocation();
  if (session.status === 'checking')
    return (
      <main className={styles.page}>
        <p role="status">正在恢复登录状态…</p>
      </main>
    );
  if (session.status === 'error')
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>登录状态暂时无法确认</h1>
          <p role="alert">{session.message}</p>
          <button
            className={styles.retry}
            type="button"
            onClick={() => {
              void restore();
            }}
          >
            重试恢复登录
          </button>
          <Link to="/">返回热榜</Link>
        </section>
      </main>
    );
  if (session.status === 'anonymous')
    return (
      <Navigate
        replace
        to={`/user/login?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`}
      />
    );
  return children;
}
