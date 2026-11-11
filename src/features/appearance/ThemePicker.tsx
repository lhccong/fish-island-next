import { useState, type CSSProperties } from 'react';
import { Check, Palette } from 'lucide-react';
import { builtinSkins } from '@/skins/builtin';
import { Dialog } from '@/shared/ui/Dialog';
import { useAppearanceStore } from './model/appearance-store';
import styles from './ThemePicker.module.css';

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const skinId = useAppearanceStore((state) => state.skinId);
  const setSkinId = useAppearanceStore((state) => state.setSkinId);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      className={styles.dialog ?? ''}
      dismissLabel="关闭主题弹窗"
      showCloseAction={false}
      title="主题模式"
      description="选择后立即生效，刷新后保留。"
      trigger={
        <button className={styles.trigger} type="button" aria-label="切换主题" title="切换主题">
          <Palette size={21} aria-hidden="true" />
          <span>主题</span>
        </button>
      }
    >
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
              style={skin.tokens as CSSProperties}
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
        <span>
          <Check size={14} aria-hidden="true" /> 自动保存你的选择
        </span>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          关闭
        </button>
      </div>
    </Dialog>
  );
}
