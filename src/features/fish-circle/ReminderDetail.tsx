import { useCallback } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { CircleReminder, FishCirclePort } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import { MomentCard } from './MomentCard';
import { usePage } from './use-page';
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
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={reminder.momentId ? '动态详情' : '通知详情'}
      description={`${reminder.senderName}的互动消息`}
      dismissLabel="关闭通知详情"
    >
      {result.status === 'loading' && <p role="status">正在加载动态详情…</p>}
      {result.status === 'error' && (
        <div role="alert">
          <p>{result.message}</p>
          <button type="button" onClick={refresh}>
            重试详情
          </button>
        </div>
      )}
      {result.status === 'ready' &&
        result.data.items.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            user={user}
            service={service}
            onRefresh={refresh}
            onViewUser={onViewUser}
          />
        ))}
      {!reminder.momentId && (
        <>
          <p>{reminder.content || '收到一条互动通知'}</p>
          {reminder.image && (
            <img
              src={reminder.image}
              alt="通知图片"
              style={{ maxWidth: '100%' }}
              referrerPolicy="no-referrer"
            />
          )}
          <p>此类消息的关联详情尚未迁移。</p>
        </>
      )}
    </Dialog>
  );
}
