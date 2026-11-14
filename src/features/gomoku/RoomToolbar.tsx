import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import type { GameState, GomokuController } from './controller';
import styles from './Gomoku.module.css';

export function RoomToolbar({
  state: s,
  controller,
  onInvite,
  inviteBusy,
  inviteFeedback,
}: {
  state: GameState;
  controller: GomokuController;
  onInvite: () => void;
  inviteBusy: boolean;
  inviteFeedback: string;
}) {
  const [exit, setExit] = useState(false);
  const [copied, setCopied] = useState('');
  const copy = async () => {
    try {
      const url = new URL('/game/piece', location.origin);
      url.searchParams.set('roomId', s.roomId);
      url.searchParams.set('mode', 'online');
      await navigator.clipboard.writeText(url.href);
      setCopied('邀请链接已复制');
    } catch {
      setCopied(`复制失败，请手动分享房间号 ${s.roomId}`);
    }
  };
  return (
    <section className={styles.roomToolbar} aria-label="房间信息">
      <div className={styles.roomIdentity}>
        <h3>{s.mode === 'single' ? '单机练习' : '联机房间'}</h3>
        {s.mode === 'online' && (
          <span>
            房间号 <strong>{s.roomId}</strong>
          </span>
        )}
      </div>
      <div className={styles.actions}>
        {s.phase === 'waiting' && (
          <>
            <Button variant="secondary" onClick={() => void copy()}>
              复制邀请链接
            </Button>
            <Button disabled={inviteBusy} onClick={onInvite}>
              {inviteBusy ? '邀请处理中…' : '邀请聊天室岛友'}
            </Button>
          </>
        )}
        <Button variant="secondary" onClick={() => setExit(true)}>
          {s.mode === 'single' ? '结束练习' : '退出房间'}
        </Button>
      </div>
      {copied && s.phase === 'waiting' && (
        <p role="status" className={styles.toolbarFeedback}>
          {copied}
        </p>
      )}
      {inviteFeedback && s.phase === 'waiting' && (
        <p role="status" className={styles.toolbarFeedback}>
          {inviteFeedback}
        </p>
      )}
      <Dialog
        open={exit}
        onOpenChange={setExit}
        title={s.mode === 'single' ? '结束练习？' : '退出当前房间？'}
        description={
          s.mode === 'single'
            ? '当前练习不会保存。'
            : '旧版服务不提供离房通知，退出只结束本机对局，对方不会收到通知。请先在公共聊天室告知对方。'
        }
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setExit(false)}>
            继续对局
          </Button>
          <Button
            onClick={() => {
              setExit(false);
              controller.leave();
            }}
          >
            确认退出
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
