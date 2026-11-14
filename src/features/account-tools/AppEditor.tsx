import { useState } from 'react';
import { safeRedirect, type AccountToolsPort, type DeveloperApp } from '@/domain/account-tools';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Feedback } from './Feedback';
import { useOperation } from './use-operation';
import styles from './Tools.module.css';
export function AppEditor({
  port,
  app,
  onDone,
}: {
  port: AccountToolsPort;
  app: DeveloperApp | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(app?.appName ?? '');
  const [description, setDescription] = useState(app?.appDesc ?? '');
  const [website, setWebsite] = useState(app?.appWebsite ?? '');
  const [redirect, setRedirect] = useState(app?.redirectUri ?? '');
  const [status, setStatus] = useState(String(app?.status ?? 1));
  const operation = useOperation();
  return (
    <form
      data-view="editor"
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void operation.run(async (signal) => {
          if (!name.trim()) throw new Error('请输入应用名称');
          if (!redirect.trim() || redirect.split(',').some((url) => !safeRedirect(url.trim())))
            throw new Error('请输入有效的 HTTP/HTTPS 回调地址，多个地址用英文逗号分隔');
          if (website.trim() && !safeRedirect(website.trim()))
            throw new Error('请输入有效的应用网站地址');
          await port.saveApp(
            {
              appName: name.trim(),
              appDesc: description.trim(),
              appWebsite: website.trim(),
              redirectUri: redirect.trim(),
              status: Number(status),
            },
            app?.id ?? null,
            signal,
          );
          if (!signal.aborted) onDone();
        });
      }}
    >
      <ScrollArea label="应用编辑内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={`${styles.fields} ${styles.formGrid}`}>
          <label className={styles.field}>
            应用名称
            <input
              value={name}
              maxLength={80}
              disabled={operation.busy}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            网站地址
            <input
              type="url"
              value={website}
              disabled={operation.busy}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.span}`}>
            应用描述
            <textarea
              value={description}
              maxLength={500}
              disabled={operation.busy}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.span}`}>
            回调地址
            <textarea
              value={redirect}
              disabled={operation.busy}
              onChange={(e) => setRedirect(e.target.value)}
            />
          </label>
          {app && (
            <div className={styles.field}>
              <span>状态</span>
              <Select
                label="应用状态"
                value={status}
                disabled={operation.busy}
                onValueChange={setStatus}
                options={[
                  { value: '1', label: '启用' },
                  { value: '0', label: '禁用' },
                ]}
              />
            </div>
          )}
        </div>
      </ScrollArea>
      <Feedback {...operation} />
      <div className={styles.actions}>
        <Button variant="secondary" disabled={operation.busy} onClick={onDone}>
          返回列表
        </Button>
        <Button type="submit" disabled={operation.busy}>
          {app ? '保存' : '创建应用'}
        </Button>
      </div>
    </form>
  );
}
