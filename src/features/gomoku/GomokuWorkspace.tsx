import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { GomokuSocialPort } from '@/domain/gomoku';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
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
type RoomIntent = 'enter' | 'join' | 'watch';

export function GomokuWorkspace({
  controller,
  social,
  initialRoom = '',
  initialIntent = 'enter',
  renderInvitation,
  onRoomHandled,
  onReconnect,
  user,
  profiles,
}: {
  controller: GomokuController;
  social: GomokuSocialPort;
  initialRoom?: string;
  initialIntent?: RoomIntent;
  renderInvitation: (roomId: string) => ReactNode;
  onRoomHandled?: () => void;
  onReconnect: () => void;
  user: Pick<AuthUser, 'name' | 'avatarUrl'>;
  profiles: Pick<UserCardPort, 'userCard'>;
}) {
  const s = useStore(controller.store);
  const [inviteState, setInviteState] = useState('');
  const [inviteRoom, setInviteRoom] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [joinPrompt, setJoinPrompt] = useState<{ roomId: string; intent: RoomIntent } | null>(null);
  const invitation = useRef<AbortController | null>(null);
  const invitationId = useRef<{ roomId: string; id: string } | null>(null);
  const cooldown = useRef(0);
  const sameRoom = s.roomId === initialRoom;
  const busy = ['creating', 'joining', 'loading-watch'].includes(s.phase);
  const active = s.phase === 'waiting' || s.phase === 'playing';
  const lobby = s.phase === 'lobby' || busy;
  const initialSpectator = initialIntent === 'watch';
  useEffect(() => () => invitation.current?.abort(), []);
  useEffect(() => {
    if (!initialRoom || s.connection !== 'connected') return;
    if (sameRoom && (active || s.phase === 'finished')) {
      onRoomHandled?.();
      return;
    }
    if (active || busy) return;
    controller[initialIntent](initialRoom);
    onRoomHandled?.();
  }, [
    initialRoom,
    initialIntent,
    s.connection,
    s.phase,
    sameRoom,
    active,
    busy,
    controller,
    onRoomHandled,
  ]);
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
  const conflictingInvite = initialRoom && !sameRoom && active;
  return (
    <div className={styles.workspace}>
      <div className={styles.topline}>
        <h2>五子棋</h2>
        <span role="status" aria-label="五子棋连接状态" className={styles.connection}>
          {s.connection === 'connecting' || s.connection === 'reconnecting' ? (
            <LoadingIndicator compact>{connectionLabel[s.connection]}</LoadingIndicator>
          ) : (
            connectionLabel[s.connection]
          )}
        </span>
      </div>
      {s.error && (
        <div role="alert" className={styles.error}>
          {s.error}
          {s.phase === 'interrupted' && (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => controller.leave()}>
                返回大厅
              </Button>
              {s.mode === 'spectator' && s.spectatable && s.connection === 'connected' && (
                <Button onClick={() => controller.watch(s.roomId)}>重新观战</Button>
              )}
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
          收到了房间 {initialRoom} 的{initialSpectator ? '观战链接' : '邀请'}。
          <Button
            variant="secondary"
            onClick={() => setJoinPrompt({ roomId: initialRoom, intent: initialIntent })}
          >
            {initialSpectator ? '切换到观战房间' : '切换到邀请房间'}
          </Button>
        </div>
      )}
      <div
        className={styles.gameLayout}
        data-lobby={lobby}
        data-spectator={!lobby && s.mode === 'spectator'}
      >
        {lobby ? (
          <>
            <GomokuLobby
              controller={controller}
              busy={busy}
              connected={s.connection === 'connected'}
              requestedRoom={s.roomId || initialRoom}
            />
            {busy && (
              <div className={styles.feedback}>
                <LoadingIndicator>
                  {s.phase === 'creating'
                    ? '正在创建房间…'
                    : s.phase === 'loading-watch'
                      ? '正在加载观战棋谱…'
                      : '正在加入房间…'}
                </LoadingIndicator>
                {s.phase === 'loading-watch' && (
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => controller.leave()}>
                      取消观战
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <GomokuRoom
            key={`${s.mode}:${s.roomId}`}
            state={s}
            user={user}
            profiles={profiles}
            controller={controller}
            onInvite={() => void invite()}
            inviteBusy={inviteBusy}
            inviteFeedback={inviteRoom === s.roomId ? inviteState : ''}
          />
        )}
        <PublicGameChat port={social} renderInvitation={renderInvitation} />
      </div>
      <Dialog
        title="切换房间？"
        description={s.mode === 'spectator' ? '将退出当前观战。' : '将退出当前对局。'}
        open={!!joinPrompt}
        onOpenChange={(open) => {
          if (!open) setJoinPrompt(null);
        }}
        showCloseAction={false}
      >
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setJoinPrompt(null)}>
            {s.mode === 'spectator' ? '继续观战' : '继续当前对局'}
          </Button>
          <Button
            onClick={() => {
              if (!joinPrompt) return;
              controller.leave();
              controller[joinPrompt.intent](joinPrompt.roomId);
              setJoinPrompt(null);
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
