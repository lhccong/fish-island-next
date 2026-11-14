import { useEffect, useState } from 'react';
import type { AccountToolsPort, DeveloperApp } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { AppEditor } from './AppEditor';
import { DeveloperAppRow } from './DeveloperAppRow';
import styles from './Tools.module.css';
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; apps: DeveloperApp[] };
export function DeveloperApps({ port }: { port: AccountToolsPort }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<DeveloperApp | 'new' | null>(null);
  useEffect(() => {
    const task = new AbortController();
    void port
      .apps(task.signal)
      .then((apps) => {
        if (!task.signal.aborted) setState({ status: 'ready', apps });
      })
      .catch((error: unknown) => {
        if (!task.signal.aborted)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '获取应用失败',
          });
      });
    return () => task.abort();
  }, [port, revision]);
  const refresh = () => {
    setState({ status: 'loading' });
    setRevision((v) => v + 1);
  };
  if (editor)
    return (
      <AppEditor
        port={port}
        app={editor === 'new' ? null : editor}
        onDone={() => {
          setEditor(null);
          refresh();
        }}
      />
    );
  return (
    <div
      className={styles.body}
      data-view={state.status === 'ready' && !state.apps.length ? 'empty' : 'list'}
      data-many={state.status === 'ready' && state.apps.length > 1}
    >
      <div className={styles.toolbar}>
        <span>{state.status === 'ready' ? `${state.apps.length} 个应用` : '我的应用'}</span>
        <Button onClick={() => setEditor('new')}>创建应用</Button>
      </div>
      <ScrollArea label="开放平台应用列表" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.fields}>
          {state.status === 'loading' && <p role="status">正在读取应用…</p>}
          {state.status === 'error' && (
            <div>
              <p role="alert">{state.message}</p>
              <Button variant="secondary" onClick={refresh}>
                重试
              </Button>
            </div>
          )}
          {state.status === 'ready' &&
            (state.apps.length ? (
              state.apps.map((app) => (
                <DeveloperAppRow
                  key={app.id}
                  port={port}
                  app={app}
                  onEdit={() => setEditor(app)}
                  onDeleted={refresh}
                />
              ))
            ) : (
              <div className={styles.empty}>
                <p role="status">暂无应用，创建应用后可接入摸鱼岛登录。</p>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
