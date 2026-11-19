import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import {
  defaultFontScale,
  defaultTabIdentity,
  fontScaleOptions,
  isFontScale,
  isPresetTabIcon,
  isTabIcon,
  normalizeTabIdentity,
  tabIdentityPresets,
  useWebsiteSettingsStore,
} from './model/website-settings-store';
import { checkTabImage, readTabImage } from './tab-image';
import styles from './WebsiteSettings.module.css';

export function WebsiteSettingsForm() {
  const saved = useWebsiteSettingsStore((state) => state.identity);
  const savedFontScale = useWebsiteSettingsStore((state) => state.fontScale);
  const save = useWebsiteSettingsStore((state) => state.save);
  const [name, setName] = useState(saved.name);
  const [icon, setIcon] = useState(saved.icon);
  const [fontScale, setFontScale] = useState(savedFontScale);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    operation.current = new AbortController();
    return () => operation.current?.abort();
  }, []);
  function updateIcon(value: string) {
    setIcon(value);
    setPreviewFailed(false);
    setFeedback('');
    setError('');
  }
  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault();
        setFeedback('');
        setError('');
        if (!name.trim() || name.trim().length > 60) {
          setError('请输入 1～60 字的网站名称。');
          return;
        }
        setBusy(true);
        try {
          // Validate the address before letting the browser request it.
          const identity = normalizeTabIdentity({ name, icon });
          if (!identity) throw new Error('请输入 HTTPS 图标地址，或选择本地图片。');
          if (identity.icon !== saved.icon) {
            await checkTabImage(identity.icon, operation.current?.signal);
          }
          if (operation.current?.signal.aborted) return;
          save(identity, fontScale);
          setName(identity.name);
          setIcon(identity.icon);
          setFeedback('已保存到此浏览器');
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : '保存失败，请重试。');
        } finally {
          setBusy(false);
        }
      }}
    >
      <ScrollArea label="网站设置内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <span>界面字号</span>
            <Select
              label="界面字号"
              value={fontScale}
              options={fontScaleOptions}
              disabled={busy}
              onValueChange={(value) => {
                if (!isFontScale(value)) return;
                setFontScale(value);
                setFeedback('');
                setError('');
              }}
            />
          </div>
          <label className={styles.field}>
            <span>网站名称</span>
            <input
              aria-label="网站名称"
              value={name}
              maxLength={60}
              disabled={busy}
              onChange={(event) => {
                setName(event.target.value);
                setFeedback('');
                setError('');
              }}
            />
          </label>
          <div className={styles.field}>
            <span>网站图标</span>
            <div className={styles.preview} aria-label="标签页预览">
              {previewFailed || !isTabIcon(icon) ? (
                <span className={styles.placeholder}>?</span>
              ) : (
                <img
                  key={icon}
                  src={icon}
                  alt="网站图标预览"
                  onError={() => setPreviewFailed(true)}
                />
              )}
              <span>{name.trim() || '网站名称'}</span>
            </div>
            <div className={styles.presets} role="group" aria-label="网站图标预设">
              {tabIdentityPresets.map((preset) => (
                <Button
                  key={preset.icon}
                  className={styles.preset ?? ''}
                  variant="secondary"
                  aria-pressed={icon === preset.icon && name.trim() === preset.name}
                  disabled={busy}
                  onClick={() => {
                    setName(preset.name);
                    updateIcon(preset.icon);
                  }}
                >
                  <img src={preset.icon} alt="" width={16} height={16} />
                  {preset.name}
                </Button>
              ))}
            </div>
            <label className={styles.field}>
              <span>图标地址</span>
              <input
                aria-label="图标地址"
                type="url"
                inputMode="url"
                disabled={busy}
                placeholder={
                  icon.startsWith('data:') ? '已选择本地图片' : 'https://example.com/icon.png'
                }
                value={icon.startsWith('data:') || isPresetTabIcon(icon) ? '' : icon}
                onChange={(event) => updateIcon(event.target.value || defaultTabIdentity.icon)}
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              aria-label="选择本地图标文件"
              hidden
              accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setBusy(true);
                setError('');
                setFeedback('');
                try {
                  const src = await readTabImage(file, operation.current?.signal);
                  if (!operation.current?.signal.aborted) updateIcon(src);
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : '读取失败，请重试。');
                } finally {
                  setBusy(false);
                }
              }}
            />
            <div>
              <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                选择本地图片
              </Button>
            </div>
            <p className={styles.hint}>
              PNG、JPEG、WebP 或 ICO，最大 256 KB；图片仅保存在此浏览器。
            </p>
          </div>
        </div>
      </ScrollArea>
      <div className={styles.feedback}>
        {busy && <LoadingIndicator compact>正在处理图标…</LoadingIndicator>}
        {error && <p role="alert">{error}</p>}
        {feedback && <p role="status">{feedback}</p>}
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setName(defaultTabIdentity.name);
            updateIcon(defaultTabIdentity.icon);
            setFontScale(defaultFontScale);
          }}
        >
          恢复默认
        </Button>
        <Button type="submit" disabled={busy}>
          保存
        </Button>
      </div>
    </form>
  );
}
