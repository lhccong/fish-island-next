import { useEffect, useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
import { opposite, type GomokuPlayer, type Stone } from '@/domain/gomoku';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import type { GameState } from './game-state';
import styles from './Gomoku.module.css';

function Player({
  name,
  avatar,
  color,
  active,
  self = false,
}: GomokuPlayer & { color: Stone; active: boolean; self?: boolean }) {
  return (
    <div data-active={active}>
      <UserAvatar name={name} src={avatar} />
      <span className={styles.playerText}>
        <strong>{self ? `${name}（你）` : name}</strong>
        <small>
          <span className={styles.stone} data-color={color} />
          {color === 'black' ? '黑棋' : '白棋'}
        </small>
      </span>
    </div>
  );
}

export function GomokuPlayers({
  state: s,
  user,
  profiles,
}: {
  state: GameState;
  user: Pick<AuthUser, 'name' | 'avatarUrl'>;
  profiles: Pick<UserCardPort, 'userCard'>;
}) {
  const [result, setResult] = useState<{
    id: string;
    attempt: number;
    profile: { name: string; avatar: string | null } | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsProfile =
    s.mode === 'online' && s.opponentId && (!s.opponentAvatar || s.opponentName === '岛友');
  useEffect(() => {
    if (!needsProfile) return;
    const abort = new AbortController();
    void profiles
      .userCard(s.opponentId, abort.signal)
      .then((value) => {
        if (abort.signal.aborted) return;
        if (!value || value.id !== s.opponentId) throw new Error('对手资料暂不可用');
        setResult({
          id: s.opponentId,
          attempt,
          profile: { name: value.name, avatar: value.avatar },
        });
      })
      .catch(() => {
        if (!abort.signal.aborted) setResult({ id: s.opponentId, attempt, profile: null });
      });
    return () => abort.abort();
  }, [needsProfile, s.opponentId, profiles, attempt]);
  const current = result?.id === s.opponentId && result.attempt === attempt ? result : null;
  const profile = current?.profile;
  const status = !current ? 'loading' : profile ? 'ready' : 'error';
  const opponent =
    s.mode === 'single' ? '电脑' : !s.opponentId ? '等待加入' : profile?.name || s.opponentName;
  const first = s.mode === 'spectator' ? 'black' : s.color;
  const second = opposite(first);
  const players =
    s.mode === 'spectator'
      ? s.watchedPlayers
      : {
          [first]: { name: user.name, avatar: user.avatarUrl },
          [second]: {
            name: opponent,
            avatar:
              s.mode === 'online' && s.opponentId ? profile?.avatar || s.opponentAvatar : null,
          },
        };
  return (
    <div>
      {players?.[first] && players[second] && (
        <div className={styles.players}>
          <Player
            {...players[first]}
            color={first}
            active={s.turn === first && s.phase === 'playing'}
            self={s.mode !== 'spectator'}
          />
          <span className={styles.versus}>VS</span>
          <Player
            {...players[second]}
            color={second}
            active={s.turn === second && s.phase === 'playing'}
          />
        </div>
      )}
      {needsProfile && status === 'loading' && (
        <LoadingIndicator compact>正在读取对手资料…</LoadingIndicator>
      )}
      {needsProfile && status === 'error' && (
        <div className={styles.profileError} role="status">
          对手资料加载失败
          <Button variant="secondary" onClick={() => setAttempt((v) => v + 1)}>
            重试资料
          </Button>
        </div>
      )}
    </div>
  );
}
