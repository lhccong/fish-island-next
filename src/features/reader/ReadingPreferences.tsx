import type { ReaderSettings } from '@/domain/reader';
import { Select } from '@/shared/ui/Select';
import { Slider } from '@/shared/ui/Slider';
import { fontOptions, readingStyle } from './reading-themes';
import { ReadingColors } from './ReadingColors';
import styles from './ReaderSettings.module.css';

const fields = [
  ['paragraphIndent', '段前缩进', 0, 4, 1, 'em'],
  ['fontSize', '字号', 12, 40, 1, 'px'],
  ['lineHeight', '行高', 1.2, 3, 0.1, ''],
  ['letterSpacing', '字间距', 0, 8, 0.1, 'px'],
  ['opacity', '不透明度', 0.2, 1, 0.05, '%'],
] as const;
export function ReadingPreferences({
  settings,
  onChange,
}: {
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
}) {
  return (
    <>
      <div className={styles.field}>
        <span className={styles.caption}>字体选择</span>
        <Select
          label="字体"
          value={settings.fontFamily}
          options={fontOptions}
          onValueChange={(fontFamily) => onChange({ fontFamily })}
        />
      </div>
      <div className={styles.sliders}>
        {fields.map(([key, label, min, max, step, unit]) => (
          <Slider
            key={key}
            label={label}
            value={settings[key]}
            min={min}
            max={max}
            step={step}
            valueText={
              key === 'opacity'
                ? `${Math.round(settings.opacity * 100)}%`
                : `${settings[key]}${unit}`
            }
            onValueChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </div>
      <ReadingColors settings={settings} onChange={onChange} />
      <div className={styles.preview} style={readingStyle(settings)}>
        山有木兮木有枝，心悦君兮君不知。
      </div>
    </>
  );
}
