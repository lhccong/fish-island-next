import { lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { farmService } from '@/app/config/farm';
import { stockService } from '@/app/config/stock';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui/Button';
import type { GameId } from './game-windows-context';

const FarmWorkspace = lazy(() =>
  import('@/features/farm').then((m) => ({ default: m.FarmWorkspace })),
);
const LifeGame = lazy(() => import('@/features/life').then((m) => ({ default: m.LifeGame })));
const StockWorkspace = lazy(() =>
  import('@/features/stock').then((m) => ({ default: m.StockWorkspace })),
);

export function GameWindowContent({ game }: { game: GameId }) {
  const { session, restore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [detailCode, setDetailCode] = useState<string | null>(null);
  if (game === 'life') return <LifeGame />;
  if (session.status === 'checking') return <p role="status">正在恢复登录状态…</p>;
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
  if (game === 'farm')
    return (
      <FarmWorkspace key={session.user.id} service={farmService} onPet={() => navigate('/pet')} />
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
