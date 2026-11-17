import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { farmService } from '@/app/config/farm';
import { petService } from '@/app/config/pet';
import { stockService } from '@/app/config/stock';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/Button';
import type { GameId } from './game-windows-context';
import { useGameWindows } from './game-windows-context';

const FarmWorkspace = lazy(() =>
  import('@/features/farm').then((m) => ({ default: m.FarmWorkspace })),
);
const PetWorkspace = lazy(() =>
  import('@/features/pet').then((m) => ({ default: m.PetWorkspace })),
);
const LifeGame = lazy(() => import('@/features/life').then((m) => ({ default: m.LifeGame })));
const StockWorkspace = lazy(() =>
  import('@/features/stock').then((m) => ({ default: m.StockWorkspace })),
);
const GomokuGame = lazy(() => import('./GomokuGame').then((m) => ({ default: m.GomokuGame })));
const DrawGame = lazy(() => import('./DrawGame').then((m) => ({ default: m.DrawGame })));
const LandlordsGame = lazy(() =>
  import('./LandlordsGame').then((m) => ({ default: m.LandlordsGame })),
);
const UndercoverGame = lazy(() =>
  import('./UndercoverGame').then((m) => ({ default: m.UndercoverGame })),
);

export function GameWindowContent({ game }: { game: GameId }) {
  const { session, restore, refreshUser } = useAuth();
  const open = useGameWindows();
  const navigate = useNavigate();
  const location = useLocation();
  const [detailCode, setDetailCode] = useState<string | null>(null);
  if (game === 'life') return <LifeGame />;
  if (game === 'draw') return <DrawGame />;
  if (game === 'undercover') return <UndercoverGame />;
  if (session.status === 'checking') return <LoadingIndicator>正在恢复登录状态…</LoadingIndicator>;
  if (session.status === 'error')
    return (
      <div role="alert">
        <p>{session.message}</p>
        <Button onClick={() => void restore()}>重试恢复登录</Button>
      </div>
    );
  if (session.status !== 'authenticated')
    return (
      <div>
        <p>登录后继续游戏，进度保存在账号中。</p>
        <Button
          onClick={() => navigate('/user/login', { state: { backgroundLocation: location } })}
        >
          登录后继续
        </Button>
      </div>
    );
  if (game === 'gomoku') return <GomokuGame />;
  if (game === 'landlords') return <LandlordsGame />;
  if (game === 'farm')
    return <FarmWorkspace key={session.user.id} service={farmService} onPet={() => open('pet')} />;
  if (game === 'pet')
    return (
      <PetWorkspace
        key={session.user.id}
        service={petService}
        userId={session.user.id}
        points={
          session.user.points === undefined
            ? undefined
            : session.user.points - (session.user.usedPoints ?? 0)
        }
        onLotterySettled={refreshUser}
      />
    );
  return (
    <StockWorkspace
      key={session.user.id}
      service={stockService}
      detailCode={detailCode}
      onDetail={setDetailCode}
      onBack={() => setDetailCode(null)}
    />
  );
}
