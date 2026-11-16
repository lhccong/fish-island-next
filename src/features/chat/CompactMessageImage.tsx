import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { MessageImage } from './MessageImage';
import styles from './CompactMessageImage.module.css';

export function CompactMessageImage({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <span className={styles.cell}>
      <Button
        variant="secondary"
        className={styles.toggle}
        aria-label={expanded ? '收起单元格图片' : '展开单元格图片'}
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        {expanded ? '收起图片' : '[图片]'}
      </Button>
      {expanded && <MessageImage url={url} />}
    </span>
  );
}
