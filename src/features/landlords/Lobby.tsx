import { useState } from 'react';
import type { Room } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './Landlords.module.css';
export function Lobby({
  rooms,
  restriction,
  disabled,
  error,
  onAction,
}: {
  rooms: Room[];
  restriction: string;
  disabled: boolean;
  error: string;
  onAction: (command: string, body?: Record<string, unknown>) => void;
}) {
  const [join, setJoin] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  return (
    <>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>♠ ♥ ♣ ♦</span>
          <h2>三人一桌，好牌慢打。</h2>
          <p>经典斗地主，和岛友切磋牌技。</p>
        </div>
        <div className={styles.actions}>
          <Button
            disabled={disabled}
            onClick={() => onAction('gameCreateRoom', { gameType: 'LANDLORDS_CLASSIC' })}
          >
            创建房间
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              setRoomId('');
              setPassword('');
              setJoin(true);
            }}
          >
            通过房号加入
          </Button>
        </div>
      </section>
      {restriction && (
        <div className={styles.row}>
          <p>你还有一场未结束的对局</p>
          <Button
            disabled={disabled}
            onClick={() => onAction('gameJoinRoom', { roomId: restriction })}
          >
            返回进行中的房间
          </Button>
        </div>
      )}
      <h3>
        牌友房间 <small>{rooms.length} 桌</small>
      </h3>
      {rooms.length ? (
        <div className={styles.roomGrid}>
          {rooms.map((r) => (
            <article className={styles.room} key={r.id}>
              <div className={styles.row}>
                <h3>房间 {r.id}</h3>
                <span>
                  {r.count} / {r.max} 人
                </span>
              </div>
              {r.players.length ? (
                <ul className={styles.roomPlayers}>
                  {r.players.map((p) => (
                    <li key={p.id} className={styles.playerIdentity}>
                      <UserAvatar name={p.name} src={p.avatar} />
                      <span>{p.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>等待牌友加入</p>
              )}
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={() => {
                  if (r.locked) {
                    setRoomId(r.id);
                    setPassword('');
                    setJoin(true);
                  } else onAction('gameJoinRoom', { roomId: r.id });
                }}
              >
                {r.locked ? '输入密码加入' : '加入房间'}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>还没有房间</h3>
          <p>创建一桌，邀请两位牌友一起玩。</p>
        </div>
      )}
      <Dialog
        title="加入斗地主房间"
        description="输入牌友分享的房号；仅加密房间需要密码。"
        open={join}
        onOpenChange={setJoin}
        dismissLabel="关闭加入房间"
        showCloseAction={false}
      >
        <ScrollArea label="加入房间表单" gutter="reserved">
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (!roomId.trim()) return;
              onAction('gameJoinRoom', { roomId: roomId.trim(), password });
            }}
          >
            <label>
              房号
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={100}
                required
                autoComplete="off"
              />
            </label>
            <label>
              房间密码
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
            </label>
            <div className={styles.actions}>
              <Button type="submit" disabled={disabled || !roomId.trim()}>
                加入房间
              </Button>
            </div>
          </form>
        </ScrollArea>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </Dialog>
    </>
  );
}
