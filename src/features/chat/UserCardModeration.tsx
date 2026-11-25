import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import type { UserCardPort, UserMute } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import styles from './UserCard.module.css';

export function UserCardModeration({
  port,
  id,
  hasCover,
  hidden,
}: {
  port: UserCardPort;
  id: string;
  hasCover: boolean;
  hidden: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [info, setInfo] = useState<UserMute | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [duration, setDuration] = useState('60');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const task = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!opened) return;
    const current = new AbortController();
    void Promise.resolve()
      .then(() => {
        if (current.signal.aborted) return null;
        return port.muteInfo(id, current.signal);
      })
      .then((value) => {
        if (!current.signal.aborted && value) setInfo(value);
      })
      .catch((e: unknown) => {
        if (!current.signal.aborted) setError(e instanceof Error ? e.message : '禁言状态读取失败');
      });
    return () => current.abort();
  }, [port, id, opened, revision]);
  useEffect(() => () => task.current?.abort(), []);
  async function submit() {
    if (!info || task.current) return;
    const current = new AbortController();
    task.current = current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await port.mute(id, info.muted ? null : Number(duration), current.signal);
      if (!current.signal.aborted) {
        setNotice(info.muted ? '已解除禁言' : '禁言已生效');
        setConfirm(false);
        setInfo(null);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (!current.signal.aborted) setError(e instanceof Error ? e.message : '操作失败，请重试');
    } finally {
      task.current = null;
      if (!current.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog
      layer="nested"
      title="管理员操作"
      description="管理这位岛友的禁言状态"
      hideDescription
      dismissLabel="关闭管理员操作"
      showCloseAction={false}
      className={styles.moderationDialog ?? ''}
      trigger={
        <Button
          variant="secondary"
          className={styles.moderationTrigger}
          data-cover={hasCover}
          hidden={hidden}
          aria-label="管理员操作"
          title="管理员操作"
        >
          <Settings size={18} aria-hidden="true" />
        </Button>
      }
      onOpenChange={(open) => {
        if (open) setOpened(true);
      }}
    >
      <ScrollArea label="禁言设置" gutter="reserved" className={styles.moderationScroll ?? ''}>
        <div className={styles.moderationBody}>
          {!info && !error && <LoadingIndicator>正在读取禁言状态…</LoadingIndicator>}
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          {info && (
            <>
              <p>
                {info.muted
                  ? `已禁言${info.remaining ? ` · 剩余 ${info.remaining}` : ''}`
                  : '未禁言'}
              </p>
              {!info.muted && (
                <Select
                  label="禁言时长"
                  value={duration}
                  onValueChange={setDuration}
                  disabled={busy}
                  options={[
                    { value: '60', label: '1 分钟' },
                    { value: '600', label: '10 分钟' },
                    { value: '3600', label: '1 小时' },
                    { value: '86400', label: '1 天' },
                  ]}
                />
              )}
              {confirm && (
                <p>
                  确认{info.muted ? '解除这位岛友的禁言' : `禁言 ${Number(duration) / 60} 分钟`}？
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      {(info || error) && (
        <div className={`${styles.actions} ${styles.moderationFooter}`}>
          {!info ? (
            <Button
              variant="secondary"
              onClick={() => {
                setError('');
                setRevision((v) => v + 1);
              }}
            >
              重试禁言状态
            </Button>
          ) : confirm ? (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
                取消
              </Button>
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? <LoadingIndicator compact>{'提交中…'}</LoadingIndicator> : '确认'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              {info.muted ? '解除禁言' : '禁言用户'}
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
}
