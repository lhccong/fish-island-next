import { useState, type RefObject } from 'react';
import type { Crop } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { CropArtwork } from './CropArtwork';
import styles from './Farm.module.css';
const categories = [
  { value: 'all', label: '全部作物' },
  { value: 'grain', label: '粮食' },
  { value: 'vegetable', label: '蔬菜' },
  { value: 'fruit', label: '水果' },
  { value: 'flower', label: '花卉' },
  { value: 'specialty', label: '特产' },
];
export function SeedDialog({
  crops,
  returnFocusRef,
  count,
  balance,
  level,
  busy,
  onClose,
  onPlant,
}: {
  crops: Crop[];
  returnFocusRef: RefObject<HTMLElement | null>;
  count: number;
  balance: number;
  level: number;
  busy: boolean;
  onClose: () => void;
  onPlant: (id: string) => Promise<boolean>;
}) {
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const crop = crops.find((c) => c.id === selected);
  const available = crops.filter((c) => category === 'all' || c.category === category);
  const allowed =
    crop && !crop.locked && crop.unlockLevel <= level && crop.price * count <= balance;
  return (
    <Dialog
      returnFocusRef={returnFocusRef}
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title="选择种子"
      description={`播种 ${count} 块空地 · 可用 ${balance} 积分`}
      showCloseAction={false}
      dismissLabel="关闭种子选择"
      className={styles.dialog ?? ''}
    >
      <Select label="作物分类" value={category} onValueChange={setCategory} options={categories} />
      <ScrollArea label="种子目录" gutter="reserved" className={styles.dialogScroll ?? ''}>
        <div className={styles.seeds}>
          {!available.length && <p>暂无这类作物，请切换分类。</p>}
          {available.map((c) => (
            <button
              type="button"
              className={styles.seed}
              aria-pressed={selected === c.id}
              key={c.id}
              disabled={busy || c.locked || c.unlockLevel > level}
              onClick={() => setSelected(c.id)}
            >
              <CropArtwork icon={c.icon} mature />
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.growthTime} 分钟 · 收获 {c.coin} 积分 · {c.experience} 经验
                </small>
                <small>
                  {c.locked || c.unlockLevel > level
                    ? `农场 Lv.${c.unlockLevel} 解锁`
                    : `每块 ${c.price} 积分`}
                </small>
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className={styles.dialogFooter}>
        <span>
          {crop
            ? `合计 ${crop.price * count} 积分${!allowed ? ' · 等级或积分不足' : ''}`
            : '请选择一种作物'}
        </span>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button
            disabled={busy || !allowed}
            onClick={async () => {
              if (crop && (await onPlant(crop.id))) onClose();
            }}
          >
            {busy ? '播种中…' : '确认播种'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
