import { Pencil, Eraser, Undo2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Slider } from '@/shared/ui/Slider';
import { DrawPaintPicker } from './DrawPaintPicker';
import styles from './Draw.module.css';
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
        <DrawPaintPicker paint={paint} onPaint={onPaint} />
        <Slider label="笔触粗细" min={2} max={20} value={size} onValueChange={onSize} />
      </div>
    </div>
  );
}
