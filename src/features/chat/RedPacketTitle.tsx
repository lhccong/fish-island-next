import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './RedPacketMessage.module.css';

export function RedPacketTitle({ name, error }: { name: string; error: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="红包祝福与题目"
      description="查看完整祝福、题目与领取反馈"
      hideDescription
      className={`${styles.dialog}`}
      trigger={
        <Button
          variant="secondary"
          className={styles.title}
          aria-label={`查看红包完整内容：${name}`}
        >
          <span className={styles.titleText}>{name}</span>
        </Button>
      }
    >
      <ScrollArea label="红包完整内容" gutter="reserved" className={`${styles.records}`}>
        <p>{name}</p>
        {error && <p role="alert">{error}</p>}
      </ScrollArea>
    </Dialog>
  );
}
