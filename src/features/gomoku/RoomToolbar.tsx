import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import type { GomokuController } from './controller';
import type { GameState } from './game-state';
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
  const [copied, setCopied] = useState<{ mode: 'online' | 'spectator'; text: string } | null>(null);
  const canShareWatch =
    s.mode === 'online' &&
    s.connection === 'connected' &&
    s.spectatable &&
    (s.phase === 'playing' || s.phase === 'finished');
  const copy = async (mode: 'online' | 'spectator') => {
    try {
      const url = new URL('/game/piece', location.origin);
      url.searchParams.set('roomId', s.roomId);
      url.searchParams.set('mode', mode);
      await navigator.clipboard.writeText(url.href);
      setCopied({ mode, text: mode === 'spectator' ? '观战链接已复制' : '邀请链接已复制' });
    } catch {
      setCopied({ mode, text: `复制失败，请手动分享房间号 ${s.roomId}` });
    }
  };
  return (
    <section className={styles.roomToolbar} aria-label="房间信息">
      <div className={styles.roomIdentity}>
        <h3>{s.mode === 'single' ? '单机练习' : s.mode === 'spectator' ? '观战' : '联机房间'}</h3>
        {s.mode !== 'single' && (
          <span>
            房间号 <strong>{s.roomId}</strong>
          </span>
        )}
      </div>
      <div className={styles.actions}>
        {s.phase === 'waiting' && (
          <>
            <Button variant="secondary" onClick={() => void copy('online')}>
              复制邀请链接
            </Button>
            <Button disabled={inviteBusy} onClick={onInvite}>
              {inviteBusy ? (
                <LoadingIndicator compact>{'邀请处理中…'}</LoadingIndicator>
              ) : (
                '邀请聊天室岛友'
              )}
            </Button>
          </>
        )}
        {canShareWatch && (
          <Button variant="secondary" onClick={() => void copy('spectator')}>
            复制观战链接
          </Button>
        )}
        {s.mode === 'spectator' ? (
          <Button variant="secondary" onClick={() => controller.leave()}>
            退出观战
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setExit(true)}>
            {s.mode === 'single' ? '结束练习' : '退出房间'}
          </Button>
        )}
      </div>
      {copied && (copied.mode === 'online' ? s.phase === 'waiting' : canShareWatch) && (
        <p role="status" className={styles.toolbarFeedback}>
          {copied.text}
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
            : s.spectatable
              ? '退出后会关闭房间并结束观战。'
              : '退出将结束本机对局，请先在公共聊天室告知对方。'
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
