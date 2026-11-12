import { useId, type CSSProperties } from 'react';
import styles from './Slider.module.css';
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  valueText?: string;
  onValueChange: (value: number) => void;
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  valueText = String(value),
  onValueChange,
}: SliderProps) {
  const id = useId();
  const progress = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={styles.root} data-disabled={disabled}>
      <div className={styles.heading}>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} aria-hidden="true">
          {valueText}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className={styles.input}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        style={{ '--slider-progress': `${progress}%` } as CSSProperties}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next)) onValueChange(next);
        }}
      />
    </div>
  );
}
