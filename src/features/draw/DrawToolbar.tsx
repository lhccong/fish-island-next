import { Pencil, Eraser, Undo2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Slider } from '@/shared/ui/Slider';
import styles from './Draw.module.css';
const paints = [
  ['ink', '墨黑'],
  ['red', '朱红'],
  ['blue', '海蓝'],
  ['green', '草绿'],
  ['gold', '金黄'],
  ['purple', '紫色'],
] as const;
export function DrawToolbar({
  paint,
  eraser,
  size,
  onPaint,
  onEraser,
  onSize,
  onUndo,
  onClear,
}: {
  paint: string;
  eraser: boolean;
  size: number;
  onPaint: (value: string) => void;
  onEraser: (value: boolean) => void;
  onSize: (value: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className={styles.tools} role="group" aria-label="画布工具">
      <div className={styles.toolButtons}>
        <Button
          variant={eraser ? 'secondary' : 'primary'}
          onClick={() => onEraser(false)}
          aria-pressed={!eraser}
        >
          <Pencil size={15} aria-hidden="true" />
          画笔
        </Button>
        <Button
          variant={eraser ? 'primary' : 'secondary'}
          onClick={() => onEraser(true)}
          aria-pressed={eraser}
        >
          <Eraser size={15} aria-hidden="true" />
          橡皮擦
        </Button>
        <Button variant="secondary" onClick={onUndo}>
          <Undo2 size={15} aria-hidden="true" />
          撤销
        </Button>
        <Button variant="secondary" onClick={onClear}>
          <Trash2 size={15} aria-hidden="true" />
          清空画布
        </Button>
      </div>
      <div className={styles.brush}>
        <Select
          label="画笔颜色"
          value={paint}
          onValueChange={onPaint}
          options={paints.map((p) => ({ value: p[0], label: p[1] }))}
        />
        <Slider label="笔触粗细" min={2} max={20} value={size} onValueChange={onSize} />
      </div>
    </div>
  );
}
