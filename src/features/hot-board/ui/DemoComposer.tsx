import { Box, FolderOpen, Mic, Scissors, Smile, Volume2 } from 'lucide-react';
import styles from './DemoComposer.module.css';

const tools = [
  { label: '表情', Icon: Smile },
  { label: '扩展', Icon: Box },
  { label: '文件', Icon: FolderOpen },
  { label: '截图', Icon: Scissors },
  { label: '语音', Icon: Mic },
];

export function DemoComposer() {
  return (
    <section className={styles.composer} aria-label="消息输入区">
      <textarea className={styles.input} aria-label="消息输入框" placeholder="输入消息…" />
      <div className={styles.toolbar}>
        <div className={styles.tools}>
          {tools.map(({ label, Icon }) => (
            <button key={label} type="button" disabled aria-label={label} title={label}>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button className={styles.voice} type="button" disabled aria-label="声音">
          <Volume2 size={19} aria-hidden="true" />
        </button>
        <button className={styles.send} type="button" disabled>
          <span>发送</span>
        </button>
      </div>
    </section>
  );
}
