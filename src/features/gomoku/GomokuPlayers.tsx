import { useEffect, useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { UserCardPort } from '@/domain/account-tools';
import { opposite } from '@/domain/gomoku';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import type { GameState } from './controller';
import styles from './Gomoku.module.css';

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
  return (
    <div>
      <div className={styles.players}>
        <div data-active={s.turn === s.color && s.phase === 'playing'}>
          <UserAvatar name={user.name} src={user.avatarUrl} />
          <span className={styles.playerText}>
            <strong>{user.name}（你）</strong>
            <small>
              <span className={styles.stone} data-color={s.color} />
              {s.color === 'black' ? '黑棋' : '白棋'}
            </small>
          </span>
        </div>
        <span className={styles.versus}>VS</span>
        <div data-active={s.turn !== s.color && s.phase === 'playing'}>
          <UserAvatar
            name={opponent}
            src={s.mode === 'online' && s.opponentId ? profile?.avatar || s.opponentAvatar : null}
          />
          <span className={styles.playerText}>
            <strong>{opponent}</strong>
            <small>
              <span className={styles.stone} data-color={opposite(s.color)} />
              {s.color === 'black' ? '白棋' : '黑棋'}
            </small>
          </span>
        </div>
      </div>
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
