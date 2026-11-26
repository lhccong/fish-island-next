import { useState, type CSSProperties, type PointerEvent } from 'react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Slider } from '@/shared/ui/Slider';
import {
  colorFromHsv,
  colorToHsv,
  normalizeTodoColor,
  todoColorStyle,
  type Hsv,
} from './todo-color';
import styles from './TodoColorPicker.module.css';

const presets = [
  { label: '浅绿', hex: '#CDE4D8' },
  { label: '浅黄', hex: '#FFF0C2' },
  { label: '浅粉', hex: '#FFE5E5' },
  { label: '浅紫', hex: '#E6DFFF' },
  { label: '浅蓝', hex: '#DCECFF' },
];
const defaultHsv = colorToHsv('#CDE4D8');
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const movement: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowDown: [0, -1],
  ArrowUp: [0, 1],
};

export function TodoColorPicker({
  value,
  onApply,
  popup = false,
}: {
  value: string | undefined;
  onApply: (value: string) => void;
  popup?: boolean;
}) {
  const initial = normalizeTodoColor(value);
  const [text, setText] = useState(initial ?? '');
  const [hsv, setHsv] = useState(() => (initial ? colorToHsv(initial) : defaultHsv));
  const color = /^#[\da-f]{6}$/i.test(text.trim()) ? text.trim().toUpperCase() : undefined;
  const invalid = text !== '' && !color;

  function updateHsv(next: Hsv) {
    setHsv(next);
    setText(colorFromHsv(next));
  }

  function point(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    updateHsv({
      ...hsv,
      saturation: clamp((event.clientX - bounds.left) / bounds.width),
      brightness: clamp(1 - (event.clientY - bounds.top) / bounds.height),
    });
  }

  const fields = (
    <div className={styles.fields}>
      <div className={styles.presets} role="group" aria-label="预设颜色">
        {presets.map(({ label, hex }) => (
          <Button
            key={hex}
            className={styles.preset}
            variant="secondary"
            style={{ '--swatch': hex } as CSSProperties}
            aria-label={label}
            aria-pressed={color === hex}
            onClick={() => {
              setText(hex);
              setHsv(colorToHsv(hex));
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.plane}
        style={{ '--hue': hsv.hue } as CSSProperties}
        aria-label={`饱和度 ${Math.round(hsv.saturation * 100)}%，明度 ${Math.round(hsv.brightness * 100)}%。使用方向键调整`}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
        }}
        onKeyDown={(event) => {
          const delta = movement[event.key];
          if (!delta) return;
          event.preventDefault();
          const step = event.shiftKey ? 0.1 : 0.02;
          updateHsv({
            ...hsv,
            saturation: clamp(hsv.saturation + delta[0] * step),
            brightness: clamp(hsv.brightness + delta[1] * step),
          });
        }}
      >
        <span
          className={styles.marker}
          aria-hidden="true"
          style={{ left: `${hsv.saturation * 100}%`, top: `${(1 - hsv.brightness) * 100}%` }}
        />
      </button>
      <Slider
        appearance="hue"
        label="色相"
        min={0}
        max={359}
        value={hsv.hue}
        valueText={`${hsv.hue}°`}
        onValueChange={(hue) =>
          updateHsv({
            ...hsv,
            hue,
            saturation: hsv.saturation || 0.75,
            brightness: hsv.brightness || 0.8,
          })
        }
      />
      <div className={styles.inputRow}>
        <span className={styles.sample} style={todoColorStyle(color)} aria-hidden="true">
          Aa
        </span>
        <input
          className={styles.hex}
          aria-label="HEX 颜色"
          aria-invalid={invalid}
          placeholder="#RRGGBB"
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (/^#[\da-f]{6}$/i.test(next)) setHsv(colorToHsv(next));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!invalid) onApply(color ?? 'transparent');
            }
          }}
        />
      </div>
      {invalid && (
        <p className={styles.error} role="alert">
          请输入 # 加六位十六进制颜色
        </p>
      )}
    </div>
  );

  return (
    <div className={styles.picker} data-popup={popup || undefined}>
      {popup ? (
        <ScrollArea
          gutter="reserved"
          className={styles.scroll ?? ''}
          persistentScrollbar
          label="描述底色滚动区"
        >
          {fields}
        </ScrollArea>
      ) : (
        fields
      )}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            setText('');
            setHsv(defaultHsv);
          }}
        >
          恢复默认
        </Button>
        <Button disabled={invalid} onClick={() => onApply(color ?? 'transparent')}>
          应用
        </Button>
      </div>
    </div>
  );
}
