import { Heart } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Comment } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import styles from './Comments.module.css';

interface Props {
  reaction: NonNullable<Comment['reaction']>;
  disabled: boolean;
  onToggle: (liked: boolean) => void;
}

export function CommentLikeButton({ reaction, disabled, onToggle }: Props) {
  const heart = useRef<SVGSVGElement>(null);
  const sparks = useRef<HTMLSpanElement>(null);
  const wasLiked = useRef(reaction.liked);
  useEffect(() => {
    const newlyLiked = reaction.liked && !wasLiked.current;
    wasLiked.current = reaction.liked;
    if (!newlyLiked || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounce = heart.current?.animate(
      [
        { transform: 'scale(0.82)' },
        { transform: 'scale(1.32)', offset: 0.4 },
        { transform: 'scale(0.94)', offset: 0.73 },
        { transform: 'scale(1)' },
      ],
      { duration: 360, easing: 'ease-out' },
    );
    const burst = sparks.current?.animate(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(0.85)', opacity: 0.85, offset: 0.35 },
        { transform: 'scale(1.7)', opacity: 0 },
      ],
      { duration: 420, easing: 'ease-out' },
    );
    return () => {
      bounce?.cancel();
      burst?.cancel();
    };
  }, [reaction.liked]);

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
      <span className={styles.likeIcon} aria-hidden="true">
        <Heart ref={heart} size={18} fill={reaction.liked ? 'currentColor' : 'none'} />
        <span ref={sparks} className={styles.likeSparks} />
      </span>
      <span>{reaction.likes}</span>
    </Button>
  );
}
