import { Check } from 'lucide-react';
import type { ReaderSettings } from '@/domain/reader';
import { CustomThemeEditor } from './CustomThemeEditor';
import type { ReaderController } from './controller';
import { readingStyle, readingThemes } from './reading-themes';
import styles from './ReaderSettings.module.css';

export function ReaderThemes({
  settings,
  controller,
  onChange,
}: {
  settings: ReaderSettings;
  controller: ReaderController;
  onChange: (patch: Partial<ReaderSettings>) => void;
}) {
  const select = (id: string) => {
    const custom = settings.customThemes.find((item) => item.id === id);
    onChange({
      theme: id,
      fontSize: custom?.fontSize ?? 18,
      fontFamily: custom?.fontFamily || settings.fontFamily,
      lineHeight: custom?.lineHeight ?? 1.8,
      letterSpacing: custom?.letterSpacing ?? 0.5,
    });
  };
  return (
    <>
      <h3 className={styles.sectionTitle}>系统主题</h3>
      <div className={styles.themeGrid}>
        {readingThemes
          .map((theme) => ({ id: theme.value, name: theme.label }))
          .map((theme) => (
            <button
              type="button"
              key={theme.id}
              className={styles.themeCard}
              aria-label={theme.name}
              aria-pressed={settings.theme === theme.id}
              onClick={() => select(theme.id)}
            >
              <span
                className={styles.themeSample}
                style={readingStyle({ ...settings, theme: theme.id })}
              >
                <span>Aa</span>
                {settings.theme === theme.id && <Check size={15} aria-hidden="true" />}
              </span>
              <span className={styles.themeName}>{theme.name}</span>
            </button>
          ))}
      </div>
      {settings.customThemes.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>我的主题</h3>
          <div className={styles.themeGrid}>
            {settings.customThemes.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={styles.themeCard}
                aria-label={theme.name}
                aria-pressed={settings.theme === theme.id}
                onClick={() => select(theme.id)}
              >
                <span
                  className={styles.themeSample}
                  style={readingStyle({ ...settings, theme: theme.id })}
                >
                  <span>Aa</span>
                  {settings.theme === theme.id && <Check size={15} aria-hidden="true" />}
                </span>
                <span className={styles.themeName}>{theme.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <CustomThemeEditor controller={controller} />
    </>
  );
}
