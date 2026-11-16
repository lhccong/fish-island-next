import { useState } from 'react';
import type { AdminPort } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { TextField } from './fields';
import { useAdminMutation } from './use-admin-mutation';
import styles from './Admin.module.css';

export function BroadcastPublisher({ port }: { port: AdminPort }) {
  const [content, setContent] = useState('');
  const [success, setSuccess] = useState(false);
  const mutation = useAdminMutation();
  return (
    <section className={styles.workspace} aria-label="发布全体播报">
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!content.trim() || mutation.pending) return;
          setSuccess(false);
          void mutation.run(
            (signal) => port.publishBroadcast(content.trim(), signal),
            () => {
              setContent('');
              setSuccess(true);
            },
          );
        }}
      >
        <p className={styles.feedback}>发布后，在线用户将在页面顶部看到播报。离线用户不会补收。</p>
        <TextField
          label="播报内容"
          value={content}
          maxLength={200}
          rows={5}
          required
          disabled={mutation.pending}
          aria-describedby="broadcast-count"
          onChange={(event) => {
            setContent(event.target.value);
            setSuccess(false);
          }}
        />
        <p id="broadcast-count" className={styles.feedback}>
          {content.length}/200
        </p>
        {mutation.error && (
          <p role="alert" className={styles.danger}>
            {mutation.error}
          </p>
        )}
        {success && (
          <p role="status" className={styles.feedback}>
            播报已提交，将向在线用户即时推送。
          </p>
        )}
        <div className={styles.actions}>
          <Button
            type="submit"
            aria-label={mutation.pending ? '发布中…' : '发布播报'}
            disabled={mutation.pending || !content.trim()}
          >
            {mutation.pending ? <LoadingIndicator compact>发布中…</LoadingIndicator> : '发布播报'}
          </Button>
        </div>
      </form>
    </section>
  );
}
