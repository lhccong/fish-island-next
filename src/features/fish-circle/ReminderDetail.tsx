import { useCallback, useEffect, useRef } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { CircleReminder, FishCirclePort } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ChevronLeft } from 'lucide-react';
import { MomentCard } from './MomentCard';
import { usePage } from './use-page';
import styles from './ReminderDetail.module.css';
interface Props {
  reminder: CircleReminder;
  service: FishCirclePort;
  user: AuthUser;
  onClose: () => void;
  onViewUser: (id: string, name: string) => void;
}
export function ReminderDetail({ reminder, service, user, onClose, onViewUser }: Props) {
  const load = useCallback(
    async (_page: number, signal: AbortSignal) => ({
      items: reminder.momentId ? [await service.detail(reminder.momentId, signal)] : [],
      total: reminder.momentId ? 1 : 0,
    }),
    [service, reminder.momentId],
  );
  const { result, refresh } = usePage(load);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section className={styles.panel} aria-label={reminder.momentId ? '动态详情' : '通知详情'}>
      <div className={styles.header}>
        <button
          ref={back}
          type="button"
          className={styles.back}
          aria-label="返回鱼小圈"
          onClick={onClose}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <h2>详情</h2>
      </div>
      <ScrollArea label="动态详情内容" gutter="reserved" className={styles.scroll || ''}>
        <div className={styles.content}>
          {result.status === 'loading' && (
            <p className={styles.state} role="status">
              正在加载动态详情…
            </p>
          )}
          {result.status === 'error' && (
            <div className={styles.state} role="alert">
              <p>{result.message}</p>
              <Button variant="secondary" onClick={refresh}>
                重试详情
              </Button>
            </div>
          )}
          {result.status === 'ready' &&
            result.data.items.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                variant="detail"
                commentTarget={reminder.action === 'comment' ? reminder : null}
                user={user}
                service={service}
                onRefresh={refresh}
                onViewUser={onViewUser}
              />
            ))}
          {!reminder.momentId && (
            <div className={styles.state}>
              <p>{reminder.content || '收到一条互动通知'}</p>
              {reminder.image && (
                <img
                  src={reminder.image}
                  alt="通知图片"
                  className={styles.image}
                  referrerPolicy="no-referrer"
                />
              )}
              <p>此类消息的关联详情尚未迁移。</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
