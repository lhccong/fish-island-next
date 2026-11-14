import { PencilLine, UsersRound } from 'lucide-react';
import type { DrawRoom } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import styles from './Draw.module.css';
export function RoomDirectory({
  rooms,
  status,
  busy,
  onRoom,
  onJoin,
}: {
  rooms: DrawRoom[];
  status: string;
  busy: boolean;
  onRoom: (id: string) => void;
  onJoin: (id: string) => void;
}) {
  if (status === 'loading') return null;
  return (
    <div className={styles.rooms}>
      {rooms.length === 0 && status === 'ready' && (
        <div className={styles.empty}>
          <PencilLine className={styles.emptyIcon} size={44} strokeWidth={1.3} aria-hidden="true" />
          <h3>还没有房间</h3>
          <p>创建第一间画室，等岛友加入。</p>
        </div>
      )}
      {rooms.map((r) => (
        <article className={styles.roomCard} key={r.id}>
          <span className={styles.roomMeta}>
            <UsersRound size={14} aria-hidden="true" />
            {{ WAITING: '等待开始', PLAYING: '正在绘画', ENDED: '已结束' }[r.status]} · {r.count}/
            {r.maxPlayers} 人
          </span>
          <h3>{r.creatorName}的画室</h3>
          <p>
            {r.creatorOnly ? '房主绘画' : '轮流绘画'} · {r.rounds} 轮
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => onRoom(r.id)}>
              查看房间
            </Button>
            <Button
              disabled={busy || r.status !== 'WAITING' || r.count >= r.maxPlayers}
              onClick={() => onJoin(r.id)}
            >
              加入房间
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
