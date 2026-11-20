import { useId, useState } from 'react';
import type { PetItem } from '@/domain/pet';
import { ConfirmAction } from './ConfirmAction';
import { OperationNotice } from './Feedback';
import styles from './Panels.module.css';

// The purchase endpoint represents both the quantity and the total cost as Java ints.
const maxPurchaseValue = 2_147_483_647;
const formatPoints = new Intl.NumberFormat('zh-CN');

export function ItemPurchase({
  item,
  onPurchase,
  onSuccess,
}: {
  item: PetItem;
  onPurchase: (quantity: number, signal: AbortSignal) => Promise<void>;
  onSuccess: () => void;
}) {
  const [value, setValue] = useState('1');
  const [purchased, setPurchased] = useState<number>();
  const errorId = useId();
  const quantity = Number(value);
  const maxQuantity = Math.floor(maxPurchaseValue / Math.max(1, item.price));
  const error = !/^\d+$/.test(value) || quantity < 1
    ? '请输入正整数'
    : quantity > maxQuantity
      ? `单次最多购买 ${formatPoints.format(maxQuantity)} 件`
      : '';
  const total = error ? '' : formatPoints.format(item.price * quantity);

  return (
    <>
      <div className={styles.actions}>
        {item.stackable && (
          <label className={styles.purchaseQuantity}>
            数量
            <input
              type="text"
              inputMode="numeric"
              value={value}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setValue(event.target.value);
                setPurchased(undefined);
              }}
            />
          </label>
        )}
        <ConfirmAction
          label={error ? '购买' : `购买 · ${total} 积分`}
          description={`消耗 ${total} 积分购买 ${quantity} 件「${item.name}」，是否继续？`}
          disabled={Boolean(error)}
          action={(signal) => onPurchase(quantity, signal)}
          onSuccess={() => {
            setValue('1');
            setPurchased(quantity);
            onSuccess();
          }}
        />
      </div>
      {error && (
        <p className={styles.purchaseError} id={errorId}>
          {error}
        </p>
      )}
      <OperationNotice
        notice={purchased ? { error: false, message: `已购买 ${purchased} 件「${item.name}」` } : null}
      />
    </>
  );
}
