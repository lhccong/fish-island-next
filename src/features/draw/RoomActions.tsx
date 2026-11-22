import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState } from 'react';
import type { DrawRoom, DrawPort } from '@/domain/draw';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './Draw.module.css';
type Action = Parameters<DrawPort['action']>[0];
export function RoomActions({
  room,
  userId,
  admin,
  busy,
  saving,
  error,
  onAction,
}: {
  room: DrawRoom;
  userId: string;
  admin: boolean;
  busy: boolean;
  saving: boolean;
  error: string;
  onAction: (name: Action, id: string) => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState<'quit' | 'end' | 'remove' | null>(null);
  const member = room.players.some((p) => p.id === userId);
  const owner = room.creatorId === userId;
  return (
    <>
      <div className={styles.actions}>
        {!member && (
          <Button
            disabled={busy || room.status !== 'WAITING' || room.count >= room.maxPlayers}
            onClick={() => void onAction('join', room.id)}
          >
            加入房间
          </Button>
        )}
        {(owner || admin) && room.status === 'WAITING' && (
          <Button disabled={busy || room.count < 2} onClick={() => void onAction('start', room.id)}>
            开始游戏
          </Button>
        )}
        {(owner || admin || room.drawerId === userId) && room.status === 'PLAYING' && (
          <>
            <Button disabled={busy || saving} onClick={() => void onAction('next-round', room.id)}>
              下一轮
            </Button>
            {(owner || admin) && (
              <Button
                variant="secondary"
                disabled={busy || saving}
                onClick={() => setConfirm('end')}
                aria-label="结束游戏"
              >
                <span className={styles.roomActionFull}>结束游戏</span>
                <span className={styles.roomActionShort}>结束</span>
              </Button>
            )}
          </>
        )}
        {member && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirm('quit')}
            aria-label="退出房间"
          >
            <span className={styles.roomActionFull}>退出房间</span>
            <span className={styles.roomActionShort}>退出</span>
          </Button>
        )}
        {admin && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirm('remove')}
            aria-label="移除房间"
          >
            <span className={styles.roomActionFull}>移除房间</span>
            <span className={styles.roomActionShort}>移除</span>
          </Button>
        )}
      </div>
      <Dialog
        title={
          confirm === 'end'
            ? '结束本局游戏？'
            : confirm === 'remove'
              ? '移除房间？'
              : '退出当前房间？'
        }
        description={
          saving
            ? '退出后未保存的绘画将丢失。房主退出可能关闭房间。'
            : '房主退出可能关闭房间，当前操作以服务端确认为准。'
        }
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setConfirm(null);
        }}
      >
        <div className={styles.actions}>
          <Button
            disabled={busy}
            onClick={() => {
              if (confirm)
                void onAction(confirm, room.id).then((ok) => {
                  if (ok) setConfirm(null);
                });
            }}
          >
            {busy ? <LoadingIndicator compact>{'处理中…'}</LoadingIndicator> : '确认操作'}
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </>
  );
}
