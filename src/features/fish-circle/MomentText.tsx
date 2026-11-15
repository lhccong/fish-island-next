import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './MomentText.module.css';

export function MomentText({
  content,
  compact,
  className,
}: {
  content: string;
  compact: boolean;
  className: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => {
    const element = text.current;
    if (!compact || !element) return;
    const observer = new ResizeObserver(() => {
      if (!expanded) setOverflows(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [compact, expanded, content]);
  return (
    <div
      className={styles.summary}
      data-compact={compact}
      data-expandable={compact && (overflows || expanded)}
    >
      <p
        ref={text}
        id={id}
        className={`${className} ${styles.text}`}
        data-collapsed={compact && !expanded}
      >
        {compact || expanded || content.length <= 500 ? content : `${content.slice(0, 500)}…`}
      </p>
      {(compact ? overflows || expanded : content.length > 500) && (
        <Button
          variant="secondary"
          className={styles.expand}
          data-compact={compact}
          aria-label={compact ? (expanded ? '收起动态全文' : '展开动态全文') : undefined}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {compact ? (
            expanded ? (
              <ChevronUp size={18} aria-hidden="true" />
            ) : (
              <ChevronDown size={18} aria-hidden="true" />
            )
          ) : expanded ? (
            '收起全文'
          ) : (
            '展开全文'
          )}
        </Button>
      )}
    </div>
  );
}
