import { Moon, Sun } from 'lucide-react';
import { useAppearanceStore } from './model/appearance-store';
import styles from './ColorModePicker.module.css';

export function ColorModePicker() {
  const mode = useAppearanceStore((state) => state.colorMode);
  const setMode = useAppearanceStore((state) => state.setColorMode);
  return (
    <div className={styles.options} role="group" aria-label="明暗模式">
      <button type="button" aria-pressed={mode === 'light'} onClick={() => setMode('light')}>
        <Sun size={18} aria-hidden="true" />
        明亮模式
      </button>
      <button type="button" aria-pressed={mode === 'dark'} onClick={() => setMode('dark')}>
        <Moon size={18} aria-hidden="true" />
        暗夜模式
      </button>
    </div>
  );
}
