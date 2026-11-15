import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { AuthUser } from '@/domain/auth';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Tools.module.css';
import { useEffect, useState } from 'react';
import type { AccountToolsPort, PersonalStats } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { FollowList } from './FollowList';
import details from './Details.module.css';
export function PersonalCard({ user, port }: { user: AuthUser; port: AccountToolsPort }) {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<'following' | 'followers' | null>(null);
  useEffect(() => {
    const task = new AbortController();
    void port
      .card(user.id, task.signal)
      .then((value) => {
        if (!task.signal.aborted) setStats(value);
      })
      .catch((reason: unknown) => {
        if (!task.signal.aborted)
          setError(reason instanceof Error ? reason.message : '读取卡片失败');
      });
    return () => task.abort();
  }, [port, user.id, revision]);
  if (list)
    return (
      <FollowList
        port={port}
        kind={list}
        onBack={() => {
          setList(null);
          setRevision((v) => v + 1);
        }}
      />
    );
  return (
    <ScrollArea label="个人卡片内容" gutter="reserved" className={styles.scroll ?? ''}>
      <div className={styles.fields}>
        <article
          className={details.card}
          data-has-cover={!!user.coverUrl}
          data-compact={!user.coverUrl && !user.createdAt && !user.vip && !stats?.region}
        >
          {user.coverUrl && <img className={details.cover} src={user.coverUrl} alt="个人封面" />}
          <div className={details.identity}>
            <SourceAvatar name={user.name} src={user.avatarUrl} size="profile" />
            <div>
              <h3>{user.name}</h3>
              <p>ID：{user.id}</p>
            </div>
          </div>
          <p className={details.profile}>{user.profile || '还没有填写个人简介'}</p>
          {!stats && !error && <LoadingIndicator>正在读取卡片…</LoadingIndicator>}
          {error && (
            <div>
              <p role="alert">{error}</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setError('');
                  setRevision((v) => v + 1);
                }}
              >
                重试
              </Button>
            </div>
          )}
          {stats && (
            <>
              <dl className={details.stats}>
                <div>
                  <dt>等级</dt>
                  <dd>{stats.level}</dd>
                </div>
                <div>
                  <dt>积分</dt>
                  <dd>{stats.points}</dd>
                </div>
              </dl>
              <div className={details.connections}>
                <Button variant="secondary" onClick={() => setList('following')}>
                  关注 {stats.following}
                </Button>
                <Button variant="secondary" onClick={() => setList('followers')}>
                  粉丝 {stats.followers}
                </Button>
              </div>
              {(stats.region || user.vip || user.createdAt) && (
                <p className={details.meta}>
                  {[
                    stats.region,
                    user.vip ? '会员' : '',
                    user.createdAt ? `加入于 ${user.createdAt.slice(0, 10)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </>
          )}
        </article>
      </div>
    </ScrollArea>
  );
}
