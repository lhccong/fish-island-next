import { useEffect, useRef, useState } from 'react';
import type { ChatReportPort, ChatReportReason } from '@/domain/chat';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useChatRealtime } from './realtime-context';
import type { ReportTarget } from './report-context';
import styles from './MessageReportDialog.module.css';

type ReasonsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; reasons: readonly ChatReportReason[] };
export function MessageReportDialog({
  port,
  target,
  onClose,
}: {
  port: ChatReportPort;
  target: ReportTarget;
  onClose: () => void;
}) {
  const { draft } = useChatRealtime();
  const [state, setState] = useState<ReasonsState>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submission = useRef<AbortController | null>(null);
  useEffect(() => {
    const request = new AbortController();
    void port.reasons(request.signal).then(
      (reasons) => {
        if (!request.signal.aborted) setState({ status: 'ready', reasons });
      },
      () => {
        if (!request.signal.aborted)
          setState({ status: 'error', error: '举报原因加载失败，请重试' });
      },
    );
    return () => request.abort();
  }, [port, revision]);
  useEffect(() => () => submission.current?.abort(), []);
  const reload = () => {
    setState({ status: 'loading' });
    setRevision((value) => value + 1);
  };
  const submit = async () => {
    if (submission.current || !reason || state.status !== 'ready') return;
    const request = new AbortController();
    submission.current = request;
    setPending(true);
    setError('');
    try {
      await port.submit(
        {
          targetId: target.id,
          targetUserId: target.senderId,
          reasonType: Number(reason),
          description: description.trim(),
        },
        request.signal,
      );
      if (!request.signal.aborted) {
        draft.notify('举报已提交，我们会尽快处理');
        onClose();
      }
    } catch (cause) {
      if (!request.signal.aborted)
        setError(cause instanceof Error ? cause.message : '举报提交失败，请重试');
    } finally {
      if (!request.signal.aborted) {
        submission.current = null;
        setPending(false);
      }
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="举报消息"
      description="请选择举报原因，提交后由管理员审核。"
      returnFocusRef={target.returnFocusRef}
      className={styles.dialog ?? ''}
      showCloseAction={false}
      dismissLabel="关闭举报弹窗"
    >
      <ScrollArea label="举报表单" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.body}>
          {state.status === 'loading' ? (
            <LoadingIndicator>加载举报原因…</LoadingIndicator>
          ) : state.status === 'error' ? (
            <div className={styles.feedback} role="alert">
              <p>{state.error}</p>
              <Button variant="secondary" onClick={reload}>
                重试加载
              </Button>
            </div>
          ) : !state.reasons.length ? (
            <div className={styles.feedback}>
              <p>暂无可用举报原因，请稍后重试</p>
              <Button variant="secondary" onClick={reload}>
                重试加载
              </Button>
            </div>
          ) : (
            <>
              <Select
                label="举报原因"
                value={reason}
                onValueChange={setReason}
                disabled={pending}
                options={state.reasons.map((item) => ({
                  value: String(item.value),
                  label: item.text,
                }))}
              />
              <label className={styles.field}>
                补充说明（选填）
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={pending}
                  maxLength={500}
                  rows={4}
                  placeholder="请说明具体情况"
                />
              </label>
            </>
          )}
        </div>
      </ScrollArea>
      <div className={styles.footer}>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            aria-label={pending ? '提交中' : '提交举报'}
            disabled={pending || !reason || state.status !== 'ready'}
            onClick={() => void submit()}
          >
            {pending ? <LoadingIndicator compact>提交中…</LoadingIndicator> : '提交举报'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
