import { useRef, useState } from 'react';
import { Heart, MessageCircle, MapPin, Pin } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { FishCirclePort, Moment, MomentAction } from '@/domain/fish-circle';
import { MediaGrid } from './MediaGrid';
import { Comments } from './Comments';
import { MomentEditor } from './MomentEditor';
import { MomentActionDialog } from './MomentActionDialog';
import { useOperation } from './use-operation';
import { MomentMenu } from './MomentMenu';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import styles from './MomentCard.module.css';
interface Props {
  moment: Moment;
  user: AuthUser;
  service: FishCirclePort;
  onRefresh: () => void;
  onViewUser: (id: string, name: string) => void;
}
export function MomentCard({ moment, user, service, onRefresh, onViewUser }: Props) {
  const [likes, setLikes] = useState({ liked: moment.liked, count: moment.likes });
  const [commentCount, setCommentCount] = useState(moment.comments);
  const [comments, setComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<MomentAction | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const operation = useOperation();
  const moreRef = useRef<HTMLButtonElement>(null);
  const names = moment.likeNames.split(',').filter(Boolean);
  const likeNames =
    likes.liked === moment.liked
      ? moment.likeNames
      : likes.liked
        ? [...new Set([...names, user.name])].join(',')
        : names.filter((name) => name !== user.name).join(',');
  const owner = user.id === moment.userId;
  const admin = user.role === 'admin';
  return (
    <article
      id={`circle-moment-${moment.id}`}
      tabIndex={-1}
      data-pinned={moment.top}
      className={styles.card}
      aria-label={`${moment.userName}的动态`}
    >
      {moment.top && (
        <span className={styles.pin} aria-label="置顶">
          <Pin size={12} aria-hidden="true" />
        </span>
      )}
      <div className={styles.author}>
        <button
          type="button"
          className={styles.avatar}
          aria-label={`查看${moment.userName}的鱼小圈`}
          onClick={() => onViewUser(moment.userId, moment.userName)}
        >
          <CircleAvatar name={moment.userName} src={moment.avatar} />
        </button>
        <div>
          <button
            className={styles.name}
            type="button"
            onClick={() => onViewUser(moment.userId, moment.userName)}
          >
            {moment.userName}
          </button>
          {moment.visibility === 1 && <span className={styles.private}>仅自己可见</span>}
        </div>
      </div>
      <div className={styles.body}>
        <p className={styles.text}>
          {expanded || moment.content.length <= 500
            ? moment.content
            : `${moment.content.slice(0, 500)}…`}
        </p>
        {moment.content.length > 500 && (
          <button type="button" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收起全文' : '展开全文'}
          </button>
        )}
        <MediaGrid media={moment.media} />
        {moment.location && (
          <p className={styles.location}>
            <MapPin size={14} aria-hidden="true" /> {moment.location}
          </p>
        )}
        {likeNames && (
          <p className={styles.likes}>
            <Heart size={13} aria-hidden="true" fill="currentColor" />
            <span>{likeNames}</span>
          </p>
        )}
        <div className={styles.footer}>
          <time className={styles.time} dateTime={moment.createdAt}>
            {formatMomentTime(moment.createdAt)}
          </time>
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`${likes.liked ? '取消点赞' : '点赞'} ${likes.count}`}
              aria-pressed={likes.liked}
              disabled={operation.pending}
              onClick={() => {
                void operation
                  .run((signal) => service.like(moment.id, signal))
                  .then((liked) => {
                    if (liked !== undefined) {
                      setLikes((old) => ({
                        liked,
                        count: Math.max(0, old.count + (liked === old.liked ? 0 : liked ? 1 : -1)),
                      }));
                      setNotice(liked ? '点赞成功' : '已取消点赞');
                    }
                  });
              }}
            >
              <Heart size={16} aria-hidden="true" fill={likes.liked ? 'currentColor' : 'none'} />
              <span>{likes.count}</span>
            </button>
            <button
              type="button"
              aria-label={`评论 ${commentCount}`}
              aria-expanded={comments}
              onClick={() => setComments(!comments)}
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{commentCount}</span>
            </button>
            <MomentMenu
              triggerRef={moreRef}
              owner={owner}
              admin={admin}
              top={moment.top}
              pending={operation.pending}
              onEdit={() => setEditing(true)}
              onAction={setAction}
              onToggleTop={() => {
                void operation
                  .run((signal) => service.action('top', moment.id, moment.top ? 0 : 1, signal))
                  .then((ok) => {
                    if (ok) onRefresh();
                  });
              }}
            />
          </div>
        </div>
        {operation.error && <p role="alert">{operation.error}</p>}
        {notice && (
          <p className={styles.meta} role="status">
            {notice}
          </p>
        )}
        {(comments || moment.comments > 0) && (
          <Comments
            composerOpen={comments}
            service={service}
            momentId={moment.id}
            userId={user.id}
            canManage={owner || admin}
            admin={admin}
            onCountChange={(delta) => setCommentCount((n) => Math.max(0, n + delta))}
          />
        )}
      </div>
      {editing && (
        <MomentEditor
          returnFocusRef={moreRef}
          service={service}
          original={moment}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onRefresh();
          }}
        />
      )}
      {action && (
        <MomentActionDialog
          returnFocusRef={moreRef}
          action={action}
          id={moment.id}
          service={service}
          onDone={() => setNotice('操作成功')}
          onClose={() => {
            setAction(null);
            onRefresh();
          }}
        />
      )}
    </article>
  );
}
