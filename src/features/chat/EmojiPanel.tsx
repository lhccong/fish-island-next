import { useState } from 'react';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useChatRealtime } from './realtime-context';
import faces from './qq-faces.json';
import { insertEditorEmoji, selectEditor } from './composer-editor';
import styles from './EmoticonPanel.module.css';

export function EmojiPanel() {
  const { draft, composerRef } = useChatRealtime();
  const [error, setError] = useState('');
  return (
    <>
      <ScrollArea label="Emoji 列表" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.emojiGrid}>
          {faces.map((face) => (
            <button
              type="button"
              key={face.id}
              className={styles.emoji}
              aria-label={face.text}
              title={face.text}
              onClick={() => {
                const editor = composerRef.current;
                const text = draft.store.getState().text;
                const { start, end } = draft.selection();
                const token = `[qqface:${face.id}]`;
                const next = text.slice(0, start) + token + text.slice(end);
                if (next.length > 5000) return setError('消息不能超过 5000 字');
                if (editor) insertEditorEmoji(editor, face.id, start, end);
                draft.setText(next, start + token.length);
                setError('');
                requestAnimationFrame(() => {
                  editor?.focus({ preventScroll: true });
                  if (editor) selectEditor(editor, start + token.length);
                });
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}qface/${face.id}.apng`}
                alt={face.text}
                loading="lazy"
                width={28}
                height={28}
              />
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className={styles.feedback}>
        {error ? (
          <span role="alert" data-tone="error">
            {error}
          </span>
        ) : (
          '点击 Emoji 插入草稿'
        )}
      </div>
    </>
  );
}
