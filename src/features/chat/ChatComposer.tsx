import { useState } from 'react';
import { Smile, Folder, Scissors } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './ChatWorkspace.module.css';

export function ChatComposer() {
  const [draft, setDraft] = useState('');
  return (
    <section className={styles.composer} aria-label="群聊输入区">
      <div className={styles.tools}>
        <button type="button" disabled aria-label="表情（暂未接入）">
          <Smile size={20} />
        </button>
        <button type="button" disabled aria-label="文件（暂未接入）">
          <Folder size={20} />
        </button>
        <button type="button" disabled aria-label="截图（暂未接入）">
          <Scissors size={20} />
        </button>
      </div>
      <textarea
        aria-label="消息草稿"
        placeholder="写点什么…"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className={styles.actions}>
        <span>消息暂未接入，草稿不会发送</span>
        <Button variant="secondary" disabled>
          发送
        </Button>
      </div>
    </section>
  );
}
