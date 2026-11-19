import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Bug, Sprout, Aperture } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { FollowKind, UserCardPort } from '@/domain/account-tools';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { useChatRealtime } from './realtime-context';
import { useRemark, useRemarks } from './remarks-context';
import type { RenderFollowList, UserCardTarget } from './user-card-context';
import { useUserCardResource } from './use-user-card';
import { UserCardMedia } from './UserCardMedia';
import { UserCardModeration } from './UserCardModeration';
import { UserCardCounts } from './UserCardCounts';
import { SenderTitle } from './SenderTitle';
import styles from './UserCard.module.css';

export function UserCardDialog({
  target,
  user,
  port,
  onClose,
  onVisit,
  renderFollowList,
}: {
  target: UserCardTarget;
  user: AuthUser;
  port: UserCardPort;
  onClose: () => void;
  onVisit: (kind: 'pet' | 'farm' | 'moments', id: string) => void;
  renderFollowList: RenderFollowList;
}) {
  const self = user.id === target.id;
  const resource = useUserCardResource(port, target.id, self);
  const { state, feedback, setFeedback } = resource;
  const card = state.status === 'ready' ? state.card : null;
  const remark = useRemark(target.id);
  const remarks = useRemarks();
  const remarkRef = useRef<HTMLButtonElement>(null);
  const { blacklist, composerRef, controller, draft } = useChatRealtime();
  const blocked = useSyncExternalStore(blacklist.subscribe, () =>
    blacklist.read(user.id).some((v) => v.id === target.id),
  );
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [list, setList] = useState<FollowKind | null>(null);
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
  return (
    <Dialog
      open
      title="用户卡片"
      hideTitle
      description={`${name}的个人资料`}
      hideDescription
      returnFocusRef={
        target.returnFocusRef.current?.isConnected ? target.returnFocusRef : composerRef
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={`${styles.dialog} ${list ? styles.relationships : !card?.cover ? styles.compact : ''}`}
      showCloseAction={false}
      dismissLabel="关闭用户卡片"
    >
      <div className={styles.content} data-cover={!!card?.cover} hidden={!!list}>
        <ScrollArea label="用户卡片内容" gutter="reserved" className={styles.scroll ?? ''}>
          <div className={styles.body}>
            {state.status === 'loading' && <LoadingIndicator>正在读取用户资料…</LoadingIndicator>}
            {state.status === 'error' && (
              <div>
                <p role="alert">{state.message}</p>
                <Button variant="secondary" onClick={resource.retry}>
                  重试资料
                </Button>
              </div>
            )}
            {state.status === 'ready' && !card && (
              <div>
                <p role="status">该用户资料暂不可用</p>
                <Button variant="secondary" onClick={resource.retry}>
                  重新读取
                </Button>
              </div>
            )}
            {card && (
              <div className={styles.layout}>
                <div className={styles.info}>
                  <div className={styles.identity}>
                    <div className={styles.avatar}>
                      <SourceAvatar name={name} src={card.avatar} size="profile" />
                      {card.frame && (
                        <UserCardMedia key={card.frame} src={card.frame} name={name} frame />
                      )}
                    </div>
                    <div className={styles.name}>
                      <h3>
                        {remark || name}
                        {card.vip && <span className={styles.vip}>会员</span>}
                      </h3>
                      {remark && <p>{name}</p>}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      ref={remarkRef}
                      variant="secondary"
                      onClick={() =>
                        remarks.open({ id: target.id, name, returnFocusRef: remarkRef })
                      }
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
                    {!self && (
                      <Button
                        disabled={
                          resource.busy || state.status !== 'ready' || state.following === null
                        }
                        onClick={() => void resource.toggleFollow()}
                      >
                        {resource.busy ? (
                          <LoadingIndicator compact>{'处理中…'}</LoadingIndicator>
                        ) : state.status === 'ready' && state.following ? (
                          '取消关注'
                        ) : (
                          '关注'
                        )}
                      </Button>
                    )}
                  </div>
                  {state.status === 'ready' && state.followError && (
                    <div>
                      <p role="alert">{state.followError}</p>
                      <Button variant="secondary" onClick={resource.retry}>
                        重试关注状态
                      </Button>
                    </div>
                  )}
                  <UserCardCounts card={card} triggerRef={listTrigger} onSelect={setList} />
                  {(card.titleId ||
                    target.titleId ||
                    card.level !== undefined ||
                    target.level !== undefined) && (
                    <SenderTitle
                      titleId={card.titleId ?? target.titleId}
                      level={card.level ?? target.level}
                    />
                  )}
                  {card.profile && <p className={styles.profile}>{card.profile}</p>}
                  <dl className={styles.details}>
                    <div>
                      <dt>等级</dt>
                      <dd>{card.level ?? target.level ?? '未提供'}</dd>
                    </div>
                    <div>
                      <dt>地区</dt>
                      <dd>{card.region || target.region || '未提供'}</dd>
                    </div>
                    {user.role === 'admin' && (
                      <div>
                        <dt>管理员</dt>
                        <dd>{card.admin ? '是' : '否'}</dd>
                      </div>
                    )}
                  </dl>
                  <div className={styles.links}>
                    <Button
                      variant="secondary"
                      className={card.cover ? styles.iconAction : undefined}
                      aria-label="宠物"
                      title="查看宠物"
                      onClick={() => onVisit('pet', target.id)}
                    >
                      <Bug size={17} aria-hidden="true" />
                      {!card.cover && '宠物'}
                    </Button>
                    <Button
                      variant="secondary"
                      className={card.cover ? styles.iconAction : undefined}
                      aria-label="农场"
                      title="查看农场"
                      onClick={() => {
                        onClose();
                        onVisit('farm', target.id);
                      }}
                    >
                      <Sprout size={17} aria-hidden="true" />
                      {!card.cover && '农场'}
                    </Button>
                    <Button
                      variant="secondary"
                      className={card.cover ? styles.iconAction : undefined}
                      aria-label="动态"
                      title="查看动态"
                      onClick={() => {
                        onClose();
                        onVisit('moments', target.id);
                      }}
                    >
                      <Aperture size={17} aria-hidden="true" />
                      {!card.cover && '动态'}
                    </Button>
                  </div>
                  {user.role === 'admin' && !self && (
                    <UserCardModeration port={port} id={target.id} />
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        {card?.cover && (
          <div className={styles.coverPanel}>
            <UserCardMedia key={card.cover} src={card.cover} name={name} />
          </div>
        )}
      </div>
      <div className={styles.footer} hidden={!!list}>
        {feedback.message && <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
        {confirmBlock && <p>仅在此浏览器屏蔽该岛友的聊天消息，确认加入黑名单？</p>}
        <div className={styles.actions}>
          {card && (
            <Button
              variant="secondary"
              onClick={() => {
                if (controller.sender.poke(target.id, name, user)) onClose();
                else draft.notify('戳一戳未提交，请处理待发送消息后重试', 'error');
              }}
            >
              戳一戳
            </Button>
          )}
          {!self &&
            card &&
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
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
      {list && renderFollowList({ id: target.id, name, kind: list }, () => setList(null))}
    </Dialog>
  );
}
