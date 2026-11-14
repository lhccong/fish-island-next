import { useEffect, useRef, useState } from 'react';
import { RefreshCw, LayoutGrid } from 'lucide-react';
import type { DrawPort, DrawRealtimePort, DrawIdentity, DrawSettings } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';

import { ScrollArea } from '@/shared/ui/ScrollArea';
import { RoomDirectory } from './RoomDirectory';
import { CreateRoom } from './CreateRoom';
import { DrawCanvas } from './DrawCanvas';
import { GuessComposer } from './GuessComposer';
import { RoomActions } from './RoomActions';
import { RoomActivity } from './RoomActivity';
import { RoundClock } from './RoundClock';
import { useDrawRoom } from './useDrawRoom';
import styles from './Draw.module.css';
const statusLabels = { WAITING: '等待开始', PLAYING: '正在绘画', ENDED: '已结束' };
export function DrawWorkspace({
  service,
  realtime,
  user,
  roomId,
  onRoom,
  onLogin,
}: {
  service: DrawPort;
  realtime: DrawRealtimePort;
  user: DrawIdentity | null;
  roomId: string | null;
  onRoom: (id: string | null) => void;
  onLogin: () => void;
}) {
  const data = useDrawRoom(service, realtime, roomId, user?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const controller = useRef(new AbortController());
  useEffect(() => {
    const next = new AbortController();
    controller.current = next;
    return () => next.abort();
  }, [user?.id, roomId]);
  async function run(work: () => Promise<void>) {
    if (busy) return false;
    setBusy(true);
    setError('');
    try {
      await work();
      if (!controller.current.signal.aborted) data.refresh();
      return true;
    } catch (e) {
      if (!controller.current.signal.aborted)
        setError(e instanceof Error ? e.message : '操作失败，请重试');
      return false;
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  async function create(settings: DrawSettings) {
    return run(async () => {
      const id = await service.create(settings, controller.current.signal);
      onRoom(id);
    });
  }
  async function action(
    name: 'join' | 'quit' | 'start' | 'end' | 'next-round' | 'remove',
    id: string,
  ) {
    const ok = await run(async () => {
      await service.action(name, id, controller.current.signal);
    });
    if (ok) {
      if (name === 'join') onRoom(id);
      if (name === 'quit' || name === 'remove') onRoom(null);
    }
    return ok;
  }
  if (!user)
    return (
      <div className={styles.empty}>
        <h2>你来画，我来猜</h2>
        <p>登录后创建房间，和岛友一起接力绘画。</p>
        <Button onClick={onLogin}>登录后开始</Button>
      </div>
    );
  const room = data.room;
  const member = room?.players.some((p) => p.id === user.id);

  const drawing = room?.drawerId === user.id && room.status === 'PLAYING' && member;
  return (
    <div className={styles.workspace} data-view={roomId ? 'room' : 'lobby'}>
      <div className={styles.top}>
        <div className={styles.roomHeading}>
          <h2>{room ? `${room.creatorName}的画室` : '一起画点有趣的'}</h2>
          <p title={room ? `房间 ${room.id} · ${statusLabels[room.status]}` : undefined}>
            {room
              ? `房间 ${room.id} · ${statusLabels[room.status]}`
              : '一人画，大家猜。让灵感在岛友之间接力。'}
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={busy || data.status === 'loading'}
            onClick={data.refresh}
            aria-label="刷新房间"
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span className={styles.controlLabel}>刷新房间</span>
          </Button>
          {!roomId && <CreateRoom busy={busy} error={error} onCreate={create} />}
          {roomId && (
            <Button variant="secondary" onClick={() => onRoom(null)} aria-label="房间列表">
              <LayoutGrid size={15} aria-hidden="true" />
              <span className={styles.controlLabel}>房间列表</span>
            </Button>
          )}
        </div>
      </div>
      {data.status === 'loading' && <p role="status">正在同步房间…</p>}
      {data.error && (
        <div className={styles.feedback} role="alert">
          {data.error}
          <Button variant="secondary" onClick={data.refresh}>
            重试同步
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!roomId && (
        <RoomDirectory
          rooms={data.rooms}
          status={data.status}
          busy={busy}
          onRoom={onRoom}
          onJoin={(id) => void action('join', id)}
        />
      )}
      {roomId && data.status === 'ready' && !room && (
        <div className={styles.empty}>
          <h3>房间已关闭或不存在</h3>
          <Button onClick={() => onRoom(null)}>返回房间列表</Button>
        </div>
      )}
      {room && (
        <>
          <div className={styles.round}>
            <div className={styles.roundInfo}>
              <span>
                {room.status === 'ENDED' ? '本局结束' : `第 ${room.round || 0} / ${room.rounds} 轮`}
              </span>
              <strong>
                {room.status === 'WAITING'
                  ? '等待玩家就位'
                  : drawing
                    ? `你的题目：${room.word || '等待题目'}`
                    : room.status === 'ENDED'
                      ? `答案：${room.word || '本局已结束'}`
                      : `提示：${room.hint || '看画猜词'}`}
              </strong>
              <span>
                {room.status === 'PLAYING'
                  ? `${room.drawerName || '画家'} 正在绘画`
                  : room.status === 'ENDED'
                    ? '本局得分已结算'
                    : '至少两人即可开始'}
              </span>
            </div>
            <div className={styles.roundControls}>
              <RoundClock endTime={room.status === 'PLAYING' ? room.endTime : 0} />
              <RoomActions
                room={room}
                userId={user.id}
                admin={user.role === 'admin'}
                busy={busy}
                saving={saving}
                error={error}
                onAction={action}
              />
            </div>
          </div>
          <div className={styles.game}>
            <DrawCanvas
              key={`${room.id}:${room.round}:${room.drawerId}`}
              service={service}
              roomId={room.id}
              image={room.image}
              editable={Boolean(drawing)}
              onSaved={data.refresh}
              onPending={setSaving}
            />
            <aside className={styles.side}>
              <section className={styles.panel}>
                <h3>
                  玩家 · {room.count}/{room.maxPlayers}
                </h3>
                <ul className={styles.players}>
                  {room.players.map((p) => (
                    <li
                      key={p.id}
                      data-drawing={p.id === room.drawerId && room.status === 'PLAYING'}
                    >
                      <span className={styles.playerIdentity}>
                        <span className={styles.playerAvatar} aria-hidden="true">
                          {Array.from(p.name)[0]}
                        </span>
                        <span>
                          {p.name}
                          <small>
                            {p.id === room.drawerId && room.status === 'PLAYING'
                              ? '绘画中'
                              : p.correct
                                ? '已猜中'
                                : p.id === room.creatorId
                                  ? '房主'
                                  : '猜词中'}
                          </small>
                        </span>
                      </span>
                      <strong>{p.score} 分</strong>
                    </li>
                  ))}
                </ul>
              </section>
              <section className={`${styles.panel} ${styles.guesses}`}>
                <h3>猜词记录</h3>
                <div className={styles.records}>
                  <ScrollArea label="猜词记录" gutter="reserved">
                    <div className={styles.recordContent}>
                      {data.guesses.length ? (
                        data.guesses.map((g) => (
                          <p key={g.id}>
                            <span>{g.name}</span> {g.correct ? '猜对了！' : g.word}
                          </p>
                        ))
                      ) : (
                        <p>还没有人猜词，看看画布上的线索。</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <GuessComposer
                  key={room.id}
                  service={service}
                  roomId={room.id}
                  user={user}
                  getSignal={() => controller.current.signal}
                  disabled={!member || room.status !== 'PLAYING' || busy}
                  onSent={data.refresh}
                />
              </section>
              <RoomActivity key={room.id} realtime={realtime} roomId={room.id} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
