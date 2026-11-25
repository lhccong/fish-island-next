import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ChartNoAxesColumnIncreasing, Coins, MapPin } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { AccountToolsPort, FollowKind, PersonalStats } from '@/domain/account-tools';
import {
  ProfileCard,
  ProfileCardDetails,
  ProfileCardDialog,
  ProfileCardStatus,
} from '@/shared/ui/ProfileCard';
import { FollowList } from './FollowList';

type CardResult =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: PersonalStats };

export function PersonalCard({
  user,
  port,
  returnFocusRef,
  onClose,
}: {
  user: AuthUser;
  port: AccountToolsPort;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [result, setResult] = useState<CardResult>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<FollowKind | null>(null);
  const changed = useRef(false);
  const listTrigger = useRef<HTMLButtonElement | null>(null);
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
    if (!list && listTrigger.current) {
      listTrigger.current.focus();
      listTrigger.current = null;
    }
  }, [list]);

  function openList(kind: FollowKind, trigger: HTMLButtonElement) {
    listTrigger.current = trigger;
    setList(kind);
  }

  return (
    <ProfileCardDialog
      title="我的卡片"
      name={user.name}
      cover={user.coverUrl}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
      alternateView={
        list && {
          content: (
            <FollowList
              port={port}
              kind={list}
              onChange={() => {
                changed.current = true;
              }}
              onBack={() => {
                setList(null);
                if (changed.current) {
                  changed.current = false;
                  refresh();
                }
              }}
            />
          ),
        }
      }
    >
      <ProfileCard
        name={user.name}
        avatar={user.avatarUrl}
        frame={user.avatarFrameUrl}
        profile={user.profile || '还没有填写个人简介'}
        subtitle={`ID：${user.id}${user.createdAt ? ` · 加入于 ${user.createdAt.slice(0, 10)}` : ''}`}
        nameBadge={user.vip ? '会员' : undefined}
        counts={[
          {
            label: '关注',
            value: stats?.following,
            onSelect: (trigger) => openList('following', trigger),
          },
          {
            label: '粉丝',
            value: stats?.followers,
            onSelect: (trigger) => openList('followers', trigger),
          },
        ]}
      >
        {result.status === 'loading' && <LoadingIndicator>正在读取卡片…</LoadingIndicator>}
        {result.status === 'error' && (
          <ProfileCardStatus error message={result.message} retryLabel="重试" onRetry={refresh} />
        )}
        {stats && (
          <ProfileCardDetails>
            <div>
              <dt>
                <ChartNoAxesColumnIncreasing size={14} aria-hidden="true" />
                等级
              </dt>
              <dd>{stats.level ?? '—'}</dd>
            </div>
            <div>
              <dt>
                <Coins size={14} aria-hidden="true" />
                积分
              </dt>
              <dd>{stats.points ?? '—'}</dd>
            </div>
            {stats.region && (
              <div data-wrap-value>
                <dt>
                  <MapPin size={14} aria-hidden="true" />
                  地区
                </dt>
                <dd>{stats.region}</dd>
              </div>
            )}
          </ProfileCardDetails>
        )}
      </ProfileCard>
    </ProfileCardDialog>
  );
}
