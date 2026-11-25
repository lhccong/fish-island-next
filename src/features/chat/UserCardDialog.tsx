import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { ChartNoAxesColumnIncreasing, MapPin } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { FollowKind, UserCardPort } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import {
  ProfileCard,
  ProfileCardDetails,
  ProfileCardDialog,
  ProfileCardStatus,
} from '@/shared/ui/ProfileCard';
import { useChatRealtime } from './realtime-context';
import { useRemark, useRemarks } from './remarks-context';
import type {
  RenderCardCollection,
  RenderFollowList,
  UserCardDestination,
  UserCardTarget,
} from './user-card-context';
import { useUserCardResource } from './use-user-card';
import { UserCardModeration } from './UserCardModeration';
import { UserCardLinks } from './UserCardLinks';
import { UserCardTitles } from './UserCardTitles';
import styles from './UserCard.module.css';

export function UserCardDialog({
  target,
  user,
  port,
  onClose,
  onVisit,
  renderFollowList,
  renderCardCollection,
}: {
  target: UserCardTarget;
  user: AuthUser;
  port: UserCardPort;
  onClose: () => void;
  onVisit: (kind: UserCardDestination, id: string) => void;
  renderFollowList: RenderFollowList;
  renderCardCollection: RenderCardCollection;
}) {
  const self = user.id === target.id;
  const resource = useUserCardResource(port, target.id, self);
  const { state, feedback, setFeedback } = resource;
  const card = state.status === 'ready' ? state.card : null;
  const remark = useRemark(target.id);
  const remarks = useRemarks();
  const remarkRef = useRef<HTMLButtonElement>(null);
  const { blacklist, composerRef, controller, draft } = useChatRealtime();
  const member = useStore(controller.members.store, ({ state: members }) =>
    members.status === 'success'
      ? members.members.find((entry) => entry.id === target.id)
      : undefined,
  );
  const level = card?.level ?? target.level ?? member?.level;
  const blocked = useSyncExternalStore(blacklist.subscribe, () =>
    blacklist.read(user.id).some((v) => v.id === target.id),
  );
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [list, setList] = useState<FollowKind | 'collection' | null>(null);
  const listTrigger = useRef<HTMLButtonElement | null>(null);
  const name = card?.name || target.name;
  useEffect(() => {
    if (!list && listTrigger.current) {
      listTrigger.current.focus();
      listTrigger.current = null;
    }
  }, [list]);
  function toggleBlock() {
    try {
      const old = blacklist.read(user.id).filter((v) => v.id !== target.id);
      blacklist.write(
        user.id,
        blocked
          ? old
          : [...old, { id: target.id, name, ...(card?.avatar ? { avatar: card.avatar } : {}) }],
      );
      setConfirmBlock(false);
      setFeedback({
        message: blocked ? '已移出黑名单' : '已在此浏览器屏蔽该岛友的聊天消息',
        error: false,
      });
    } catch {
      setFeedback({ message: '无法保存黑名单，请检查浏览器存储权限后重试', error: true });
    }
  }
  function openList(kind: FollowKind | 'collection', trigger: HTMLButtonElement) {
    listTrigger.current = trigger;
    setList(kind);
  }

  return (
    <ProfileCardDialog
      title="用户卡片"
      name={name}
      cover={card?.cover}
      returnFocusRef={
        target.returnFocusRef.current?.isConnected ? target.returnFocusRef : composerRef
      }
      onClose={onClose}
      topAction={
        card &&
        user.role === 'admin' &&
        !self && (
          <UserCardModeration port={port} id={target.id} hasCover={!!card.cover} hidden={!!list} />
        )
      }
      footerNotice={
        <>
          {feedback.message && <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
          {confirmBlock && <p>仅在此浏览器屏蔽该岛友的聊天消息，确认加入黑名单？</p>}
        </>
      }
      footerActions={
        card && (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (controller.sender.poke(target.id, name, user)) onClose();
                else draft.notify('戳一戳未提交，请处理待发送消息后重试', 'error');
              }}
            >
              戳一戳
            </Button>
            {!self &&
              (confirmBlock ? (
                <>
                  <Button variant="secondary" onClick={() => setConfirmBlock(false)}>
                    取消
                  </Button>
                  <Button onClick={toggleBlock}>确认加入</Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => (blocked ? toggleBlock() : setConfirmBlock(true))}
                >
                  {blocked ? '移出黑名单' : '加入黑名单'}
                </Button>
              ))}
          </>
        )
      }
      alternateView={
        list && {
          wide: list === 'collection',
          content:
            list === 'collection'
              ? renderCardCollection({ id: target.id, name }, () => setList(null))
              : renderFollowList({ id: target.id, name, kind: list }, () => setList(null)),
        }
      }
    >
      {state.status === 'loading' && <LoadingIndicator>正在读取用户资料…</LoadingIndicator>}
      {state.status === 'error' && (
        <ProfileCardStatus
          error
          message={state.message}
          retryLabel="重试资料"
          onRetry={resource.retry}
        />
      )}
      {state.status === 'ready' && !card && (
        <ProfileCardStatus
          message="该用户资料暂不可用"
          retryLabel="重新读取"
          onRetry={resource.retry}
        />
      )}
      {state.status === 'ready' && card && (
        <ProfileCard
          name={name}
          displayName={remark || name}
          avatar={card.avatar}
          frame={card.frame}
          profile={card.profile}
          subtitle={remark ? name : ''}
          nameBadge={card.vip ? '会员' : undefined}
          badges={
            <UserCardTitles
              current={card.titleId ?? target.titleId ?? member?.titleId}
              owned={card.titleIds ?? target.titleIds ?? member?.titleIds}
              level={level}
            />
          }
          counts={[
            {
              label: '关注',
              value: card.following,
              onSelect: (trigger) => openList('following', trigger),
            },
            {
              label: '粉丝',
              value: card.followers,
              onSelect: (trigger) => openList('followers', trigger),
            },
          ]}
          actions={
            <>
              {!self && (
                <Button
                  variant={state.following ? 'secondary' : 'primary'}
                  disabled={resource.busy || state.following === null}
                  onClick={() => void resource.toggleFollow()}
                >
                  {resource.busy ? (
                    <LoadingIndicator compact>处理中…</LoadingIndicator>
                  ) : state.following ? (
                    '取消关注'
                  ) : (
                    '关注'
                  )}
                </Button>
              )}
              <Button
                ref={remarkRef}
                variant="secondary"
                onClick={() => remarks.open({ id: target.id, name, returnFocusRef: remarkRef })}
              >
                {remark ? '修改备注' : '设置备注'}
              </Button>
              {user.role === 'admin' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    void Promise.resolve()
                      .then(() => navigator.clipboard.writeText(card.id))
                      .then(() => setFeedback({ message: '用户 ID 已复制', error: false }))
                      .catch(() =>
                        setFeedback({ message: '复制失败，请手动复制 ID', error: true }),
                      );
                  }}
                >
                  复制ID
                </Button>
              )}
            </>
          }
        >
          {state.followError && (
            <div className={styles.followError}>
              <p role="alert">{state.followError}</p>
              <Button variant="secondary" onClick={resource.retry}>
                重试关注状态
              </Button>
            </div>
          )}
          <ProfileCardDetails>
            <div>
              <dt>
                <ChartNoAxesColumnIncreasing size={14} aria-hidden="true" />
                等级
              </dt>
              <dd>{level ?? '未提供'}</dd>
            </div>
            <div data-wrap-value>
              <dt>
                <MapPin size={14} aria-hidden="true" />
                地区
              </dt>
              <dd>{card.region || target.region || '未提供'}</dd>
            </div>
            {card.mbti && (
              <div>
                <dt>MBTI</dt>
                <dd className={styles.mbti} data-mbti={card.mbti}>
                  {card.mbti}
                </dd>
              </div>
            )}
          </ProfileCardDetails>
          <UserCardLinks
            onVisit={(kind) => {
              if (kind !== 'pet') onClose();
              onVisit(kind, target.id);
            }}
            onCollection={(trigger) => openList('collection', trigger)}
          />
        </ProfileCard>
      )}
    </ProfileCardDialog>
  );
}
