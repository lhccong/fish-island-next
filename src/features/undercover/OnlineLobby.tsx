import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import type { AuthUser } from '@/domain/auth';
import type { UndercoverPort, UndercoverRealtimePort } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { createRoomController } from './room-controller';
import { CreateRoomDialog } from './CreateRoomDialog';
import { OnlineRoom } from './OnlineRoom';
import styles from './Undercover.module.css';
import roomStyles from './Room.module.css';
export function OnlineLobby({
  service,
  realtime,
  user,
}: {
  service: UndercoverPort;
  realtime: UndercoverRealtimePort;
  user: AuthUser;
}) {
  const [controller] = useState(() => createRoomController(service, realtime, user.id));
  const state = useStore(controller.store);
  const [create, setCreate] = useState(false);
  const [joinId, setJoinId] = useState('');
  useEffect(() => controller.start(), [controller]);
  const membership = state.rooms.find(
    (r) => r.status !== 'ENDED' && r.players.some((p) => p.id === user.id),
  );
  return (
    <div>
      <div className={styles.heading}>
        <h3>{state.activeId ? `房间 ${state.activeId}` : '房间大厅'}</h3>
        <div className={roomStyles.toolbar}>
          {state.activeId && (
            <Button
              variant="secondary"
              onClick={() => controller.select(null)}
              disabled={state.pending}
            >
              返回大厅
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={state.status === 'loading'}
            onClick={() => void controller.refresh()}
          >
            刷新房间
          </Button>
          {!state.activeId && (
            <Button disabled={!!membership || state.pending} onClick={() => setCreate(true)}>
              创建房间
            </Button>
          )}
        </div>
      </div>
      {state.status === 'loading' && (
        <p role="status" className={styles.notice}>
          正在同步房间…
        </p>
      )}
      {state.error && (
        <div role="alert" className={styles.notice}>
          <p>{state.error}</p>
          <Button variant="secondary" onClick={() => void controller.refresh()}>
            重试同步
          </Button>
        </div>
      )}
      {state.actionError && (
        <p role="alert" className={styles.error}>
          {state.actionError}
        </p>
      )}
      {state.notice && (
        <p role="status" className={styles.notice}>
          {state.notice}
        </p>
      )}
      {state.room ? (
        <OnlineRoom
          room={state.room}
          controller={controller}
          pending={state.pending || state.status !== 'ready'}
          realtime={realtime}
          user={user}
        />
      ) : (
        !state.activeId && (
          <div className={styles.panel}>
            <form
              className={roomStyles.join}
              onSubmit={(e) => {
                e.preventDefault();
                if (joinId.trim()) controller.select(joinId.trim());
              }}
            >
              <label className={styles.field}>
                通过房间号查找
                <input
                  aria-label="房间号"
                  value={joinId}
                  maxLength={100}
                  pattern="[A-Za-z0-9_-]+"
                  required
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="输入好友分享的房间号"
                />
              </label>
              <Button type="submit" variant="secondary" disabled={state.pending}>
                查找房间
              </Button>
            </form>
            {membership && (
              <p className={styles.notice}>
                你已在房间 {membership.id} 中。
                <Button variant="secondary" onClick={() => controller.select(membership.id)}>
                  回到我的房间
                </Button>
              </p>
            )}
            {state.status === 'ready' && !state.rooms.length && (
              <div className={roomStyles.empty}>
                <h3>还没有房间</h3>
                <p>创建一个房间，邀请朋友来过招。</p>
                <Button onClick={() => setCreate(true)}>创建第一个房间</Button>
              </div>
            )}
            <ul className={roomStyles.roomList}>
              {state.rooms.map((room) => (
                <li key={room.id}>
                  <div>
                    <strong>{room.creatorName}的房间</strong>
                    <p>
                      {room.mode === 2 ? '卧底猜词' : '常规模式'} · {room.players.length}/
                      {room.maxPlayers} 人 ·{' '}
                      {{ WAITING: '等待加入', PLAYING: '游戏中', ENDED: '已结束' }[room.status]}
                    </p>
                    <small>房间号 {room.id}</small>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={state.pending}
                    onClick={() => controller.select(room.id)}
                  >
                    查看房间
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
      <CreateRoomDialog open={create} onOpenChange={setCreate} controller={controller} />
    </div>
  );
}
