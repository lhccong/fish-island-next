import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { AuthUser, AvatarFrame } from '@/domain/auth';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { useAuth } from './use-auth';
import styles from './AvatarFrames.module.css';

const noFrame: AvatarFrame = { id: '-1', name: '不使用头像框', url: '', points: 0, owned: true };

export default function AvatarFramesDialog({
  user,
  embedded = false,
  returnFocusRef,
  onClose,
}: {
  user: AuthUser;
  embedded?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const { avatarFrames, exchangeAvatarFrame, setAvatarFrame, pending } = useAuth();
  const load = useCallback(
    (page: number, signal: AbortSignal) => avatarFrames(page, signal),
    [avatarFrames],
  );
  const pages = useInfinitePages(load);
  const [owned, setOwned] = useState<ReadonlySet<string>>(new Set());
  const [confirmation, setConfirmation] = useState<AvatarFrame | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const available = (user.points ?? 0) - (user.usedPoints ?? 0);

  async function act(frame: AvatarFrame, exchange: boolean) {
    if (locked.current || pending) return;
    locked.current = true;
    setBusy(true);
    setFeedback({ error: '', success: '' });
    try {
      const confirmed = await (exchange ? exchangeAvatarFrame(frame) : setAvatarFrame(frame));
      if (!mounted.current || !confirmed) return;
      if (exchange) setOwned((previous) => new Set([...previous, frame.id]));
      setConfirmation(null);
      setFeedback({
        error: '',
        success: exchange
          ? `已兑换「${frame.name}」`
          : frame.id === '-1'
            ? '已移除头像框'
            : `已使用「${frame.name}」`,
      });
    } catch (error) {
      if (mounted.current)
        setFeedback({
          error: error instanceof Error ? error.message : '操作失败，请重试',
          success: '',
        });
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const content = (
    <>
      <div className={styles.summary} hidden={embedded}>
        <span>可用积分</span>
        <strong>{available}</strong>
      </div>
      <ScrollArea label="头像框列表" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.body}>
          {pages.result.status === 'loading' && (
            <LoadingIndicator>正在加载头像框…</LoadingIndicator>
          )}
          {pages.result.status === 'error' && (
            <div role="alert">
              <p>{pages.result.message}</p>
              <Button variant="secondary" onClick={pages.refresh}>
                重新读取
              </Button>
            </div>
          )}
          <div className={styles.grid}>
            {[noFrame, ...(pages.result.status === 'ready' ? pages.result.data.items : [])].map(
              (frame) => {
                const hasOwned = frame.owned || owned.has(frame.id);
                const selected =
                  frame.id === '-1'
                    ? !user.avatarFrameUrl
                    : Boolean(frame.url) && user.avatarFrameUrl === frame.url;
                return (
                  <article key={frame.id} className={styles.card} data-selected={selected}>
                    <div className={styles.preview}>
                      <SourceAvatar
                        name={user.name}
                        src={user.avatarUrl}
                        frameUrl={frame.url}
                        size="profile"
                      />
                    </div>
                    <h3>{frame.name}</h3>
                    <p>
                      {frame.id === '-1'
                        ? '默认头像'
                        : hasOwned
                          ? '已拥有'
                          : `${frame.points} 积分`}
                    </p>
                    <Button
                      variant={selected || !hasOwned ? 'secondary' : 'primary'}
                      disabled={
                        busy ||
                        pending !== null ||
                        selected ||
                        (!hasOwned && available < frame.points) ||
                        (frame.id !== '-1' && !frame.url)
                      }
                      onClick={() => {
                        setFeedback({ error: '', success: '' });
                        if (hasOwned) void act(frame, false);
                        else setConfirmation(frame);
                      }}
                    >
                      {selected
                        ? '使用中'
                        : frame.id !== '-1' && !frame.url
                          ? '图片不可用'
                          : hasOwned
                            ? '使用'
                            : available < frame.points
                              ? '积分不足'
                              : '立即兑换'}
                    </Button>
                  </article>
                );
              },
            )}
          </div>
          {pages.result.status === 'ready' && (
            <>
              {pages.result.data.items.length === 0 && <p>暂无可兑换的头像框</p>}
              <InfiniteScroll
                label="头像框"
                hasMore={pages.hasMore}
                loading={pages.loadingMore}
                error={pages.error}
                onLoadMore={pages.loadMore}
              />
            </>
          )}
        </div>
        {embedded && <PageFooterOutlet />}
      </ScrollArea>
      <div className={styles.feedback}>
        {busy && <LoadingIndicator compact>正在保存…</LoadingIndicator>}
        {feedback.error && !confirmation && <p role="alert">{feedback.error}</p>}
        {feedback.success && <p role="status">{feedback.success}</p>}
      </div>
      {confirmation && (
        <Dialog
          open
          title="确认兑换头像框"
          description={`兑换「${confirmation.name}」将消耗 ${confirmation.points} 积分，兑换后不可退还。`}
          onOpenChange={(open) => {
            if (!open && !busy) setConfirmation(null);
          }}
          showCloseAction={false}
        >
          {feedback.error && <p role="alert">{feedback.error}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>
              取消
            </Button>
            <Button
              disabled={busy || pending !== null}
              onClick={() => void act(confirmation, true)}
            >
              {busy ? <LoadingIndicator compact>{'兑换中…'}</LoadingIndicator> : '确认兑换'}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
  if (embedded) return <section className={styles.embedded}>{content}</section>;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      returnFocusRef={returnFocusRef}
      title="头像框"
      description="为你的头像挑一个装扮"
      hideDescription
      dismissLabel="关闭头像框"
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      {content}
    </Dialog>
  );
}
