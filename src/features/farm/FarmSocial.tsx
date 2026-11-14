import { useCallback, useEffect, useRef, useState } from 'react';
import type { FarmPort, Friend, Visitor, Farmer } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { FarmFriendList } from './FarmFriendList';
import { FarmVisitorList } from './FarmVisitorList';
import { FarmAvatar } from './FarmAvatar';
import socialStyles from './FarmSocial.module.css';
import styles from './Farm.module.css';
export function FarmSocial({
  service,
  kind,
  farmer,
  now,
  onKindChange,
  onClose,
  onVisit,
}: {
  service: FarmPort;
  kind: 'friends' | 'visitors';
  farmer: Farmer | undefined;
  now: number;
  onKindChange: (kind: 'friends' | 'visitors') => void;
  onClose: () => void;
  onVisit: (friend: Friend) => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reading, setReading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setLoading(true);
    setError('');
    try {
      if (kind === 'friends') {
        const data = await service.friends(c.signal);
        if (!c.signal.aborted) setFriends(data);
      } else {
        const data = await service.visitors(c.signal);
        if (!c.signal.aborted) setVisitors(data);
      }
    } catch (e) {
      if (!c.signal.aborted) setError(e instanceof Error ? e.message : '加载失败，请重试');
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }, [service, kind]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void load();
    });
    return () => {
      disposed = true;
      request.current?.abort();
      mutation.current?.abort();
    };
  }, [load]);
  async function markRead() {
    if (mutation.current) return;
    const c = new AbortController();
    mutation.current = c;
    setReading(true);
    setError('');
    try {
      await service.readVisitors(c.signal);
      if (!c.signal.aborted) {
        setVisitors((v) => v.map((item) => ({ ...item, read: true })));
        setNotice('访客记录已全部标记已读');
      }
    } catch (e) {
      if (!c.signal.aborted) setError(e instanceof Error ? e.message : '标记失败，请重试');
    } finally {
      mutation.current = null;
      if (!c.signal.aborted) setReading(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind === 'friends' ? '好友农场' : '访客记录'}
      description={kind === 'friends' ? '互相关注的岛友，一起照料小小农场。' : '谁来收走了你的作物'}
      dismissLabel="关闭农场列表"
      className={`${styles.dialog} ${socialStyles.dialog}`}
      hideDescription
      showCloseAction={false}
    >
      <nav className={socialStyles.tabs} aria-label="好友与访客">
        <Button
          variant="secondary"
          aria-pressed={kind === 'friends'}
          disabled={reading}
          onClick={() => onKindChange('friends')}
        >
          同玩好友
        </Button>
        <Button
          variant="secondary"
          aria-pressed={kind === 'visitors'}
          disabled={reading}
          onClick={() => onKindChange('visitors')}
        >
          访客
        </Button>
      </nav>
      <ScrollArea label="农场列表" gutter="reserved" className={styles.dialogScroll ?? ''}>
        <div className={socialStyles.body}>
          {loading && <p role="status">正在加载…</p>}
          {error && (
            <p role="alert">
              {error}{' '}
              <Button variant="secondary" disabled={reading} onClick={() => void load()}>
                重试
              </Button>
            </p>
          )}
          {!loading &&
            !error &&
            (kind === 'friends' ? (
              <FarmFriendList friends={friends} now={now} onVisit={onVisit} />
            ) : (
              <FarmVisitorList visitors={visitors} />
            ))}
        </div>
      </ScrollArea>
      {notice && <p role="status">{notice}</p>}
      <div className={socialStyles.footer}>
        {farmer && (
          <div className={socialStyles.self}>
            <FarmAvatar name={farmer.name} src={farmer.avatar} />
            <span>
              <strong>{farmer.name || '我'}</strong>
              <small>Lv.{farmer.level}</small>
            </span>
          </div>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {kind === 'visitors' && (
            <Button
              disabled={reading || loading || !visitors.some((v) => !v.read)}
              onClick={() => void markRead()}
            >
              {reading ? '标记中…' : '全部已读'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
