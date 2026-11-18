import { Heart } from 'lucide-react';
import type { Comment } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './Comments.module.css';

interface Props {
  reaction: NonNullable<Comment['reaction']>;
  pending: boolean;
  disabled: boolean;
  onToggle: (liked: boolean) => void;
}

export function CommentLikeButton({ reaction, pending, disabled, onToggle }: Props) {
  return (
    <Button
      className={styles.like}
      variant="secondary"
      aria-label="点赞评论"
      aria-description={`${reaction.likes} 个赞`}
      aria-pressed={reaction.liked}
      disabled={disabled}
      onClick={() => onToggle(!reaction.liked)}
    >
      {pending ? (
        <LoadingIndicator compact>处理中…</LoadingIndicator>
      ) : (
        <>
          <Heart size={14} aria-hidden="true" fill={reaction.liked ? 'currentColor' : 'none'} />
          <span>{reaction.likes}</span>
        </>
      )}
    </Button>
  );
}
