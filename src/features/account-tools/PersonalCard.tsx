import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { AuthUser } from '@/domain/auth';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Tools.module.css';
import { useEffect, useRef, useState } from 'react';
import type { AccountToolsPort, PersonalStats } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { FollowList } from './FollowList';
import details from './Details.module.css';

type ListKind = 'following' | 'followers';
type CardResult =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: PersonalStats };

export function PersonalCard({ user, port }: { user: AuthUser; port: AccountToolsPort }) {
  const [result, setResult] = useState<CardResult>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<ListKind | null>(null);
  const changed = useRef(false);
  const returnTo = useRef<ListKind | null>(null);
  const followingButton = useRef<HTMLButtonElement>(null);
  const followersButton = useRef<HTMLButtonElement>(null);
  const stats = result.status === 'ready' ? result.stats : undefined;

  function refresh() {
    setResult({ status: 'loading' });
    setRevision((v) => v + 1);
  }

  useEffect(() => {
    const task = new AbortController();
    void port
      .card(user.id, task.signal)
      .then((value) => {
        if (!task.signal.aborted) setResult({ status: 'ready', stats: value });
      })
      .catch((reason: unknown) => {
        if (!task.signal.aborted)
          setResult({
            status: 'error',
            message: reason instanceof Error ? reason.message : '读取卡片失败',
          });
      });
    return () => task.abort();
  }, [port, user.id, revision]);

  useEffect(() => {
    if (list || !returnTo.current) return;
    const trigger = returnTo.current === 'following' ? followingButton : followersButton;
    trigger.current?.focus();
    returnTo.current = null;
  }, [list]);

  if (list)
    return (
      <FollowList
        port={port}
        kind={list}
        onChange={() => {
          changed.current = true;
        }}
        onBack={() => {
          returnTo.current = list;
          setList(null);
          if (changed.current) {
            changed.current = false;
            refresh();
          }
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
          {result.status === 'loading' && <LoadingIndicator>正在读取卡片…</LoadingIndicator>}
          {result.status === 'error' && (
            <div>
              <p role="alert">{result.message}</p>
              <Button variant="secondary" onClick={refresh}>
                重试
              </Button>
            </div>
          )}
          {stats && (
            <dl className={details.stats}>
              <div>
                <dt>等级</dt>
                <dd>{stats.level ?? '—'}</dd>
              </div>
              <div>
                <dt>积分</dt>
                <dd>{stats.points ?? '—'}</dd>
              </div>
            </dl>
          )}
          <div className={details.connections}>
            <Button ref={followingButton} variant="secondary" onClick={() => setList('following')}>
              {stats?.following === undefined ? '关注' : `关注 ${stats.following}`}
            </Button>
            <Button ref={followersButton} variant="secondary" onClick={() => setList('followers')}>
              {stats?.followers === undefined ? '粉丝' : `粉丝 ${stats.followers}`}
            </Button>
          </div>
          {(stats?.region || user.vip || user.createdAt) && (
            <p className={details.meta}>
              {[
                stats?.region,
                user.vip ? '会员' : '',
                user.createdAt && `加入于 ${user.createdAt.slice(0, 10)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </article>
      </div>
    </ScrollArea>
  );
}
