import { Heart } from 'lucide-react';
import type { Comment } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import styles from './Comments.module.css';

interface Props {
  reaction: NonNullable<Comment['reaction']>;
  disabled: boolean;
  onToggle: (liked: boolean) => void;
}

export function CommentLikeButton({ reaction, disabled, onToggle }: Props) {
  return (
    <Button
      className={styles.like}
      variant="secondary"
      aria-label="点赞评论"
      aria-description={`${reaction.likes} 个赞`}
      aria-pressed={reaction.liked}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle(!reaction.liked);
      }}
    >
      <Heart size={18} aria-hidden="true" fill={reaction.liked ? 'currentColor' : 'none'} />
      <span>{reaction.likes}</span>
    </Button>
  );
}
