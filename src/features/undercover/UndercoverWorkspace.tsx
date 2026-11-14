import { useState } from 'react';
import { ScanFace, Users, Wifi } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { UndercoverPort, UndercoverRealtimePort } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { LocalTable } from './LocalTable';
import { OnlineLobby } from './OnlineLobby';
import styles from './Undercover.module.css';
export function UndercoverWorkspace({
  service,
  realtime,
  user,
  onLogin,
}: {
  service: UndercoverPort;
  realtime: UndercoverRealtimePort;
  user: AuthUser | null;
  onLogin: () => void;
}) {
  const [tab, setTab] = useState<'local' | 'online'>('local');
  const [visited, setVisited] = useState(false);
  return (
    <div className={styles.workspace}>
      <header className={styles.intro}>
        <ScanFace size={40} strokeWidth={1.3} aria-hidden="true" />
        <div>
          <h2>谁是卧底</h2>
          <p>每一句，都有破绽。</p>
        </div>
      </header>
      <nav className={styles.modes} aria-label="谁是卧底玩法">
        <Button
          variant={tab === 'local' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'local'}
          onClick={() => setTab('local')}
        >
          <Users size={16} aria-hidden="true" />
          同屏游戏
        </Button>
        <Button
          variant={tab === 'online' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'online'}
          onClick={() => {
            setTab('online');
            setVisited(true);
          }}
        >
          <Wifi size={16} aria-hidden="true" />
          联机房间
        </Button>
      </nav>
      <section hidden={tab !== 'local'} aria-label="同屏游戏">
        <LocalTable />
      </section>
      <section hidden={tab !== 'online'} aria-label="联机房间">
        {visited &&
          (user ? (
            <OnlineLobby key={user.id} service={service} realtime={realtime} user={user} />
          ) : (
            <div className={styles.panel}>
              <h3>和岛友在线过招</h3>
              <p>登录后创建或加入真实房间，也可以选择同屏游戏直接开始。</p>
              <Button onClick={onLogin}>登录后联机</Button>
            </div>
          ))}
      </section>
    </div>
  );
}
