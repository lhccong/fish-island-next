import { useState } from 'react';
import { petBatchPackLimit, type PetCardPlayAction } from '@/domain/pet';
import { Select } from '@/shared/ui/Select';
import { ConfirmAction } from './ConfirmAction';
import styles from './cards/PetCards.module.css';

export function PetBatchOpen({
  poolId,
  stock,
  pending,
  submit,
}: {
  poolId: string;
  stock: number;
  pending: boolean;
  submit: (action: PetCardPlayAction, signal: AbortSignal) => Promise<void>;
}) {
  const [selection, setSelection] = useState<number>();
  const limit = Math.min(stock, petBatchPackLimit);
  const quantity = Math.min(selection ?? limit, limit);
  const options = Array.from({ length: Math.max(0, limit - 1) }, (_, index) => ({
    value: String(index + 2),
    label: `${index + 2} 包`,
  }));

  return (
    <ConfirmAction
      label="批量拆包"
      description="一次拆开当前卡池的待拆卡包，卡片直接收入收藏，每包各记一条开包记录。"
      disabled={pending || limit < 2}
      action={(signal) => submit({ type: 'openBatch', poolId, quantity }, signal)}
      onSuccess={() => {}}
    >
      {(submitting) => (
        <div className={styles.batchSelector}>
          <span>拆包数量</span>
          <Select
            label="拆包数量"
            value={quantity >= 2 ? String(quantity) : ''}
            options={options}
            disabled={submitting || limit < 2}
            onValueChange={(value) => setSelection(Number(value))}
          />
        </div>
      )}
    </ConfirmAction>
  );
}
