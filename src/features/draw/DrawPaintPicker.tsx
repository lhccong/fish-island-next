import { useId, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Popover } from '@/shared/ui/Popover';
import { Select } from '@/shared/ui/Select';
import styles from './Draw.module.css';

export const defaultDrawPaint = '#202124';

const paints = [
  { value: defaultDrawPaint, label: '墨黑' },
  { value: '#ffffff', label: '白色' },
  { value: '#80868b', label: '灰色' },
  { value: '#d93025', label: '朱红' },
  { value: '#f4511e', label: '橙色' },
  { value: '#e8a000', label: '金黄' },
  { value: '#ffff00', label: '亮黄' },
  { value: '#188038', label: '草绿' },
  { value: '#7cb342', label: '浅绿' },
  { value: '#00897b', label: '青绿' },
  { value: '#00cddd', label: '亮青' },
  { value: '#1967d2', label: '海蓝' },
  { value: '#5cbbf6', label: '天蓝' },
  { value: '#9334e6', label: '紫色' },
  { value: '#e91e63', label: '桃红' },
  { value: '#f48fb1', label: '粉色' },
  { value: '#795548', label: '棕色' },
  { value: '#dfb48c', label: '米色' },
];

export function DrawPaintPicker({
  paint,
  onPaint,
}: {
  paint: string;
  onPaint: (paint: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(paint);
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();
  const options = paints.some(({ value }) => value === paint)
    ? paints
    : [...paints, { value: paint, label: paint.toUpperCase() }];
  const hex = draft.trim().replace(/^#/, '');
  const preview = /^[\da-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null;

  return (
    <div className={styles.colorControls}>
      <span className={styles.paintSwatch} style={{ backgroundColor: paint }} aria-hidden="true" />
      <Select label="画笔颜色" value={paint} onValueChange={onPaint} options={options} />
      <Popover
        label="自定义颜色"
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setDraft(paint);
            setInvalid(false);
          }
          setOpen(next);
        }}
        trigger={<Button variant="secondary">自定义颜色</Button>}
      >
        <form
          className={styles.customPaint}
          onSubmit={(event) => {
            event.preventDefault();
            if (!preview) {
              setInvalid(true);
              return;
            }
            onPaint(preview);
            setOpen(false);
          }}
        >
          <label htmlFor={inputId}>十六进制颜色</label>
          <div className={styles.paintInput}>
            <span
              className={styles.paintSwatch}
              style={{ backgroundColor: preview ?? paint }}
              aria-hidden="true"
            />
            <input
              id={inputId}
              value={draft}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={invalid}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
            />
          </div>
          {invalid && <p role="alert">请输入 6 位十六进制颜色，例如 #4F8AC9。</p>}
          <Button type="submit">应用颜色</Button>
        </form>
      </Popover>
    </div>
  );
}
