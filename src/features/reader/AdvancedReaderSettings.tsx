import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReaderSettings } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { keyOptions } from './reading-themes';
import styles from './ReaderSettings.module.css';

export function AdvancedReaderSettings({ controller }: { controller: ReaderController }) {
  const settings = useReader(controller, (state) => state.settings);
  const [token, setToken] = useState(controller.getState().accessToken);
  const [baseUrl, setBaseUrl] = useState(settings.apiBaseUrl);
  const [notice, setNotice] = useState('');
  const update = (patch: Partial<ReaderSettings>) =>
    controller.getState().configure({ ...controller.getState().settings, ...patch });
  return (
    <details className={styles.advanced}>
      <summary>
        窗口、快捷键与阅读服务
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className={styles.advancedBody}>
        <div className={styles.field}>
          <span className={styles.caption}>阅读窗口</span>
          <Select
            label="阅读窗口"
            value={settings.floating ? 'floating' : 'page'}
            options={[
              { value: 'floating', label: '全局悬浮阅读' },
              { value: 'page', label: '页面内阅读' },
            ]}
            onValueChange={(value) => update({ floating: value === 'floating' })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>背景点击</span>
          <Select
            label="背景点击"
            value={settings.clickThrough ? 'through' : 'close'}
            options={[
              { value: 'through', label: '点击穿透，可操作背景页面' },
              { value: 'close', label: '点击背景关闭阅读器' },
            ]}
            onValueChange={(value) => update({ clickThrough: value === 'through' })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>窗口拖动</span>
          <Select
            label="窗口拖动"
            value={String(settings.allowWindowMove)}
            options={[
              { value: 'true', label: '允许拖动' },
              { value: 'false', label: '锁定位置' },
            ]}
            onValueChange={(value) => update({ allowWindowMove: value === 'true' })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>快速隐藏</span>
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
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>紧急隐藏快捷键</span>
          <Select
            label="紧急隐藏快捷键"
            value={settings.panicKey}
            options={keyOptions}
            onValueChange={(panicKey) => update({ panicKey })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>上一章快捷键</span>
          <Select
            label="上一章快捷键"
            value={settings.prevPageKey}
            options={keyOptions}
            onValueChange={(prevPageKey) => update({ prevPageKey })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.caption}>下一章快捷键</span>
          <Select
            label="下一章快捷键"
            value={settings.nextPageKey}
            options={keyOptions}
            onValueChange={(nextPageKey) => update({ nextPageKey })}
          />
        </div>
        <p className={styles.hint}>
          快捷键在阅读区域生效，输入和弹窗内不会触发。Ctrl+T 切换背景点击，目录请使用工具栏。
        </p>
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
      </div>
    </details>
  );
}
