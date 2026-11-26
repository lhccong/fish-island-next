import { ArrowUpToLine } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './Circle.module.css';

const showAfter = 320;

export function CircleBackToTop({
  viewportRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateVisibility = () => setVisible(viewport.scrollTop >= showAfter);
    updateVisibility();
    viewport.addEventListener('scroll', updateVisibility, { passive: true });
    return () => viewport.removeEventListener('scroll', updateVisibility);
  }, [viewportRef]);

  if (!visible) return null;
  return (
    <Button
      variant="secondary"
      className={styles.backToTop}
      aria-label="回到顶部"
      title="回到顶部"
      onClick={() => {
        const viewport = viewportRef.current;
        viewport?.focus({ preventScroll: true });
        viewport?.scrollTo({ top: 0, behavior: 'instant' });
      }}
    >
      <ArrowUpToLine size={20} aria-hidden="true" />
    </Button>
  );
}
