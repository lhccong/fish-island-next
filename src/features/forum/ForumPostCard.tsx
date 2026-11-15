import { useState } from 'react';
import { MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPort, ForumPost } from '@/domain/forum';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ForumPostMenu } from './ForumPostMenu';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';
export function ForumPostCard({
  initial,
  user,
  service,
  onOpen,
  onLogin,
  onEdit,
  onDeleted,
}: {
  initial: ForumPost;
  user: AuthUser | null;
  service: ForumPort;
  onOpen: () => void;
  onLogin: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [post, setPost] = useState(initial);
  const operation = useOperation();
  return (
    <article className={styles.post}>
      <div className={styles.meta}>
        <SourceAvatar name={post.author} src={post.avatar || null} />
        <span>{post.author}</span>
        <time>{post.createdAt.replace('T', ' ').slice(0, 16)}</time>
        {post.featured && <strong>精华</strong>}
      </div>
      <div className={styles.tags}>
        {post.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <button type="button" className={styles.postLink} onClick={onOpen}>
        <h2>{post.title || '无标题帖子'}</h2>
        <p>{(post.summary || post.content).replace(/<[^>]*>/g, '').slice(0, 160)}</p>
      </button>
      <div className={styles.postBottom}>
        <span>
          <Eye size={14} aria-hidden="true" />
          浏览 {post.views}
        </span>
        <button
          type="button"
          className={styles.statButton}
          aria-pressed={post.liked}
          disabled={operation.busy}
          onClick={() => {
            if (!user) onLogin();
            else
              void operation.run(async (signal) => {
                const delta = await service.react(post.id, 'like', signal);
                if (!signal.aborted)
                  setPost((p) => ({
                    ...p,
                    liked: delta === 1,
                    likes: Math.max(0, p.likes + delta),
                  }));
              });
          }}
        >
          <ThumbsUp size={14} aria-hidden="true" />
          {post.liked ? '已赞' : '点赞'} {post.likes}
        </button>
        <button type="button" className={styles.statButton} onClick={onOpen}>
          <MessageSquare size={14} aria-hidden="true" />
          评论 {post.comments}
        </button>
        <ForumPostMenu
          post={post}
          user={user}
          service={service}
          onEdit={onEdit}
          onFeatured={(featured) => setPost((p) => ({ ...p, featured }))}
          onDeleted={onDeleted}
        />
      </div>
      {operation.busy && <LoadingIndicator compact>正在点赞…</LoadingIndicator>}
      {operation.message && <p role="status">{operation.message}</p>}
    </article>
  );
}
