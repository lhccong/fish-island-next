import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router';
import { ChatPageHost } from '@/app/components/ChatPageHost';
import { HotBoardPage } from '@/app/pages/HotBoardPage';
import { RequireAuth } from '@/app/components/RequireAuth';
import { RequireAdmin } from '@/app/components/RequireAdmin';
import { adminSections } from '@/app/components/admin-sections';
import { PageLoading } from '@/app/components/PageLoading';
import { ToolsRoute } from '@/app/pages/ToolsRoute';
import { defaultToolPath, tools } from '@/app/config/tools';
import { AuthNotice } from '@/features/auth';
import styles from './AppRoutes.module.css';
import { GameErrorBoundary } from '@/app/components/GameErrorBoundary';
import { GameWindowsProvider } from '@/app/components/GameWindowsProvider';
import { SiteFooter } from '@/app/components/SiteFooter';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
const ForumPage = lazy(() =>
  import('@/app/pages/ForumPage').then((m) => ({ default: m.ForumPage })),
);
const PointsShopPage = lazy(() =>
  import('@/app/pages/PointsShopPage').then((m) => ({ default: m.PointsShopPage })),
);
const AchievementsPage = lazy(() => import('@/app/pages/AchievementsPage'));
const AdminPage = lazy(() =>
  import('@/app/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const AboutPage = lazy(() =>
  import('@/app/pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const DiscoveryPage = lazy(() =>
  import('@/app/pages/DiscoveryPage').then((module) => ({ default: module.DiscoveryPage })),
);
const PetPage = lazy(() =>
  import('@/app/pages/PetPage').then((module) => ({ default: module.PetPage })),
);
const PetCardsDemoPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/app/pages/PetCardsDemoPage').then((module) => ({
        default: module.PetCardsDemoPage,
      })),
    )
  : null;
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
const DrawPage = lazy(() => import('@/app/pages/DrawPage').then((m) => ({ default: m.DrawPage })));
const LandlordsPage = lazy(() =>
  import('@/app/pages/LandlordsPage').then((m) => ({ default: m.LandlordsPage })),
);
const UndercoverPage = lazy(() =>
  import('@/app/pages/UndercoverPage').then((module) => ({ default: module.UndercoverPage })),
);
const StockPage = lazy(() =>
  import('@/app/pages/StockPage').then((module) => ({ default: module.StockPage })),
);
const FarmPage = lazy(() =>
  import('@/app/pages/FarmPage').then((module) => ({ default: module.FarmPage })),
);
const GomokuPage = lazy(() =>
  import('@/app/pages/GomokuPage').then((module) => ({ default: module.GomokuPage })),
);
const LifeGamePage = lazy(() =>
  import('@/app/pages/LifeGamePage').then((module) => ({ default: module.LifeGamePage })),
);
const DarkRoomPage = lazy(() =>
  import('@/app/pages/DarkRoomPage').then((module) => ({ default: module.DarkRoomPage })),
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
      <div className={styles.page} aria-hidden={isLogin ? true : undefined}>
        <ChatPageHost
          active={displayLocation.pathname === '/chat' || displayLocation.pathname === '/chat/mini'}
          standalone={displayLocation.pathname === '/chat/mini'}
        />
        <Suspense fallback={<PageLoading />}>
          <Routes location={displayLocation}>
            <Route path="/" element={<HotBoardPage />} />
            <Route path="/discover" element={<DiscoveryPage />} />
            <Route
              path="/discover/achievements"
              element={
                <RequireAuth>
                  <AchievementsPage />
                </RequireAuth>
              }
            />
            <Route path="/post/*" element={<ForumPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPage section="overview" />
                </RequireAdmin>
              }
            />
            {adminSections.map((s) => (
              <Route
                key={s.id}
                path={s.path}
                element={
                  <RequireAdmin>
                    <AdminPage section={s.id} />
                  </RequireAdmin>
                }
              />
            ))}
            <Route path="/avatarFrames" element={<Navigate to="/utils/avatar-frames" replace />} />
            <Route path="/utils" element={<Navigate to={defaultToolPath} replace />} />
            {tools.map((tool) => (
              <Route key={tool.path} path={tool.path} element={<ToolsRoute tool={tool} />} />
            ))}
            <Route
              path="/utils/avatar-frames"
              element={
                <RequireAuth>
                  <PointsShopPage />
                </RequireAuth>
              }
            />
            <Route path="/about" element={<Navigate to="/rank/reward" replace />} />
            <Route path="/rank" element={<Navigate to="/rank/reward" replace />} />
            <Route path="/rank/about" element={<AboutPage section="about" />} />
            <Route path="/rank/reward" element={<AboutPage section="reward" />} />
            <Route path="/rank/welfare" element={<AboutPage section="welfare" />} />
            <Route path="/rank/other" element={<AboutPage section="other" />} />
            <Route path="/discover/games" element={<GamesPage />} />
            <Route
              path="/game/darkRoom"
              element={
                <GameErrorBoundary>
                  <DarkRoomPage />
                </GameErrorBoundary>
              }
            />
            <Route
              path="/game/undercover"
              element={
                <GameErrorBoundary>
                  <UndercoverPage />
                </GameErrorBoundary>
              }
            />
            <Route
              path="/game/draw/:roomId?"
              element={
                <GameErrorBoundary>
                  <DrawPage />
                </GameErrorBoundary>
              }
            />
            <Route
              path="/game/piece"
              element={
                <RequireAuth>
                  <GameErrorBoundary>
                    <GomokuPage />
                  </GameErrorBoundary>
                </RequireAuth>
              }
            />
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
            {PetCardsDemoPage && <Route path="/pet/cards-demo" element={<PetCardsDemoPage />} />}
            <Route
              path="/point/tournament"
              element={<Navigate to="/pet?challenge=tournament" replace />}
            />
            <Route
              path="/game/tournament"
              element={<Navigate to="/pet?challenge=tournament" replace />}
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
            <Route path="/chat" element={null} />
            <Route path="/chat/mini" element={null} />
            <Route
              path="/moments/fish-circle"
              element={
                <RequireAuth>
                  <FishCirclePage />
                </RequireAuth>
              }
            />
            <Route
              path="/game/landlords/:roomId?"
              element={
                <RequireAuth>
                  <GameErrorBoundary>
                    <LandlordsPage />
                  </GameErrorBoundary>
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
                  <PageFooterOutlet />
                </main>
              }
            />
          </Routes>
        </Suspense>
        <SiteFooter placement="mobile-overlay" showOnMobile={displayLocation.pathname === '/'} />
      </div>
      {isLogin && (
        <Suspense
          fallback={
            <div className={styles.loading}>
              <LoadingIndicator compact>正在打开登录…</LoadingIndicator>
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
