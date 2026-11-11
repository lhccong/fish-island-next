import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation, type Location } from 'react-router';
import { HotBoardPage } from '@/app/pages/HotBoardPage';
import { RequireAuth } from '@/app/components/RequireAuth';
import { AuthNotice } from '@/features/auth';
import styles from './AppRoutes.module.css';
const LoginPage = lazy(() =>
  import('@/app/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const SsoAuthorizePage = lazy(() =>
  import('@/app/pages/SsoAuthorizePage').then((module) => ({ default: module.SsoAuthorizePage })),
);
const InitializationPage = lazy(() =>
  import('@/app/pages/InitializationPage').then((module) => ({
    default: module.InitializationPage,
  })),
);
const ChatPlaceholderPage = lazy(() =>
  import('@/app/pages/ChatPlaceholderPage').then((module) => ({
    default: module.ChatPlaceholderPage,
  })),
);

export function AppRoutes() {
  const location = useLocation();
  const isLogin = location.pathname === '/user/login';
  const state = location.state as { backgroundLocation?: Location } | null;
  const background = state?.backgroundLocation;
  const displayLocation = isLogin
    ? background && background.pathname !== '/user/login'
      ? background
      : { ...location, pathname: '/', search: '', hash: '', state: null }
    : location;
  return (
    <>
      <div aria-hidden={isLogin ? true : undefined}>
        <Suspense fallback={<p role="status">正在打开页面…</p>}>
          <Routes location={displayLocation}>
            <Route path="/" element={<HotBoardPage />} />
            <Route
              path="/oauth2/authorize"
              element={
                <RequireAuth>
                  <SsoAuthorizePage />
                </RequireAuth>
              }
            />
            <Route
              path="/chat"
              element={
                <RequireAuth>
                  <ChatPlaceholderPage />
                </RequireAuth>
              }
            />
            <Route path="/foundation" element={<InitializationPage />} />
            <Route
              path="*"
              element={
                <main>
                  <h1>页面不存在</h1>
                  <a href="/">返回首页</a>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      {isLogin && (
        <Suspense
          fallback={
            <div className={styles.loading} role="status">
              正在打开登录…
            </div>
          }
        >
          <LoginPage />
        </Suspense>
      )}
      {!isLogin && <AuthNotice />}
    </>
  );
}
