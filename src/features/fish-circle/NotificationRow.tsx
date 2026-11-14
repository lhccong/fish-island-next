import { Heart, MessageCircle } from 'lucide-react';
import type { CircleReminder } from '@/domain/fish-circle';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import styles from './CircleNotifications.module.css';

export function NotificationRow({
  item,
  deleting,
  disabled,
  selected,
  unread,
  onSelected,
  onOpen,
}: {
  item: CircleReminder;
  deleting: boolean;
  disabled: boolean;
  selected: boolean;
  unread: boolean;
  onSelected: (selected: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <div className={styles.row}>
      {deleting && (
        <label className={styles.selection}>
          <input
            type="checkbox"
            aria-label={`选择通知 ${item.id}`}
            checked={selected}
            disabled={disabled}
            onChange={(event) => onSelected(event.target.checked)}
          />
        </label>
      )}
      <button
        type="button"
        className={styles.item}
        data-unread={unread}
        onClick={onOpen}
        disabled={disabled}
      >
        <span className={styles.avatar}>
          <CircleAvatar name={item.senderName} src={item.avatar} />
        </span>
        <span className={styles.body}>
          <span className={styles.meta}>
            <strong>
              {item.senderName}
              {unread && <span className={styles.unread} aria-label="未读" />}
            </strong>
            <time>{formatMomentTime(item.createdAt)}</time>
          </span>
          <span className={styles.action}>
            {item.action === 'like' ? (
              <Heart size={14} aria-hidden="true" />
            ) : (
              <MessageCircle size={14} aria-hidden="true" />
            )}
            {item.action === 'like'
              ? '赞了你的动态'
              : item.action === 'comment'
                ? '评论了你的动态'
                : item.action === 'mention'
                  ? '提到了你'
                  : '发来一条通知'}
          </span>
          {item.action !== 'like' && item.content && (
            <span className={styles.preview}>{item.content}</span>
          )}
        </span>
        {item.image && (
          <img
            className={styles.thumbnail}
            src={item.image}
            alt="通知图片"
            referrerPolicy="no-referrer"
          />
        )}
      </button>
    </div>
  );
}
