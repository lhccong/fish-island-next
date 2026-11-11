import { Pin } from 'lucide-react';
import type { Moment } from '@/domain/fish-circle';
import { CircleAvatar } from './CircleAvatar';
import { formatMomentTime } from './format-time';
import styles from './PinnedMoments.module.css';
interface Props {
  moments: Moment[];
  onSelect: (id: string) => void;
}
function PinnedList({ moments, onSelect }: Props) {
  return (
    <div className={styles.list}>
      {moments.length ? (
        moments.map((moment) => (
          <button
            type="button"
            key={moment.id}
            onClick={() => onSelect(moment.id)}
            aria-label={`定位置顶动态：${moment.userName}`}
          >
            <CircleAvatar name={moment.userName} src={moment.avatar} size="small" />
            <span className={styles.copy}>
              <span className={styles.author}>
                {moment.userName}
                <time>{formatMomentTime(moment.createdAt)}</time>
              </span>
              <span className={styles.excerpt}>{moment.content || '图片动态'}</span>
            </span>
          </button>
        ))
      ) : (
        <p className={styles.empty}>本页暂无置顶动态</p>
      )}
    </div>
  );
}
export function PinnedMoments(props: Props) {
  return (
    <>
      <aside className={styles.desktop} aria-label="本页置顶动态">
        <h2>
          <Pin size={15} aria-hidden="true" />
          置顶动态<span>本页</span>
        </h2>
        <PinnedList {...props} />
      </aside>
      <details className={styles.mobile}>
        <summary>
          <Pin size={15} aria-hidden="true" />
          置顶动态<span>本页 {props.moments.length} 条</span>
        </summary>
        <PinnedList {...props} />
      </details>
    </>
  );
}
