import { useRef, useState, type RefObject } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useInvitation } from './use-invitation';
import styles from './ui/InvitationDialog.module.css';

export default function InvitationDialog({
  onClose,
  returnFocusRef,
}: {
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { state, retry } = useInvitation();
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'status'; message: string }>();
  const codeField = useRef<HTMLInputElement>(null);
  const linkField = useRef<HTMLInputElement>(null);
  const code = state.kind === 'ready' ? state.code : '';
  const url = new URL('/user/login', window.location.origin);
  url.searchParams.set('invite', code);
  const shareData = { title: '加入摸鱼岛', url: url.href };
  const canShare =
    code && typeof navigator.share === 'function' && (navigator.canShare?.(shareData) ?? true);

  async function copy(field: HTMLInputElement | null, label: string) {
    if (!field) return;
    setFeedback(undefined);
    try {
      await navigator.clipboard.writeText(field.value);
      setFeedback({ kind: 'status', message: `${label}已复制` });
    } catch {
      field.focus();
      field.select();
      setFeedback({ kind: 'error', message: `无法自动复制，请手动复制${label}` });
    }
  }

  async function share() {
    setFeedback(undefined);
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setFeedback({ kind: 'error', message: '系统分享失败，请复制邀请链接' });
      }
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      returnFocusRef={returnFocusRef}
      title="邀请好友加入摸鱼岛"
      description="分享链接、邀请码或二维码，邀请好友注册。"
      dismissLabel="关闭邀请弹窗"
      showCloseAction={false}
      className={`${styles.dialog} ${state.kind === 'ready' ? '' : styles.compact}`}
    >
      <ScrollArea label="邀请内容" gutter="reserved" className={styles.scroll ?? ''}>
        {state.kind === 'error' ? (
          <div className={styles.message}>
            <p role="alert" className={styles.error}>
              {state.message}
            </p>
          </div>
        ) : state.kind === 'ready' ? (
          <div className={styles.content}>
            <div className={styles.field}>
              <label htmlFor="friend-invitation-link">邀请链接</label>
              <div className={styles.row}>
                <input id="friend-invitation-link" ref={linkField} value={url.href} readOnly />
                <Button
                  aria-label="复制链接"
                  onClick={() => void copy(linkField.current, '邀请链接')}
                >
                  复制
                </Button>
              </div>
            </div>
            <div className={styles.sharePanel} role="group" aria-label="邀请码和二维码">
              <div className={styles.field}>
                <label htmlFor="friend-invitation-code">邀请码</label>
                <div className={`${styles.row} ${styles.codeRow}`}>
                  <input id="friend-invitation-code" ref={codeField} value={code} readOnly />
                  <Button
                    variant="secondary"
                    onClick={() => void copy(codeField.current, '邀请码')}
                  >
                    复制邀请码
                  </Button>
                </div>
              </div>
              <figure className={styles.scan}>
                <QRCodeCanvas
                  value={url.href}
                  size={120}
                  marginSize={4}
                  title="邀请二维码"
                  style={{ width: '100%', height: 'auto' }}
                />
                <figcaption>微信或相机扫码</figcaption>
              </figure>
            </div>
          </div>
        ) : (
          <LoadingIndicator>正在准备邀请…</LoadingIndicator>
        )}
      </ScrollArea>
      {feedback && (
        <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={styles[feedback.kind]}>
          {feedback.message}
        </p>
      )}
      <div className={styles.actions}>
        {state.kind === 'error' ? (
          <Button onClick={() => void retry()}>重试</Button>
        ) : canShare ? (
          <Button variant="secondary" onClick={() => void share()}>
            用系统分享
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      </div>
    </Dialog>
  );
}
