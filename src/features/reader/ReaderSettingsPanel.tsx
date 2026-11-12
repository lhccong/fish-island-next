import { useState } from 'react';
import { defaultReaderSettings, type ReaderSettings } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Select } from '@/shared/ui/Select';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { fontOptions, keyOptions, readingStyle, readingThemes } from './reading-themes';
import { SpeechSettings } from './SpeechSettings';
import { CustomThemeEditor } from './CustomThemeEditor';
import styles from './Reader.module.css';

const numericFields = [
  ['fontSize', '字号', 12, 40, 1],
  ['lineHeight', '行高', 1.2, 3, 0.1],
  ['letterSpacing', '字间距', 0, 8, 0.5],
  ['paragraphIndent', '段前缩进', 0, 4, 1],
  ['opacity', '不透明度', 0.2, 1, 0.05],
] as const;
export function ReaderSettingsPanel({
  controller,
  onClose,
}: {
  controller: ReaderController;
  onClose: () => void;
}) {
  const settings = useReader(controller, (state) => state.settings);
  const [token, setToken] = useState(controller.getState().accessToken);
  const [baseUrl, setBaseUrl] = useState(settings.apiBaseUrl);
  const [notice, setNotice] = useState('');
  const update = (patch: Partial<ReaderSettings>) =>
    controller.getState().configure({ ...controller.getState().settings, ...patch });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="阅读设置"
      dismissLabel="关闭阅读设置"
      description="排版实时保存；阅读服务默认使用项目配置，可在当前会话覆盖。"
      className={styles.wideDialog ?? ''}
    >
      <div className={styles.settings}>
        <Select
          label="阅读主题"
          value={settings.theme}
          options={[
            ...readingThemes,
            ...settings.customThemes.map((theme) => ({ value: theme.id, label: theme.name })),
          ]}
          onValueChange={(theme) => {
            const custom = settings.customThemes.find((item) => item.id === theme);
            update({
              theme,
              fontSize: custom?.fontSize ?? 18,
              fontFamily: custom?.fontFamily ?? settings.fontFamily,
              lineHeight: custom?.lineHeight ?? 1.8,
              letterSpacing: custom?.letterSpacing ?? 0.5,
            });
          }}
        />
        <Select
          label="字体"
          value={settings.fontFamily}
          options={fontOptions}
          onValueChange={(fontFamily) => update({ fontFamily })}
        />
        <div className={styles.formGrid}>
          {numericFields.map(([key, label, min, max, step]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= min && value <= max)
                    update({ [key]: value });
                }}
              />
            </label>
          ))}
        </div>
        <div className={styles.preview} style={readingStyle(settings)}>
          阅读预览：偷得浮生半日闲，让文字陪伴片刻时光。
        </div>
        <CustomThemeEditor controller={controller} />
        <Select
          label="阅读窗口"
          value={settings.floating ? 'floating' : 'page'}
          options={[
            { value: 'floating', label: '全局悬浮阅读' },
            { value: 'page', label: '页面内阅读' },
          ]}
          onValueChange={(value) => update({ floating: value === 'floating' })}
        />
        <Select
          label="背景点击"
          value={settings.clickThrough ? 'through' : 'close'}
          options={[
            { value: 'through', label: '点击穿透，可操作背景页面' },
            { value: 'close', label: '点击背景关闭阅读器' },
          ]}
          onValueChange={(value) => update({ clickThrough: value === 'through' })}
        />
        <Select
          label="窗口拖动"
          value={String(settings.allowWindowMove)}
          options={[
            { value: 'true', label: '允许拖动' },
            { value: 'false', label: '锁定位置' },
          ]}
          onValueChange={(value) => update({ allowWindowMove: value === 'true' })}
        />
        <Select
          label="快速隐藏"
          value={settings.quickHide}
          options={[
            { value: 'none', label: '仅使用隐藏按钮' },
            { value: 'mouseOut', label: '鼠标移出窗口隐藏' },
            { value: 'key', label: '使用紧急快捷键' },
          ]}
          onValueChange={(value) => update({ quickHide: value as ReaderSettings['quickHide'] })}
        />
        <Select
          label="紧急隐藏快捷键"
          value={settings.panicKey}
          options={keyOptions}
          onValueChange={(panicKey) => update({ panicKey })}
        />
        <Select
          label="上一章快捷键"
          value={settings.prevPageKey}
          options={keyOptions}
          onValueChange={(prevPageKey) => update({ prevPageKey })}
        />
        <Select
          label="下一章快捷键"
          value={settings.nextPageKey}
          options={keyOptions}
          onValueChange={(nextPageKey) => update({ nextPageKey })}
        />
        <p className={styles.hint}>
          快捷键在阅读区域生效，输入和弹窗内不会触发。Ctrl+T 切换背景点击，目录请使用工具栏。
        </p>
        <SpeechSettings settings={settings} onChange={update} />
        <fieldset>
          <legend>阅读服务</legend>
          <label>
            API 服务地址
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://reader.yucoder.cn/reader3"
            />
          </label>
          <label>
            阅读服务凭证（当前会话覆盖）
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              try {
                const url = new URL(baseUrl);
                if (
                  !['https:', 'http:'].includes(url.protocol) ||
                  url.username ||
                  url.password ||
                  url.search ||
                  url.hash
                )
                  throw new Error();
                controller.getState().setAccessToken(token.trim());
                setToken(controller.getState().accessToken);
                update({ apiBaseUrl: baseUrl.replace(/\/$/, '') });
                setNotice('阅读服务配置已应用');
              } catch {
                setNotice('请输入有效的 HTTP/HTTPS 服务地址，不包含凭证、查询或片段');
              }
            }}
          >
            应用服务配置
          </Button>
          <p className={styles.hint}>
            已接入项目默认配置；留空并应用可恢复默认值。会话覆盖不写入书架。
          </p>
        </fieldset>
        {notice && <p role="status">{notice}</p>}
        <Button
          variant="secondary"
          onClick={() => {
            update({
              ...defaultReaderSettings,
              apiBaseUrl: settings.apiBaseUrl,
              customThemes: settings.customThemes,
            });
            setNotice('阅读排版与操作已恢复默认');
          }}
        >
          恢复默认阅读设置
        </Button>
      </div>
    </Dialog>
  );
}
