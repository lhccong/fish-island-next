import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router';
import { HotBoardPage } from '@/app/pages/HotBoardPage';
import { RequireAuth } from '@/app/components/RequireAuth';
import { PageLoading } from '@/app/components/PageLoading';
import { AuthNotice } from '@/features/auth';
import styles from './AppRoutes.module.css';
import { GameErrorBoundary } from '@/app/components/GameErrorBoundary';
import { GameWindowsProvider } from '@/app/components/GameWindowsProvider';
const AboutPage = lazy(() =>
  import('@/app/pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const DiscoveryPage = lazy(() =>
  import('@/app/pages/DiscoveryPage').then((module) => ({ default: module.DiscoveryPage })),
);
const PetPage = lazy(() =>
  import('@/app/pages/PetPage').then((module) => ({ default: module.PetPage })),
);
const ReaderPage = lazy(() =>
  Promise.all([import('@/app/pages/ReaderPage'), import('@/app/components/GlobalReader')]).then(
    ([module]) => ({ default: module.ReaderPage }),
  ),
);
const GlobalReader = lazy(() =>
  import('@/app/components/GlobalReader').then((module) => ({ default: module.GlobalReader })),
);
const GamesPage = lazy(() =>
  import('@/app/pages/GamesPage').then((module) => ({ default: module.GamesPage })),
);
const StockPage = lazy(() =>
  import('@/app/pages/StockPage').then((module) => ({ default: module.StockPage })),
);
const FarmPage = lazy(() =>
  import('@/app/pages/FarmPage').then((module) => ({ default: module.FarmPage })),
);
const LifeGamePage = lazy(() =>
  import('@/app/pages/LifeGamePage').then((module) => ({ default: module.LifeGamePage })),
);
const FishCirclePage = lazy(() =>
  import('@/app/pages/FishCirclePage').then((module) => ({ default: module.FishCirclePage })),
);
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
  const [readerEnabled, setReaderEnabled] = useState(false);
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
    <GameWindowsProvider>
      <div aria-hidden={isLogin ? true : undefined}>
        <Suspense fallback={<PageLoading />}>
          <Routes location={displayLocation}>
            <Route path="/" element={<HotBoardPage />} />
            <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/about" element={<Navigate to="/rank/reward" replace />} />
            <Route path="/rank" element={<Navigate to="/rank/reward" replace />} />
            <Route path="/rank/about" element={<AboutPage section="about" />} />
            <Route path="/rank/reward" element={<AboutPage section="reward" />} />
            <Route path="/rank/welfare" element={<AboutPage section="welfare" />} />
            <Route path="/rank/other" element={<AboutPage section="other" />} />
            <Route path="/discover/games" element={<GamesPage />} />
            <Route
              path="/game/farm"
              element={
                <RequireAuth>
                  <FarmPage />
                </RequireAuth>
              }
            />
            <Route
              path="/game/stock/:indexCode?"
              element={
                <RequireAuth>
                  <StockPage />
                </RequireAuth>
              }
            />
            <Route
              path="/pet"
              element={
                <RequireAuth>
                  <PetPage />
                </RequireAuth>
              }
            />
            <Route path="/reader" element={<ReaderPage onOpen={() => setReaderEnabled(true)} />} />
            <Route
              path="/game/life"
              element={
                <GameErrorBoundary>
                  <LifeGamePage />
                </GameErrorBoundary>
              }
            />
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
            <Route
              path="/moments/fish-circle"
              element={
                <RequireAuth>
                  <FishCirclePage />
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
      {readerEnabled && (
        <Suspense fallback={null}>
          <GlobalReader />
        </Suspense>
      )}
    </GameWindowsProvider>
  );
}
