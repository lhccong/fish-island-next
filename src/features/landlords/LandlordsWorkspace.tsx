import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore } from 'react';
import type { LandlordsPort, RankingPort } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Lobby } from './Lobby';
import { Ranking } from './Ranking';
import { RoomChat } from './RoomChat';
import { Table } from './Table';
import { createLandlordsModel } from './model';
import styles from './Landlords.module.css';
export function LandlordsWorkspace({
  port,
  ranking,
  userId,
  roomId,
  onRoom,
}: {
  port: LandlordsPort;
  ranking: RankingPort;
  userId: string;
  roomId: string | null;
  onRoom: (id: string | null) => void;
}) {
  const model = useMemo(() => createLandlordsModel(port, userId), [port, userId]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [leave, setLeave] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const navigate = useEffectEvent(onRoom);
  useEffect(() => model.start((id) => navigate(id)), [model]);
  useEffect(() => {
    model.enter(roomId);
  }, [model, roomId]);
  const busy = Boolean(state.pending) || !state.connected;
  return (
    <div className={styles.workspace}>
      <div className={styles.workspaceHeader}>
        <div>
          <h2>{roomId ? `房间 ${roomId}` : '斗地主'}</h2>
          <span className={styles.muted}>
            {state.connected
              ? roomId
                ? '经典斗地主'
                : '经典模式 · 好友牌桌'
              : '等待账号连接恢复…'}
          </span>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy} onClick={model.sync}>
            同步房间
          </Button>
          {!roomId && (
            <Button variant="secondary" onClick={() => setShowRanking(true)}>
              排行榜
            </Button>
          )}
          {roomId && (
            <Button variant="secondary" disabled={busy} onClick={() => setLeave(true)}>
              离开房间
            </Button>
          )}
        </div>
      </div>
      {state.loading && <p role="status">正在同步牌桌…</p>}
      {state.pending && !state.loading && <p role="status">正在等待服务端确认…</p>}
      {state.error && (
        <div role="alert" className={styles.error}>
          <p>{state.error}</p>
          {roomId && !state.table.roomId && (
            <Button variant="secondary" onClick={() => onRoom(null)}>
              返回大厅
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!state.connected || Boolean(state.pending)}
            onClick={model.sync}
          >
            重试同步
          </Button>
        </div>
      )}
      {roomId ? (
        <div className={styles.roomLayout}>
          <div className={styles.playColumn}>
            <Table
              table={state.table}
              userId={userId}
              pending={Boolean(state.pending)}
              connected={state.connected}
              onAction={model.send}
            />
            {state.notice && <p role="status">{state.notice}</p>}
          </div>
          <RoomChat key={roomId} port={port} userId={userId} roomId={roomId} />
        </div>
      ) : (
        !state.loading && (
          <Lobby
            rooms={state.rooms}
            restriction={state.restriction}
            disabled={busy}
            error={state.error}
            onAction={model.send}
          />
        )
      )}
      <Dialog
        title="离开当前牌桌？"
        description="对局中离开将由服务端开启托管，对局结束前只能返回本房间。"
        open={leave}
        onOpenChange={setLeave}
        showCloseAction={false}
        dismissLabel="关闭离房确认"
      >
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setLeave(false)}>
            继续游戏
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (model.send('gameLeaveRoom')) setLeave(false);
            }}
          >
            确认离开
          </Button>
        </div>
      </Dialog>
      <Dialog
        title="斗地主排行榜"
        description="经典模式战绩"
        open={showRanking}
        onOpenChange={setShowRanking}
        dismissLabel="关闭排行榜"
        showCloseAction={false}
      >
        {showRanking && <Ranking port={ranking} />}
      </Dialog>
    </div>
  );
}
