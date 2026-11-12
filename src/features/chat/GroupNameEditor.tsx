import { useId, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './GroupNameEditor.module.css';

export function GroupNameEditor({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  function close() {
    setEditing(false);
    setError('');
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <section className={styles.section} aria-label="本地群聊名称">
      <h3>群聊名称</h3>
      {editing ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onSave(draft);
              setFeedback('已保存到本地');
              close();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : '保存失败，请重试');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          }}
        >
          <label className={styles.label} htmlFor={id}>
            新群聊名称
          </label>
          <input
            id={id}
            autoFocus
            value={draft}
            maxLength={60}
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
            onChange={(event) => {
              setDraft(event.target.value);
              setError('');
            }}
          />
          <p id={`${id}-help`} className={styles.help}>
            1–30 个字符，仅在当前浏览器生效
          </p>
          {error && (
            <p id={`${id}-error`} className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={close}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.valueRow}>
            <p>{name}</p>
            <Button
              ref={trigger}
              variant="secondary"
              aria-label="修改群聊名称"
              onClick={() => {
                setDraft(name);
                setFeedback('');
                setError('');
                setEditing(true);
              }}
            >
              修改
            </Button>
          </div>
          <p className={styles.help}>仅保存在当前浏览器，不影响其他成员</p>
          {feedback && (
            <p role="status" className={styles.help}>
              {feedback}
            </p>
          )}
        </>
      )}
    </section>
  );
}
