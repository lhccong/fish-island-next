import type { RefObject } from 'react';
import type { PetCardsPort } from '@/domain/pet';
import { Dialog } from '@/shared/ui/Dialog';
import { PetCardsDemo } from './PetCardsDemo';
import styles from './cards/PetCards.module.css';

export function PetCardsDialog({
  port,
  userId,
  onClose,
  returnFocusRef,
}: {
  port: PetCardsPort;
  userId: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog
      open
      title="宠物卡包试玩"
      description="每天领取两包，拆开卡包并收藏宠物卡片。"
      hideDescription
      className={styles.dialog ?? ''}
      dismissLabel="关闭宠物卡包"
      returnFocusRef={returnFocusRef}
      showCloseAction={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PetCardsDemo port={port} userId={userId} />
    </Dialog>
  );
}
