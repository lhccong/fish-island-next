import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UndercoverRoom, UndercoverRealtimePort } from '@/domain/undercover';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { RoomPlayers } from './RoomPlayers';
import { RoomChat } from './RoomChat';
import type { RoomController } from './room-controller';
import styles from './Undercover.module.css';
import roomStyles from './Room.module.css';
export function OnlineRoom({
  room,
  controller,
  pending,
  realtime,
  user,
}: {
  room: UndercoverRoom;
  controller: RoomController;
  pending: boolean;
  realtime: UndercoverRealtimePort;
  user: AuthUser;
}) {
  const [confirm, setConfirm] = useState<'quit' | 'end' | 'remove' | null>(null);
  const [reveal, setReveal] = useState(false);
  const me = room.players.find((p) => p.id === user.id);
  const manager = room.creatorId === user.id || user.role === 'admin';
  const full = room.players.length >= room.maxPlayers;
  return (
    <div className={roomStyles.layout}>
      <section className={styles.panel} aria-label="房间信息">
        <div className={styles.heading}>
          <h3>{room.mode === 2 ? '卧底猜词' : '常规模式'}</h3>
          <span>
            {{ WAITING: '等待开始', PLAYING: '游戏进行中', ENDED: '游戏已结束' }[room.status]}
          </span>
        </div>
        <p>
          {room.creatorName}的房间 · {room.players.length}/{room.maxPlayers} 人
        </p>
        {room.status === 'PLAYING' && me && (
          <div className={roomStyles.word}>
            {reveal ? (
              <>
                <small>
                  {room.role
                    ? `你的身份：${room.role === 'undercover' ? '卧底' : '平民'}`
                    : '你的词语'}
                </small>
                <strong>{room.word || '等待服务端分配'}</strong>
                <Button variant="secondary" onClick={() => setReveal(false)}>
                  收起词语
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setReveal(true)}>
                查看我的词语
              </Button>
            )}
          </div>
        )}
        {room.result && (
          <p role="status" className={styles.notice}>
            {room.result}
          </p>
        )}
        <div className={roomStyles.toolbar}>
          {!me && room.status === 'WAITING' && (
            <Button
              disabled={pending || full}
              onClick={() => void controller.action('join', room.id)}
            >
              {full ? '房间已满' : '加入房间'}
            </Button>
          )}
          {manager && room.status === 'WAITING' && (
            <Button
              disabled={pending || room.players.length < 3}
              onClick={() => void controller.action('start', room.id)}
            >
              开始游戏
            </Button>
          )}
          {manager && room.status === 'PLAYING' && (
            <Button variant="secondary" disabled={pending} onClick={() => setConfirm('end')}>
              结算本轮
            </Button>
          )}
          {me && room.status !== 'ENDED' && (
            <Button variant="secondary" disabled={pending} onClick={() => setConfirm('quit')}>
              退出房间
            </Button>
          )}
          {user.role === 'admin' && (
            <Button variant="secondary" disabled={pending} onClick={() => setConfirm('remove')}>
              移除房间
            </Button>
          )}
        </div>
        <RoomPlayers room={room} userId={user.id} pending={pending} controller={controller} />
        <details className={styles.rules}>
          <summary>联机规则</summary>
          <p>
            至少 3
            人开始，卧底人数由服务端分配。按房间通知轮流描述，投票与结算由服务端确认；平票无人出局。常规模式不公开身份；猜词模式卧底有
            3 次机会，猜中即获胜。
          </p>
          <p>关闭页面不会自动退出房间。房主退出可能解散房间或移交房主，请留意服务端结果。</p>
        </details>
      </section>
      <RoomChat key={room.id} room={room} realtime={realtime} user={user} />
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(null);
        }}
        title={
          confirm === 'quit' ? '退出房间？' : confirm === 'remove' ? '移除房间？' : '立即结算本轮？'
        }
        description={
          confirm === 'quit'
            ? '进行中的退出会影响当前对局，房主退出可能解散房间。'
            : confirm === 'remove'
              ? '管理员移除后，房间内所有玩家将无法继续本局。'
              : '将按当前票数结算，未投票的玩家也会进入下一阶段。'
        }
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" disabled={pending} onClick={() => setConfirm(null)}>
            取消
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              if (confirm && (await controller.action(confirm, room.id))) setConfirm(null);
            }}
          >
            {pending ? '正在处理…' : '确认'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
