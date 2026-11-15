import { useCallback } from 'react';
import type { PetPort } from '@/domain/pet';
import { Select } from '@/shared/ui/Select';
import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import { usePetPages } from './use-pet-pages';
import styles from './Panels.module.css';

export function FoodSelect({
  service,
  value,
  savedName,
  disabled,
  onChange,
}: {
  service: PetPort;
  value: string;
  savedName: string;
  disabled: boolean;
  onChange: (code: string) => void;
}) {
  const load = useCallback(
    (page: number, signal: AbortSignal) => service.items('bag', page, signal, 'consumable'),
    [service],
  );
  const resource = usePetPages(load);
  const foods = new Map<string, { value: string; name: string; quantity: number }>();
  if (resource.state.status === 'ready')
    for (const item of resource.state.data.records) {
      if (item.subType !== 'food' || !item.code || item.quantity <= 0) continue;
      const existing = foods.get(item.code);
      foods.set(item.code, {
        value: item.code,
        name: item.name,
        quantity: (existing?.quantity ?? 0) + item.quantity,
      });
    }
  const options: { value: string; label: string; disabled?: boolean }[] = [...foods.values()].map(
    (food) => ({ value: food.value, label: `${food.name} ×${food.quantity}` }),
  );
  if (value && !foods.has(value))
    options.unshift({
      value,
      label: `${savedName || '已保存食物'}（${resource.hasMore ? '未在已加载背包中' : '暂无库存'}）`,
      disabled: true,
    });
  return (
    <div className={styles.foodSelect}>
      <span>选择食物</span>
      {resource.state.status === 'loading' ? (
        <LoadingIndicator compact>正在读取背包食物…</LoadingIndicator>
      ) : resource.state.status === 'error' ? (
        <div role="alert">
          <p>{resource.state.message}</p>
          <Button variant="secondary" onClick={resource.reload}>
            重试食物
          </Button>
        </div>
      ) : (
        <>
          <Select
            label="选择食物"
            appearance="pixel"
            value={value}
            placeholder="从背包选择食物"
            options={options}
            disabled={disabled || (!options.length && !resource.hasMore)}
            onValueChange={onChange}
            pagination={
              <InfiniteScroll
                label="食物"
                hasMore={resource.hasMore}
                loading={resource.loadingMore}
                error={resource.error}
                onLoadMore={resource.loadMore}
              />
            }
          />
          {!foods.size && !resource.hasMore && (
            <p className={styles.muted}>背包暂无可用食物，可前往补给铺购买。</p>
          )}
        </>
      )}
    </div>
  );
}
