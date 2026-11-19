import { useEffect, useState } from 'react';
import type { AdminPort } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Switch } from '@/shared/ui/Switch';
import { useAdminMutation } from './use-admin-mutation';
import styles from './Admin.module.css';

type SettingsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; saved: boolean; enabled: boolean };

export function BigFishSettings({ port }: { port: AdminPort }) {
  const [state, setState] = useState<SettingsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const mutation = useAdminMutation();
  useEffect(() => {
    const request = new AbortController();
    void port.getBigFishEnabled(request.signal).then(
      (enabled) => {
        if (!request.signal.aborted) setState({ status: 'ready', saved: enabled, enabled });
      },
      (error: unknown) => {
        if (!request.signal.aborted)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '读取大肥鱼设置失败，请重试',
          });
      },
    );
    return () => request.abort();
  }, [port, attempt]);

  return (
    <section className={styles.workspace} aria-label="大肥鱼设置">
      {state.status === 'loading' ? (
        <div className={styles.empty}>
          <LoadingIndicator>正在读取设置…</LoadingIndicator>
        </div>
      ) : state.status === 'error' ? (
        <div className={styles.empty}>
          <p role="alert" className={styles.feedback}>
            {state.message}
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: 'loading' });
                setAttempt((value) => value + 1);
              }}
            >
              重试
            </Button>
          </div>
        </div>
      ) : (
        <form
          className={styles.tablePanel}
          onSubmit={(event) => {
            event.preventDefault();
            if (state.enabled === state.saved || mutation.pending) return;
            void mutation.run(
              (signal) => port.saveBigFishEnabled(state.enabled, signal),
              () => setState({ ...state, saved: state.enabled }),
            );
          }}
        >
          <div className={styles.settingRow}>
            <div>
              <h2 className={styles.heading}>启动大肥鱼</h2>
              <p className={styles.settingHelp}>开启后，大肥鱼会在群聊中回复提及并偶尔插话。</p>
            </div>
            <Switch
              label="启动大肥鱼"
              checked={state.enabled}
              disabled={mutation.pending}
              onCheckedChange={(enabled) => setState({ ...state, enabled })}
            />
          </div>
          {mutation.error && state.enabled !== state.saved && (
            <p role="alert" className={styles.danger}>
              {mutation.error}
            </p>
          )}
          <div className={styles.settingFooter}>
            <p role="status" className={styles.settingHelp}>
              {state.saved ? '当前已开启' : '当前已关闭'}
            </p>
            <Button type="submit" disabled={state.enabled === state.saved || mutation.pending}>
              {mutation.pending ? <LoadingIndicator compact>保存中…</LoadingIndicator> : '保存'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
