import { useState, type CSSProperties } from 'react';
import { Check, Palette } from 'lucide-react';
import { builtinSkins, getSkinTokens } from '@/skins/builtin';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { useAppearanceStore } from './model/appearance-store';
import styles from './ThemePicker.module.css';
import { ColorModePicker } from './ColorModePicker';
import { WebsiteSettingsForm } from './WebsiteSettingsForm';
import websiteStyles from './WebsiteSettings.module.css';

export function ThemePicker({ presentation = 'rail' }: { presentation?: 'rail' | 'ribbon' }) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState(false);
  const skinId = useAppearanceStore((state) => state.skinId);
  const colorMode = useAppearanceStore((state) => state.colorMode);
  const setSkinId = useAppearanceStore((state) => state.setSkinId);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setWebsite(false);
      }}
      className={(website ? websiteStyles.dialog : styles.dialog) ?? ''}
      dismissLabel={website ? '关闭网站设置' : '关闭主题弹窗'}
      showCloseAction={false}
      title={website ? '网站设置' : '主题模式'}
      description={
        website
          ? '自定义标签页名称和图标，保存到此浏览器，刷新后保留。'
          : '选择后立即生效，刷新后保留。'
      }
      trigger={
        <button
          className={styles.trigger}
          data-presentation={presentation}
          type="button"
          aria-label="切换主题"
          title="切换主题"
        >
          <Palette size={21} aria-hidden="true" />
          <span>主题</span>
        </button>
      }
    >
      {website ? (
        <WebsiteSettingsForm />
      ) : (
        <>
          <ColorModePicker />
          <div className={styles.options} role="group" aria-label="主题选择">
            {builtinSkins.map((skin) => (
              <button
                className={styles.option}
                key={skin.id}
                type="button"
                aria-label={skin.name}
                aria-pressed={skinId === skin.id}
                onClick={() => setSkinId(skin.id)}
              >
                <span
                  className={styles.preview}
                  style={getSkinTokens(skin.id, colorMode) as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={styles.previewRail}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.previewSidebar}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.previewChat}>
                    <i className={styles.previewHeading} />
                    <i className={styles.incoming} />
                    <i className={styles.outgoing} />
                    <i className={styles.previewInput} />
                  </span>
                </span>
                <span className={styles.caption}>
                  <span>{skin.name}</span>
                  <span className={styles.selection} aria-hidden="true">
                    {skinId === skin.id && <Check size={12} strokeWidth={3} />}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className={styles.footer}>
            <Button variant="secondary" onClick={() => setWebsite(true)}>
              网站设置
            </Button>
            <Button onClick={() => setOpen(false)}>关闭</Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
