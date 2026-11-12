import { useState } from 'react';
import type { ReaderSettings } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import styles from './ReaderSettings.module.css';

export function CustomThemeEditor({ controller }: { controller: ReaderController }) {
  const themes = useReader(controller, (state) => state.settings.customThemes);
  const [name, setName] = useState('');
  const [paper, setPaper] = useState('');
  const [ink, setInk] = useState('');
  const [error, setError] = useState('');
  const update = (settings: Partial<ReaderSettings>) =>
    controller.getState().configure({ ...controller.getState().settings, ...settings });
  return (
    <details className={styles.themeEditor}>
      <summary>自定义正文主题</summary>
      <p className={styles.hint}>自选颜色仅影响正文，输入六位十六进制颜色。</p>
      <div className={styles.formGrid}>
        <label>
          主题名称
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} />
        </label>
        <label>
          背景颜色
          <input
            placeholder="#f0e6d2"
            value={paper}
            onChange={(event) => setPaper(event.target.value)}
          />
        </label>
        <label>
          文字颜色
          <input
            placeholder="#5c4b36"
            value={ink}
            onChange={(event) => setInk(event.target.value)}
          />
        </label>
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          if (!name.trim() || !/^#[\da-f]{6}$/i.test(paper) || !/^#[\da-f]{6}$/i.test(ink)) {
            setError('请填写主题名及有效的六位颜色');
            return;
          }
          const old = themes.find((theme) => theme.name === name.trim());
          const theme = {
            id: old?.id ?? crypto.randomUUID(),
            name: name.trim(),
            backgroundColor: paper,
            fontColor: ink,
            fontSize: controller.getState().settings.fontSize,
            fontFamily: controller.getState().settings.fontFamily,
            lineHeight: controller.getState().settings.lineHeight,
            letterSpacing: controller.getState().settings.letterSpacing,
          };
          update({
            customThemes: [...themes.filter((item) => item.id !== theme.id), theme].slice(-30),
            theme: theme.id,
          });
          setError('主题已保存');
        }}
      >
        保存并应用主题
      </Button>
      {error && <p role="status">{error}</p>}
      {themes.map((theme) => (
        <div className={styles.actions} key={theme.id}>
          <span>{theme.name}</span>
          <Button
            variant="secondary"
            onClick={() => {
              setName(theme.name);
              setPaper(theme.backgroundColor);
              setInk(theme.fontColor);
              const current = controller.getState().settings;
              update({
                theme: theme.id,
                fontSize: theme.fontSize ?? current.fontSize,
                fontFamily: theme.fontFamily || current.fontFamily,
                lineHeight: theme.lineHeight ?? current.lineHeight,
                letterSpacing: theme.letterSpacing ?? current.letterSpacing,
              });
            }}
          >
            编辑
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              update({
                customThemes: themes.filter((item) => item.id !== theme.id),
                theme:
                  controller.getState().settings.theme === theme.id
                    ? 'default'
                    : controller.getState().settings.theme,
              })
            }
          >
            删除主题
          </Button>
        </div>
      ))}
    </details>
  );
}
