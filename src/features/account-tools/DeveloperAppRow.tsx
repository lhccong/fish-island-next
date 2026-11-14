import { useState } from 'react';
import type { AccountToolsPort, DeveloperApp } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { Feedback } from './Feedback';
import { useOperation } from './use-operation';
import styles from './Tools.module.css';
import details from './Details.module.css';
export function DeveloperAppRow({
  port,
  app,
  onEdit,
  onDeleted,
}: {
  port: AccountToolsPort;
  app: DeveloperApp;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [secret, setSecret] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null);
  const operation = useOperation();
  return (
    <article className={details.app} data-expanded={!!secret || confirm !== null}>
      <div className={details.appHeading}>
        <span className={details.appStamp} aria-hidden="true">
          {app.appName.slice(0, 1)}
        </span>
        <h3>{app.appName}</h3>
        <span className={details.status} data-enabled={app.status === 1}>
          {app.status === 1 ? '已启用' : '已禁用'}
        </span>
      </div>
      {app.appDesc && <p className={details.appDescription}>{app.appDesc}</p>}
      <dl className={details.metadata}>
        <div>
          <dt>Client ID</dt>
          <dd>
            <code>{app.clientId}</code>
          </dd>
        </div>
        {app.appWebsite && (
          <div>
            <dt>网站</dt>
            <dd>{app.appWebsite}</dd>
          </div>
        )}
        <div>
          <dt>回调地址</dt>
          <dd>{app.redirectUri}</dd>
        </div>
      </dl>
      {secret && (
        <div className={details.secretBox}>
          <span>Client Secret</span>
          <code className={details.secret}>{secret}</code>
        </div>
      )}
      <Feedback {...operation} />
      {confirm ? (
        <div className={details.confirmation}>
          <p>
            {confirm === 'delete'
              ? '确定删除应用？已接入的登录将不可用。'
              : '确定重置密钥？旧密钥将立即失效。'}
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" disabled={operation.busy} onClick={() => setConfirm(null)}>
              取消
            </Button>
            <Button
              disabled={operation.busy}
              onClick={() => {
                void operation.run(async (signal) => {
                  if (confirm === 'delete') {
                    await port.deleteApp(app.id, signal);
                    if (!signal.aborted) onDeleted();
                  } else {
                    const value = await port.secret(app.id, true, signal);
                    if (!signal.aborted) {
                      setSecret(value);
                      setConfirm(null);
                      operation.setNotice('密钥已重置，请同步更新你的应用');
                    }
                  }
                });
              }}
            >
              确认{confirm === 'delete' ? '删除' : '重置'}
            </Button>
          </div>
        </div>
      ) : (
        <div className={details.appActions}>
          <Button variant="secondary" disabled={operation.busy} onClick={onEdit}>
            编辑
          </Button>
          <Button
            variant="secondary"
            disabled={operation.busy}
            onClick={() => {
              if (secret) {
                setSecret('');
                return;
              }
              void operation.run(async (signal) => {
                const value = await port.secret(app.id, false, signal);
                if (!signal.aborted) setSecret(value);
              });
            }}
          >
            {secret ? '隐藏密钥' : '查看密钥'}
          </Button>
          <Button
            variant="secondary"
            disabled={operation.busy}
            onClick={() => {
              setSecret('');
              setConfirm('reset');
            }}
          >
            重置密钥
          </Button>
          <Button
            variant="secondary"
            disabled={operation.busy}
            className={details.danger}
            onClick={() => setConfirm('delete')}
          >
            删除
          </Button>
        </div>
      )}
    </article>
  );
}
