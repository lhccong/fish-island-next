import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { GomokuSocialPort } from '@/domain/gomoku';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { GomokuLobby } from './GomokuLobby';
import { GomokuRoom } from './GomokuRoom';
import { PublicGameChat } from './PublicGameChat';
import type { GomokuController } from './controller';
import styles from './Gomoku.module.css';

const connectionLabel = {
  connecting: '正在连接…',
  connected: '联机已连接',
  reconnecting: '正在重新连接…',
  offline: '网络已离线',
  unauthorized: '登录已过期',
  closed: '联机未连接',
};
export function GomokuWorkspace({
  controller,
  social,
  initialRoom = '',
  onRoomHandled,
  onReconnect,
}: {
  controller: GomokuController;
  social: GomokuSocialPort;
  initialRoom?: string;
  onRoomHandled?: () => void;
  onReconnect: () => void;
}) {
  const s = useStore(controller.store);
  const [inviteState, setInviteState] = useState('');
  const [inviteRoom, setInviteRoom] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [joinPrompt, setJoinPrompt] = useState('');
  const invitation = useRef<AbortController | null>(null);
  const invitationId = useRef<{ roomId: string; id: string } | null>(null);
  const cooldown = useRef(0);
  useEffect(() => () => invitation.current?.abort(), []);
  useEffect(() => {
    if (!initialRoom || s.connection !== 'connected') return;
    if (s.roomId === initialRoom && ['waiting', 'playing', 'finished'].includes(s.phase)) {
      onRoomHandled?.();
      return;
    }
    if (['waiting', 'playing', 'creating', 'joining'].includes(s.phase)) {
      // Keep an active game intact; URL invitations need an explicit choice.
      return;
    }
    controller.join(initialRoom);
    onRoomHandled?.();
  }, [initialRoom, s.connection, s.phase, s.roomId, controller, onRoomHandled]);
  const invite = async () => {
    if (invitation.current) return;
    setInviteRoom(s.roomId);
    if (Date.now() < cooldown.current) {
      setInviteState('邀请已发出，请等待 60 秒后再发送。');
      return;
    }
    const abort = new AbortController();
    if (invitationId.current?.roomId !== s.roomId)
      invitationId.current = { roomId: s.roomId, id: crypto.randomUUID() };
    invitation.current = abort;
    setInviteBusy(true);
    setInviteState('');
    try {
      await social.send(
        `[invite/chess]${s.roomId}[/invite]`,
        abort.signal,
        invitationId.current.id,
      );
      if (!abort.signal.aborted) {
        cooldown.current = Date.now() + 60000;
        invitationId.current = null;
        setInviteState('邀请已发送到公共聊天室');
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setInviteState(e instanceof Error ? e.message : '邀请发送失败，请重试。');
    } finally {
      if (!abort.signal.aborted) {
        invitation.current = null;
        setInviteBusy(false);
      }
    }
  };
  const busy = s.phase === 'creating' || s.phase === 'joining';
  const conflictingInvite =
    initialRoom && initialRoom !== s.roomId && ['waiting', 'playing'].includes(s.phase);
  return (
    <div className={styles.workspace}>
      <div className={styles.topline}>
        <h2>五子棋</h2>
        <span role="status" aria-label="五子棋连接状态" className={styles.connection}>
          {connectionLabel[s.connection]}
        </span>
      </div>
      {s.error && (
        <div role="alert" className={styles.error}>
          {s.error}
          {s.phase === 'interrupted' && (
            <div>
              <Button variant="secondary" onClick={() => controller.leave()}>
                返回大厅
              </Button>
            </div>
          )}
          {s.connection !== 'connected' && (
            <div>
              <Button variant="secondary" onClick={onReconnect}>
                重试连接
              </Button>
            </div>
          )}
        </div>
      )}
      {conflictingInvite && (
        <div className={styles.feedback}>
          收到了房间 {initialRoom} 的邀请。
          <Button variant="secondary" onClick={() => setJoinPrompt(initialRoom)}>
            切换到邀请房间
          </Button>
        </div>
      )}
      <div
        className={styles.gameLayout}
        data-lobby={['lobby', 'creating', 'joining'].includes(s.phase)}
      >
        {['lobby', 'creating', 'joining'].includes(s.phase) ? (
          <>
            <GomokuLobby
              controller={controller}
              busy={busy}
              connected={s.connection === 'connected'}
            />
            {busy && (
              <p role="status" className={styles.feedback}>
                {s.phase === 'creating' ? '正在创建房间…' : '正在加入房间…'}
              </p>
            )}
          </>
        ) : (
          <GomokuRoom
            key={`${s.mode}:${s.roomId}`}
            state={s}
            controller={controller}
            onInvite={() => void invite()}
            inviteBusy={inviteBusy}
            inviteFeedback={inviteRoom === s.roomId ? inviteState : ''}
          />
        )}
        <PublicGameChat port={social} />
      </div>
      <Dialog
        title="切换房间？"
        description="当前本机对局将结束，旧服务不会通知对方离房。"
        open={!!joinPrompt}
        onOpenChange={(open) => {
          if (!open) setJoinPrompt('');
        }}
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setJoinPrompt('')}>
            继续当前对局
          </Button>
          <Button
            onClick={() => {
              controller.leave();
              controller.join(joinPrompt);
              setJoinPrompt('');
              onRoomHandled?.();
            }}
          >
            确认切换
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
