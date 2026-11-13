import { lazy, Suspense, useState } from 'react';
import { Smile } from 'lucide-react';
import { Popover } from '@/shared/ui/Popover';
import { Button } from '@/shared/ui/Button';
import styles from './EmoticonPanel.module.css';

const Panel = lazy(() => import('./EmoticonPicker'));
export function EmoticonLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      label="表情包"
      open={open}
      onOpenChange={setOpen}
      className={styles.panel ?? ''}
      trigger={
        <Button variant="secondary" aria-label="表情包">
          <Smile size={20} aria-hidden="true" />
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<p role="status">正在加载表情包面板…</p>}>
          <Panel onSelect={() => setOpen(false)} />
        </Suspense>
      )}
    </Popover>
  );
}
