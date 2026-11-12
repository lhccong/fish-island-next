import { useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { normalizeReaderColor, type ReaderSettings } from '@/domain/reader';
import { readingThemes } from './reading-themes';
import styles from './ReaderSettings.module.css';

export function ReadingColors({
  settings,
  onChange,
}: {
  settings: ReaderSettings;
  onChange: (patch: Partial<ReaderSettings>) => void;
}) {
  const custom = settings.customThemes.find((item) => item.id === settings.theme);
  const preset = readingThemes.some((item) => item.value === settings.theme)
    ? settings.theme
    : 'default';
  const apply = (kind: 'ink' | 'paper', value: string) => {
    const tokens = getComputedStyle(document.documentElement);
    const fontColor = normalizeReaderColor(
      custom?.fontColor ?? tokens.getPropertyValue(`--color-reader-${preset}-ink`).trim(),
    );
    const backgroundColor = normalizeReaderColor(
      custom?.backgroundColor ?? tokens.getPropertyValue(`--color-reader-${preset}-paper`).trim(),
    );
    const selected = normalizeReaderColor(value);
    if (!fontColor || !backgroundColor || !selected) return;
    const theme = {
      id: 'reader-personal-colors',
      name: '个人配色',
      fontColor,
      backgroundColor,
      [kind === 'ink' ? 'fontColor' : 'backgroundColor']: selected,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      lineHeight: settings.lineHeight,
      letterSpacing: settings.letterSpacing,
    };
    onChange({
      theme: theme.id,
      customThemes: [...settings.customThemes.filter((item) => item.id !== theme.id), theme].slice(
        -30,
      ),
    });
  };
  return (
    <div className={styles.colors}>
      {(['ink', 'paper'] as const).map((kind) => (
        <ColorField
          key={`${settings.theme}:${kind}`}
          kind={kind}
          value={custom?.[kind === 'ink' ? 'fontColor' : 'backgroundColor']}
          preset={preset}
          onChange={(value) => apply(kind, value)}
        />
      ))}
    </div>
  );
}
function ColorField({
  kind,
  value,
  preset,
  onChange,
}: {
  kind: 'ink' | 'paper';
  value: string | undefined;
  preset: string;
  onChange: (value: string) => void;
}) {
  const [edit, setEdit] = useState({ source: value, text: value ?? '' });
  const draft = edit.source === value ? edit.text : (value ?? '');
  const label = kind === 'ink' ? '文字颜色' : '背景颜色';
  const invalid = draft.length > 0 && !/^#[\da-f]{6}$/i.test(draft);
  return (
    <details className={styles.colorField}>
      <summary>
        <span
          className={styles.colorSwatch}
          style={
            { backgroundColor: value ?? `var(--color-reader-${preset}-${kind})` } as CSSProperties
          }
        />
        <span>{label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className={styles.palette}>
        {readingThemes.map((theme) => (
          <button
            key={theme.value}
            type="button"
            aria-label={`${label}：${theme.label}`}
            style={{ backgroundColor: `var(--color-reader-${theme.value}-${kind})` }}
            onClick={() =>
              onChange(
                getComputedStyle(document.documentElement)
                  .getPropertyValue(`--color-reader-${theme.value}-${kind}`)
                  .trim(),
              )
            }
          />
        ))}
      </div>
      <input
        className={styles.input}
        aria-label={`自定义${label}`}
        aria-invalid={invalid}
        value={draft}
        placeholder="#RRGGBB"
        maxLength={7}
        onChange={(event) => {
          const next = event.target.value;
          setEdit({ source: value, text: next });
          if (/^#[\da-f]{6}$/i.test(next)) onChange(next);
        }}
      />
      {invalid && <small className={styles.invalid}>请输入六位十六进制颜色</small>}
    </details>
  );
}
