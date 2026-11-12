import { useId, useState, type KeyboardEvent } from 'react';
import { BookOpen, Palette, Volume2 } from 'lucide-react';
import { defaultReaderSettings, type ReaderSettings } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { ReadingPreferences } from './ReadingPreferences';
import { ReaderThemes } from './ReaderThemes';
import { SpeechSettings } from './SpeechSettings';
import { AdvancedReaderSettings } from './AdvancedReaderSettings';
import styles from './ReaderSettings.module.css';

const tabs = [
  { id: 'reading', label: '阅读设置', icon: BookOpen },
  { id: 'themes', label: '主题设置', icon: Palette },
  { id: 'speech', label: '朗读设置', icon: Volume2 },
] as const;
export function ReaderSettingsPanel({
  controller,
  onClose,
}: {
  controller: ReaderController;
  onClose: () => void;
}) {
  const settings = useReader(controller, (state) => state.settings);
  const storageError = useReader(controller, (state) => state.storageError);
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('reading');
  const [notice, setNotice] = useState('');
  const id = useId();
  const update = (patch: Partial<ReaderSettings>) =>
    controller.getState().configure({ ...controller.getState().settings, ...patch });
  const tabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next]!.id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="阅读设置"
      description="调整阅读排版、主题配色与朗读。修改即时生效。"
      hideDescription
      dismissLabel="关闭阅读设置"
      showCloseAction={false}
      className={styles.dialog ?? ''}
    >
      <div className={styles.tabs} role="tablist" aria-label="阅读设置分类">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            id={`${id}-${item.id}-tab`}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`${id}-${item.id}-panel`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => tabKey(event, index)}
          >
            <item.icon size={16} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      <ScrollArea label="阅读设置内容" className={styles.scroll ?? ''} gutter="reserved">
        <div
          className={styles.panel}
          role="tabpanel"
          id={`${id}-reading-panel`}
          aria-labelledby={`${id}-reading-tab`}
          hidden={tab !== 'reading'}
        >
          <ReadingPreferences settings={settings} onChange={update} />
          <Button
            variant="secondary"
            onClick={() => {
              update({
                ...defaultReaderSettings,
                apiBaseUrl: settings.apiBaseUrl,
                customThemes: settings.customThemes,
              });
              setNotice('已恢复默认样式');
            }}
          >
            恢复默认样式
          </Button>
          <AdvancedReaderSettings controller={controller} />
        </div>
        <div
          className={styles.panel}
          role="tabpanel"
          id={`${id}-themes-panel`}
          aria-labelledby={`${id}-themes-tab`}
          hidden={tab !== 'themes'}
        >
          <ReaderThemes settings={settings} controller={controller} onChange={update} />
        </div>
        <div
          className={styles.panel}
          role="tabpanel"
          id={`${id}-speech-panel`}
          aria-labelledby={`${id}-speech-tab`}
          hidden={tab !== 'speech'}
        >
          <SpeechSettings settings={settings} onChange={update} />
        </div>
      </ScrollArea>
      {storageError && (
        <p className={styles.storageError} role="alert">
          {storageError}
        </p>
      )}
      <div className={styles.footer}>
        <span role="status">{storageError ? '设置尚未保存' : notice || '即时生效 · 自动保存'}</span>
        <Button onClick={onClose}>完成</Button>
      </div>
    </Dialog>
  );
}
